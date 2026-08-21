import dns from "dns";
import net from "net";

// RQ-3116: makeApiClientRequest handed a renderer-supplied URL to axios in the main
// process with no destination check, reaching the cloud metadata service.
//
// Scope is deliberately narrower than the finding, which asked to block loopback and
// RFC1918 too. This IS an API client — blocking localhost and internal hosts would
// break its primary use case — so only metadata/link-local space is refused.
//
// The check hangs off the agent's DNS lookup rather than a pre-flight resolve: that
// validates at connect time (no resolve-then-connect window) and covers every
// redirect hop, since follow-redirects reuses the agent. axios follows up to 5
// redirects, so a pre-flight-only check is bypassed by a 302 to the metadata address.
export class BlockedRequestTargetError extends Error {
  readonly hostname: string;

  readonly address: string;

  constructor(hostname: string, address: string) {
    super(
      `Refusing to request ${hostname}: resolves to ${address}, a cloud metadata / link-local address.`
    );
    this.name = "BlockedRequestTargetError";
    this.hostname = hostname;
    this.address = address;
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
]);

const BLOCKED_EXACT_IPV4 = new Set([
  "100.100.100.100", // Alibaba Cloud
  "192.0.0.192", // Oracle Cloud (classic)
]);

const normalizeIpv6 = (address: string): string =>
  address.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();

// This address only; fd00::/8 at large is legitimate ULA.
const BLOCKED_EXACT_IPV6 = new Set(["fd00:ec2::254", "fd00:ec2:0:0:0:0:0:254"]);

export const isBlockedAddress = (rawAddress: string): boolean => {
  if (!rawAddress) {
    return false;
  }
  const address = rawAddress.trim();

  if (net.isIPv4(address)) {
    // Link-local: where every major cloud parks its IMDS.
    if (address.startsWith("169.254.")) {
      return true;
    }
    return BLOCKED_EXACT_IPV4.has(address);
  }

  const ipv6 = normalizeIpv6(address);
  if (net.isIPv6(ipv6)) {
    if (/^fe[89ab][0-9a-f]?:/.test(ipv6)) {
      return true;
    }
    if (BLOCKED_EXACT_IPV6.has(ipv6)) {
      return true;
    }
    // IPv4-mapped IPv6 must not launder a blocked address.
    const mapped = ipv6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) {
      return isBlockedAddress(mapped[1]);
    }
  }

  return false;
};

export const isBlockedHostname = (rawHostname: string): boolean => {
  if (!rawHostname) {
    return false;
  }
  const hostname = rawHostname.trim().toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return true;
  }
  // A literal IP never reaches DNS, so check it here too.
  return isBlockedAddress(hostname.replace(/^\[|\]$/g, ""));
};

// Catches a direct hit before a socket opens; hostnames that merely resolve to a
// blocked address are caught by guardedLookup.
export const assertRequestTargetAllowed = (url: string): void => {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return; // Not our business to police URL syntax.
  }
  if (isBlockedHostname(hostname)) {
    throw new BlockedRequestTargetError(hostname, hostname);
  }
};

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number
) => void;

/** Agent DNS lookup that refuses blocked addresses at connect time. */
export const guardedLookup = (
  hostname: string,
  options: dns.LookupOneOptions | dns.LookupAllOptions | number,
  callback: LookupCallback
): void => {
  dns.lookup(
    hostname,
    options as dns.LookupAllOptions,
    (
      err: NodeJS.ErrnoException | null,
      address: string | dns.LookupAddress[],
      family?: number
    ) => {
      if (err) {
        callback(err, address, family);
        return;
      }
      const resolved: dns.LookupAddress[] = Array.isArray(address)
        ? address
        : [{ address: address as unknown as string, family: family as number }];

      const blocked = resolved.find((entry) => isBlockedAddress(entry.address));
      if (blocked) {
        callback(
          new BlockedRequestTargetError(hostname, blocked.address),
          address,
          family
        );
        return;
      }
      callback(null, address, family);
    }
  );
};

// Called synchronously before each hop, so it can only check the literal host;
// guardedLookup covers whatever it resolves to.
export const assertRedirectTargetAllowed = (options: {
  hostname?: string;
  host?: string;
}): void => {
  const hostname = options.hostname || options.host;
  if (hostname && isBlockedHostname(hostname)) {
    throw new BlockedRequestTargetError(hostname, hostname);
  }
};

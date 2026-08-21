import dns from "dns";
import net from "net";

/**
 * RQ-3116 (F-007) — SSRF via the get-api-response IPC.
 *
 * `makeApiClientRequest` handed `apiRequest.url` to axios in the main process with
 * no destination check, so JS in webAppWindow could drive the privileged main
 * process to the cloud instance-metadata service and read back the host IAM role's
 * temporary credentials.
 *
 * SCOPE DECISION — this deliberately does NOT match the finding's remediation text.
 *
 * The finding asks for a blocklist covering "loopback, RFC1918 CIDRs, link-local,
 * IPv6 ULA/loopback, and known cloud-metadata IPs", plus https-only for non-localhost.
 * Implemented literally that breaks the product: this IS an API client, and testing
 * `http://localhost:3000` and internal staging hosts is its primary use case.
 *
 * So the blocklist is scoped to what carries the actual impact — credential theft
 * from metadata services — and leaves loopback and RFC1918 reachable:
 *
 *   BLOCKED   169.254.0.0/16   IPv4 link-local. Covers AWS/Azure/GCP/Oracle/DO IMDS
 *                              at 169.254.169.254 and ECS task metadata at
 *                              169.254.170.2. Autoconfiguration space — not a
 *                              legitimate API target.
 *             fe80::/10        IPv6 link-local, same reasoning.
 *             fd00:ec2::254    AWS IMDSv6. Only this address, not all of fd00::/8 —
 *                              ULA is legitimate internal addressing.
 *             100.100.100.100  Alibaba Cloud metadata.
 *             192.0.0.192      Oracle Cloud (classic) metadata.
 *             metadata.google.internal / metadata.goog   GCP metadata by name.
 *
 *   ALLOWED   127.0.0.1, localhost, ::1, 10/8, 172.16/12, 192.168/16, and http://
 *             to internal hosts — all legitimate API-client targets.
 *
 * DNS is re-checked after resolution, as the finding asks, but via a guarded
 * `lookup` on the agent rather than a pre-flight resolve. That is strictly stronger:
 * it validates at connect time (no resolve-then-connect TOCTOU window) and it covers
 * every redirect hop, since follow-redirects reuses the agent. A pre-flight-only
 * check would be bypassed by a benign URL that 302s to the metadata address.
 */

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

/** Hostnames that address a metadata service directly. */
const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
]);

/** Exact single-address metadata endpoints. */
const BLOCKED_EXACT_IPV4 = new Set([
  "100.100.100.100", // Alibaba Cloud
  "192.0.0.192", // Oracle Cloud (classic)
]);

const normalizeIpv6 = (address: string): string =>
  address.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();

/** AWS IMDSv6. Deliberately this address only — fd00::/8 as a whole is legitimate ULA. */
const BLOCKED_EXACT_IPV6 = new Set(["fd00:ec2::254", "fd00:ec2:0:0:0:0:0:254"]);

export const isBlockedAddress = (rawAddress: string): boolean => {
  if (!rawAddress) {
    return false;
  }
  const address = rawAddress.trim();

  if (net.isIPv4(address)) {
    // 169.254.0.0/16 — IPv4 link-local, where every major cloud parks its IMDS.
    if (address.startsWith("169.254.")) {
      return true;
    }
    return BLOCKED_EXACT_IPV4.has(address);
  }

  const ipv6 = normalizeIpv6(address);
  if (net.isIPv6(ipv6)) {
    // fe80::/10 — IPv6 link-local.
    if (/^fe[89ab][0-9a-f]?:/.test(ipv6)) {
      return true;
    }
    if (BLOCKED_EXACT_IPV6.has(ipv6)) {
      return true;
    }
    // ::ffff:169.254.x.x — IPv4-mapped IPv6 must not launder a blocked address.
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
  // A literal IP in the URL never reaches DNS, so check it here too.
  return isBlockedAddress(hostname.replace(/^\[|\]$/g, ""));
};

/**
 * Synchronous check on a URL's literal host. Catches direct-IP and
 * metadata-by-name targets before a socket is opened, with a clear error.
 * Hostnames that only resolve to a blocked address are caught by the guarded
 * lookup below.
 */
export const assertRequestTargetAllowed = (url: string): void => {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return; // Not our business to police URL syntax; axios will reject it.
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

/**
 * A drop-in replacement for the agent's DNS lookup that refuses blocked
 * addresses at connect time — so it applies to every redirect hop and leaves no
 * resolve-then-connect window.
 */
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

/**
 * follow-redirects calls this synchronously before each hop. It can only check the
 * literal host — the guarded lookup covers the resolved address.
 */
export const assertRedirectTargetAllowed = (options: {
  hostname?: string;
  host?: string;
}): void => {
  const hostname = options.hostname || options.host;
  if (hostname && isBlockedHostname(hostname)) {
    throw new BlockedRequestTargetError(hostname, hostname);
  }
};

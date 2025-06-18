import { Cookie, CookieJar } from "tough-cookie";
import type { AxiosResponse, AxiosRequestConfig } from "axios";
import Store from "electron-store";

let cookieJar = new CookieJar(undefined, { looseMode: true });

const offlineStore = new Store({
  name: "cookies",
  cwd: "storage",
  schema: {
    cookies: {
      type: "string",
      default: JSON.stringify({}),
    },
  },
});

export const loadCookies = () => {
  console.log("Loading cookies from offline store...");
  const rawCookieJarDump = offlineStore.get("cookies");
  let offlineJar: any;
  if (rawCookieJarDump) {
    // @ts-ignore
    offlineJar = JSON.parse(rawCookieJarDump);
  }
  if (!offlineJar || !offlineJar.cookies) {
    console.log(
      "No cookies found in offline store.",
      !!offlineJar,
      offlineJar?.cookies
    );
    return;
  }

  // @ts-ignore
  cookieJar = CookieJar.fromJSON(offlineJar);
};

export const saveCookies = () => {
  const cookiesToStore = JSON.stringify(cookieJar.toJSON());
  offlineStore.set("cookies", cookiesToStore);
};

loadCookies();

export const storeCookiesFromResponse = (
  response: AxiosResponse
): AxiosResponse => {
  let cookies =
    response.headers["set-cookie"] || response.headers["Set-Cookie"];
  cookies = cookies ? (Array.isArray(cookies) ? cookies : [cookies]) : [];
  const finalURL: string =
    response.request?.res?.responseUrl || // to follow redirect
    response.config.url ||
    "";
  cookies.forEach((cookie: string) => {
    cookieJar.setCookieSync(cookie, finalURL, {ignoreError: true});
  });
  return response;
};

export const addCookiesToRequest = (request: AxiosRequestConfig) => {
  if (!request || !request.url) return request;
  const { url } = request;
  const storedCookies = cookieJar.getCookiesSync(url);
  const currentCookies =
    request.headers?.Cookie || request.headers?.cookie || "";
  const cookieString = storedCookies
    .map((cookie) => `${cookie.key}=${cookie.value}`)
    .join("; ");
  const headers = request.headers || {};
  const allCookies = [currentCookies, cookieString].filter(Boolean).join("; ");
  const finalCookie = Cookie.parse(allCookies, {
    // to allow key-less cookies (non-compliant to OG RFC 6265)
    // https://github.com/httpwg/http-extensions/issues/159
    loose: true,
  });
  if (finalCookie) {
    headers.Cookie = finalCookie?.toString();
  }
  request.headers = headers;
  return request;
};

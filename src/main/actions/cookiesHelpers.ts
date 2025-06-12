import { Cookie, CookieJar } from "tough-cookie";
import type { AxiosResponse, AxiosRequestConfig } from "axios";

const cookieJar = new CookieJar();

export const storeCookiesFromResponse = (
  response: AxiosResponse
): AxiosResponse => {
  let cookies = response.headers["set-cookie"] || response.headers["Set-Cookie"];
  cookies = cookies ? (Array.isArray(cookies) ? cookies : [cookies]) : [];
  cookies.forEach((cookie: string) => {
    cookieJar.setCookieSync(cookie, response.config.url as string);
  });
  return response;
};

export const addCookiesToRequest = (request: AxiosRequestConfig) => {
  if (!request || !request.url) return request;
  const { url } = request;
  const storedCookies = cookieJar.getCookiesSync(url);
  const currentCookies = request.headers?.Cookie || request.headers?.cookie || "";
  const cookieString = storedCookies.map((cookie) => `${cookie.key}=${cookie.value}`).join("; ");
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

import { CookieJar } from "tough-cookie";
import type { AxiosResponse, AxiosRequestConfig } from "axios";

const cookieJar = new CookieJar();

export const storeCookiesFromResponse = (
  response: AxiosResponse
): AxiosResponse => {
  let cookies =
    response.headers["set-cookie"] || response.headers["Set-Cookie"];
  cookies = cookies ? (Array.isArray(cookies) ? cookies : [cookies]) : [];
  cookies.forEach((cookie: string) => {
    cookieJar.setCookieSync(cookie, response.config.url as string);
  });
  console.log("Stored cookies from response:", cookies);
  return response;
};

export const addCookiesToRequest = (request: AxiosRequestConfig) => {
  if (!request || !request.url) return request;
  const { url } = request;
  const cookies = cookieJar.getCookiesSync(url);
  const currentCookies = request.headers?.Cookie || request.headers?.cookie || "";
  const cookieString = cookies
    .map((cookie) => `${cookie.key}=${cookie.value}`)
    .join("; ");
  const headers = request.headers || {};
  headers.Cookie = [currentCookies, cookieString].filter(Boolean).join("; ");
  request.headers = headers;

  console.log("Added cookies to request:", request.headers.Cookie);
  return request;
};

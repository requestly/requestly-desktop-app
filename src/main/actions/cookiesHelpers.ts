import { CookieJar } from "tough-cookie";
import type { AxiosResponse, AxiosRequestConfig } from "axios";

const cookieJar = new CookieJar();

/* axios interceptors */
export const cookiesResponseInterceptor = (
  response: AxiosResponse
): AxiosResponse => {
  const cookies = response.headers["set-cookie"];
  if (cookies) {
    cookies.forEach((cookie: string) => {
      cookieJar.setCookieSync(cookie, response.config.url as string);
    });
  }
  return response;
};

export const cookiesRequestInterceptor = (request: AxiosRequestConfig) => {
  if (!request || !request.url) return request;
  const { url } = request;
  const cookies = cookieJar.getCookiesSync(url);
  if (cookies.length > 0) {
    if (!request.headers) request.headers = {};
    request.headers.Cookie = cookies
      .map((cookie) => cookie.toString())
      .join("; ");
  }
  return request;
};
/* There are also error cases, but they get bypassed as we override validateStatus (and is rest is taken care of by proxy) */

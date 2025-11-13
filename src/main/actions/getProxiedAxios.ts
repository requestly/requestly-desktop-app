import axios, { AxiosInstance } from "axios";
import { readFileSync } from "fs";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";
import { ClientRequest, RequestOptions } from "agent-base";
import {
  addCookiesToRequest,
  storeCookiesFromResponse,
} from "./cookiesHelpers";
const dns = require("dns")
import http from "http";
import https from "https";

class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  ca: unknown;

  constructor(opts: HttpsProxyAgentOptions) {
    super(opts);
    this.ca = opts.ca;
  }

  async callback(req: ClientRequest, opts: RequestOptions) {
    return super.callback(req, Object.assign(opts, { ca: this.ca }));
  }
}

interface ProxyConfig {
  ip: string;
  port: number;
  rootCertPath: string;
}

let proxiedAxios: AxiosInstance;
let proxiedAxiosWithSessionCookies: AxiosInstance;
let proxyConfig: ProxyConfig;

function createAxiosInstance(
  config: ProxyConfig,
  enableRQProxy: boolean = false,
  addStoredCookies: boolean = false
): AxiosInstance {
  let instance: AxiosInstance;
  if (enableRQProxy) {
    instance = axios.create({
      proxy: false,
      httpAgent: new HttpsProxyAgent(`http://${config.ip}:${config.port}`),
      httpsAgent: new PatchedHttpsProxyAgent({
        host: config.ip,
        port: config.port,
        ca: readFileSync(config.rootCertPath),
      }),
    });
  } else {
    /* https://github.com/requestly/requestly-desktop-app/pull/227 */
    const localhostIPv4Lookup = (hostname: any, options: any, callback: any) => {
      if (hostname === 'localhost') {
        dns.lookup(hostname, { ...options, family: 4 }, callback);
      } else {
        dns.lookup(hostname, options, callback);
      }
    };
    const httpAgent = new http.Agent({ lookup: localhostIPv4Lookup });
    const httpsAgent = new https.Agent({ lookup: localhostIPv4Lookup });
    instance = axios.create({
      proxy: false,
      httpAgent,
      httpsAgent,
    });
  }

  instance.interceptors.response.use(storeCookiesFromResponse);
  if (addStoredCookies) {
    instance.interceptors.request.use(addCookiesToRequest);
  }
  return instance;
}

export const createOrUpdateAxiosInstance = (
  newProxyConfig: ProxyConfig
): AxiosInstance => {
  proxyConfig = {
    ...(proxyConfig || {}),
    ...newProxyConfig,
  };

  try {
    proxiedAxios = createAxiosInstance(proxyConfig, false);
    proxiedAxiosWithSessionCookies = createAxiosInstance(proxyConfig, false, true);
  } catch (error) {
    /* Do nothing */
    console.error("Error creating or updating Axios instance:", error);
  }

  return proxiedAxios;
};

/* 
  [Intentional] add cookies by default. In line with emulating browser behaviour.
  A better name could be excludeCredentials=false .
  did this because a flag called `withCredentials` has now been released for extension
*/
const getProxiedAxios = (includeCredentials: boolean = true): AxiosInstance => {
  if (includeCredentials)
    return proxiedAxiosWithSessionCookies ?? proxiedAxios ?? axios;
  return proxiedAxios ?? axios;
};

export default getProxiedAxios;

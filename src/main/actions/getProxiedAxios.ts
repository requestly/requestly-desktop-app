import axios, { AxiosInstance } from "axios";
import { readFileSync } from "fs";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";
import { ClientRequest, RequestOptions } from "agent-base";
import {
  cookiesRequestInterceptor,
  cookiesResponseInterceptor,
} from "./cookiesHelpers";

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

let axiosInstance: AxiosInstance;
let axiosInstanceWithCookies: AxiosInstance;
let proxyConfig: ProxyConfig;

function createAxiosInstance(config: ProxyConfig): AxiosInstance {
  return axios.create({
    proxy: false,
    httpAgent: new HttpsProxyAgent(`http://${config.ip}:${config.port}`),
    httpsAgent: new PatchedHttpsProxyAgent({
      host: config.ip,
      port: config.port,
      ca: readFileSync(config.rootCertPath),
    }),
  });
}

export const createOrUpdateAxiosInstance = (
  newProxyConfig: ProxyConfig
): AxiosInstance => {
  proxyConfig = {
    ...(proxyConfig || {}),
    ...newProxyConfig,
  };

  try {
    axiosInstance = createAxiosInstance(proxyConfig);
    axiosInstanceWithCookies = createAxiosInstance(proxyConfig);
    axiosInstanceWithCookies.interceptors.request.use(
      cookiesRequestInterceptor
    );
    axiosInstanceWithCookies.interceptors.response.use(
      cookiesResponseInterceptor
    );
  } catch {
    /* Do nothing */
  }

  return axiosInstance;
};

const getProxiedAxios = (withCookies = true): AxiosInstance => {
  if (withCookies) return axiosInstanceWithCookies ?? axiosInstance ?? axios;
  return axiosInstance ?? axios;
};

export default getProxiedAxios;

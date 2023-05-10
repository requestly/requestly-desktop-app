import axios, { AxiosInstance } from "axios";
import { readFileSync } from "fs";
import { HttpsProxyAgent, HttpsProxyAgentOptions } from "https-proxy-agent";
import { ClientRequest, RequestOptions } from "agent-base";

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
let proxyConfig: ProxyConfig;

export const createOrUpdateAxiosInstance = (
  newProxyConfig: ProxyConfig
): AxiosInstance => {
  proxyConfig = {
    ...(proxyConfig || {}),
    ...newProxyConfig,
  };

  axiosInstance = axios.create({
    proxy: false,
    httpAgent: new HttpsProxyAgent(
      `http://${proxyConfig.ip}:${proxyConfig.port}`
    ),
    httpsAgent: new PatchedHttpsProxyAgent({
      host: proxyConfig.ip,
      port: proxyConfig.port,
      ca: readFileSync(proxyConfig.rootCertPath),
    }),
  });

  return axiosInstance;
};

const getProxiedAxios = (): AxiosInstance => {
  if (axiosInstance) {
    return axiosInstance;
  }

  return axios;
};

export default getProxiedAxios;

import { staticConfig } from "../../config";
import { getCurrentProxyPort } from "../storage/cacheUtils";

interface ProxyConfig {
  ip: string;
  port: number | null;
  rootCertPath: string;
}

const getProxyConfig = (): ProxyConfig | null => {
  return {
    ip: staticConfig.PROXY_HOST,
    port: getCurrentProxyPort(),
    rootCertPath: staticConfig.ROOT_CERT_PATH,
  };
};

export default getProxyConfig;

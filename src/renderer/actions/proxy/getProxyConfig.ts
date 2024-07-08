import { ip } from "address";
import { staticConfig } from "../../config";
import { getCurrentProxyPort } from "../storage/cacheUtils";

interface ProxyConfig {
  ip: string;
  port: number | null;
  rootCertPath: string;
}

const getProxyConfig = (): ProxyConfig | null => {
  const proxyIp = ip()!;

  return {
    ip: proxyIp,
    port: getCurrentProxyPort(),
    rootCertPath: staticConfig.ROOT_CERT_PATH,
  };
};

export default getProxyConfig;

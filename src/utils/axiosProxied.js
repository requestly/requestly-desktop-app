import axios from "axios";
import { readFileSync } from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";

class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  constructor(opts) {
    super(opts);
    this.ca = opts.ca;
  }

  async callback(req, opts) {
    return super.callback(req, Object.assign(opts, { ca: this.ca }));
  }
}

const axiosProxied = axios.create({
  proxy: false,
  httpAgent: new HttpsProxyAgent(`http://127.0.0.1:8281`),
  httpsAgent: new PatchedHttpsProxyAgent({
    host: "127.0.0.1",
    port: 8281,
    ca: readFileSync(
      "/Users/vaibhav/Library/Application Support/Requestly/.tmp/certs/ca.pem"
    ),
  }),
});

export default axiosProxied;

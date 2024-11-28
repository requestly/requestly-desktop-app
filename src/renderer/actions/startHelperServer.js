import { ipcRenderer } from "electron";
import { staticConfig } from "../config";

const http = require("http");

const pemPath = staticConfig.ROOT_CERT_PATH;

function trackHelperServerHit() {
  ipcRenderer.invoke("helper-server-hit");
}

const getShellScript = (port) => `
    export http_proxy="http://127.0.0.1:${port}"
    export HTTP_PROXY="http://127.0.0.1:${port}"
    export https_proxy="http://127.0.0.1:${port}"
    export HTTPS_PROXY="http://127.0.0.1:${port}"
    export GLOBAL_AGENT_HTTP_PROXY="http://127.0.0.1:${port}"
    export CGI_HTTP_PROXY="http://127.0.0.1:${port}"
    export npm_config_proxy="http://127.0.0.1:${port}"
    export npm_config_https_proxy="http://127.0.0.1:${port}"
    export GOPROXY="http://127.0.0.1:${port}"
    export SSL_CERT_FILE="${pemPath}"
    export NODE_EXTRA_CA_CERTS="${pemPath}"
    export REQUESTS_CA_BUNDLE="${pemPath}"
    export PERL_LWP_SSL_CA_FILE="${pemPath}"
    export GIT_SSL_CAINFO="${pemPath}"
    export CARGO_HTTP_CAINFO="${pemPath}"
    export CURL_CA_BUNDLE="${pemPath}"
    if command -v winpty >/dev/null 2>&1; then
        # Work around for winpty's hijacking of certain commands
        alias php=php
        alias node=node
    fi
    if command -v winpty >/dev/null 2>&1; then
        # Work around for winpty's hijacking of certain commands
        alias php=php
        alias node=node
    fi
    echo 'Requestly interception enabled'
`;

const startHelperServer = async (helperServerPort) => {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // create web server
      console.log(window.proxy.httpPort);
      if (req.url === "/tpsetup") {
        const shellScript = getShellScript(window.proxy.httpPort);
        // const shellScript = `export http_proxy="http://127.0.0.1:${window.proxy.httpPort}"`
        trackHelperServerHit();
        res.writeHead(200, { "Content-Type": "text/x-shellscript" });
        res.write(shellScript);
        res.end();
      } else res.end("Invalid Request!");
    });
    server.listen(helperServerPort, () => {
      resolve(true);
    });
  });
};

export default startHelperServer;

import * as _ from "lodash";
// ACTIONS
import {
  FreshChrome,
  ExistingChrome,
  FreshChromeBeta,
  FreshChromeCanary,
  FreshChromeDev,
  FreshChromium,
  FreshChromiumDev,
  FreshEdge,
  FreshEdgeBeta,
  FreshEdgeDev,
  FreshEdgeCanary,
  FreshBrave,
  FreshOpera,
  ExistingChromeBeta,
  ExistingChromeDev,
  ExistingEdge,
  ExistingArc,
  FreshOperaGX,
  FreshOperaCrypto,
} from "./browsers/chromium-based-browsers";
import { addShutdownHandler } from "../shutdown";
import { Electron } from "./electron";
import { FreshFirefox } from "./browsers/fresh-firefox";
import { FreshSafari } from "./browsers/safari";
import { SystemWideProxy } from "./os/system-wide";
import { ipcRenderer } from "electron";
import AndroidAdbDevice from "./mobile/android";

export const buildApps = (config) => {
  const apps = [
    new FreshChrome(config),
    new ExistingChrome(config),
    new FreshChromeBeta(config),
    new ExistingChromeBeta(config),
    new FreshChromeDev(config),
    new ExistingChromeDev(config),
    new FreshChromeCanary(config),
    new FreshChromium(config),
    new FreshChromiumDev(config),
    new FreshEdge(config),
    new ExistingEdge(config),
    new FreshEdgeBeta(config),
    new FreshEdgeDev(config),
    new FreshEdgeCanary(config),
    new FreshOpera(config),
    new FreshOperaGX(config),
    new FreshOperaCrypto(config),
    new ExistingArc(config),
    new FreshBrave(config),
    new FreshFirefox(config),
    new Electron(config),
    new FreshSafari(config),
    new SystemWideProxy(config),
    new AndroidAdbDevice(config),
  ];

  // When the server exits, try to shut down the interceptors too
  addShutdownHandler(() => shutdownApps(apps));

  const appIndex = _.keyBy(apps, (app) => app.id);

  if (Object.keys(appIndex).length !== apps.length) {
    throw new Error("Duplicate app id");
  }

  /*
  * Extra IPC for now
  *
  * TODO in proxy : lib/proxy/lib/proxy.js -> Proxy.prototype.close
  * a cleaner way would be to directly add
  * shutdown/close handler inside the proxy
  * so no IPC call, every proxy restart would trigger
  * all added `closeHandlers`
  */
  ipcRenderer.on("deactivate-traffic-sources", async () => {
    await shutdownApps(apps);
    ipcRenderer.send("reply-deactivate-traffic-sources");
  });

  return appIndex;
};

export const shutdownApps = (apps) => {
  return Promise.all(apps.map((i) => i.deactivateAll()));
};

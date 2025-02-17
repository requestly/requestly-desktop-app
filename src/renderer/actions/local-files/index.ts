import { RPCServiceOverIPC } from "../../lib/RPCServiceOverIPC";

import * as MethodsToExpose from "./actions";

/* only contains template code right now but can be THE place for files code */

export class LocalFileSync extends RPCServiceOverIPC {
  constructor() {
    super("fs"); // namespace for this service
    this.init();
  }

  init() {
    // any initialization logic if needed

    // setup all methods to be exposed over IPC
    Object.values(MethodsToExpose).forEach((method) => {
      this.exposeMethodOverIPC(method.name, method);
    });

    // setup OS event listener however
    // setInterval(() => {
    //   /* GARGBAGE POC CODE FOR NOW */
    //   const randomMessage = Math.floor(Math.random() * 100);
    //   console.log(`${Date.now()} - Sending event to webapp: `, randomMessage);

    //   // relay those events over to webapp
    //   this.sendServiceEvent({
    //     type: "test",
    //     data: { test: "data - non-changing", message: randomMessage },
    //   });
    // }, 7500);
  }
}

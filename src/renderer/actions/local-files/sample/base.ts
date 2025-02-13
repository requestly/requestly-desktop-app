import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";

export class TestClass {
  constructor(
    readonly base: number,
    // readonly emitter: (event: any)=> void
    readonly emitter: typeof RPCServiceOverIPC.prototype.sendServiceEvent
  ) {
    this.base = base;
    console.log("DBG: Event emitter set");
    setInterval(() => {
      emitter(`${this.base}: time${Date.now()}`);
    }, 3000);
  }

  async add(x: number) {
    console.log("DBG: add called with x having type", x);
    return this.base + x;
  }

  async multiply(x: number) {
    return this.base * x;
  }
}

import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { TestClass } from "./base";

export class TestService extends RPCServiceOverIPC {
  instance?: TestClass;

  constructor() {
    super("test"); // namespace for this service
    // const instance = new TestClass(base);
    // this.instance = instance;
    this.init();
  }

  init() {
    console.log("DBG: exposed build method");
    this.exposeMethodOverIPC("build", this.build.bind(this));
  }

  async build(base: number) {
    console.log("DBG: build called");
    this.instance = new TestClass(base, this.sendServiceEvent.bind(this));
    this.exposeMethodOverIPC("add", this.instance.add.bind(this.instance));
    this.exposeMethodOverIPC(
      "multiply",
      this.instance.multiply.bind(this.instance)
    );
  }
}

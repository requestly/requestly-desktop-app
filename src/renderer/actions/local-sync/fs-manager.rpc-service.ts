import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { FsManager } from "./fs-manager";
import { createWorkspaceFolder } from "./fs-utils";

export class FsManagerRPCService extends RPCServiceOverIPC {
  static NAMESPACE = "local_sync";

  // instance?: FsManager;

  constructor() {
    super(FsManagerRPCService.NAMESPACE);
    this.init();
  }

  init() {
    this.exposeMethodOverIPC("createWorkspaceFolder", createWorkspaceFolder);
    this.exposeMethodOverIPC("build", this.build.bind(this));
  }

  async build(rootPath: string) {
    const instance = new FsManager(rootPath);
    this.exposeMethodOverIPC(
      "getAllRecords",
      instance.getAllRecords.bind(instance)
    );
  }
}

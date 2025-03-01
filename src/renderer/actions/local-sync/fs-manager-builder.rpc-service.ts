import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { createWorkspaceFolder, getAllWorkspaces } from "./fs-utils";
import { FsManagerRPCService } from "./fs-manager.rpc-service";

export class FsManagerBuilderRPCService extends RPCServiceOverIPC {
  static NAMESPACE = "local_sync_builder";

  private exposedWorkspacePaths = new Set<string>();

  constructor() {
    super(FsManagerBuilderRPCService.NAMESPACE);
    this.init();
  }

  init() {
    this.exposeMethodOverIPC("createWorkspaceFolder", createWorkspaceFolder);
    this.exposeMethodOverIPC("getAllWorkspaces", getAllWorkspaces);
    this.exposeMethodOverIPC("build", this.build.bind(this));
  }

  async build(rootPath: string) {
    if (this.exposedWorkspacePaths.has(rootPath)) {
      console.log("not building again");
      return;
    }
    new FsManagerRPCService(rootPath).init();
    this.exposedWorkspacePaths.add(rootPath);
  }
}

import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { createWorkspaceFolder, getAllWorkspaces } from "./fs-utils";
import { FsManagerRPCService } from "./fs-manager.rpc-service";

export class FsManagerBuilderRPCService extends RPCServiceOverIPC {
  static NAMESPACE = "local_sync_builder";

  private exposedWorkspacePaths = new Map<string, FsManagerRPCService>();

  constructor() {
    super(FsManagerBuilderRPCService.NAMESPACE);
    this.init();
  }

  init() {
    this.exposeMethodOverIPC("createWorkspaceFolder", createWorkspaceFolder);
    this.exposeMethodOverIPC("getAllWorkspaces", getAllWorkspaces);
    this.exposeMethodOverIPC("build", this.build.bind(this));
    this.exposeMethodOverIPC("reload", this.reload.bind(this));
  }

  async build(rootPath: string) {
    if (this.exposedWorkspacePaths.has(rootPath)) {
      console.log("not building again");
      return;
    }
    // We are essentially using the exposedWorkspacePaths as a lock.
    // If two parallel executions occur, one of them would set an empty object,
    // and hence the other one won't be able to proceed.
    // It's a simple hack for now, TODO: productionize this
    this.exposedWorkspacePaths.set(rootPath, {} as any);
    const manager = new FsManagerRPCService(rootPath);
    await manager.init();
    this.exposedWorkspacePaths.set(rootPath, manager);
  }

  async reload(rootPath: string) {
    const manager = this.exposedWorkspacePaths.get(rootPath);
    if (!manager) {
      throw new Error(`FsManager not found for root path: ${rootPath}`);
    }
    manager.reload();
  }
}

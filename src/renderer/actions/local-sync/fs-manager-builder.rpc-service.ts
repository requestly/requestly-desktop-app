import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import {
  createWorkspaceFolder,
  getAllWorkspaces,
  removeWorkspace,
  createDefaultWorkspace,
  openExistingLocalWorkspace,
  checkIsWorkspacePathAvailable,
} from "./fs-utils";
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
    this.exposeMethodOverIPC("createDefaultWorkspace", createDefaultWorkspace);
    this.exposeMethodOverIPC(
      "openExistingLocalWorkspace",
      openExistingLocalWorkspace
    );
    this.exposeMethodOverIPC("checkIsWorkspacePathAvailable", checkIsWorkspacePathAvailable);
    this.exposeMethodOverIPC("getAllWorkspaces", getAllWorkspaces);
    this.exposeMethodOverIPC("removeWorkspace", removeWorkspace);
    this.exposeMethodOverIPC("build", this.build.bind(this));
    this.exposeMethodOverIPC("reload", this.reload.bind(this));
  }

  async build(rootPath: string) {
    if (this.exposedWorkspacePaths.has(rootPath)) {
      console.log("not building again");
      return;
    }
    const manager = new FsManagerRPCService(
      rootPath,
      this.exposedWorkspacePaths
    );
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

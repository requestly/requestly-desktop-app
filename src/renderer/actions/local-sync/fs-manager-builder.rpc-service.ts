import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { FsManagerRPCService } from "./fs-manager.rpc-service";
import { CoreManager } from "./core-manager";

export class FsManagerBuilderRPCService extends RPCServiceOverIPC {
  static NAMESPACE = "local_sync_builder";

  private exposedWorkspacePaths = new Map<string, FsManagerRPCService>();

  constructor() {
    super(FsManagerBuilderRPCService.NAMESPACE);
    this.init();
  }

  init() {
    this.exposeMethodOverIPC("createWorkspaceFolder", CoreManager.createWorkspaceFolder);
    this.exposeMethodOverIPC("getAllWorkspaces", CoreManager.getAllWorkspaces);
    this.exposeMethodOverIPC("build", this.build.bind(this));
    this.exposeMethodOverIPC("reload", this.reload.bind(this));
  }

  async build(rootPath: string) {
    if (this.exposedWorkspacePaths.has(rootPath)) {
      const manager = this.exposedWorkspacePaths.get(rootPath)!;
      await manager.healIfBroken();
      return;
    }
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

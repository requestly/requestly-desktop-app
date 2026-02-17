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
    // [PERF] Desktop: build() started
    const buildStartTime = Date.now();
    console.log(`[PERF] [Desktop] FsManagerBuilder.build() started at ${new Date(buildStartTime).toLocaleTimeString()}`);
    console.log(`[PERF] [Desktop] rootPath: ${rootPath}`);
    
    if (this.exposedWorkspacePaths.has(rootPath)) {
      console.log("[PERF] [Desktop] Workspace already exposed, skipping rebuild");
      return;
    }
    
    try {
      const manager = new FsManagerRPCService(
        rootPath,
        this.exposedWorkspacePaths
      );
      
      console.log("[PERF] [Desktop] Calling manager.init()...");
      const initStartTime = Date.now();
      
      await manager.init();
      
      const initEndTime = Date.now();
      const initDuration = initEndTime - initStartTime;
      console.log(`[PERF] [Desktop] manager.init() completed in ${initDuration}ms at ${new Date(initEndTime).toLocaleTimeString()}`);
      
      this.exposedWorkspacePaths.set(rootPath, manager);
      
      const buildEndTime = Date.now();
      const buildDuration = buildEndTime - buildStartTime;
      console.log(`[PERF] [Desktop] FsManagerBuilder.build() completed in ${buildDuration}ms`);
      
      if (buildDuration > 10000) {
        console.warn(`[PERF] [Desktop] ⚠️ WARNING: build() took ${buildDuration}ms (>10s). Workspace may be large.`);
      }
      if (buildDuration > 30000) {
        console.error(`[PERF] [Desktop] ❌ ERROR: build() took ${buildDuration}ms (>30s). MUTEX TIMEOUT LIKELY!`);
      }
    } catch (error) {
      const buildEndTime = Date.now();
      const buildDuration = buildEndTime - buildStartTime;
      console.error(`[PERF] [Desktop] ❌ ERROR: build() failed after ${buildDuration}ms:`, error);
      throw error;
    }
  }

  async reload(rootPath: string) {
    const manager = this.exposedWorkspacePaths.get(rootPath);
    if (!manager) {
      throw new Error(`FsManager not found for root path: ${rootPath}`);
    }
    manager.reload();
  }
}

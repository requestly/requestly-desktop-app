import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { FsManager } from "./fs-manager";

async function waitForInit() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(""), 800);
  });
}

export class FsManagerRPCService extends RPCServiceOverIPC {
  private fsManager: FsManager;

  constructor(
    readonly rootPath: string,
    readonly exposedWorkspacePaths: Map<string, unknown>
  ) {
    super(`local_sync: ${rootPath}`);
    this.fsManager = new FsManager(rootPath, this.exposedWorkspacePaths);
  }

  reload() {
    this.fsManager.reload();
  }

  async init(): Promise<void> {
    // [PERF] Start timing for fsManager.init()
    const fsMgrInitStart = Date.now();
    console.log(`[PERF] [Desktop] FsManagerRPCService.init() starting for: ${this.rootPath}`);
    
    try {
      console.log("[PERF] [Desktop] Calling fsManager.init()...");
      await this.fsManager.init();
      
      const fsMgrInitEnd = Date.now();
      const fsMgrInitDuration = fsMgrInitEnd - fsMgrInitStart;
      console.log(`[PERF] [Desktop] fsManager.init() completed in ${fsMgrInitDuration}ms`);
    } catch (error) {
      const fsMgrInitEnd = Date.now();
      const fsMgrInitDuration = fsMgrInitEnd - fsMgrInitStart;
      console.error(`[PERF] [Desktop] fsManager.init() failed after ${fsMgrInitDuration}ms:`, error);
      // console.log("FsManagerRPCService init", error);
      throw new Error(
        `Failed to initialize FsManager for ${this.rootPath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // [PERF] Start timing for method exposures
    const exposeStart = Date.now();
    console.log("[PERF] [Desktop] Exposing RPC methods...");
    
    this.exposeMethodOverIPC(
      "getAllRecords",
      this.fsManager.getAllRecords.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "getRecord",
      this.fsManager.getRecord.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "createRecord",
      this.fsManager.createRecord.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "createRecordWithId",
      this.fsManager.createRecordWithId.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "updateRecord",
      this.fsManager.updateRecord.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "deleteRecord",
      this.fsManager.deleteRecord.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "deleteRecords",
      this.fsManager.deleteRecords.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "moveRecord",
      this.fsManager.moveRecord.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "moveRecords",
      this.fsManager.moveRecords.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "getCollection",
      this.fsManager.getCollection.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "createCollection",
      this.fsManager.createCollection.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "createCollectionWithId",
      this.fsManager.createCollectionWithId.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "deleteCollection",
      this.fsManager.deleteCollection.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "deleteCollections",
      this.fsManager.deleteCollections.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "renameCollection",
      this.fsManager.renameCollection.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "moveCollection",
      this.fsManager.moveCollection.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "moveCollections",
      this.fsManager.moveCollections.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "setCollectionVariables",
      this.fsManager.setCollectionVariables.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "getAllEnvironments",
      this.fsManager.getAllEnvironments.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "createEnvironment",
      this.fsManager.createEnvironment.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "updateEnvironment",
      this.fsManager.updateEnvironment.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "duplicateEnvironment",
      this.fsManager.duplicateEnvironment.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "updateCollectionDescription",
      this.fsManager.updateCollectionDescription.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "updateCollectionAuthData",
      this.fsManager.updateCollectionAuthData.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "writeRawRecord",
      this.fsManager.writeRawRecord.bind(this.fsManager)
    );
    this.exposeMethodOverIPC(
      "getRawFileData",
      this.fsManager.getRawFileData.bind(this.fsManager)
    );

    this.exposeMethodOverIPC(
      "createCollectionFromCompleteRecord",
      this.fsManager.createCollectionFromCompleteRecord.bind(this.fsManager)
    );

    const exposeEnd = Date.now();
    const exposeDuration = exposeEnd - exposeStart;
    console.log(`[PERF] [Desktop] RPC methods exposed in ${exposeDuration}ms`);

    // hack - arbitrary wait
    console.log("[PERF] [Desktop] Calling waitForInit() (800ms wait)...");
    const waitStart = Date.now();
    await waitForInit();
    const waitEnd = Date.now();
    console.log(`[PERF] [Desktop] waitForInit() completed in ${waitEnd - waitStart}ms`);
    
    // [PERF] Total time
    const totalEnd = Date.now();
    const totalDuration = totalEnd - fsMgrInitStart;
    console.log(`[PERF] [Desktop] FsManagerRPCService.init() TOTAL completed in ${totalDuration}ms`);
    
    if (totalDuration > 10000) {
      console.warn(`[PERF] [Desktop] ⚠️ WARNING: FsManagerRPCService.init() took ${totalDuration}ms (>10s)`);
    }
    if (totalDuration > 30000) {
      console.error(`[PERF] [Desktop] ❌ ERROR: FsManagerRPCService.init() took ${totalDuration}ms (>30s). MUTEX TIMEOUT LIKELY!`);
    }
  }
}

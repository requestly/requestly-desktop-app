import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { FsManager } from "./fs-manager";

export class FsManagerRPCService extends RPCServiceOverIPC {
  private fsManager: FsManager;

  constructor(readonly rootPath: string) {
    super(`local_sync: ${rootPath}`);
    this.fsManager = new FsManager(rootPath);
    this.init();
  }

  init() {
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
      "copyCollection",
      this.fsManager.copyCollection.bind(this.fsManager)
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
  }
}

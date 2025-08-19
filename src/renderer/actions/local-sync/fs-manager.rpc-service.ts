import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { FsManager } from "./fs-manager";

export class FsManagerRPCService extends RPCServiceOverIPC {
  private fsManager: FsManager;

  constructor(readonly rootPath: string) {
    super(`local_sync: ${rootPath}`);
    this.fsManager = new FsManager(rootPath);
  }

  reload() {
    this.fsManager.reload();
  }

  async healIfBroken() {
    const result = await this.fsManager.healIfBroken();
    if (result?.error) {
      throw new Error(result.error.message);
    }
  }

  async init() {
    await this.healIfBroken();
    this.exposeMethodOverIPC(
      "getAllRecords",
      this.fsManager.apiFsManager.getAllRecords.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "getRecord",
      this.fsManager.apiFsManager.getRecord.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "createRecord",
      this.fsManager.apiFsManager.createRecord.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "createRecordWithId",
      this.fsManager.apiFsManager.createRecordWithId.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "updateRecord",
      this.fsManager.apiFsManager.updateRecord.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "deleteRecord",
      this.fsManager.apiFsManager.deleteRecord.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "deleteRecords",
      this.fsManager.apiFsManager.deleteRecords.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "moveRecord",
      this.fsManager.apiFsManager.moveRecord.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "moveRecords",
      this.fsManager.apiFsManager.moveRecords.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "getCollection",
      this.fsManager.apiFsManager.getCollection.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "createCollection",
      this.fsManager.apiFsManager.createCollection.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "createCollectionWithId",
      this.fsManager.apiFsManager.createCollectionWithId.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "deleteCollection",
      this.fsManager.apiFsManager.deleteCollection.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "deleteCollections",
      this.fsManager.apiFsManager.deleteCollections.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "renameCollection",
      this.fsManager.apiFsManager.renameCollection.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "moveCollection",
      this.fsManager.apiFsManager.moveCollection.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "moveCollections",
      this.fsManager.apiFsManager.moveCollections.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "copyCollection",
      this.fsManager.apiFsManager.copyCollection.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "setCollectionVariables",
      this.fsManager.apiFsManager.setCollectionVariables.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "getAllEnvironments",
      this.fsManager.apiFsManager.getAllEnvironments.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "createEnvironment",
      this.fsManager.apiFsManager.createEnvironment.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "updateEnvironment",
      this.fsManager.apiFsManager.updateEnvironment.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "duplicateEnvironment",
      this.fsManager.apiFsManager.duplicateEnvironment.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "updateCollectionDescription",
      this.fsManager.apiFsManager.updateCollectionDescription.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "updateCollectionAuthData",
      this.fsManager.apiFsManager.updateCollectionAuthData.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "writeRawRecord",
      this.fsManager.apiFsManager.writeRawRecord.bind(this.fsManager.apiFsManager)
    );
    this.exposeMethodOverIPC(
      "getRawFileData",
      this.fsManager.apiFsManager.getRawFileData.bind(this.fsManager.apiFsManager)
    );

    this.exposeMethodOverIPC(
      "createCollectionFromCompleteRecord",
      this.fsManager.apiFsManager.createCollectionFromCompleteRecord.bind(this.fsManager.apiFsManager)
    );
  }
}

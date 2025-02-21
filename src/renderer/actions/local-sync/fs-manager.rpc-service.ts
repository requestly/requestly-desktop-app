import { RPCServiceOverIPC } from "renderer/lib/RPCServiceOverIPC";
import { FsManager } from "./fs-manager";
import { createWorkspaceFolder, getAllWorkspaces } from "./fs-utils";

export class FsManagerRPCService extends RPCServiceOverIPC {
  static NAMESPACE = "local_sync";

  isBuilt = false;

  constructor() {
    super(FsManagerRPCService.NAMESPACE);
    this.init();
  }

  init() {
    console.log("main init");
    this.exposeMethodOverIPC("createWorkspaceFolder", createWorkspaceFolder);
    this.exposeMethodOverIPC("getAllWorkspaces", getAllWorkspaces);
    this.exposeMethodOverIPC("build", this.build.bind(this));
  }

  async build(rootPath: string) {
    if (this.isBuilt) {
      console.log("not building again");
      return;
    }
    this.isBuilt = true;
    console.log("build received");
    const instance = new FsManager(rootPath);
    this.exposeMethodOverIPC(
      "getAllRecords",
      instance.getAllRecords.bind(instance)
    );
    this.exposeMethodOverIPC("getRecord", instance.getRecord.bind(instance));
    this.exposeMethodOverIPC(
      "createRecord",
      instance.createRecord.bind(instance)
    );
    this.exposeMethodOverIPC(
      "createRecordWithId",
      instance.createRecordWithId.bind(instance)
    );
    this.exposeMethodOverIPC(
      "updateRecord",
      instance.updateRecord.bind(instance)
    );
    this.exposeMethodOverIPC(
      "deleteRecord",
      instance.deleteRecord.bind(instance)
    );
    this.exposeMethodOverIPC(
      "deleteRecords",
      instance.deleteRecords.bind(instance)
    );

    this.exposeMethodOverIPC(
      "getCollection",
      instance.getCollection.bind(instance)
    );
    this.exposeMethodOverIPC(
      "createCollection",
      instance.createCollection.bind(instance)
    );
    this.exposeMethodOverIPC(
      "createCollectionWithId",
      instance.createCollectionWithId.bind(instance)
    );
    this.exposeMethodOverIPC(
      "deleteCollection",
      instance.deleteCollection.bind(instance)
    );
    this.exposeMethodOverIPC(
      "deleteCollections",
      instance.deleteCollections.bind(instance)
    );
    this.exposeMethodOverIPC(
      "renameCollection",
      instance.renameCollection.bind(instance)
    );
    this.exposeMethodOverIPC(
      "moveCollection",
      instance.moveCollection.bind(instance)
    );
    this.exposeMethodOverIPC(
      "copyCollection",
      instance.copyCollection.bind(instance)
    );

    this.exposeMethodOverIPC(
      "getAllEnvironments",
      instance.getAllEnvironments.bind(instance)
    );

    this.exposeMethodOverIPC(
      "createEnvironment",
      instance.createEnvironment.bind(instance)
    );

    this.exposeMethodOverIPC(
      "updateEnvironment",
      instance.updateEnvironment.bind(instance)
    );

    this.exposeMethodOverIPC(
      "duplicateEnvironment",
      instance.duplicateEnvironment.bind(instance)
    );

    console.log("exposed everything");
  }
}

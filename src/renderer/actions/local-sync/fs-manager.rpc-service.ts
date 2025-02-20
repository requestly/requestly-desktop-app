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
      "getAllEnvironments",
      instance.getAllEnvironments.bind(instance)
    );

    // this.exposeMethodOverIPC(
    //   "createNonGlobalEnvironment",
    //   instance.createNonGlobalEnvironment.bind(instance)
    // );

    // this.exposeMethodOverIPC(
    //   "createGlobalEnvironment",
    //   instance.createGlobalEnvironment.bind(instance)
    // );

    this.exposeMethodOverIPC(
      "createEnvironment",
      instance.createEnvironment.bind(instance)
    );
  }
}

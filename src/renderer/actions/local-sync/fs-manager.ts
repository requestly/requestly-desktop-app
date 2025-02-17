import { TObject, type Static } from "@sinclair/typebox";

import fs from "node:fs";
import fsp from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { ApiRecord, Config } from "./schemas";
import {
  appendPath,
  createFsResource,
  getNormalizedPath,
  parseContent,
} from "./common-utils";
import { FsResource, FileSystemResult, APIEntity } from "./types";
import { writeContent } from "./fs-utils";

const CONFIG_FILE = "requestly.json";

export class FsManager {
  static CONFIG_FILE = "requestly.json";

  static COLLECTION_VARIABLES_FILE = "vars.json";

  static ENVIRONMENT_VARIABLES_FILE = "env.json";

  private rootPath: string;

  private config: Static<typeof Config>;

  constructor(rootPath: string) {
    this.rootPath = getNormalizedPath(rootPath);
    this.config = this.parseConfig();
  }

  private parseConfig() {
    const configFile = this.createResource({
      id: this.getIdFromPath(appendPath(this.rootPath, CONFIG_FILE)),
      type: "file",
    });
    const rawConfig = fs.readFileSync(configFile.path).toString();
    const parsedConfig = parseContent(rawConfig, Config);
    if (parsedConfig.type === "error") {
      throw new Error(
        `Could not load config from ${CONFIG_FILE}. ${parsedConfig.error.message}`
      );
    }
    const { content: config } = parsedConfig;
    console.log(config);
    if (config.version !== "0.0.1") {
      throw new Error(`Unsupported version in ${CONFIG_FILE}!`);
    }
    return config;
  }

  private createResource<T extends FsResource["type"]>(params: {
    id: string;
    type: T;
  }) {
    return createFsResource({
      path: params.id,
      rootPath: this.rootPath,
      type: params.type,
    });
  }

  // eslint-disable-next-line
  private getIdFromPath(path: string) {
    return path;
  }

  private mapSuccessWrite<
    T extends FileSystemResult<{ resource: FsResource }>,
    R extends FileSystemResult<any>
  >(writeResult: T, fn: (id: string) => R) {
    if (writeResult.type === "success") {
      const { resource } = writeResult.content;
      const id = this.getIdFromPath(resource.path);
      return fn(id);
    }

    // If writeResult is not success, then we simply need to bubble up the error.
    // To do that along with keeping the return type consistent, we manually cast here.
    // This cast is safe since it's error response we are dealing with.
    return writeResult as unknown as R & { type: "error" };
  }

  private parseFolder(path: string, container: FsResource[]) {
    const children = fs.readdirSync(path);
    // eslint-disable-next-line
    for (const child of children) {
      const resourcePath = appendPath(path, child);
      const resourceMetadata = fs.statSync(resourcePath);

      if (resourceMetadata.isDirectory()) {
        container.push(
          this.createResource({
            id: this.getIdFromPath(resourcePath),
            type: "folder",
          })
        );
        this.parseFolder(resourcePath, container);
      } else {
        container.push(
          this.createResource({
            id: this.getIdFromPath(resourcePath),
            type: "file",
          })
        );
      }
    }
  }

  private async parseFile<T extends TObject>(
    id: string,
    validator: T
  ): Promise<FileSystemResult<Static<T>>> {
    const resource = this.createResource({
      id,
      type: "file",
    });
    try {
      const content = (await fsp.readFile(resource.path)).toString();
      const parsedContentResult = parseContent(content, validator);
      if (parsedContentResult.type === "error") {
        return {
          type: "error",
          error: {
            message: parsedContentResult.error.message,
          },
        };
      }

      return parsedContentResult;
    } catch (e: any) {
      return {
        type: "error",
        error: {
          message: e.message || "An unexpected error has occured!",
        },
      };
    }
  }

  // eslint-disable-next-line
  private generateFileName() {
    return `${uuidv4()}.json`;
  }

  getRecord(id: string) {
    return this.parseFile(id, ApiRecord);
  }

  getAllRecords(): APIEntity[] {
    return [];
  }

  async createRecord(
    collectionId: string,
    content: Static<typeof ApiRecord>
  ): Promise<FileSystemResult<{ id: string }>> {
    try {
      const folderResource = this.createResource({
        id: collectionId,
        type: "folder",
      });
      const path = appendPath(folderResource.path, this.generateFileName());
      const resource = createFsResource({
        rootPath: this.rootPath,
        path,
        type: "file",
      });
      return writeContent(resource, content).then((result) =>
        this.mapSuccessWrite(result, (id) => {
          return {
            type: "success",
            content: {
              id,
            },
          };
        })
      );
    } catch (e: any) {
      return {
        type: "error",
        error: {
          message: e.message || "An unexpected error has occured!",
        },
      };
    }
  }

  async updateRecord(
    id: string,
    patch: Partial<Static<typeof ApiRecord>>
  ): Promise<FileSystemResult<void>> {
    try {
      const fileResource = this.createResource({
        id,
        type: "file",
      });
      const parsedRecordResult = await this.parseFile(
        fileResource.path,
        ApiRecord
      );

      if (parsedRecordResult.type === "error") {
        return parsedRecordResult;
      }
      const { content: currentRecord } = parsedRecordResult;
      const updatedRecord: Static<typeof ApiRecord> = {
        ...currentRecord,
        ...patch,
      };
      return writeContent(fileResource, updatedRecord);
    } catch (e: any) {
      return {
        type: "error",
        error: {
          message: e.message || "An unexpected error has occured!",
        },
      };
    }
  }
}

// async function main() {
//   const fileStore = new FileStore("/Users/rahulramteke/adhoc/ftest");
//   // console.log(
//   // 	"aa",
//   // 	await fileStore.getRecord("/Users/rahulramteke/adhoc/ftest/f1/r2.json"),
//   // );

//   const createResult = await fileStore.createRecord(
//     "/Users/rahulramteke/adhoc/ftest/f1",
//     {
//       name: "nana",
//       url: "ass",
//       method: ApiMethods.GET,
//     }
//   );

//   if (createResult.type !== "success") {
//     console.error(createResult.error);
//     return;
//   }

//   const updateResult = await fileStore.updateRecord(createResult.content.id, {
//     name: "nana23",
//   });

//   console.log("update result:", updateResult);

//   // const deleteResult = await fileStore.deleteFolder({
//   // 	path: "/Users/rahulramteke/adhoc/ftest/f4",
//   // 	type: "folder",
//   // });

//   // console.log("delete result:", deleteResult);
// }

// main().catch((e) => console.error("main", e));

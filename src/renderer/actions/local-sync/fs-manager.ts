import { TObject, type Static } from "@sinclair/typebox";

import fs from "node:fs";
import fsp from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { ApiRecord, Config } from "./schemas";
import {
  appendPath,
  createFsResource,
  getIdFromPath,
  getNormalizedPath,
  mapSuccessfulFsResult,
  mapSuccessWrite,
  parseContent,
} from "./common-utils";
import { FsResource, FileSystemResult, APIEntity, Collection, API } from "./types";
import { parseFile, parseFileToApi, parseFolderToCollection, writeContent } from "./fs-utils";
import { CONFIG_FILE, ENVIRONMENT_VARIABLES_FILE } from "./constants";

export class FsManager {
  private rootPath: string;

  private config: Static<typeof Config>;

  constructor(rootPath: string) {
    this.rootPath = getNormalizedPath(rootPath);
    this.config = this.parseConfig();
  }

  private parseConfig() {
    const configFile = this.createResource({
      id: getIdFromPath(appendPath(this.rootPath, CONFIG_FILE)),
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

  private async parseFolder(path: string, container: FsResource[]) {
    const children = await fsp.readdir(path);
    // eslint-disable-next-line
    for (const child of children) {
      const resourcePath = appendPath(path, child);
      const resourceMetadata = await fsp.stat(resourcePath);

      if (resourceMetadata.isDirectory()) {
        container.push(
          this.createResource({
            id: getIdFromPath(resourcePath),
            type: "folder",
          })
        );
        this.parseFolder(resourcePath, container);
      } else {
        container.push(
          this.createResource({
            id: getIdFromPath(resourcePath),
            type: "file",
          })
        );
      }
    }
  }

  // eslint-disable-next-line
  private generateFileName() {
    return `${uuidv4()}.json`;
  }

  getRecord(id: string) {
    return parseFile({
      resource: this.createResource({
        id,
        type: "file",
      }),
      validator: ApiRecord,
    });
  }

  async getAllRecords(): Promise<APIEntity[]> {
    const resourceContainer: FsResource[] = [];
    await this.parseFolder(this.rootPath, resourceContainer);

    const entities: APIEntity[] = [];
    // eslint-disable-next-line
    for (const resource of resourceContainer) {
      const entityParsingResult: FileSystemResult<APIEntity> | undefined =
        await (async () => {
          if (resource.type === "folder") {
            return parseFolderToCollection(this.rootPath, resource).then(
              (result) =>
                mapSuccessfulFsResult(
                  result,
                  (successfulResult) => successfulResult.content.collection
                )
            );
          }
          const envFile = appendPath(this.rootPath, ENVIRONMENT_VARIABLES_FILE);
          if (resource.path === envFile) {
            // eslint-disable-next-line consistent-return
            return;
          }
          return parseFileToApi(this.rootPath, resource).then((result) =>
            mapSuccessfulFsResult(
              result,
              (successfulResult) => successfulResult.content.api
            )
          );
        })();

      if (entityParsingResult?.type === "success") {
        entities.push(entityParsingResult.content);
      }
    }

    return entities;
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
        mapSuccessWrite(result, (id) => {
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
      const parsedRecordResult = await parseFile({
        resource: fileResource,
        validator: ApiRecord,
      });

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

import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { app } from "electron";

const NETWORK_SESSIONS_FOLDER_NAME = "network-sessions";

function getSessionStorageFolderPath() {
  const folderPath = path.join(
    app.getPath("appData"),
    NETWORK_SESSIONS_FOLDER_NAME
  );

  if (!fs.existsSync(folderPath)) {
    fs.mkdir(folderPath);
  }
  return folderPath;
}

export async function getAllNetworkSessions() {
  let finalFilesList = [];
  const folderPath = getSessionStorageFolderPath();

  const sessionsFileRegexPattern = /(.+)_(.+)_(\d+).har/;

  const files = await fs.promises.readdir(folderPath);
  finalFilesList = files
    .filter((file) => {
      return sessionsFileRegexPattern.test(file);
    })
    .map((file) => {
      const [fileName, id, name, createdTs] = file.match(
        sessionsFileRegexPattern
      );
      return { id, name, ts: parseInt(createdTs, 10), fileName };
    });
  return finalFilesList;
}

async function getSessionPath(id, name, ts) {
  const sessionsPath = getSessionStorageFolderPath();
  if (!name) {
    const matchingFiles = (await getAllNetworkSessions()).filter(
      ({ fileName }) => {
        return fileName?.startsWith(id);
      }
    );

    if (matchingFiles.length) {
      return path.join(sessionsPath, matchingFiles[0].fileName);
    }

    return null;
  }

  if (ts) {
    return path.join(sessionsPath, `${id}_${name}_${ts}.har`);
  }

  return path.join(path.format(sessionsPath), `${id}_${name}.har`);
}

export function getMetadataFromPath(pathString) {
  const parsedFilePath = path.parse(pathString);
  const [id, name, createdTs] = parsedFilePath.name.split("_");
  return { id, name, createdTs, fileName: parsedFilePath.base };
}

export async function storeSessionRecording(har, name) {
  const id = randomUUID();
  const createdTs = Date.now();
  const sessionPath = await getSessionPath(id, name, createdTs);
  fs.writeFileSync(sessionPath, JSON.stringify(har), console.log);
  return id;
}

export async function deleteNetworkRecording(id) {
  const sessionPath = await getSessionPath(id);
  fs.unlink(sessionPath, console.log);
}

async function readSessionFile(sessionPath, id, metadata) {
  try {
    const data = await fs.promises.readFile(sessionPath, "utf8");
    return { ...metadata, har: JSON.parse(data) };
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`session for ${id} does not exist`);
    } else {
      console.error(err);
    }
    return null;
  }
}

export async function getSessionRecording(id) {
  const sessionPath = await getSessionPath(id);
  if (sessionPath) {
    const metadata = getMetadataFromPath(sessionPath);
    const result = await readSessionFile(sessionPath, id, metadata);
    return result;
  }
  return null;
}

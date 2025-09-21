import { v4 } from "uuid";

class FileIndex {
  private pathToId = new Map<string, string>();
  private idToPath = new Map<string, string>();

  private addPath(path: string) {
    const id = v4();
    this.pathToId.set(path, id);
    this.idToPath.set(id, path);

    return id;

  }

  addIdPath(id: string, path: string, skipExistenceChecks = false) {
    if (!skipExistenceChecks) {
      if (this.hasId(id)) {
        throw new Error('Id already exists!');
      }
      if (this.hasPath(path)) {
        throw new Error('Path already exists!');
      }
    }
    this.pathToId.set(path, id);
    this.idToPath.set(id, path);
  }

  // Get ID for a path, create if doesn't exist
  getId(path: string): string {
    let id = this.pathToId.get(path);
    if (!id) {
      id = this.addPath(path);
    }
    return id;
  }

  // Get path for an ID
  getPath(id: string): string | undefined {
    return this.idToPath.get(id);
  }

  // Check if path exists
  hasPath(filePath: string): boolean {
    return this.pathToId.has(filePath);
  }

  // Check if ID exists
  hasId(id: string): boolean {
    return this.idToPath.has(id);
  }

  // Remove mapping
  remove(params: { type: 'path', path: string } | { type: 'id', id: string }): boolean {
    const id = params.type === 'id' ? params.id : this.pathToId.get(params.path);
    const path = params.type === 'path' ? params.path : this.idToPath.get(params.id);

    if (!path && !id) {
      return false;
    }
    if (id) {
      this.idToPath.delete(id);
    }
    if (path) {
      this.pathToId.delete(path);
    }
    return true;
  }

  movePath(oldPath: string, newPath: string): boolean {
    const existingId = this.getId(oldPath);
    if (!existingId) {
      return false;
    }

    this.idToPath.set(existingId, newPath);
    this.pathToId.delete(oldPath);
    this.pathToId.set(newPath, existingId);

    return true;
  }
}

export const fileIndex = new FileIndex();

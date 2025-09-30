import { v4 } from "uuid";
import pathUtils from 'path';

class FileIndex {
  private pathToId = new Map<string, string>();
  private idToPath = new Map<string, string>();

  private addPath(path: string) {
    const id = v4();
    this.pathToId.set(path, id);
    this.idToPath.set(id, path);

    return id;

  }

  private isFolder(path: string) {
    return path[path.length - 1] === '/';
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
      if(this.isFolder(path)) {
        Array.from(this.pathToId).forEach(([childPath, childId]) => {
          if(childPath.startsWith(path)) {
            this.pathToId.delete(childPath);
            this.idToPath.delete(childId);
          }
        });
      }
      
    }
    return true;
  }

  movePath(oldPath: string, newPath: string): boolean {
    const existingId = this.pathToId.get(oldPath);
    if (!existingId) {
      return false;
    }

    this.idToPath.set(existingId, newPath);
    this.pathToId.delete(oldPath);
    this.pathToId.set(newPath, existingId);

    if(this.isFolder(oldPath)) {
      Array.from(this.pathToId).forEach(([childPath, childId]) => {
        if(!childPath.startsWith(oldPath)) {
          return;
        }

        const newChildPath = childPath.replace(oldPath, newPath);

        this.idToPath.set(childId, newChildPath);
        this.pathToId.delete(childPath);
        this.pathToId.set(newChildPath, childId);
      });
    }

    return true;
  }

  getImmediateChildren(path: string): Set<string> {
    if(!path.endsWith('/')) {
      return new Set();
    }

    const allChildren = Array.from(this.pathToId.keys().filter(p => p.startsWith(path)));
    const immediateChildren = new Set(allChildren.map(p => {
      const grandChild = p.split(path)[1];
      if(!grandChild) {
        return;
      }
      
      let index = grandChild.indexOf('/');

      // Grand child is actually a file and hence an immediate child
      if(index === -1) {
        return pathUtils.parse(grandChild).name;
      }
      const child = grandChild.slice(0, index);
      return child;
    }).filter(Boolean) as string[]);
    
    return immediateChildren;
  }
}

export const fileIndex = new FileIndex();

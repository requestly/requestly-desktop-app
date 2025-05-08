export class FsUnix {
  static writeFile(filePath: string, content: string): string {
    return `echo ${JSON.stringify(content)} > ${JSON.stringify(filePath)}`;
  }

  static unlink(filePath: string): string {
    return `rm -f ${JSON.stringify(filePath)}`;
  }

  static mkdir(dirPath: string): string {
    return `mkdir -p ${JSON.stringify(dirPath)}`;
  }

  static rmdir(dirPath: string): string {
    return `rm -rf ${JSON.stringify(dirPath)}`;
  }

  static rename(oldPath: string, newPath: string): string {
    return `mv ${JSON.stringify(oldPath)} ${JSON.stringify(newPath)}`;
  }

  static cp(sourcePath: string, destPath: string): string {
    return `cp -r ${JSON.stringify(sourcePath)} ${JSON.stringify(destPath)}`;
  }
}

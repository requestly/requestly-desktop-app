import { shell } from "electron";

const deleteItem = (itemPath) => {
  return shell.moveItemToTrash(itemPath, true);
};

export default deleteItem;

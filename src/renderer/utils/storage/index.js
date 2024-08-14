export const filterSuperObjectByType = (superObject, requestedObjectType) => {
  let records = [];

  for (let key in superObject) {
    records.push(superObject[key]);
  }

  if (!requestedObjectType) {
    return records;
  }

  return records.filter((record) => {
    let objectType = record?.objectType;
    return objectType === requestedObjectType;
  });
};

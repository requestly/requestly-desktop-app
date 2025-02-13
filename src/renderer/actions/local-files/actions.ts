/* Define all methods invokable from webapp here, dummy for now */
export function test(serializableData: any, secodArg: any) {
  return new Promise((resolve) => {
    console.log("test", serializableData);
    console.log("second arg", secodArg);
    const result = Math.floor(Math.random() * 100);
    console.log("Random result: ", result);
    resolve(`Test result: ${result}`);
  });
}

export function magic(anything: any) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Magic: ", anything);
      resolve("Magic done");
    }, 2000);
  });
}

import stream from "stream";

export function stringAsStream(input: string) {
  const contentStream = new stream.Readable();
  // eslint-disable-next-line no-underscore-dangle
  contentStream._read = () => {};
  contentStream.push(input);
  contentStream.push(null);
  return contentStream;
}

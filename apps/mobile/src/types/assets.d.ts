/** Metro resolves an image import to an asset module id. */
declare module '*.png' {
  const asset: number;
  // eslint-disable-next-line import-x/no-default-export -- an ambient module has no other form
  export default asset;
}

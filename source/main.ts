import { getEncodedPng, RgbVector } from './getEncodedPng.ts';

const fooResolution = 8 * 1;
const fooPngPixelsResult: Array<Array<RgbVector>> = [];
for (let rowIndex = 0; rowIndex < fooResolution; rowIndex++) {
  const fooPixelRowResult: Array<RgbVector> = [];
  for (let columnIndex = 0; columnIndex < fooResolution; columnIndex++) {
    fooPixelRowResult.push([
      255, 0, 0
    ]);
  }
  fooPngPixelsResult.push(fooPixelRowResult);
}
const fooPng = getEncodedPng({
  pngPixels: fooPngPixelsResult,
});
console.log(Array.from(fooPng).map((someByte) => `0x${someByte.toString(16)}`).join(' '))
// Deno.writeFileSync('./foo.png', fooPng);
// 0x89 0x50 0x4e 0x47 0xd 0xa 0x1a 0xa 0x0 0x0 0x0 0xd 0x49 0x48 0x44 0x52 0x0 0x0 0x1 0x0 0x0 0x0 0x1 0x0 0x8 0x2 0x0 0x0 0x0 0xf0 0x3f 0xe7 0x71
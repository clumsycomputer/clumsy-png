import { getEncodedPng, RgbVector } from './getEncodedPng.ts';

const fooResolution = 1024 * 2;
const fooPngPixelsResult: Array<Array<RgbVector>> = [];
for (let rowIndex = 0; rowIndex < fooResolution; rowIndex++) {
  const fooPixelRowResult: Array<RgbVector> = [];
  for (let columnIndex = 0; columnIndex < fooResolution; columnIndex++) {
    fooPixelRowResult.push([
      Math.floor(255 * Math.random()),
      Math.floor(255 * Math.random()),
      Math.floor(255 * Math.random()),
    ]);
  }
  fooPngPixelsResult.push(fooPixelRowResult);
}
const fooPng = getEncodedPng({
  pngPixels: fooPngPixelsResult,
});
Deno.writeFileSync('./foo.png', fooPng);

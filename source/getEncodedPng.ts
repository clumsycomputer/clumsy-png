import { deflate } from 'https://deno.land/x/compress@v0.4.5/mod.ts';

export interface GetEncodedPngApi {
  pngPixels: Array<Array<RgbVector>>;
}

export function getEncodedPng(api: GetEncodedPngApi): Uint8Array {
  const { pngPixels } = api;
  const widthPixelCount = pngPixels[0].length;
  const heightPixelCount = pngPixels.length;
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  const { ihdrChunk } = getIhdrChunk({
    colorBitDepth: 0x08,
    colorModel: 0x02,
    compressionMethod: 0x00,
    filterMethod: 0x00,
    interlaceMethod: 0x00,
    widthPixelCount,
    heightPixelCount,
  });
  const { idatChunk } = getIdatChunk({
    pngPixels,
    widthPixelCount,
    heightPixelCount,
  });
  const { iendChunk } = getIendChunk();
  return new Uint8Array([
    ...pngSignature,
    ...ihdrChunk,
    ...idatChunk,
    ...iendChunk,
  ]);
}

interface GetIhdrChunkApi {
  widthPixelCount: Uint32;
  heightPixelCount: Uint32;
  colorBitDepth: Include<ColorBitDepth, EightBitColorDepth>;
  colorModel: Include<ColorModel, TruecolorModel>;
  compressionMethod: CompressionMethod;
  filterMethod: Include<FilterMethod, NoneFilterMethod>;
  interlaceMethod: Include<InterlaceMethod, NoneInterlaceMethod>;
}

type ColorModel =
  | GrayscaleModel
  | TruecolorModel
  | IndexedColorModel
  | GrayscaleAlphaModel
  | TruecolorAlphaModel;
type GrayscaleModel = 0x00;
type TruecolorModel = 0x02;
type IndexedColorModel = 0x03;
type GrayscaleAlphaModel = 0x04;
type TruecolorAlphaModel = 0x06;

type ColorBitDepth =
  | OneBitColorDepth
  | TwoBitColorDepth
  | FourBitColorDepth
  | EightBitColorDepth
  | SixteenBitColorDepth;
type OneBitColorDepth = 0x01;
type TwoBitColorDepth = 0x02;
type FourBitColorDepth = 0x04;
type EightBitColorDepth = 0x08;
type SixteenBitColorDepth = 0x10;

type CompressionMethod = DeflateZlibCompression;
type DeflateZlibCompression = 0x00;
type UnknownFutureCompressionMethod = 0x01;

type FilterMethod =
  | NoneFilterMethod
  | AdaptiveFilterMethod
  | SubFilterMethod
  | UpFilterMethod
  | AverageFilterMethod
  | PaethFilterMethod;
type NoneFilterMethod = 0x00;
type AdaptiveFilterMethod = 0x00;
type SubFilterMethod = 0x01;
type UpFilterMethod = 0x02;
type AverageFilterMethod = 0x03;
type PaethFilterMethod = 0x04;

type InterlaceMethod = NoneInterlaceMethod | Adam7InterlaceMethod;
type NoneInterlaceMethod = 0x00;
type Adam7InterlaceMethod = 0x01;

function getIhdrChunk(api: GetIhdrChunkApi) {
  const {
    widthPixelCount,
    heightPixelCount,
    colorBitDepth,
    colorModel,
    compressionMethod,
    filterMethod,
    interlaceMethod,
  } = api;
  const ihdrChunkLength = getFourByteBigEndianTuple({
    someUint32: 13,
  });
  const ihdrChunkType: FourByteBigEndianTuple = [0x49, 0x48, 0x44, 0x52]; // 'IHDR' in ASCII
  const ihdrChunkConfig = [
    ...getFourByteBigEndianTuple({
      someUint32: widthPixelCount,
    }),
    ...getFourByteBigEndianTuple({
      someUint32: heightPixelCount,
    }),
    colorBitDepth,
    colorModel,
    compressionMethod,
    filterMethod,
    interlaceMethod,
  ];
  const ihdrCyclicRedundancyChecksum = getCyclicRedundancyChecksum({
    someStructuredBytes: [
      ...ihdrChunkType,
      ...ihdrChunkConfig,
    ],
  });
  return {
    ihdrChunk: new Uint8Array([
      ...ihdrChunkLength,
      ...ihdrChunkType,
      ...ihdrChunkConfig,
      ...ihdrCyclicRedundancyChecksum,
    ]),
  };
}

interface GetIdatChunkApi extends Pick<GetEncodedPngApi, 'pngPixels'> {
  widthPixelCount: Uint32;
  heightPixelCount: Uint32;
}

function getIdatChunk(api: GetIdatChunkApi) {
  const { heightPixelCount, widthPixelCount, pngPixels } = api;
  // Each pixel consists of 3 bytes (RGB), and each row starts with a single byte for filter type.
  const augmentedWidthSize = widthPixelCount * 3 + 1;
  const augmentedPngPixels = new Uint8Array(
    heightPixelCount * augmentedWidthSize,
  );
  for (let rowIndex = 0; rowIndex < heightPixelCount; rowIndex++) {
    // Set filter type to 0 (no filter) for each row.
    augmentedPngPixels[rowIndex * augmentedWidthSize] = 0;
    for (let columnIndex = 0; columnIndex < widthPixelCount; columnIndex++) {
      const augmentedPixelIndexBase = rowIndex * augmentedWidthSize + 1 +
        columnIndex * 3;
      // Red component
      augmentedPngPixels[augmentedPixelIndexBase] =
        pngPixels[rowIndex][columnIndex][0];
      // Green component
      augmentedPngPixels[augmentedPixelIndexBase + 1] =
        pngPixels[rowIndex][columnIndex][1];
      // Blue component
      augmentedPngPixels[augmentedPixelIndexBase + 2] =
        pngPixels[rowIndex][columnIndex][2];
    }
  }
  const compressedPngPixels = deflate(augmentedPngPixels);
  const idatChunkType: FourByteBigEndianTuple = [0x49, 0x44, 0x41, 0x54]; // 'IDAT' in ASCII
  const idatCyclicRedundancyChecksum = getCyclicRedundancyChecksum({
    someStructuredBytes: [
      ...idatChunkType,
      ...compressedPngPixels,
    ],
  });
  return {
    idatChunk: new Uint8Array([
      ...getFourByteBigEndianTuple({
        someUint32: compressedPngPixels.length,
      }),
      ...idatChunkType,
      ...compressedPngPixels,
      ...idatCyclicRedundancyChecksum,
    ]),
  };
}

function getIendChunk() {
  const iendChunkLength = getFourByteBigEndianTuple({
    someUint32: 0,
  });
  const iendChunkType: FourByteBigEndianTuple = [0x49, 0x45, 0x4E, 0x44]; // 'IEND' in ASCII
  const iendCyclicRedundancyChecksum = getCyclicRedundancyChecksum({
    someStructuredBytes: iendChunkType,
  });
  return {
    iendChunk: [
      ...iendChunkLength,
      ...iendChunkType,
      ...iendCyclicRedundancyChecksum,
    ],
  };
}

interface GetCyclicRedundancyChecksumApi {
  someStructuredBytes: Array<Byte>;
}

function getCyclicRedundancyChecksum(
  api: GetCyclicRedundancyChecksumApi,
) {
  const { someStructuredBytes } = api;
  const wholeChecksum = someStructuredBytes.reduce(
    (wholeChecksumResult, someByte) => {
      // XOR the current byte of data with the least-significant byte of the checksum, then mask with 0xff
      const checksumIndex = (wholeChecksumResult ^ someByte) & 0xff;
      let checksumByteResult = checksumIndex;
      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        // This section of the code applies the polynomial used in the CRC-32 algorithm.
        // The polynomial for CRC-32 is 0xEDB88320. This representation is based on the reversed polynomial
        // (also known as the "non-reflected" form) which is used in many CRC-32 variants, including the one used in PNG files.
        //
        // The expression `checksumByteResult & 1` checks if the least significant bit (LSB) of `checksumByteResult` is 1.
        checksumByteResult = checksumByteResult & 1
          // Here, `checksumByteResult >>> 1` shifts `checksumByteResult` one bit to the right, effectively dividing it by 2
          // and discarding the LSB. This operation corresponds to the step in the CRC calculation where the current bit is
          // "consumed" and the algorithm moves to the next bit.
          //
          // The XOR operation `^` with the polynomial `0xEDB88320` is then applied. This is the core step in CRC-32
          // where the polynomial is used to modify the checksum based on the input data. The polynomial is applied
          // only if the LSB is 1, as per the CRC-32 algorithm's rules.
          ? 0xedb88320 ^ (checksumByteResult >>> 1)
          // Just shift right if the least significant bit is 0
          : checksumByteResult >>> 1;
      }
      // XOR the current checksumByteResult with the shifted whole checksum
      return checksumByteResult ^ (wholeChecksumResult >>> 8);
    },
    0xffffffff,
  );
  // This step is known as "final XOR" or "CRC inversion." In many CRC algorithms, this final XOR step is used to ensure
  // that the CRC of an empty string is non-zero and to avoid other potential weaknesses in the CRC algorithm.
  // Essentially, it's a standard part of the CRC calculation to improve its error-detection capabilities.
  const invertedWholeChecksum = wholeChecksum ^ 0xffffffff;
  return getFourByteBigEndianTuple({
    someUint32: invertedWholeChecksum,
  });
}

type Byte = number;
type Uint32 = number;
type FourByteBigEndianTuple = [Byte, Byte, Byte, Byte];
type Include<T, U> = T extends U ? U : never;
export type RgbVector = [red: number, green: number, blue: number];

interface GetFourByteBigEndianTuple {
  someUint32: Uint32;
}

function getFourByteBigEndianTuple(
  api: GetFourByteBigEndianTuple,
): FourByteBigEndianTuple {
  const { someUint32 } = api;
  return [
    (someUint32 >>> 24) & 0xff,
    (someUint32 >>> 16) & 0xff,
    (someUint32 >>> 8) & 0xff,
    someUint32 & 0xff,
  ];
}

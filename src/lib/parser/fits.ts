/**
 * Minimal multi-extension FITS parser for the browser.
 *
 * FITS spec reference: https://fits.gsfc.nasa.gov/fits_standard.html
 *   - Each HDU = header blocks + data blocks
 *   - Each block is 2880 bytes
 *   - Header cards are 80 ASCII characters
 *   - Data is padded to a multiple of 2880 bytes
 */

const BLOCK = 2880;
const CARD = 80;

/** Recursive N-dimensional array type. */
export type NdArray = number | NdArray[];

type BitpixReader = (view: DataView, offset: number) => number;

const BITPIX_READERS: Record<number, BitpixReader> = {
  8: (v, o) => v.getUint8(o),
  16: (v, o) => v.getInt16(o, false),
  32: (v, o) => v.getInt32(o, false),
  64: (v, o) => Number(v.getBigInt64(o, false)),
  [-32]: (v, o) => v.getFloat32(o, false),
  [-64]: (v, o) => v.getFloat64(o, false),
};

/**
 * Reshapes a flat number array into an N-dimensional nested array
 * following FITS axis ordering (NAXIS1 = innermost / fastest-varying).
 */
function reshape(flat: number[], shape: number[]): NdArray {
  if (shape.length === 0) return flat[0];
  if (shape.length === 1) return flat;

  const innerSize = shape.slice(0, -1).reduce((a, b) => a * b, 1);
  const outerLen = shape[shape.length - 1];
  const result: NdArray[] = new Array(outerLen);

  for (let i = 0; i < outerLen; i++) {
    const chunk = flat.slice(i * innerSize, (i + 1) * innerSize);
    result[i] = reshape(chunk, shape.slice(0, -1));
  }

  return result;
}

/**
 * Represents a single Header Data Unit (HDU) in a FITS file.
 *
 * Provides access to header keyword values and decoded pixel/table data.
 * Data is automatically shaped according to the NAXIS dimensions:
 * - 0D (scalar) → `number`
 * - 1D → `number[]`
 * - 2D → `number[][]`
 * - ND → recursively nested arrays
 */
export class FITSHDU {
  /** Header keyword–value pairs. Access as `hdu.header["KEYWORD"]`. */
  readonly header: Record<string, string>;

  /** NAXIS dimensions array (e.g. `[width, height]` for a 2D image). */
  readonly shape: number[];

  /** BITPIX value indicating the data type. */
  readonly bitpix: number;

  private readonly buffer: ArrayBuffer;
  private readonly dataOffset: number;
  private readonly dataLength: number;
  private cachedFlat: number[] | null = null;
  private cachedData: NdArray | null = null;

  constructor(
    header: Record<string, string>,
    shape: number[],
    bitpix: number,
    buffer: ArrayBuffer,
    dataOffset: number,
    dataLength: number,
  ) {
    this.header = header;
    this.shape = shape;
    this.bitpix = bitpix;
    this.buffer = buffer;
    this.dataOffset = dataOffset;
    this.dataLength = dataLength;
  }

  /**
   * Decodes the raw binary data into a flat number array.
   *
   * Values are read according to the BITPIX type. NaN values are replaced with 0.
   * Result is cached after first access.
   */
  private decodeFlat(): number[] {
    if (this.cachedFlat) return this.cachedFlat;

    const reader = BITPIX_READERS[this.bitpix];
    if (!reader) throw new Error(`Unsupported BITPIX value: ${this.bitpix}`);

    const bytesPerPixel = Math.abs(this.bitpix) / 8;
    const pixelCount = this.dataLength / bytesPerPixel;
    const view = new DataView(this.buffer, this.dataOffset, this.dataLength);
    const result: number[] = new Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      const val = reader(view, i * bytesPerPixel);
      result[i] = Number.isNaN(val) ? 0 : val;
    }

    this.cachedFlat = result;
    return result;
  }

  /**
   * Decoded data shaped according to the NAXIS dimensions.
   *
   * Automatically returns the correct dimensionality:
   * - 1 axis  → `number[]`
   * - 2 axes  → `number[][]`
   * - N axes  → `NdArray` (recursively nested)
   *
   * The result is cached after first access.
   */
  get data(): NdArray {
    if (this.cachedData !== null) return this.cachedData;
    this.cachedData = reshape(this.decodeFlat(), this.shape);
    return this.cachedData;
  }
}

/**
 * Parsed FITS file with named access to HDUs by extension name.
 *
 * ```ts
 * const flux  = file.get("FLUX")?.data;
 * const author = file.get("FLUX")?.header["AUTHOR"];
 * ```
 */
export class FITSFile {
  /** All HDUs in file order. */
  readonly hdus: FITSHDU[];

  /** The primary (first) HDU. */
  readonly primary: FITSHDU;

  /** Map of EXTNAME → HDU for quick access to named extensions. */
  private readonly extMap: Map<string, FITSHDU>;

  /** @internal */
  constructor(hdus: FITSHDU[], extMap: Map<string, FITSHDU>) {
    this.hdus = hdus;
    this.primary = hdus[0];
    this.extMap = extMap;
  }

  /**
   * Returns the HDU with the given extension name.
   *
   * @param extname - The EXTNAME keyword value to look up.
   * @returns The matching {@link FITSHDU}, or `undefined` if not found.
   */
  get(extname: string): FITSHDU | undefined {
    return this.extMap.get(extname);
  }
}

/**
 * Parser for the FITS (Flexible Image Transport System) binary format.
 *
 * Supports reading multi-extension FITS files with generic access to
 * any extension's headers and decoded data.
 */
export class FITSParser {
  private readonly buffer: ArrayBuffer;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
  }

  /**
   * Parses the FITS buffer into a {@link FITSFile}.
   */
  parse(): FITSFile {
    const hdus = this.parseHDUs();
    const extMap = new Map<string, FITSHDU>();

    for (const hdu of hdus) {
      const name = hdu.header["EXTNAME"];
      if (name) extMap.set(name, hdu);
    }

    return new FITSFile(hdus, extMap);
  }

  /**
   * Convenience method that parses and extracts data from a named extension.
   *
   * @param extname - The extension name to extract.
   * @returns The auto-shaped data array.
   * @throws If the extension is not found.
   */
  extract(extname: string): NdArray {
    const hdu = this.parse().get(extname);
    if (!hdu) throw new Error(`Extension "${extname}" not found in FITS file`);
    return hdu.data;
  }

  private parseHDUs(): FITSHDU[] {
    const bytes = new Uint8Array(this.buffer);
    const hdus: FITSHDU[] = [];
    let offset = 0;

    while (offset < bytes.length) {
      const header: Record<string, string> = {};
      let headerDone = false;

      while (!headerDone && offset < bytes.length) {
        for (let i = 0; i < BLOCK / CARD; i++) {
          const cardStr = String.fromCharCode(...bytes.slice(offset + i * CARD, offset + (i + 1) * CARD));
          const keyword = cardStr.slice(0, 8).trim();

          if (keyword === "END") {
            headerDone = true;
            break;
          }

          if (cardStr[8] === "=") {
            const raw = cardStr.slice(10).split("/")[0].trim();
            const value = raw.startsWith("'") ? raw.slice(1, raw.lastIndexOf("'")).trim() : raw;
            header[keyword] = value;
          }
        }
        offset += BLOCK;
      }

      const bitpix = parseInt(header["BITPIX"] ?? "0", 10);
      const naxisCount = parseInt(header["NAXIS"] ?? "0", 10);
      const shape: number[] = [];
      for (let i = 1; i <= naxisCount; i++) {
        shape.push(parseInt(header[`NAXIS${i}`] ?? "0", 10));
      }

      const bytesPerPixel = Math.abs(bitpix) / 8;
      const totalPixels = shape.reduce((a, b) => a * b, 1);
      const dataLength = naxisCount === 0 ? 0 : totalPixels * bytesPerPixel;
      const dataOffset = offset;

      hdus.push(new FITSHDU(header, shape, bitpix, this.buffer, dataOffset, dataLength));

      const dataPadded = Math.ceil(dataLength / BLOCK) * BLOCK;
      offset += dataPadded;

      if (offset >= bytes.length) break;
    }

    return hdus;
  }
}

/** A header card to write into a FITS HDU. */
export interface FITSHeaderCard {
  key: string;
  value: string | number | boolean;
  comment?: string;
}

function formatCard(card: FITSHeaderCard): string {
  const key = card.key.toUpperCase().padEnd(8, " ").slice(0, 8);
  let valueField: string;

  if (typeof card.value === "boolean") {
    valueField = (card.value ? "T" : "F").padStart(20, " ");
  } else if (typeof card.value === "number") {
    let s: string;
    if (Number.isInteger(card.value)) {
      s = card.value.toString();
    } else {
      s = card.value.toExponential(13).toUpperCase().replace("E", "E");
    }
    valueField = s.padStart(20, " ");
  } else {
    const escaped = String(card.value).replace(/'/g, "''");
    const padded = escaped.padEnd(8, " ");
    valueField = `'${padded}'`;
  }

  let line = `${key}= ${valueField}`;
  if (card.comment) {
    const remaining = 80 - line.length - 3;
    const comment = card.comment.slice(0, Math.max(0, remaining));
    if (comment.length > 0) line += ` / ${comment}`;
  }
  return line.padEnd(80, " ").slice(0, 80);
}

function buildHeaderBytes(cards: FITSHeaderCard[]): Uint8Array {
  const lines = cards.map(formatCard);
  lines.push("END".padEnd(80, " "));

  const cardsPerBlock = BLOCK / CARD;
  while (lines.length % cardsPerBlock !== 0) {
    lines.push(" ".repeat(80));
  }

  const out = new Uint8Array(lines.length * CARD);
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < CARD; j++) {
      out[i * CARD + j] = lines[i].charCodeAt(j) & 0xff;
    }
  }
  return out;
}

/**
 * Writer for simple single-HDU FITS images (BITPIX = -64, big-endian Float64).
 *
 * Produces a standards-compliant FITS file with mandatory keywords
 * (SIMPLE, BITPIX, NAXIS, NAXIS1, NAXIS2) followed by any user-supplied cards.
 * Data is written in FITS axis order (NAXIS1 = innermost / fastest-varying),
 * matching the row-major convention used by {@link FITSHDU.data}.
 */
export class FITSWriter {
  /**
   * Encodes a 2D array as a single-HDU FITS file.
   *
   * @param data       Row-major 2D array. Outer length = NAXIS2, inner length = NAXIS1.
   * @param extraCards Additional header cards inserted after the mandatory keywords.
   */
  static write2D(data: number[][], extraCards: FITSHeaderCard[] = []): ArrayBuffer {
    const naxis2 = data.length;
    const naxis1 = naxis2 > 0 ? data[0].length : 0;
    const bitpix = -64;

    const cards: FITSHeaderCard[] = [
      { key: "SIMPLE", value: true, comment: "Standard FITS format" },
      { key: "BITPIX", value: bitpix, comment: "64-bit floating point" },
      { key: "NAXIS", value: 2 },
      { key: "NAXIS1", value: naxis1 },
      { key: "NAXIS2", value: naxis2 },
      ...extraCards,
    ];

    const headerBytes = buildHeaderBytes(cards);

    const pixelCount = naxis1 * naxis2;
    const dataLength = pixelCount * 8;
    const dataPadded = Math.ceil(dataLength / BLOCK) * BLOCK;
    const dataBytes = new Uint8Array(dataPadded);
    const view = new DataView(dataBytes.buffer);

    let off = 0;
    for (let y = 0; y < naxis2; y++) {
      const row = data[y];
      for (let x = 0; x < naxis1; x++) {
        view.setFloat64(off, row[x], false);
        off += 8;
      }
    }

    const out = new Uint8Array(headerBytes.length + dataBytes.length);
    out.set(headerBytes, 0);
    out.set(dataBytes, headerBytes.length);
    return out.buffer;
  }
}

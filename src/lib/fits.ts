/**
 * Minimal multi-extension FITS parser for the browser.
 *
 * The jsfitsio library only handles single-HDU files so we need our own
 * parser to navigate to the FLUX extension in multi-extension files.
 *
 * FITS spec reference: https://fits.gsfc.nasa.gov/fits_standard.html
 *   - Each HDU = header blocks + data blocks
 *   - Each block is 2880 bytes
 *   - Header cards are 80 ASCII characters
 *   - Data is padded to a multiple of 2880 bytes
 */

const BLOCK = 2880;
const CARD = 80;

interface FITSHeader {
  cards: Map<string, string>;
  naxis: number[];
  bitpix: number;
  extname: string;
  /** Byte offset where the data for this HDU starts */
  dataOffset: number;
  /** Byte length of the data for this HDU (unpadded) */
  dataLength: number;
}

/**
 * Parse all HDU headers from a FITS file buffer, returning metadata for each.
 */
function parseHeaders(buf: ArrayBuffer): FITSHeader[] {
  const bytes = new Uint8Array(buf);
  const headers: FITSHeader[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const cards = new Map<string, string>();
    let headerDone = false;

    // Read header cards
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
          // Strip quotes from string values
          const value = raw.startsWith("'") ? raw.slice(1, raw.lastIndexOf("'")).trim() : raw;
          cards.set(keyword, value);
        }
      }
      offset += BLOCK;
    }

    const bitpix = parseInt(cards.get("BITPIX") ?? "0", 10);
    const naxisCount = parseInt(cards.get("NAXIS") ?? "0", 10);
    const naxis: number[] = [];
    for (let i = 1; i <= naxisCount; i++) {
      naxis.push(parseInt(cards.get(`NAXIS${i}`) ?? "0", 10));
    }

    const bytesPerPixel = Math.abs(bitpix) / 8;
    const totalPixels = naxis.reduce((a, b) => a * b, 1);
    const dataLength = naxisCount === 0 ? 0 : totalPixels * bytesPerPixel;
    const dataOffset = offset;

    headers.push({
      cards,
      naxis,
      bitpix,
      extname: cards.get("EXTNAME") ?? "",
      dataOffset,
      dataLength,
    });

    // Skip past data blocks (padded to BLOCK boundary)
    const dataPadded = Math.ceil(dataLength / BLOCK) * BLOCK;
    offset += dataPadded;

    // If there was no data axis and we're past an empty primary, break if done
    if (offset >= bytes.length) break;
  }

  return headers;
}

/**
 * Extract 2D float32 data from a named extension (default "FLUX").
 * Returns a row-major number[][] suitable for the Heatmap component.
 */
export function extractFlux2D(buf: ArrayBuffer, extname = "FLUX"): number[][] {
  const headers = parseHeaders(buf);
  const hdu = headers.find((h) => h.extname === extname);
  if (!hdu) throw new Error(`Extension "${extname}" not found in FITS file`);
  if (hdu.naxis.length !== 2) throw new Error(`Expected 2D data, got ${hdu.naxis.length}D`);

  const [naxis1, naxis2] = hdu.naxis; // cols, rows in FITS ordering
  const view = new DataView(buf, hdu.dataOffset, hdu.dataLength);
  const rows: number[][] = [];

  for (let row = 0; row < naxis2; row++) {
    const rowData: number[] = [];
    for (let col = 0; col < naxis1; col++) {
      const byteOffset = (row * naxis1 + col) * 4; // float32 = 4 bytes
      const val = view.getFloat32(byteOffset, false); // big-endian
      rowData.push(Number.isNaN(val) ? 0 : val);
    }
    rows.push(rowData);
  }

  return rows;
}

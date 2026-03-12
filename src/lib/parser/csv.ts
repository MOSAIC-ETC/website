/**
 * Parser for CSV (Comma-Separated Values) files.
 *
 * Supports configurable delimiters, optional headers, and automatic
 * type coercion of numeric values.
 */

export interface CSVParserOptions {
  /** Column delimiter (defaults to ",""). */
  delimiter?: string;
  /** Whether the first row contains column headers (defaults to true). */
  hasHeader?: boolean;
}

export type CSVRow = Record<string, string | number>;
export type CSVFile = CSVRow[];

/**
 * Parses CSV text into structured row objects or raw string arrays.
 *
 * Handles quoted fields (including escaped quotes), configurable delimiters,
 * and optional header rows for named column access.
 */
export class CSVParser {
  private readonly text: string;
  private readonly delimiter: string;
  private readonly hasHeader: boolean;

  /**
   * @param text - Raw CSV text content.
   * @param options - Parser configuration options.
   */
  constructor(text: string, options: CSVParserOptions = {}) {
    this.text = text;
    this.delimiter = options.delimiter ?? ",";
    this.hasHeader = options.hasHeader ?? true;
  }

  /**
   * Splits a single CSV line into fields, respecting quoted values.
   */
  private parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === this.delimiter) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    fields.push(current.trim());
    return fields;
  }

  /**
   * Coerces a string value to a number if it represents a valid numeric value.
   */
  private coerce(value: string): string | number {
    if (value === "") return value;
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }

  /**
   * Splits the raw text into non-empty lines, stripping trailing carriage returns.
   */
  private getLines(): string[] {
    return this.text
      .split("\n")
      .map((line) => line.replace(/\r$/, ""))
      .filter((line) => line.trim() !== "");
  }

  /**
   * Parses the CSV into an array of objects keyed by header column names.
   *
   * Numeric values are automatically coerced. Requires the CSV to have a header row.
   *
   * @returns An array of row objects with header names as keys.
   * @throws If the CSV was configured without headers.
   */
  parse(): CSVFile {
    if (!this.hasHeader) {
      throw new Error("Cannot parse as objects without a header row");
    }

    const lines = this.getLines();
    if (lines.length === 0) return [];

    const headers = this.parseLine(lines[0]);
    return lines.slice(1).map((line) => {
      const fields = this.parseLine(line);
      const row: CSVRow = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = this.coerce(fields[i] ?? "");
      }
      return row;
    });
  }

  /**
   * Returns the header column names.
   *
   * @returns An array of header strings, or an empty array if no header row.
   */
  getHeaders(): string[] {
    if (!this.hasHeader) return [];
    const lines = this.getLines();
    if (lines.length === 0) return [];
    return this.parseLine(lines[0]);
  }
}

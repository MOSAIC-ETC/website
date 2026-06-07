/**
 * Testes de propriedades adicionais do algoritmo drizzle (areaWeightedResample).
 *
 * Complementa drizzle-flux.test.ts (conservação de fluxo) verificando:
 *  1. Identidade: scaleRatio=1 reproduz a grade de entrada
 *  2. Grades não-quadradas (retangulares)
 *  3. Monotonidade: regiões mais brilhantes permanecem mais brilhantes após reamostragem
 *  4. Grade uniforme → saída uniforme
 */

import { describe, expect, it } from "vitest";

import { areaWeightedResample } from "@/lib/resample";

function makeGrid(rows: number, cols: number, f: (r: number, c: number) => number): number[][] {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => f(r, c)));
}

function gridMean(grid: number[][]): number {
  let sum = 0, count = 0;
  for (const row of grid) for (const v of row) { sum += v; count++; }
  return sum / count;
}

// ---------------------------------------------------------------------------
// 1. Identidade (scaleRatio = 1)
// ---------------------------------------------------------------------------

describe("identidade — scaleRatio = 1", () => {
  it("grade 5×5 uniforme: saída idêntica à entrada", () => {
    const input = makeGrid(5, 5, () => 7);
    const output = areaWeightedResample(input, 1);
    expect(output.length).toBe(5);
    expect(output[0].length).toBe(5);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        expect(output[r][c]).toBeCloseTo(input[r][c], 10);
  });

  it("grade 8×12 com gradiente: saída idêntica à entrada", () => {
    const input = makeGrid(8, 12, (r, c) => r * 12 + c + 1);
    const output = areaWeightedResample(input, 1);
    expect(output.length).toBe(8);
    expect(output[0].length).toBe(12);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 12; c++)
        expect(output[r][c]).toBeCloseTo(input[r][c], 10);
  });
});

// ---------------------------------------------------------------------------
// 2. Grades não-quadradas
// ---------------------------------------------------------------------------

describe("grades retangulares (não-quadradas)", () => {
  it("10×15 com R≈3,333 (MaNGA→MOSAIC): dimensões de saída corretas", () => {
    const input = makeGrid(10, 15, () => 1);
    const R = 10 / 3;
    const output = areaWeightedResample(input, R);
    // Math.ceil(10 × R) = Math.ceil(33.33) = 34
    // Math.ceil(15 × R) = Math.ceil(50.00) = 50
    expect(output.length).toBe(Math.ceil(10 * R));
    expect(output[0].length).toBe(Math.ceil(15 * R));
  });

  it("3×7 com R=2: dimensões de saída dobradas em cada eixo", () => {
    const input = makeGrid(3, 7, (r, c) => r + c);
    const output = areaWeightedResample(input, 2);
    expect(output.length).toBe(6);
    expect(output[0].length).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// 3. Monotonidade regional
// ---------------------------------------------------------------------------

describe("monotonidade: regiões mais brilhantes permanecem mais brilhantes após reamostragem", () => {
  it("metade superior mais brilhante → média da metade superior ainda maior após R=3", () => {
    // Metade superior (linhas 0..4) = 100, metade inferior (linhas 5..9) = 1
    const input = makeGrid(10, 10, (r) => (r < 5 ? 100 : 1));
    const output = areaWeightedResample(input, 3);
    const outRows = output.length;
    const midRow = Math.floor(outRows / 2);

    // Média dos pixels da metade superior da saída
    const upperMean = gridMean(output.slice(0, midRow));
    // Média dos pixels da metade inferior da saída
    const lowerMean = gridMean(output.slice(midRow));

    expect(upperMean).toBeGreaterThan(lowerMean);
  });

  it("pixel central mais brilhante: valor do pixel de saída correspondente é maior que a borda", () => {
    const n = 9;
    const input = makeGrid(n, n, (r, c) => r === 4 && c === 4 ? 1000 : 1);
    const output = areaWeightedResample(input, 3);
    const midR = Math.floor(output.length / 2);
    const midC = Math.floor(output[0].length / 2);
    // Pixel central da saída deve ser maior que canto
    expect(output[midR][midC]).toBeGreaterThan(output[0][0]);
  });
});

// ---------------------------------------------------------------------------
// 4. Entrada uniforme → saída uniforme
// ---------------------------------------------------------------------------

describe("entrada uniforme → saída uniforme", () => {
  it("todos os valores iguais a 5, R=2,5: saída com todos os valores iguais a 5", () => {
    const input = makeGrid(8, 8, () => 5);
    const output = areaWeightedResample(input, 2.5);
    for (const row of output)
      for (const v of row)
        expect(v).toBeCloseTo(5, 10);
  });

  it("todos os valores iguais, R fracionário (MaNGA→MOSAIC): saída uniforme", () => {
    const input = makeGrid(6, 6, () => 42);
    const output = areaWeightedResample(input, 10 / 3);
    for (const row of output)
      for (const v of row)
        expect(v).toBeCloseTo(42, 10);
  });
});

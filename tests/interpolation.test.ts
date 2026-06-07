/**
 * Unit tests for funções auxiliares de integração e interpolação.
 *
 * Cobre:
 *  - interpolateTransmission: clamping fora do domínio, coincidência exata nos nós,
 *    interpolação linear entre nós
 *  - integrateSpectrum: função constante e rampa linear (regra dos trapézios)
 *  - integrateTransmission: idem, para curvas de transmissão
 *  - lookupNearest: correspondência exata, vizinho mais próximo, desempate (primeiro vence)
 */

import { describe, expect, it } from "vitest";

import {
  integrateSpectrum,
  integrateTransmission,
  interpolateTransmission,
  lookupNearest,
} from "@/app/[locale]/(public)/etc/lib/calculate";
import type { Spectrum } from "@/app/[locale]/(public)/etc/lib/calculate";
import type { NMFile } from "@/app/[locale]/(public)/etc/lib/types";

// ---------------------------------------------------------------------------
// interpolateTransmission
// ---------------------------------------------------------------------------

describe("interpolateTransmission", () => {
  const curve: NMFile[] = [
    { wavelength: 500, transmission: 0.0 },
    { wavelength: 600, transmission: 1.0 },
    { wavelength: 700, transmission: 0.5 },
  ];

  it("retorna o valor exato nos nós de controle", () => {
    expect(interpolateTransmission(curve, 500)).toBe(0.0);
    expect(interpolateTransmission(curve, 600)).toBe(1.0);
    expect(interpolateTransmission(curve, 700)).toBe(0.5);
  });

  it("clamp abaixo do menor comprimento de onda → valor do primeiro nó", () => {
    expect(interpolateTransmission(curve, 400)).toBe(0.0);
    expect(interpolateTransmission(curve, 499)).toBe(0.0);
  });

  it("clamp acima do maior comprimento de onda → valor do último nó", () => {
    expect(interpolateTransmission(curve, 800)).toBe(0.5);
    expect(interpolateTransmission(curve, 701)).toBe(0.5);
  });

  it("interpolação linear no ponto médio entre dois nós", () => {
    // Entre 500 (t=0) e 600 (t=1): ponto médio 550 → t=0.5
    expect(interpolateTransmission(curve, 550)).toBeCloseTo(0.5, 10);
    // Entre 600 (t=1) e 700 (t=0.5): ponto médio 650 → t=0.75
    expect(interpolateTransmission(curve, 650)).toBeCloseTo(0.75, 10);
  });

  it("interpolação linear a 25% do intervalo [500, 600]", () => {
    // t = (525-500)/(600-500) = 0.25 → T = 0 + 0.25×1 = 0.25
    expect(interpolateTransmission(curve, 525)).toBeCloseTo(0.25, 10);
  });

  it("funciona com curva de um único elemento (retorna sempre o mesmo valor)", () => {
    const single: NMFile[] = [{ wavelength: 550, transmission: 0.8 }];
    expect(interpolateTransmission(single, 400)).toBe(0.8);
    expect(interpolateTransmission(single, 550)).toBe(0.8);
    expect(interpolateTransmission(single, 700)).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// integrateSpectrum  (regra dos trapézios)
// ---------------------------------------------------------------------------

describe("integrateSpectrum", () => {
  it("espectro constante: integral = valor × largura do intervalo", () => {
    const spec: Spectrum = [
      { wavelength: 500, flux: 3 },
      { wavelength: 600, flux: 3 },
      { wavelength: 700, flux: 3 },
    ];
    // ∫ 3 dλ de 500 a 700 = 3 × 200 = 600
    expect(integrateSpectrum(spec)).toBeCloseTo(600, 10);
  });

  it("rampa linear: regra dos trapézios é exata", () => {
    // f(λ) = λ − 500  →  ∫_{500}^{700} (λ-500) dλ = [1/2(λ-500)²]_{500}^{700} = 20 000
    const spec: Spectrum = [
      { wavelength: 500, flux: 0 },
      { wavelength: 600, flux: 100 },
      { wavelength: 700, flux: 200 },
    ];
    expect(integrateSpectrum(spec)).toBeCloseTo(20_000, 8);
  });

  it("integral com passo irregular (dois intervalos de tamanhos diferentes)", () => {
    // f = 2 em [500,510], f = 2 em [510,600]
    // ∫ = 2×10 + 2×90 = 200
    const spec: Spectrum = [
      { wavelength: 500, flux: 2 },
      { wavelength: 510, flux: 2 },
      { wavelength: 600, flux: 2 },
    ];
    expect(integrateSpectrum(spec)).toBeCloseTo(200, 10);
  });

  it("único par de pontos: trapézio simples", () => {
    const spec: Spectrum = [
      { wavelength: 400, flux: 0 },
      { wavelength: 500, flux: 10 },
    ];
    // 0.5 × (0 + 10) × 100 = 500
    expect(integrateSpectrum(spec)).toBeCloseTo(500, 10);
  });
});

// ---------------------------------------------------------------------------
// integrateTransmission
// ---------------------------------------------------------------------------

describe("integrateTransmission", () => {
  it("transmissão unitária constante: integral = largura do filtro", () => {
    const data = [
      { wavelength: 400, transmission: 1 },
      { wavelength: 500, transmission: 1 },
      { wavelength: 600, transmission: 1 },
    ];
    expect(integrateTransmission(data)).toBeCloseTo(200, 10);
  });

  it("perfil triangular: área do triângulo", () => {
    // T = 0 em 400, sobe a 1 em 500, volta a 0 em 600 → área = 0.5 × base × altura = 0.5 × 200 × 1 = 100
    const data = [
      { wavelength: 400, transmission: 0 },
      { wavelength: 500, transmission: 1 },
      { wavelength: 600, transmission: 0 },
    ];
    expect(integrateTransmission(data)).toBeCloseTo(100, 10);
  });
});

// ---------------------------------------------------------------------------
// lookupNearest
// ---------------------------------------------------------------------------

describe("lookupNearest", () => {
  type Row = Record<string, string>;
  const table: Row[] = [
    { wavelength: "500", value: "10" },
    { wavelength: "600", value: "20" },
    { wavelength: "700", value: "30" },
  ];

  it("correspondência exata retorna o valor correto", () => {
    expect(lookupNearest(table, 500, "value")).toBe(10);
    expect(lookupNearest(table, 600, "value")).toBe(20);
    expect(lookupNearest(table, 700, "value")).toBe(30);
  });

  it("vizinho mais próximo abaixo da tabela → primeiro elemento", () => {
    expect(lookupNearest(table, 400, "value")).toBe(10);
  });

  it("vizinho mais próximo acima da tabela → último elemento", () => {
    expect(lookupNearest(table, 800, "value")).toBe(30);
  });

  it("ponto mais próximo de 540 é 500 (distância 40 < 60)", () => {
    expect(lookupNearest(table, 540, "value")).toBe(10);
  });

  it("ponto mais próximo de 560 é 600 (distância 40 < 60)", () => {
    expect(lookupNearest(table, 560, "value")).toBe(20);
  });

  it("empate de distâncias (exatamente no meio) → retorna o primeiro encontrado (500)", () => {
    // 550 equidista de 500 e 600; a busca linear retorna 500 (encontrado primeiro,
    // pois diff < bestDiff usa < estrito)
    expect(lookupNearest(table, 550, "value")).toBe(10);
  });
});

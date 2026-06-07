/**
 * Unit tests for convertToFluxLambda.
 *
 * Verifica:
 *  - Identidades algébricas simples (W_M2_UM, ERGS_S_CM2_ANGSTROM)
 *  - Fórmula AB contra a definição matemática
 *  - Monotonidade magnitude↔fluxo para AB e mag aparente
 *  - Relação 5 mag = fator 100 em fluxo
 *  - Consistência entre unidades (Jy ↔ erg/s/cm²/Hz ↔ AB)
 */

import { describe, expect, it } from "vitest";

import { convertToFluxLambda } from "@/app/[locale]/(public)/etc/lib/conversions";
import { SPEED_OF_LIGHT, ZERO_POINT } from "@/app/[locale]/(public)/etc/lib/physics";
import type { FilterEntry } from "@/app/[locale]/(public)/etc/lib/types";
import { MagnitudeUnit as MU } from "@/app/[locale]/(public)/etc/lib/types";

const C_NM = SPEED_OF_LIGHT * 1e9; // nm/s — igual ao usado em conversions.ts

function mockFilter(effWavelength: number, zeroPoint: number): FilterEntry {
  return { effWavelength, zeroPoint } as unknown as FilterEntry;
}

// ---------------------------------------------------------------------------
// Identidades dimensionais simples
// ---------------------------------------------------------------------------

describe("W/m²/μm → erg/s/cm²/nm", () => {
  it("retorna o valor sem alteração (1 W/m²/μm ≡ 1 erg/s/cm²/nm)", () => {
    expect(convertToFluxLambda(1, MU.W_M2_UM, 550, mockFilter(550, 0))).toBe(1);
    expect(convertToFluxLambda(7.3, MU.W_M2_UM, 800, mockFilter(800, 0))).toBe(7.3);
  });
});

describe("erg/s/cm²/Å → erg/s/cm²/nm", () => {
  it("multiplica por 10 (1 nm = 10 Å)", () => {
    expect(convertToFluxLambda(1, MU.ERGS_S_CM2_ANGSTROM, 550, mockFilter(550, 0))).toBe(10);
    expect(convertToFluxLambda(2.5, MU.ERGS_S_CM2_ANGSTROM, 550, mockFilter(550, 0))).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Magnitude AB
// ---------------------------------------------------------------------------

describe("magnitude AB", () => {
  const f = mockFilter(550, 0); // filtro não utilizado neste caso

  it("AB=0 reproduz a definição: F_ν = 10^{-0.4(m-ZERO_POINT)} × c/λ²", () => {
    const lambda = 550;
    const f_nu = 10 ** (-0.4 * (0 - ZERO_POINT));
    const expected = (f_nu * C_NM) / lambda ** 2;
    expect(convertToFluxLambda(0, MU.AB, lambda, f)).toBeCloseTo(expected, 15);
  });

  it("magnitude maior → fluxo menor (relação inversa)", () => {
    const bright = convertToFluxLambda(10, MU.AB, 550, f);
    const faint = convertToFluxLambda(20, MU.AB, 550, f);
    expect(bright).toBeGreaterThan(faint);
  });

  it("5 magnitudes de diferença = fator 100 em fluxo", () => {
    const f10 = convertToFluxLambda(10, MU.AB, 550, f);
    const f15 = convertToFluxLambda(15, MU.AB, 550, f);
    expect(f10 / f15).toBeCloseTo(100, 8);
  });

  it("F_λ ∝ 1/λ² para AB fixo (F_ν constante implica F_λ inversamente prop. a λ²)", () => {
    const f500 = convertToFluxLambda(15, MU.AB, 500, f);
    const f700 = convertToFluxLambda(15, MU.AB, 700, f);
    expect(f500 / f700).toBeCloseTo((700 / 500) ** 2, 8);
  });
});

// ---------------------------------------------------------------------------
// Magnitude aparente (sistema Vega)
// ---------------------------------------------------------------------------

describe("magnitude aparente", () => {
  const f = mockFilter(550, 3.631e-9);

  it("magnitude maior → fluxo menor", () => {
    expect(convertToFluxLambda(10, MU.APPARENT, 550, f)).toBeGreaterThan(
      convertToFluxLambda(15, MU.APPARENT, 550, f),
    );
  });

  it("5 magnitudes de diferença = fator 100 em fluxo", () => {
    const f10 = convertToFluxLambda(10, MU.APPARENT, 550, f);
    const f15 = convertToFluxLambda(15, MU.APPARENT, 550, f);
    expect(f10 / f15).toBeCloseTo(100, 8);
  });

  it("F_λ proporcional ao zeroPoint do filtro", () => {
    const f1 = convertToFluxLambda(12, MU.APPARENT, 550, mockFilter(550, 1e-9));
    const f2 = convertToFluxLambda(12, MU.APPARENT, 550, mockFilter(550, 2e-9));
    expect(f2 / f1).toBeCloseTo(2, 10);
  });
});

// ---------------------------------------------------------------------------
// Consistência entre unidades
// ---------------------------------------------------------------------------

describe("consistência entre unidades", () => {
  const f = mockFilter(550, 0);

  it("Jy e erg/s/cm²/Hz produzem o mesmo F_λ para fontes fisicamente equivalentes (1 Jy = 1e-23 erg/s/cm²/Hz)", () => {
    const fFromJy = convertToFluxLambda(1, MU.JY, 550, f);
    const fFromHz = convertToFluxLambda(1e-23, MU.ERGS_S_CM2_HZ, 550, f);
    // Falha indica que as duas fórmulas usam fatores de conversão diferentes.
    expect(fFromJy).toBeCloseTo(fFromHz, 5);
  });

  it("AB=0 (≡ 3631 Jy) deve produzir o mesmo F_λ que Jy=3631", () => {
    const fAB = convertToFluxLambda(0, MU.AB, 550, f);
    const fJy = convertToFluxLambda(3631, MU.JY, 550, f);
    // Falha indica bug na conversão de Jy → F_λ.
    expect(fJy / fAB).toBeCloseTo(1, 3);
  });
});

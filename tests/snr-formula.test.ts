/**
 * Testes da fórmula SNR em regimes analíticos limites.
 *
 * Fórmula (de calculate.ts):
 *   signal = C_s × √N_DIT
 *   noise  = √(C_s + C_b + N_pix × (RON² + DARK × DIT))
 *   SNR    = signal / noise
 *
 * A fórmula é implementada aqui diretamente para testar suas propriedades
 * matemáticas nos três regimes físicos documentados na Seção 3.3 do TCC:
 *   1. Dominado pela fonte  : SNR ≈ √(C_s × N_DIT)
 *   2. Dominado pelo fundo  : SNR ≈ C_s × √(N_DIT / C_b)
 *   3. Dominado pelo ruído  : SNR ≈ C_s × √(N_DIT) / (√N_pix × RON)
 */

import { describe, expect, it } from "vitest";

interface SNRParams {
  sourceCount: number;    // C_s [fótons por exposição]
  backgroundCount: number; // C_b [fótons por exposição]
  nDit: number;           // número de exposições
  nPix: number;           // pixels cobertos pela fonte
  ron: number;            // ruído de leitura [e⁻ rms]
  dark: number;           // corrente de escuro [e⁻/s]
  dit: number;            // tempo de exposição [s]
}

function computeSNR({ sourceCount: Cs, backgroundCount: Cb, nDit: N, nPix, ron, dark, dit }: SNRParams): number {
  const signal = Cs * Math.sqrt(N);
  const noise = Math.sqrt(Cs + Cb + nPix * (ron ** 2 + dark * dit));
  return signal / noise;
}

// ---------------------------------------------------------------------------
// Regime 1 — dominado pela fonte  (Poisson da fonte)
// ---------------------------------------------------------------------------

describe("regime dominado pela fonte (C_s >> C_b, C_s >> N_pix·RON²)", () => {
  it("SNR ≈ √(C_s × N_DIT) para C_s = 10 000, N_DIT = 1", () => {
    const Cs = 10_000;
    const snr = computeSNR({ sourceCount: Cs, backgroundCount: 0, nDit: 1, nPix: 1, ron: 0, dark: 0, dit: 1 });
    // SNR = Cs/√Cs = √Cs = 100
    expect(snr).toBeCloseTo(Math.sqrt(Cs), 6);
  });

  it("SNR cresce com √N_DIT: dobrar exposições aumenta SNR em √2", () => {
    const base = { sourceCount: 10_000, backgroundCount: 0, nPix: 1, ron: 0, dark: 0, dit: 1 };
    const snr1 = computeSNR({ ...base, nDit: 1 });
    const snr4 = computeSNR({ ...base, nDit: 4 });
    expect(snr4 / snr1).toBeCloseTo(2, 8); // √4 = 2
  });
});

// ---------------------------------------------------------------------------
// Regime 2 — dominado pelo fundo  (Poisson do fundo de céu)
// ---------------------------------------------------------------------------

describe("regime dominado pelo fundo (C_b >> C_s, C_b >> N_pix·RON²)", () => {
  it("SNR ≈ C_s × √(N_DIT / C_b) para C_s = 100, C_b = 1 000 000, N_DIT = 1", () => {
    const Cs = 100, Cb = 1_000_000;
    const snr = computeSNR({ sourceCount: Cs, backgroundCount: Cb, nDit: 1, nPix: 1, ron: 0, dark: 0, dit: 1 });
    const expected = Cs / Math.sqrt(Cb); // ≈ 0.1
    expect(snr).toBeCloseTo(expected, 4);
  });

  it("SNR proporcional a C_s quando C_b é fixo (regime extremo: C_s << C_b)", () => {
    // C_s = 1 << C_b = 1 000 000 → a contribuição de C_s ao ruído é desprezível
    const base = { backgroundCount: 1_000_000, nDit: 1, nPix: 1, ron: 0, dark: 0, dit: 1 };
    const snr1 = computeSNR({ ...base, sourceCount: 1 });
    const snr2 = computeSNR({ ...base, sourceCount: 2 });
    expect(snr2 / snr1).toBeCloseTo(2, 4);
  });
});

// ---------------------------------------------------------------------------
// Regime 3 — dominado pelo ruído de leitura
// ---------------------------------------------------------------------------

describe("regime dominado pelo ruído de leitura (N_pix·RON² >> C_s + C_b)", () => {
  it("SNR ≈ C_s × √N_DIT / (√N_pix × RON)", () => {
    const Cs = 10, nPix = 4, ron = 1_000;
    const snr = computeSNR({ sourceCount: Cs, backgroundCount: 0, nDit: 1, nPix, ron, dark: 0, dit: 1 });
    const expected = Cs / (Math.sqrt(nPix) * ron); // ≈ 0.005
    expect(snr).toBeCloseTo(expected, 6);
  });

  it("SNR inversamente proporcional ao RON (regime extremo: RON² >> C_s)", () => {
    // C_s = 1 << RON² = 10^8 → contribuição de Poisson ao ruído é desprezível
    const base = { sourceCount: 1, backgroundCount: 0, nDit: 1, nPix: 1, dark: 0, dit: 1 };
    const snr100 = computeSNR({ ...base, ron: 10_000 });
    const snr200 = computeSNR({ ...base, ron: 20_000 });
    expect(snr200 / snr100).toBeCloseTo(0.5, 4);
  });
});

// ---------------------------------------------------------------------------
// Propriedades gerais independentes do regime
// ---------------------------------------------------------------------------

describe("propriedades gerais", () => {
  it("SNR = 0 quando C_s = 0 (sem sinal)", () => {
    const snr = computeSNR({ sourceCount: 0, backgroundCount: 100, nDit: 4, nPix: 9, ron: 5, dark: 1, dit: 300 });
    expect(snr).toBe(0);
  });

  it("maior contagem de fundo → menor SNR (mantendo C_s fixo)", () => {
    const base = { sourceCount: 500, nDit: 1, nPix: 1, ron: 5, dark: 0, dit: 1 };
    const snrLow = computeSNR({ ...base, backgroundCount: 0 });
    const snrHigh = computeSNR({ ...base, backgroundCount: 100_000 });
    expect(snrLow).toBeGreaterThan(snrHigh);
  });

  it("mais exposições (N_DIT) sempre aumenta o SNR", () => {
    const base = { sourceCount: 200, backgroundCount: 1_000, nPix: 4, ron: 10, dark: 0.1, dit: 300 };
    const snr1 = computeSNR({ ...base, nDit: 1 });
    const snr4 = computeSNR({ ...base, nDit: 4 });
    const snr9 = computeSNR({ ...base, nDit: 9 });
    expect(snr4).toBeGreaterThan(snr1);
    expect(snr9).toBeGreaterThan(snr4);
  });
});

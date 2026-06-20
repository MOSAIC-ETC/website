import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

async function auditPage(page: Page, url: string, label: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  if (results.violations.length > 0) {
    console.log(`\n=== Violações em ${label} (${url}) ===\n`);
    for (const v of results.violations) {
      console.log(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
      console.log(`  Regra: ${v.helpUrl}`);
      console.log(`  Elementos afetados: ${v.nodes.length}`);
      for (const node of v.nodes) {
        console.log(`    - ${node.target.join(", ")}`);
        console.log(`      ${node.failureSummary?.split("\n")[0]}`);
      }
    }
  }

  const summary = {
    violations: results.violations.length,
    critical: results.violations.filter((v) => v.impact === "critical").length,
    serious: results.violations.filter((v) => v.impact === "serious").length,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
  };

  console.log(
    `\n[${label}] Resumo: ${summary.violations} violações (${summary.critical} críticas, ${summary.serious} sérias), ${summary.passes} aprovados, ${summary.incomplete} incompletos\n`,
  );

  return { results, summary };
}

test.describe("MOSAIC ETC — auditoria de acessibilidade WCAG 2.1 AA", () => {
  test("relatório: /pt/etc (aba SNR-Spectrum)", async ({ page }) => {
    const { summary } = await auditPage(page, "/pt/etc", "SNR-Spectrum");
    expect(summary.critical, "violações críticas em /pt/etc").toBe(0);
  });

  test("relatório: /pt/login", async ({ page }) => {
    const { summary } = await auditPage(page, "/pt/login", "Login");
    expect(summary.critical, "violações críticas em /pt/login").toBe(0);
  });

  test("relatório: /pt/etc (aba Mapa SNR)", async ({ page }) => {
    await page.goto("/pt/etc");
    await page.waitForLoadState("networkidle");
    await page.getByRole("tab", { name: /mapa snr/i }).click();
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    if (results.violations.length > 0) {
      console.log("\n=== Violações em aba Mapa SNR ===\n");
      for (const v of results.violations) {
        console.log(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.nodes.length} elemento(s) — ${v.helpUrl}`);
      }
    }

    console.log(`\n[Mapa SNR] Resumo: ${results.violations.length} violações (${critical.length} críticas, ${serious.length} sérias), ${results.passes.length} aprovados\n`);

    expect(critical.length, "violações críticas na aba Mapa SNR").toBe(0);
  });
});

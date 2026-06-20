import { chromium } from "@playwright/test";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/pt/etc");
  await page.waitForLoadState("networkidle");
  
  // Get all buttons with no accessible name
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => ({
      id: btn.id,
      ariaLabel: btn.getAttribute('aria-label'),
      ariaLabelledBy: btn.getAttribute('aria-labelledby'),
      role: btn.getAttribute('role'),
      innerText: btn.innerText?.slice(0, 50),
      className: btn.className?.slice(0, 80),
    }));
  });
  console.log(JSON.stringify(buttons, null, 2));
  await browser.close();
})();

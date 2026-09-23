/**
 * Screenshots the running app at seven viewports for design review, and
 * reports horizontal overflow / scroll state / background colour for each.
 *
 *   npm run build && npx next start -p 3410 -H 127.0.0.1
 *   BASE=http://127.0.0.1:3410 npm run shots
 *
 * Drives the locally installed Chrome through puppeteer-core, so there is no
 * browser download. Use 127.0.0.1 rather than localhost: Next binds IPv4 and
 * Chrome resolves localhost to ::1.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const OUT = process.env.OUT || "C:/Users/MOHAMM~1.MUZ/AppData/Local/Temp/shots";

const TARGETS = [
  { name: "mobile-landing", path: "/", w: 390, h: 844, dsf: 2 },
  { name: "mobile-home", path: "/chats", w: 390, h: 844, dsf: 2 },
  { name: "mobile-settings", path: "__settings__", w: 390, h: 844, dsf: 2 },
  { name: "mobile-chat", path: "__chat__", w: 390, h: 844, dsf: 2 },
  { name: "tablet-landing", path: "/", w: 834, h: 1112, dsf: 1 },
  { name: "desktop-landing", path: "/", w: 1440, h: 900, dsf: 1 },
  { name: "desktop-home", path: "/chats", w: 1440, h: 900, dsf: 1 },
  { name: "small-landing", path: "/", w: 360, h: 640, dsf: 2 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

for (const t of TARGETS) {
  const page = await browser.newPage();
  await page.setViewport({ width: t.w, height: t.h, deviceScaleFactor: t.dsf });
  try {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
    if (t.path === "/") {
      await page.evaluate(() => { try { localStorage.clear(); } catch {} });
      await page.reload({ waitUntil: "networkidle2", timeout: 45000 });
    }

    await new Promise((r) => setTimeout(r, 1500)); // hydration

    if (t.path === "__chat__") {
      // enter the app, then open the first seeded conversation
      await page.evaluate(() => {
        const b = document.querySelector('button[aria-label*="let" i], button[aria-label*="Start" i]');
        b?.click();
      });
      await new Promise((r) => setTimeout(r, 2500));
      const href = await page.evaluate(() => {
        const row = [...document.querySelectorAll("button")]
          .find((x) => /Acme|Vendor|Onboarding/i.test(x.textContent || ""));
        row?.click();
        return location.pathname;
      });
      await new Promise((r) => setTimeout(r, 2500));
      console.log(`  ${t.name}: at ${await page.evaluate(() => location.pathname)}`);
    } else if (t.path !== "/") {
      await page.evaluate(() => {
        const b = document.querySelector('button[aria-label*="Start" i]');
        b?.click();
      });
      await new Promise((r) => setTimeout(r, 2600));
      if (t.path === "__settings__") {
        await page.evaluate(() => {
          const s = [...document.querySelectorAll("a")]
            .find((a) => a.getAttribute("href") === "/chats/settings");
          s?.click();
        });
        await new Promise((r) => setTimeout(r, 1600));
      }
    }

    await new Promise((r) => setTimeout(r, 1200)); // let entrance animations settle

    const metrics = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      scrollH: document.documentElement.scrollHeight,
      clientH: document.documentElement.clientHeight,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      path: location.pathname,
    }));

    await page.screenshot({ path: `${OUT}/${t.name}.png` });
    const overflow = metrics.scrollW > metrics.clientW + 1;
    const scrolls = metrics.scrollH > metrics.clientH + 1;
    console.log(
      `  ${t.name.padEnd(17)} ${t.w}x${t.h}  path=${metrics.path.padEnd(8)}` +
        ` hOverflow=${overflow ? "YES <-- BAD" : "no "}` +
        ` vScroll=${scrolls ? "yes" : "no "}` +
        ` bg=${metrics.bodyBg}`,
    );
  } catch (e) {
    console.log(`  ${t.name}: FAILED ${e.message.slice(0, 90)}`);
  }
  await page.close();
}
await browser.close();
console.log("\nshots written to " + OUT);

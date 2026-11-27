// Plays levels 1–3 through the real UI at iPad size: answer the dispatcher on the keypad,
// lay the reference track by tapping, test run, midnight run, three stars.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const url = new URL("../public/index.html", import.meta.url).href + "?debug";
const shots = process.env.SHOTS || "";
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
const errors: string[] = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error" && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();

const ok = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };
const visible = (sel: string) => page.locator(sel).isVisible();

await page.click("#playBtn");
await page.click('.lvl[data-level="1"]');

for (let n = 1; n <= 3; n++) {
  // dispatcher orders, answered on the on-screen keypad / yes-no buttons
  await page.waitForSelector("#orders:not([hidden])", { timeout: 5000 });
  for (let guard = 0; guard < 6 && await visible("#orders"); guard++) {
    const o = await page.evaluate(() => { const G = (window as any).__ml.G, o = G.orders[G.oi]; return o.done ? null : { input: o.input, ans: String(o.ans) }; });
    if (!o) { await page.waitForTimeout(300); continue; }
    if (o.input === "yn") await page.click(`#oYN button[data-yn="${o.ans}"]`);
    else {
      for (const ch of o.ans.replace(":", "")) await page.click(`#oPad button[data-k="${ch}"]`);
      await page.click('#oPad button[data-k="✓"]');
    }
    await page.waitForTimeout(1200);
  }
  await page.waitForSelector("#orders", { state: "hidden", timeout: 5000 });

  // lay the reference solution square by square: pick the tool, tap, tap again to spin until it matches
  const pieces = await page.evaluate(() => (window as any).__ml.solutionPieces());
  for (const p of pieces) {
    await page.click(`.tool[data-tool="${p.k}"]`);
    const c = await page.evaluate(([x, y]) => (window as any).__ml.tileCenter(x, y), [p.x, p.y]);
    for (let tries = 0; tries < 5; tries++) {
      await page.mouse.click(c.x, c.y);
      const cur = await page.evaluate(i => (window as any).__ml.G.track[i], p.i);
      if (cur && cur.k === p.k && cur.r === p.r) break;
      ok(tries < 4, `level ${n}: couldn't set piece at ${p.x},${p.y}`);
    }
  }
  const cost = await page.evaluate(() => (window as any).__ml.trackCost());
  ok(await page.locator("#coins").innerText().then(t => t.includes(`${cost} spent`)), `level ${n}: coin counter doesn't show ${cost}`);

  // daylight test run
  await page.click("#testBtn");
  await page.waitForFunction(() => { const G = (window as any).__ml.G; return G.tested && !G.run; }, null, { timeout: 30000 });
  if (shots && n === 3) await page.screenshot({ path: `${shots}/level3-tested.png` });

  // midnight run
  await page.click("#nightBtn");
  if (shots && n === 3) { await page.waitForTimeout(4500); await page.screenshot({ path: `${shots}/level3-midnight.png` }); }
  await page.waitForSelector("#win:not([hidden])", { timeout: 40000 });
  const stars = await page.locator("#winStars span:not(.off)").count();
  ok(stars === 3, `level ${n}: ${stars} stars, want 3`);
  const best = await page.evaluate(k => (window as any).__ml.S.best[k], n - 1);
  ok(best === 3, `level ${n}: saved ${best} stars`);
  if (shots && n === 3) await page.screenshot({ path: `${shots}/level3-win.png` });
  console.log(`  ✓ level ${n}: orders, ${pieces.length} pieces (${cost} coins), test run, midnight run, ★★★`);
  if (n < 3) await page.click("#nextBtn");
}
// Drag painting the way a kid draws: one stroke out of the depot, lift, then a second stroke that
// starts on the empty corner square and has to bend to meet the first. Undo takes back the whole stroke.
{
  const ml = (fn: string, ...args: any[]) => page.evaluate(([f, a]) => (window as any).__ml[f](...a), [fn, args] as const);
  await page.click("#nextBtn").catch(() => {});
  await page.evaluate(() => { const m = (window as any).__ml; m.loadLevel(2); m.skipOrders(); });
  await page.click('.tool[data-tool="s"]');
  const drag = async (pts: number[][]) => {
    let c = await ml("tileCenter", ...pts[0]); await page.mouse.move(c.x, c.y); await page.mouse.down();
    for (const [x, y] of pts.slice(1)) { c = await ml("tileCenter", x, y); await page.mouse.move(c.x, c.y, { steps: 3 }); }
    await page.mouse.up();
  };
  await drag([[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]]);
  await drag([[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6]]);
  const corner = await page.evaluate(() => (window as any).__ml.G.track[1 * 12 + 6]);
  ok(corner && corner.k === "c", `second stroke's first square should curve into the first stroke, got ${JSON.stringify(corner)}`);
  ok((await ml("runAll")).ok, "two drag strokes should make a working line");
  await page.click("#undoBtn");
  const left = await page.evaluate(() => (window as any).__ml.G.track.filter(Boolean).length);
  ok(left === 4, `undo should remove the whole second stroke, ${left} pieces left`);
  console.log("  ✓ drag strokes join around a corner; undo removes one stroke");
}

// Midnight monsters on Loop Street (a whole graveyard in the middle): leave them alone and they catch
// the train; tap every one as it climbs out and the Midnight Express gets home.
{
  await page.evaluate(() => { const m = (window as any).__ml; m.loadLevel(13); m.solve(); m.G.tested = true; });
  await page.click("#nightBtn");
  await page.waitForFunction(() => (window as any).__ml.monsters().length > 0, null, { timeout: 5000 });
  await page.waitForSelector("#derail:not([hidden])", { timeout: 30000 });
  ok(await page.locator("#derailTitle").innerText() === "Caught!", "untouched monsters should catch the train");
  if (shots) await page.screenshot({ path: `${shots}/caught.png` });
  await page.click("#retryBtn");
  let taps = 0;
  for (let guard = 0; guard < 400 && !(await visible("#win")) && !(await visible("#derail")); guard++) {
    for (const m of await page.evaluate(() => (window as any).__ml.monsters())) { await page.mouse.click(m.x, m.y); taps++; }
    if (shots && guard === 25) await page.screenshot({ path: `${shots}/monsters.png` });
    await page.waitForTimeout(80);
  }
  ok(await visible("#win"), "zapping every monster should get the train home");
  const run = await page.evaluate(() => { const R = (window as any).__ml.G.lastRun; return { zaps: R.zaps, lanterns: R.lanterns }; });
  ok(run.zaps >= 2 && run.lanterns === 3, `zapped ${run.zaps}, ${run.lanterns} lanterns left`);
  ok((await page.locator("#winMon").innerText()).includes(`${run.zaps} zapped`), "win card should count the zaps");
  console.log(`  ✓ midnight monsters: untouched they catch the train; ${run.zaps} zapped (${taps} taps) and it gets home`);
}

// Every level's reference line fits its budget in the real HUD: the coin counter never goes negative.
{
  const n = await page.evaluate(() => (window as any).__ml.LEVELS.length);
  for (let k = 1; k <= n; k++) {
    const r = await page.evaluate((k) => { const m = (window as any).__ml; m.loadLevel(k); m.solve(); return { ok: m.runAll().ok, coins: document.getElementById("coins")!.innerText, budget: m.G.L.budget }; }, k);
    const left = Number((r.coins.match(/(-?\d+) left/) || [])[1]);
    ok(r.ok && left >= 0, `level ${k}: reference line shows "${r.coins}" (runs: ${r.ok})`);
    if (shots && k > 18) await page.screenshot({ path: `${shots}/level${k}.png` });
  }
  console.log(`  ✓ all ${n} levels: the reference line runs with coins to spare in the HUD`);
}

const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("midnightline.v1") || "{}").best);
ok(saved && saved[0] === 3 && saved[2] === 3, "progress not saved to localStorage midnightline.v1");
ok(!errors.length, "page errors:\n" + errors.join("\n"));
await browser.close();
console.log("playthrough: levels 1–3 cleared with three stars");

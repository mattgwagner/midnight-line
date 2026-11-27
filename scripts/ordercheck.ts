// Every generated order's stated answer must match the arithmetic in its own text.
import { loadCore } from "./core.ts";

const C = loadCore();
let seed = 12345;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let bad = 0, count = 0;
const kinds: Record<string, number> = {}, yn: Record<string, Set<string>> = {};
const fail = (o: any, msg: string) => { if (bad++ < 20) console.log(`  ✗ ${o.kind}: "${o.text}" → ${o.ans}: ${msg}`); };
const nums = (s: string) => (s.match(/\d+(?::\d\d)?/g) || []);

function check(o: any) {
  count++; kinds[o.kind] = (kinds[o.kind] || 0) + 1;
  const n = nums(o.text);
  let want: any;
  switch (o.kind) {
    case "afford": {   // "You have C coins. Can you buy a bridge|tunnel and N curves|straights?"
      const [Cn, N] = n.map(Number), base = /bridge/.test(o.text) ? 5 : /tunnel/.test(o.text) ? 6 : NaN;
      want = base + N <= Cn ? "yes" : "no"; break;
    }
    case "spend": { const [a, b] = n.map(Number); want = a + b; break; }
    case "left": { const [Cn, a] = n.map(Number); want = Cn - a; if (want < 0) fail(o, "negative coins"); break; }
    case "tons": { const [cars, per] = n.map(Number); want = cars * per; if (cars > 12 || per > 12) fail(o, "outside 12×12"); break; }
    case "pull": {
      const [cars, per, limit] = n.map(Number);
      want = cars * per <= limit ? "yes" : "no";
      if (cars > 12 || per > 12) fail(o, "outside 12×12");
      break;
    }
    case "trips": { const [P, per] = n.map(Number); want = P / per; if (!Number.isInteger(want) || want > 12 || per > 12) fail(o, "not a 12×12 division fact"); break; }
    case "area": { const [long, wide] = n.map(Number); want = long * wide; if (long > 12 || wide > 12) fail(o, "outside 12×12"); break; }
    case "fence": { const [long, wide] = n.map(Number); want = 2 * (long + wide); if (wide > long) fail(o, "wider than it is long"); break; }
    case "time": {
      const [start, dur] = n, [h, m] = start.split(":").map(Number), t = h * 60 + m + Number(dur);
      let hh = Math.floor(t / 60) % 12; if (hh === 0) hh = 12;
      want = `${hh}:${String(t % 60).padStart(2, "0")}`;
      if (Number(dur) % 5 || Number(dur) < 5 || Number(dur) > 55) fail(o, "odd trip length");
      break;
    }
    default: fail(o, "unknown kind");
  }
  if (want !== o.ans) fail(o, `text says ${want}`);
  if (o.input === "yn") (yn[o.kind] ||= new Set()).add(o.ans);
  // the answer box accepts the stated answer, and rejects a near miss
  const typed = o.input === "time" ? o.ans.replace(":", "") : o.ans;
  if (!C.checkAnswer(o, typed)) fail(o, "checkAnswer rejects the right answer");
  const misses = o.input === "yn" ? [o.ans === "yes" ? "no" : "yes"] : o.input === "time" ? timeMisses(o.text) : [o.ans + 1, o.ans - 1];
  for (const miss of misses) if (C.checkAnswer(o, miss)) fail(o, `checkAnswer accepts ${miss}`);
}

// The slips a kid makes on elapsed time: forgetting to carry the hour, carrying it twice, or an hour off.
function timeMisses(text: string) {
  const [start, dur] = nums(text), [h, m] = start.split(":").map(Number), mm = m + Number(dur);
  const wrap = (x: number) => { let hh = Math.floor(x / 60) % 12; if (hh === 0) hh = 12; return `${hh}${String(x % 60).padStart(2, "0")}`; };
  const right = h * 60 + mm;
  const out = [`${h}${String(mm % 60).padStart(2, "0")}`, wrap(right + 60), wrap(right + 660)];
  if (mm < 100) out.push(`${h}${mm}`);   // "3:65"
  return out.filter(x => x !== wrap(right));
}

const mem = C.newMem();
for (let round = 0; round < 400; round++) {
  for (let idx = 0; idx < C.LEVELS.length; idx++) {
    const os = C.levelOrders(idx, mem, rnd);
    if (os.length !== C.LEVELS[idx].orders) fail(os[0] || { kind: "?" }, `level ${idx + 1} got ${os.length} orders`);
    const reg = C.regionOf(idx), allowed = [["afford", "spend", "left"], ["tons", "pull", "time"], ["trips", "time", "pull"], ["area", "fence", "trips", "time", "pull"]][reg];
    for (const o of os) {
      if (!allowed.includes(o.kind)) fail(o, `not a region ${reg + 1} order`);
      if (o.kind === "time" && idx < 9) fail(o, "time orders start in region 2's later levels");
      check(o);
      C.recordOrder(o, rnd() < 0.85, mem);   // mostly right, so tables unlock over time
    }
  }
}
for (const k of ["afford", "pull"]) if (!yn[k] || yn[k].size !== 2) { bad++; console.log(`  ✗ ${k} orders never answer both yes and no`); }
console.log(`ordercheck: ${count} orders · ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(" · ")} · tables unlocked ${mem.tier}/11`);
console.log(bad ? `ordercheck: ${bad} problem(s)` : "ordercheck: every answer matches its numbers");
process.exit(bad ? 1 : 0);

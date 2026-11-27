// Every level must be solvable: lay its reference solution, plan the run, and check the result independently.
import { loadCore } from "./core.ts";

const C = loadCore();
const { W, H } = C;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], OPP = [2, 3, 0, 1];
let bad = 0;
const fail = (n: number, msg: string) => { bad++; console.log(`  ✗ level ${n}: ${msg}`); };

function stepDir(a: number, b: number) {
  for (let d = 0; d < 4; d++) { const x = (a % W) + DX[d], y = Math.floor(a / W) + DY[d]; if (x >= 0 && y >= 0 && x < W && y < H && y * W + x === b) return d; }
  return -1;
}

// Independent walk of a planned path: every move follows connected track both ways, and stops are all visited.
function walk(G: any, path: number[], stops: number[], from: number, back: boolean, noReverse: boolean) {
  if (path[0] !== from) return "does not start at its depot";
  const seen = new Set<number>();
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1], b = path[k];
    if (a === b) continue;   // waiting at a signal
    const d = stepDir(a, b);
    if (d < 0) return `jumps from ${a} to ${b}`;
    if (!(C.conn(G, a) >> d & 1) || !(C.conn(G, b) >> OPP[d] & 1)) return `crosses a gap between ${a} and ${b}`;
    seen.add(b);
  }
  // a train may only turn back at a dead-end station, and never on a no-reverse level
  const moves = path.filter((t, k) => k === 0 || t !== path[k - 1]);
  for (let k = 1; k < moves.length - 1; k++) {
    if (moves[k - 1] !== moves[k + 1]) continue;
    const t = moves[k], st = G.L.stAt[t];
    if (noReverse) return `backs up at ${t} on a no-reverse level`;
    if (!st) return `turns back mid-track at ${t}`;
    const linked = [0, 1, 2, 3].filter(e => {
      const x = (t % W) + DX[e], y = Math.floor(t / W) + DY[e];
      return (st.mask >> e & 1) && x >= 0 && y >= 0 && x < W && y < H && (C.conn(G, y * W + x) >> OPP[e] & 1);
    });
    if (linked.length > 1) return `turns back at through-station ${st.id}`;
  }
  const miss = stops.filter(s => !seen.has(s));
  if (miss.length) return `never reaches ${miss.join(",")}`;
  if (back && path[path.length - 1] !== from) return "doesn't come home";
  return "";
}

const total = C.LEVELS.length;
console.log(`levelcheck: ${total} levels`);
if (total !== 24) { bad++; console.log(`  ✗ expected 24 levels, found ${total}`); }
C.LEVELS.forEach((def: any, idx: number) => {
  const n = idx + 1;
  if (def.map.length !== H || def.map.some((r: string) => r.length !== W)) return fail(n, "map is not 12×8");
  if (!def.sol || def.sol.length !== H || def.sol.some((r: string) => r.length !== W)) return fail(n, "solution is not 12×8");
  for (const r of def.map) for (const ch of r) if (!C.TERRAIN.includes(ch) && !/[A-Fa-f]/.test(ch)) fail(n, `unknown map char ${ch}`);
  const L = C.makeLevel(def, idx), G = C.newGame(L);
  C.applySolution(G);
  def.sol.forEach((row: string, y: number) => [...row].forEach((ch, x) => {
    const i = y * W + x;
    if (C.SOL[ch] && !C.canPlace(L, i, C.SOL[ch][0])) fail(n, `solution piece ${ch} at ${x},${y} can't go on ${L.stAt[i] ? "a station" : L.terr[i]}`);
    if (/[A-Fa-f]/.test(ch) && def.map[y][x] !== ch) fail(n, `solution station ${ch} at ${x},${y} isn't on the map`);
  }));
  const ids = new Set<string>();
  for (const tr of L.trains) { ids.add(tr.from); tr.stops.forEach((s: string) => ids.add(s)); }
  if (ids.size !== L.stations.length) fail(n, "some station isn't served by any train");
  if (def.orders < 1 || def.orders > 3) fail(n, `${def.orders} orders (want 1–3)`);
  if (def.beat && !C.BEATS.includes(def.beat)) fail(n, `unknown beat ${def.beat}`);
  if (idx < 3 && def.beat) fail(n, "spooky beat on levels 1–3");
  if (idx >= 3 && !def.map.join("").includes("g")) fail(n, "no tombstones, so no midnight monsters");

  const cost = C.trackCost(G);
  if (cost > def.budget) fail(n, `solution costs ${cost}, budget ${def.budget}`);
  const res = C.runAll(G);
  if (!res.ok) return fail(n, `reference solution doesn't run (${JSON.stringify(res.trains.map((t: any) => t.fail))})`);
  res.trains.forEach((t: any, k: number) => {
    const tr = L.trains[k], why = walk(G, t.path, tr.stops.map((s: string) => L.byId[s].i), L.byId[tr.from].i, !!L.back, !!L.noReverse);
    if (why) fail(n, `train ${k + 1} ${why}`);
  });
  if (res.trains.length === 2) {   // trains never share a square at the same moment, or swap squares
    const [a, b] = res.trains.map((t: any) => t.path), at = (p: number[], t: number) => p[Math.min(t, p.length - 1)];
    for (let t = 0; t < Math.max(a.length, b.length) + 2; t++) {
      if (at(a, t) === at(b, t)) { fail(n, `trains meet at ${at(a, t)} on tick ${t}`); break; }
      if (t && at(a, t) === at(b, t - 1) && at(b, t) === at(a, t - 1)) { fail(n, `trains swap on tick ${t}`); break; }
    }
  }
  const empty = C.runAll(C.newGame(L));
  if (empty.ok) fail(n, "an empty board already passes");
  console.log(`  ✓ ${String(n).padStart(2)} ${def.name.padEnd(16)} ${String(cost).padStart(2)}/${String(def.budget).padEnd(2)} coins  ${res.trains.map((t: any) => t.path.length - 1).join("+")} ticks${def.beat ? "  " + def.beat : ""}`);
});
// Sandbox: unlimited coins, no orders, and the train should visit what it can reach.
{
  const L = C.makeLevel(C.SANDBOX, -1);
  if (L.budget !== Infinity || C.SANDBOX.orders) { bad++; console.log("  ✗ sandbox should be free with no orders"); }
}
console.log(bad ? `levelcheck: ${bad} problem(s)` : "levelcheck: all levels solvable within budget");
process.exit(bad ? 1 : 0);

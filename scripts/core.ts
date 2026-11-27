// Evaluates the DOM-free core block of public/index.html so checks run against the shipped code.
import { readFileSync } from "node:fs";

const NAMES = ["W", "H", "LEVELS", "SANDBOX", "BEATS", "SOL", "TERRAIN", "makeLevel", "newGame", "applySolution", "runAll", "trackCost", "canPlace", "conn", "levelOrders", "recordOrder", "checkAnswer", "newMem", "regionOf"];

export function loadCore(): any {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const m = html.match(/\/\/ ==CORE==([\s\S]*?)\/\/ ==\/CORE==/);
  if (!m) throw new Error("core block not found");
  return new Function(`"use strict";${m[1]}\nreturn { ${NAMES.join(", ")} };`)();
}

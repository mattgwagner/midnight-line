# Midnight Line

A spooky railroad builder in one HTML file. Lay track across a foggy map, answer the dispatcher's cargo orders, test your line in daylight, then watch the Midnight Express run it at midnight.

- **18 levels** in three regions: Foggy Valley (straights, curves, bridges; coin orders), Haunted Mine (tunnels, switches, branch lines; multiplication orders), Ghost Town (loops, two trains on one line; division and timetable orders).
- **Pieces:** straight 1, curve 1, switch 3, bridge 5 (river only), tunnel 6 (mountain only). Trains back out of dead-end stations, except on the Ghost Town loop levels.
- **Stars:** ★ every station connected, ★ within budget, ★ every order right the first time.
- **Orders** pick numbers with a light Leitner box per fact. Times tables unlock in Door Codes' order (2, 10, 5, 3, 4, …).
- **Sandbox** (unlocks after Foggy Valley) and a **Train Yard** of engine and car skins earned with stars.

Progress lives in the browser's localStorage (`midnightline.v1`). All art and sound are drawn and synthesized in code (Canvas 2D + Web Audio), no assets.

## Run locally

```sh
bun server.ts                # http://127.0.0.1:4849
HOST=0.0.0.0 bun server.ts   # reachable from other devices on your network
```

Or open `public/index.html` in a browser.

## Deploy

Static assets on Cloudflare Workers (Red Leg Dev), live at https://midnight-line.mattgwagner.workers.dev:

```sh
npm install
npm run deploy
```

## Testing

```sh
npm run levelcheck    # every level's reference solution runs within budget
npm run ordercheck    # every generated order's answer matches the numbers in its text
npm run playthrough   # Playwright plays levels 1–3 through the UI at iPad size (/usr/bin/chromium)
npm run check         # all three
```

The checks evaluate the `// ==CORE==` block of `public/index.html` directly, so keep that block free of DOM code.

`?debug` exposes `window.__ml` (`S` save, `G` level state, `loadLevel(n)` with 0 = Sandbox, `solve()`, `skipOrders()`, `runAll()`, `tileCenter(x, y)`). `?test=midnight|derail|orders` stages that event straight away.

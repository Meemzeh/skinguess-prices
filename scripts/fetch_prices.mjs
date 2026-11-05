// Collects the current lowest Steam Community Market price of every CS2 skin, per wear, into prices.json for
// SKINGUESS (skinguess.eu). Runs in GitHub Actions (.github/workflows/prices.yml) in this public repository; the
// result is force-pushed to the `prices` branch and the site reads it from raw.githubusercontent.com.
//
// Steam has no official market API. This walks the market's search results (100 listings per request, only the
// skin categories) slowly and politely. If Steam answers "too many requests", it waits and retries; pages that
// still fail keep the price from the previous run, so a bad run never wipes the list.
//
// Usage: node scripts/fetch_prices.mjs <old prices.json or missing> <new prices.json>
import fs from 'node:fs';

const [, , OLD, OUT] = process.argv;
const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const TYPES = ['Pistol', 'SMG', 'Rifle', 'SniperRifle', 'Shotgun', 'Machinegun', 'Knife'].map(t => 'tag_CSGO_Type_' + t).concat(['tag_Type_Hands', 'tag_CSGO_Tool_Taser']);
const QUALITY = ['tag_normal', 'tag_tournament', 'tag_unusual'];   // normal, Souvenir, ★ (knives/gloves). No StatTrak.
const PAGE = Number(process.env.PAGE || 100), PAUSE = Number(process.env.PAUSE_MS || 12000), MAX_MINUTES = Number(process.env.MAX_MINUTES || 80);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function url(start) {
  const p = new URLSearchParams({ query: '', start: String(start), count: String(PAGE), search_descriptions: '0', sort_column: 'name', sort_dir: 'asc', appid: '730', norender: '1' });
  TYPES.forEach(t => p.append('category_730_Type[]', t));
  QUALITY.forEach(q => p.append('category_730_Quality[]', q));
  return (process.env.STEAM_BASE || 'https://steamcommunity.com') + '/market/search/render/?' + p;   // STEAM_BASE: tests only
}

// "Souvenir AWP | Dragon Lore (Factory New)" -> { sv: true, name: "AWP | Dragon Lore", wear: 0 }
export function parseName(hash) {
  const m = /^(.*) \(([^()]+)\)$/.exec(hash || '');
  if (!m) return null;
  const wear = WEARS.indexOf(m[2]);
  if (wear < 0) return null;
  let name = m[1], sv = false;
  if (name.includes('StatTrak')) return null;
  if (name.startsWith('Souvenir ')) { sv = true; name = name.slice(9); }
  return { sv, name, wear };
}

async function page(start) {
  let wait = 60000;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(url(start), { headers: { 'Accept': 'application/json', 'Accept-Language': 'en', 'User-Agent': 'Mozilla/5.0 (compatible; skinguess-prices/1.0; +https://skinguess.eu)' } });
      if (r.status === 429 || r.status >= 500) throw new Error('HTTP ' + r.status);
      if (!r.ok) throw new Error('HTTP ' + r.status + ' (not retried)');
      const j = await r.json();
      if (!j || !j.success || !Array.isArray(j.results)) throw new Error('bad answer');
      return j;
    } catch (e) {
      console.log(`  page ${start}: ${e.message} (attempt ${attempt})`);
      if (/not retried/.test(e.message)) return null;
      await sleep(Number(process.env.RETRY_MS || wait)); wait = Math.min(wait * 2, 300000);
    }
  }
  return null;
}

async function main() {
  let old = {};
  try { old = JSON.parse(fs.readFileSync(OLD, 'utf8')); } catch (e) { }
  const prices = JSON.parse(JSON.stringify(old.usd || {})), souvenir = JSON.parse(JSON.stringify(old.sv || {}));
  const t0 = Date.now();
  // Steam answers at most 10 listings per request to anonymous visitors, whatever count asks for, so step by what
  // actually came back. A run stops after MAX_MINUTES and the next run continues at the saved position.
  let total = Infinity, got = 0, failed = 0, start = Number(old.next) || 0, requests = 0, firstStart = start;
  while (start < total) {
    if ((Date.now() - t0) / 60000 > MAX_MINUTES) { console.log('time is up, keeping the rest from the previous run'); break; }
    const j = await page(start);
    requests++;
    if (j) {
      total = j.total_count;
      if (requests === 1) console.log(`total listings: ${total}, starting at ${start}, Steam gave ${j.results.length} per request`);
      for (const it of j.results) {
        const p = parseName(it.hash_name);
        if (!p) continue;
        const map = p.sv ? souvenir : prices;
        (map[p.name] = map[p.name] || [null, null, null, null, null])[p.wear] = it.sell_listings ? it.sell_price : null;   // US cents; nobody selling: no price
        got++;
      }
    } else failed++;
    if (failed >= 6 && !got) { console.log('Steam keeps refusing, stopping; the old prices stay'); break; }
    start += (j && j.results.length) || PAGE;
    if (start < total) await sleep(PAUSE);
  }
  const next = start >= total ? 0 : start;                 // where the next run continues (0 = start over)
  const out = { updated: got ? new Date().toISOString() : (old.updated || null), next, total: isFinite(total) ? total : (old.total || null), currency: 'USD', source: 'Steam Community Market, lowest listing', usd: prices, sv: souvenir };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`done: ${requests} requests from ${firstStart} to ${start} of ${total}, ${got} listings read, ${failed} requests failed, ${Object.keys(prices).length} skins, ${Object.keys(souvenir).length} souvenir skins, next run starts at ${next}`);
  if (!got && !old.updated) process.exitCode = 1;
}

if (import.meta.url === 'file://' + process.argv[1]) main();

# skinguess-prices

Lowest Steam Community Market prices for every CS2 skin, per wear, for [SKINGUESS](https://skinguess.eu).

- `scripts/fetch_prices.mjs` walks the Steam Market search results for the skin categories. Steam answers
  anonymous requests with 10 listings at a time (about 12,000 listings in total), so a run reads for at most
  45 minutes and the next run continues where it stopped. "Too many requests" means waiting and retrying;
  a listing that could not be read keeps its previous price.
- `.github/workflows/prices.yml` runs every 2 hours (and on demand from the Actions tab) and force-pushes the
  result as a single commit to the **`prices`** branch, so the history does not grow.
- The site reads `https://raw.githubusercontent.com/Meemzeh/skinguess-prices/prices/prices.json`.

`prices.json`: `{ updated, next, total, currency: "USD", usd: { "<skin>": [FN, MW, FT, WW, BS] }, sv: { ...Souvenir } }`,
prices in US cents, `null` when nobody is selling that wear. StatTrak is not included and Steam does not split
Doppler phases.

If GitHub ever pauses the schedule (it does that after 60 days without activity), turn it back on in the
Actions tab. Steam has no official market API; this uses its public search results and can break if Steam
changes them.

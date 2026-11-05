import test from 'node:test';
import assert from 'node:assert/strict';
import { parseName } from '../scripts/fetch_prices.mjs';

test('market names are read into skin + wear', () => {
  assert.deepEqual(parseName('AK-47 | Redline (Field-Tested)'), { sv: false, name: 'AK-47 | Redline', wear: 2 });
  assert.deepEqual(parseName('★ Karambit | Doppler (Factory New)'), { sv: false, name: '★ Karambit | Doppler', wear: 0 });
  assert.deepEqual(parseName('Souvenir AWP | Dragon Lore (Battle-Scarred)'), { sv: true, name: 'AWP | Dragon Lore', wear: 4 });
  assert.equal(parseName('StatTrak™ AK-47 | Redline (Field-Tested)'), null);
  assert.equal(parseName('★ Karambit'), null);
  assert.equal(parseName('Sticker | Titan (Holo) | Katowice 2014'), null);
});

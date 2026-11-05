import test from 'node:test';
import assert from 'node:assert/strict';
import { parseName, parseEcb } from '../scripts/fetch_prices.mjs';

test('market names are read into skin + wear', () => {
  assert.deepEqual(parseName('AK-47 | Redline (Field-Tested)'), { sv: false, name: 'AK-47 | Redline', wear: 2 });
  assert.deepEqual(parseName('★ Karambit | Doppler (Factory New)'), { sv: false, name: '★ Karambit | Doppler', wear: 0 });
  assert.deepEqual(parseName('Souvenir AWP | Dragon Lore (Battle-Scarred)'), { sv: true, name: 'AWP | Dragon Lore', wear: 4 });
  assert.equal(parseName('StatTrak™ AK-47 | Redline (Field-Tested)'), null);
  assert.equal(parseName('★ Karambit'), null);
  assert.equal(parseName('Sticker | Titan (Holo) | Katowice 2014'), null);
});

test('the ECB euro rate is read from its daily XML', () => {
  const xml = "<Cube><Cube time='2026-11-05'><Cube currency='USD' rate='1.0812'/><Cube currency='JPY' rate='165.2'/></Cube></Cube>";
  assert.deepEqual(parseEcb(xml), { rate: 1.0812, date: '2026-11-05' });
  assert.equal(parseEcb('<html>error</html>'), null);
  assert.equal(parseEcb(''), null);
});

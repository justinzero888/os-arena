import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Only the owner-validated Phase 4 Extreme boards are accepted here.
const APPROVED = new Set([
  "7137c7942b830ab8df743112b355f05ae007684462f6f5985cf0afcd3cd64538",
  "ab244f5cf8e664036c39c138077a6a2a5b1c0df10c8e86944da7bf7f60f0f1c6",
  "6ff449ca5910568523c8ae3aced9a4e63ade87675d494ced2cef6889ad9d2a47",
  "50aaa2388b9943e304b6c399806a8a52ebd50c77b203b87173764f5f65d9e53c",
  "4a8470b82222e4e10e1fd879225f4720603ef5c17c10d8cbd758e03dc7a37745",
  "df3d69a2701f30d68d1497046a26b2c140148cafd9092419e6060230d5a0ed79",
  "af80060c16104c370a33f6d5504f3ee2d929a35acc2085daae7fa5adad7b1ba6",
  "fa15b31886f37328ac1645e636ba5a3e0af4b39a18caabde1ca15e8fac572095",
  "b054b9e94dfbbe7564ff8be5c64ecc81c4980e0a2fc68418bb6d9d31460bc298",
  "f3040b43cb8f66b48778158e257c5ba76195fe4441f79a175ddf82ed70c4f78b",
  "624819e0fe3969f2f2aba592894d4c775c81d8e82c3327d3672f2551030c1d9f",
  "41248e883093c0dab4426b9c5639642ef390a834b5d2b6a4f833a3d95d3c21d5",
  "16293d90ca5bfb2b92f7dbe94862be5c7eb25ad8ff9dc650ad57c8a5c34cdf60",
  "d4c9f346c2618071de524db0951b0b9ae040c2399e809155c3add0c80d6bb166",
  "a569578141d0c74f24ada6e9e0dbc143699e05c4e87cf371508ff623ab04ab7b",
  "2a1a765cecd6c915187cb72f6e4dc4241e868aa2972e4f4cd774d7c124420878"
]);
const digest = value => createHash('sha256').update(value).digest('hex');
function solve(givens) {
  const cells = [...givens].map(Number); const solutions = [];
  function visit() {
    if (solutions.length > 1) return;
    let best = -1, choices = null;
    for (let i = 0; i < 81; i++) {
      if (cells[i]) continue;
      const row = Math.floor(i / 9), col = i % 9;
      const used = new Set(Array.from({ length: 9 }, (_, k) => cells[row * 9 + k]).concat(
        Array.from({ length: 9 }, (_, k) => cells[k * 9 + col]),
        Array.from({ length: 9 }, (_, k) => cells[(Math.floor(row / 3) * 3 + Math.floor(k / 3)) * 9 + Math.floor(col / 3) * 3 + k % 3])));
      const next = [1,2,3,4,5,6,7,8,9].filter(value => !used.has(value));
      if (!next.length) return;
      if (!choices || next.length < choices.length) { best = i; choices = next; }
    }
    if (best < 0) { solutions.push(cells.join('')); return; }
    for (const value of choices) { cells[best] = value; visit(); cells[best] = 0; }
  }
  visit();
  if (solutions.length !== 1) throw new Error('Extreme supply puzzle must have exactly one solution');
  return solutions[0];
}
export function loadExtremeSupply(path = process.env.ARENA_EXTREME_SUPPLY || new URL('../.arena-extreme-supply.json', import.meta.url)) {
  let data; try { data = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new Error('Local Extreme puzzle supply is unavailable'); }
  if (data.tier !== 'Extreme' || !Array.isArray(data.puzzles) || !data.puzzles.length) throw new Error('Invalid Extreme puzzle supply');
  const seen = new Set();
  return data.puzzles.map(({ givens }) => {
    if (typeof givens !== 'string' || !/^[0-9]{81}$/.test(givens) || !APPROVED.has(digest(givens)) || seen.has(givens)) throw new Error('Unapproved or duplicate Extreme puzzle');
    seen.add(givens); return { givens, solution: solve(givens) };
  });
}

#!/usr/bin/env node
/**
 * build-asia-financials-samples.mjs - writes two sample CSV files for the Japan and Taiwan financials tapes.
 *   public/data/japan-financials-sample.csv   (first 100 companies by securities code)
 *   public/data/taiwan-financials-sample.csv  (first 100 companies by securities code)
 * Same columns as /v1/japan-financials and /v1/taiwan-financials. Empty cells stay empty, never 0.
 *
 *   node scripts/build-asia-financials-samples.mjs
 *   node scripts/build-asia-financials-samples.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const JAPAN_COLS = ['code', 'edinet_code', 'name', 'name_en', 'sector', 'year', 'period_end', 'basis', 'assets_jpy', 'equity_jpy',
  'revenue_jpy', 'operating_profit_jpy', 'net_profit_jpy', 'shares', 'bps_jpy', 'eps_jpy', 'per', 'price_jpy', 'market_cap_jpy'];
export const TAIWAN_COLS = ['code', 'name', 'name_en', 'industry_code', 'industry_en', 'listed_on', 'year', 'quarter', 'revenue_twd',
  'operating_profit_twd', 'pretax_profit_twd', 'net_profit_twd', 'assets_twd', 'liabilities_twd', 'equity_twd', 'bps_twd',
  'close_twd', 'price_date', 'per', 'pbr', 'dividend_yield_pct', 'market_cap_twd'];
export const cell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const csv = (rows, cols, n = 100) => [cols.join(','), ...[...rows].sort((a, b) => String(a.code).localeCompare(String(b.code))).slice(0, n)
  .map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';

if (process.argv.includes('--selftest')) {
  const t = [];
  const ok = (name, v) => t.push([name, !!v]);
  ok('null is an empty cell, not 0', cell(null) === '' && cell(undefined) === '' && cell(0) === '0');
  ok('commas and quotes are quoted', cell('a,b') === '"a,b"' && cell('a"b') === '"a""b"');
  const out = csv([{ code: '2', x: 1 }, { code: '1', x: null }], ['code', 'x']);
  ok('sorted by code, header first', out === 'code,x\n1,\n2,1\n');
  ok('row cap is honoured', csv([{ code: '1' }, { code: '2' }, { code: '3' }], ['code'], 2).trim().split('\n').length === 3);
  ok('no representative or officer names in the column lists', ![...JAPAN_COLS, ...TAIWAN_COLS].some((c) => /^rep_|chairman|president/.test(c)));
  for (const [n, v] of t) console.log((v ? 'ok   ' : 'FAIL ') + n);
  process.exit(t.every(([, v]) => v) ? 0 : 1);
}
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', f), 'utf8')).rows;
for (const [tape, cols, out] of [['japan-financials-tape.json', JAPAN_COLS, 'japan-financials-sample.csv'], ['taiwan-financials-tape.json', TAIWAN_COLS, 'taiwan-financials-sample.csv']]) {
  const rows = read(tape);
  fs.writeFileSync(path.join(root, 'public/data', out), csv(rows, cols));
  console.log(out + ' - 100 of ' + rows.length + ' rows, ' + cols.length + ' columns');
}

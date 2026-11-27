#!/usr/bin/env node
/**
 * jb-press-targets.mjs — 사장님이 주신 엑셀(기자별 월별 기사생산량-2026)에서
 *   「전체」 줄의 값이 70을 넘는 기자·달만 뽑아 적는다. 읽기만 한다.
 *
 * 사장님 2026-11-27 — 「월 전체기사량이70건이 넘는 데만 검색해서 작업하도록 해...70건 이하는 하지 말고」
 * 열: D~M = 1~10월, P = 11월(N 은 숨긴 옛 11월 값이라 쓰지 않는다).
 * 수식 칸은 엑셀이 저장해 둔 계산값을 읽는다. 계산값이 없으면 「못 읽음」으로 적고 대상에 넣지 않는다.
 *
 *   node scripts/jb-press-targets.mjs <엑셀> <낼 json>
 */
import fs from 'node:fs';
import { 푼다 } from './lib/xlsx-읽어본다.mjs';

const [엑셀, 낼곳] = process.argv.slice(2);
const 통 = 푼다(엑셀);
const 풀기 = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const 글들 = [...String(통['xl/sharedStrings.xml'] || '').matchAll(/<si>([\s\S]*?)<\/si>/g)]
  .map((m) => 풀기([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
const 장 = String(통['xl/worksheets/sheet1.xml']);
const 줄들 = new Map();
for (const 줄 of 장.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const 칸 = {};
  for (const c of 줄[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const 꼴 = (c[2].match(/t="(\w+)"/) || [])[1];
    const v = c[3] ? (c[3].match(/<v>([\s\S]*?)<\/v>/) || [])[1] : undefined;
    칸[c[1]] = v === undefined ? null : (꼴 === 's' ? 글들[Number(v)] : v);
  }
  줄들.set(Number(줄[1]), 칸);
}
const 달열 = { D: '01', E: '02', F: '03', G: '04', H: '05', I: '06', J: '07', K: '08', L: '09', M: '10', P: '11' };
const 대상 = []; const 기자들 = []; const 못읽음 = [];
for (const [번, 칸] of 줄들) {
  if (칸.C !== '전체' || !칸.B) continue;
  const 기자 = String(칸.B).trim();
  const 달 = {};
  for (const [열, 월] of Object.entries(달열)) {
    if (칸[열] === null || 칸[열] === undefined || 칸[열] === '') { 달[월] = null; continue; }
    const n = Number(칸[열]);
    if (!Number.isFinite(n)) { 못읽음.push(기자 + ' ' + 월); 달[월] = null; continue; }
    달[월] = n;
    if (n > 70) 대상.push({ 기자, 달: '2026-' + 월, 전체: n, 줄: 번 });
  }
  기자들.push({ 기자, 줄: 번, 달 });
}
fs.writeFileSync(낼곳, JSON.stringify({ 기자들, 대상, 못읽음 }, null, 1));
console.log('기자 ' + 기자들.length + '명 · 70건 넘는 기자·달 ' + 대상.length + '개 · 대상 기자 ' + new Set(대상.map((x) => x.기자)).size + '명 · 값을 못 읽은 칸 ' + 못읽음.length + '개');
const 묶음 = {};
for (const x of 대상) (묶음[x.기자] = 묶음[x.기자] || []).push(x.달.slice(5) + '월 ' + x.전체);
for (const [k, v] of Object.entries(묶음)) console.log('  ' + k + ': ' + v.join(', '));
if (못읽음.length) console.log('못 읽은 칸: ' + 못읽음.join(' · '));

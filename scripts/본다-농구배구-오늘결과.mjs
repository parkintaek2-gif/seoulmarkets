#!/usr/bin/env node
/**
 * 본다-농구배구-오늘결과.mjs — **KBL·KOVO 공식 화면에서 그날 결과를 읽는다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 사장님 — 「기사에서만 확인하지마. 공식 사이트에서 확인하는 습관을 가져」
 *
 * ⛔ 크롬 9222 에 붙을 때 b.close() 금지 — 사장님 창이 닫힌다. disconnect() 만
 * ⛔ 언제나 새 탭. 연 탭은 «그 일이 끝나는 자리»에서 닫는다 (finally)
 *
 * 쓰는 법
 *   node scripts/본다-농구배구-오늘결과.mjs [YYYY-MM-DD]
 */
import puppeteer from 'puppeteer-core';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** ⛔ toISOString() 금지 — 이 PC 는 이미 한국시간이다 */
function 오늘날짜() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function 지금시각() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

const 날 = process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2]) ? process.argv[2] : 오늘날짜();

const 볼곳 = [
  { 이름: 'KBL 첫 화면 — 그날 경기와 점수', 길: 'https://www.kbl.or.kr/' },
  { 이름: 'KBL 팀 순위', 길: 'https://www.kbl.or.kr/game/team-rank' },
  { 이름: 'KOVO 첫 화면 — 경기일정과 순위', 길: 'https://www.kovo.co.kr/' },
];

const 줄 = [];
const 적는다 = (s) => { console.log(s); 줄.push(s); };

적는다(`# 경기 밑감 — ${날} (받은 때 ${지금시각()})`);
적는다('');
적는다('⚠ 공식 화면에서 그대로 받아 적은 것이다. 기사에서 베낀 것이 아니다.');
적는다('⛔ 사진은 이 자가 안 고른다 — 눈으로 열어 보고 고른다(워터마크·등번호 대조).');
적는다('');

const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
for (const 곳 of 볼곳) {
  const page = await b.newPage();
  try {
    await page.goto(곳.길, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3500));
    const 글 = await page.evaluate(() => document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 4000));
    적는다('## ' + 곳.이름);
    적는다('');
    적는다('주소 ' + page.url());
    적는다('');
    적는다('```');
    적는다(글);
    적는다('```');
    적는다('');
  } catch (e) {
    적는다('## ' + 곳.이름);
    적는다('🔴 못 읽었다 — ' + String(e).slice(0, 200));
    적는다('');
  } finally {
    await page.close();
  }
}
await b.disconnect();

const 낼곳 = path.join(뿌리, 'docs', `자료-경기밑감-${날.replace(/-/g, '')}.md`);
fs.mkdirSync(path.dirname(낼곳), { recursive: true });
/* 한 날에 여러 번 받으면 덧붙인다 — 경기 중에 받은 것과 끝난 뒤 받은 것이 둘 다 남는다 */
fs.appendFileSync(낼곳, 줄.join('\n') + '\n\n---\n\n', 'utf8');
console.log('\n✅ 적었다 — ' + 낼곳);

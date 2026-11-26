#!/usr/bin/env node
/**
 * 중부매일-일정1-되읽는다.mjs — 번호를 주면 그 기사의 분류·승인·노출시간을 읽는다.
 * ⛔ 읽기만 한다. 일정 ①(2026-11-27) 검수에 쓴다.
 *
 *   node scripts/중부매일-일정1-되읽는다.mjs 1496538 1500329
 *   node scripts/중부매일-일정1-되읽는다.mjs --전부      (일정 ① 대상 26건을 다시 읽어 처음 상태와 견준다)
 */
import fs from 'node:fs';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 서식주소, 상태글 } from './중부매일-기자와분류-바꾼다.mjs';

const 처음곳 = 'docs/자국/중부매일-일정1-상태-20261127.json';
const 검수곳 = 'docs/자국/중부매일-일정1-검수-20261127.json';
const 쉰다 = (밀리) => new Promise((끝) => setTimeout(끝, 밀리));

async function 읽기(번호) {
  return 새탭에서(서식주소(번호), async (붙음) => {
    await 자리잡기(붙음, { 최대: 45000 });
    await 쉰다(3500);
    try { return JSON.parse(String(await 재기(붙음, 상태글, 25000))); } catch { return null; }
  });
}
const 한줄 = (번호, s) => [번호, s ? s.섹션1글 + ' > ' + s.섹션2글 + ' > ' + s.연재글 : '🔴 못 읽음',
  s ? (s.승인 ? '승인' : '미승인') : '', s ? s.노출날 + ' ' + s.노출시각 : '', s ? s.기자id + ' ' + s.기자명 : '', s ? String(s.제목).slice(0, 26) : ''].join(' | ');

if (process.argv.includes('--전부')) {
  const 처음 = JSON.parse(fs.readFileSync(처음곳, 'utf8'));
  const 결과 = [];
  let 어긋남 = 0;
  for (const 줄 of 처음) {
    const 뒤 = await 읽기(줄.번호);
    const 전 = 줄.상태;
    const 탈 = [];
    if (!뒤) 탈.push('못 읽음');
    else {
      if (줄.할일 === '문화칼럼으로' && !(뒤.섹션1 === 'S1N7' && 뒤.섹션2 === 'S2N149' && 뒤.연재 === 'SRN552')) 탈.push('문화칼럼이 아니다');
      if (줄.할일 === '보도자료로' && 뒤.섹션1 !== 'S1N31') 탈.push('보도자료가 아니다');
      if (뒤.노출날 !== 전.노출날 || 뒤.노출시각 !== 전.노출시각) 탈.push('노출시간이 바뀌었다');
      if (뒤.승인 !== 전.승인) 탈.push('승인 상태가 바뀌었다');
      if (뒤.기자id !== 전.기자id || 뒤.기자명 !== 전.기자명 || 뒤.기자메일 !== 전.기자메일) 탈.push('기자가 바뀌었다');
      if (뒤.제목 !== 전.제목) 탈.push('제목이 바뀌었다');
    }
    if (탈.length) 어긋남 += 1;
    결과.push({ 번호: 줄.번호, 할일: 줄.할일, 전, 뒤, 탈 });
    console.log((탈.length ? '🔴 ' : '✅ ') + 줄.할일 + ' | ' + 한줄(줄.번호, 뒤) + (탈.length ? ' — ' + 탈.join(' · ') : ''));
  }
  fs.writeFileSync(검수곳, JSON.stringify(결과, null, 1));
  console.log('검수 ' + 결과.length + '건 · 어긋난 것 ' + 어긋남 + '건 — ' + 검수곳);
} else {
  for (const 번호 of process.argv.slice(2).filter((x) => /^\d+$/.test(x))) console.log(한줄(번호, await 읽기(번호)));
}

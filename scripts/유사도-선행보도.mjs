/**
 * 유사도-선행보도.mjs — 선행보도와의 유사도를 «어절 3연속» 겹침으로 측정한다.
 * v7 — 「선행보도 또는 보도자료와 유사도 퍼센티지로 표시」, 「유사도 30% 미만 = 자체기사」
 *
 * 재는 법: 내 기사 본문을 어절로 끊어 3개씩 묶고(3-gram), 그 묶음 가운데
 * 선행보도에도 그대로 있는 것이 몇 %인지 센다. 문장을 베꼈으면 바로 올라간다.
 */
import fs from 'node:fs';

const 씻기 = (s) => String(s)
  .replace(/\[[^\]]*\]/g, ' ')
  .replace(/[^0-9A-Za-z가-힣%.]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function 세묶음(글) {
  const 어절 = 씻기(글).split(' ').filter(Boolean);
  const 묶음 = new Set();
  for (let i = 0; i + 2 < 어절.length; i += 1) 묶음.add(어절.slice(i, i + 3).join(' '));
  return 묶음;
}

export function 유사도(내글, 남글) {
  const 내것 = 세묶음(내글);
  const 남것 = 세묶음(남글);
  if (내것.size === 0) return { 겹침: 0, 비율: 0, 전체: 0 };
  let 겹침 = 0;
  for (const m of 내것) if (남것.has(m)) 겹침 += 1;
  return { 겹침, 전체: 내것.size, 비율: Math.round((겹침 / 내것.size) * 1000) / 10 };
}

if (process.argv.includes('--자체검사')) {
  let 센다 = 0; let 깨짐 = 0;
  const 본다 = (말, 참) => { 센다 += 1; if (!참) { 깨짐 += 1; console.log('  ⛔ ' + 말); } else console.log('  ✔ ' + 말); };
  본다('같은 글은 100%', 유사도('가 나 다 라 마', '가 나 다 라 마').비율 === 100);
  본다('아주 다른 글은 0%', 유사도('가 나 다 라 마', '바 사 아 자 차').비율 === 0);
  본다('절반 베끼면 절반쯤 나온다', 유사도('가 나 다 라 마 바', '가 나 다 하 호 후').비율 > 20);
  본다('세 어절이 안 되면 0건', 세묶음('가 나').size === 0);
  본다('대괄호 표시는 빼고 센다', !Array.from(세묶음('[제목] 가 나 다')).some((v) => v.includes('제목')));
  console.log(`\n${깨짐 === 0 ? '✅' : '🔴'} 유사도 — ${센다 - 깨짐}/${센다}`);
  process.exitCode = 깨짐 === 0 ? 0 : 1;
} else {
  const [, , 내파일, ...남파일들] = process.argv;
  const 내글 = fs.readFileSync(내파일, 'utf8').split('\n─────')[0];
  let 합집합겹침 = new Set();
  const 내것 = 세묶음(내글);
  for (const 남 of 남파일들) {
    const 결과 = 유사도(내글, fs.readFileSync(남, 'utf8'));
    console.log(`${남.split(/[\\/]/).pop()}  겹친 3어절 ${결과.겹침} / ${결과.전체}  = ${결과.비율}%`);
    const 남것 = 세묶음(fs.readFileSync(남, 'utf8'));
    for (const m of 내것) if (남것.has(m)) 합집합겹침.add(m);
  }
  console.log(`\n선행보도 ${남파일들.length}건을 모두 합쳐도 겹치는 3어절 ${합집합겹침.size} / ${내것.size} = ${Math.round((합집합겹침.size / 내것.size) * 1000) / 10}%`);
  console.log('겹친 보기 20개 —');
  console.log(Array.from(합집합겹침).slice(0, 20).map((v) => '  · ' + v).join('\n'));
}

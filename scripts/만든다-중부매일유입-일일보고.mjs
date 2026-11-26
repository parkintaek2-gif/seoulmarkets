/**
 * 만든다-중부매일유입-일일보고.mjs — 중부매일 「오늘의 운세」 박스 → KLifeMap 유입
 * 일일 보고의 **엑셀과 메일 본문**을 만든다. 보내지는 않는다(보내는 것은 send-mail.mjs).
 *
 * 사장님 2026-11-26 — 「날짜, 중부매일 세션, 중부매일 사용자, 네이버 사용자, 구글 사용자,
 *   기타 검색엔진, 전체 세션, 전체 사용자, 전체 페이지뷰로 항목을 바꿔 매일 e메일로 보고해」
 *
 * ⛔ 유불리 해석을 붙이지 않는다. 0 이면 0 이라고 적는다.
 *
 *   node scripts/잰다-중부매일에서-오나.mjs --잰다 --날수=10 --자료=docs/자국/중부매일유입-일일.json
 *   node scripts/만든다-중부매일유입-일일보고.mjs docs/자국/중부매일유입-일일.json docs/자국/jb-inflow-daily.xlsx docs/자국/jb-inflow-daily.txt
 */
import fs from 'node:fs';
import { 통만든다, 적는다 } from './lib/xlsx-쓴다.mjs';

const [자료길, 엑셀길, 글길] = process.argv.slice(2);
if (!자료길 || !엑셀길 || !글길) {
  console.error('⛔ 자료(json) · 엑셀 · 글 자리를 차례로 준다');
  process.exit(1);
}
const { head: 머리, rows: 줄들 } = JSON.parse(fs.readFileSync(자료길, 'utf8'));

/* 이 PC 는 KST 다 — toISOString 을 쓰지 않는다 */
const 지금 = new Date();
const 두자리 = (n) => String(n).padStart(2, '0');
const 오늘 = `${지금.getFullYear()}-${두자리(지금.getMonth() + 1)}-${두자리(지금.getDate())}`;
const 날이름 = (d) => d + (d === 오늘 ? ' (진행 중)' : '');

const 읽는법 = [
  '측정 기준은 GA4(케이라이프맵 속성)이며, 광고 차단과 쿠키 거부만큼 덜 세므로 바닥값입니다.',
  '배너를 넣은 날은 2026-11-24 19:31입니다. 그 이전 날짜는 비교 기준입니다.',
  '중부매일: 출처가 jbnews.com(PC와 모바일)인 세션과 사용자입니다.',
  '네이버 사용자: 출처 이름에 naver 가 든 사용자입니다. 검색 외에 블로그, 카페에서 온 사용자도 포함됩니다.',
  '구글 사용자: 출처 이름에 google 이 든 사용자입니다. Gemini(gemini.google.com)는 여기서 빼고 AI 칸에서 셉니다.',
  '기타 검색엔진: 다음, 빙, 야후, 덕덕고, 줌 등과 그 밖의 자연검색 유입 사용자입니다.',
  'AI 4개 항목: 출처가 챗GPT(chatgpt.com, openai), 구글 Gemini, 클로드(claude.ai)인 사용자이고, AI 기타는 퍼플렉시티, 코파일럿, 딥시크, 그록 등입니다. AI 서비스가 출처 정보를 넘기지 않으면 GA4에 직접 유입으로 기록되므로 바닥값입니다.',
  '검색엔진별 사용자는 출처별 값을 더한 것이라, 같은 사람이 하루에 두 출처로 오면 두 번 셉니다.',
  '오늘 날짜 줄은 하루가 끝나지 않은 값이며 다음 날 다시 읽습니다.',
];

/* ── 엑셀 ── */
const 통 = 통만든다();
const 장 = 통.새장('일일 유입');
장.너비([20, ...머리.slice(1).map(() => 14)]);
장.틀고정('B2');
장.줄(머리.map((v) => ({ v, 꼴: '머리' })));
for (const r of 줄들) {
  장.줄([{ v: 날이름(r[0]), 꼴: '글' }, ...r.slice(1).map((v) => ({ v: Number(v), 꼴: '수' }))]);
}
const 둘째 = 통.새장('읽는 법');
둘째.너비([120]);
for (const 글 of 읽는법) 둘째.줄([{ v: 글, 꼴: '글왼쪽' }]);
적는다(통, 엑셀길);

/* ── 메일 본문 ── */
const 끝난줄 = 줄들.filter((r) => r[0] !== 오늘);
const 글 = [`[5번] 중부매일 「오늘의 운세」 박스 → 케이라이프맵 유입 일일 보고 (${오늘})`, ''];
if (끝난줄.length >= 2) {
  const a = 끝난줄[끝난줄.length - 2];
  const b = 끝난줄[끝난줄.length - 1];
  글.push(`전날 대비 (${a[0].slice(5)} → ${b[0].slice(5)})`);
  for (let i = 1; i < 머리.length; i += 1) {
    const d = Number(b[i]) - Number(a[i]);
    const 변화 = d === 0 ? '변화 0' : (d > 0 ? `+${d}` : `${d}`);
    글.push(`- ${머리[i]}: ${a[i]} → ${b[i]} (${변화})`);
  }
  글.push('');
}
글.push(`최근 ${줄들.length}일`);
글.push(머리.join(' / '));
for (const r of 줄들) 글.push([날이름(r[0]), ...r.slice(1)].join(' / '));
글.push('');
for (const 줄 of [읽는법[0], 읽는법[1], 읽는법[3], 읽는법[6], 읽는법[8], '표는 첨부한 엑셀에 같은 내용으로 들어 있습니다.']) 글.push(`- ${줄}`);
fs.writeFileSync(글길, 글.join('\n') + '\n', 'utf8');

console.log(`엑셀 ${엑셀길}`);
console.log(`글 ${글길}`);

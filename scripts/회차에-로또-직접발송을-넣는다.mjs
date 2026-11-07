#!/usr/bin/env node
/**
 * 회차에-로또-직접발송을-넣는다.mjs — 로또 회차(토 21:30)가 기사를 스스로 데스킹해 사장님께 Gmail로 직접 보내게 한다.
 * 🔴 사장님 (2026-11-07) 「중부매일계정이 저녁에 로또 기사 써야 해. 저번주처럼 써서 나한테 이메일 보내게 조치해놔.」
 * 틀은 회차에-아침세편-직접발송을-넣는다.mjs 와 같다(맨 앞 머리절, 두 번 돌려도 안전, 세 자리 확인).
 *   node scripts/회차에-로또-직접발송을-넣는다.mjs [--적는다|--자가시험]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const 조직 = '953d4e54-f96e-4d6d-b33e-33311fbd09ad';
export const 회차 = [['21', 'trig_01HpVAvBYmyzmAXvm72K8Paf']]; // 로또 · 매주 토요일 21:30
export const 자국 = '[사장님 2026-11-07] 로또 기사를 직접 데스킹해 사장님께 메일로 보낸다';
export const 끝표 = '<!-- ⬆ 여기까지가 2026-11-07 로또 직접 발송 머리절이다 ⬇ -->';

export const 머리절 = [
  '# 🔴🔴 ' + 자국 + ' — 아래 어떤 글보다 먼저다',
  '',
  '사장님 말씀 그대로: 「중부매일계정이 저녁에 로또 기사 써야 해. 저번주처럼 써서 나한테 이메일 보내게 조치해놔.」',
  '',
  '이 회차는 매주 토요일 밤 아래를 한다. 아래 본문에 「5번이 거둬서 보낸다」고 적혀 있으면 이 머리절이 이긴다.',
  '',
  '## 1. 기사',
  '- 쓰는 법은 아래 본문 그대로다(지난주와 같이). 키워드 <로또 당첨번호>를 제목과 본문에 넣는다.',
  '- 당첨번호, 보너스 번호, 등수별 당첨자 수와 당첨금은 동행복권 공식 발표로 맞춘다. 발표가 아직 안 올라왔으면 올라올 때까지 기다렸다가 쓴다. 지어내지 않는다.',
  '',
  '## 2. 데스킹 — 이 회차가 직접 한다',
  '- 기준: 자체기사 지침 v7과 스타일북 2026. 숫자를 공식 발표와 한 번 더 맞춘다.',
  '- 순한글로 지어낸 말, 번역투, 금지 어미를 고친다. 마크다운 별표를 넣지 않는다.',
  '- 형식: [제목] [부제목] [본문] [추천 키워드 3개]. 본문 맨 앞 [중부매일 박인택 기자].',
  '',
  '## 3. 메일 — 이 회차가 직접 보낸다',
  '- 데스킹을 마친 기사를 Gmail로 parkintaek2@gmail.com 에 보낸다. 네이버 주소로는 보내지 않는다.',
  '- 메일 제목: [중부매일] 기사 제목 (데스킹 완료)',
  '- 보낸 뒤 이 대화에 「보냈다」와 보낸 시각을 적는다. 보내기가 막히면 지어내지 말고 「못 보냈다」와 그 이유를 적고, 최종본을 이 대화에 낸다.',
  '',
  끝표,
  '',
  '',
].join('\n');

/** 옛 머리절이 있으면 걷고 새것을 맨 앞에 붙인다 */
export function 고치기(옛글, 쓸머리절 = 머리절) {
  if (typeof 옛글 !== 'string' || !옛글) return { 바뀌었나: false, 까닭: '지침이 비어 있다', 글: 옛글 };
  const 머리 = 쓸머리절.split('\n')[0].split(' — ')[0];
  const i = 옛글.indexOf(머리);
  if (i < 0) return { 바뀌었나: true, 까닭: '머리절을 맨 앞에 붙였다', 글: 쓸머리절 + 옛글 };
  if (i > 0) return { 바뀌었나: false, 까닭: '머리절이 맨 앞이 아닌 곳에 있다 — 손으로 본다', 글: 옛글 };
  const 끝 = 옛글.indexOf(끝표);
  if (끝 < 0) return { 바뀌었나: false, 까닭: '앞서 붙인 머리절의 끝을 못 찾았다 — 손으로 본다', 글: 옛글 };
  const 본문 = 옛글.slice(끝 + 끝표.length).replace(/^\n+/, '');
  const 새글 = 쓸머리절 + 본문;
  if (새글 === 옛글) return { 바뀌었나: false, 까닭: '이미 같은 머리절이 들어 있다', 글: 옛글 };
  return { 바뀌었나: true, 까닭: '머리절을 갈아 끼웠다', 글: 새글 };
}

const 이파일이진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (이파일이진입점 && process.argv.includes('--자가시험')) {
  let 탈 = 0;
  const 본다 = (이름, 참) => { console.log((참 ? '  ✅ ' : '  🔴 ') + 이름); if (!참) 탈 += 1; };
  const 원래 = '# 🔴🔴 [사장님 2026-11-04] 프로야구를 빼고\n본문\n';
  const a = 고치기(원래);
  본다('처음 붙이면 바뀐다', a.바뀌었나 && a.글.startsWith('# 🔴🔴 ' + 자국));
  본다('옛 머리절과 본문을 지우지 않는다', a.글.includes('[사장님 2026-11-04]') && a.글.includes('본문'));
  본다('두 번 돌려도 안 바뀐다', !고치기(a.글).바뀌었나);
  본다('두 번 돌려도 한 벌이다', (고치기(a.글).글.split(자국).length - 1) === 1);
  본다('낡은 판은 갈아 끼운다', (() => { const 낡은 = '# 🔴🔴 ' + 자국 + ' — 옛판\n낡은글\n' + 끝표 + '\n\n' + 원래; const r = 고치기(낡은); return r.바뀌었나 && !r.글.includes('낡은글') && r.글.includes('본문'); })());
  본다('빈 지침은 손대지 않는다', !고치기('').바뀌었나);
  본다('Gmail 로 사장님께 직접 보낸다', 머리절.includes('Gmail로 parkintaek2@gmail.com'));
  본다('⛔ 네이버로 보내지 않는다', 머리절.includes('네이버 주소로는 보내지 않는다'));
  본다('공식 발표로 맞춘다', 머리절.includes('동행복권 공식 발표'));
  본다('로또 회차 하나만 고친다', 회차.length === 1 && 회차[0][0] === '21');
  console.log(탈 ? `\n🔴 ${탈}가지 떨어졌다` : '\n✅ 모두 통과');
  process.exit(탈 ? 1 : 0);
}

if (이파일이진입점 && !process.argv.includes('--자가시험')) {
  const 적는다 = process.argv.includes('--적는다');
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + (process.env.KLM_CHROME_PORT || '9222'), defaultViewport: null, protocolTimeout: 240000 });
  const page = await b.newPage();
  let 탈 = 0;
  try {
    await page.goto('https://claude.ai/scheduled-task/' + 회차[0][1], { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 4000));
    for (const [시, trig] of 회차) {
      const 읽기 = () => page.evaluate(async (o, t) => {
        const res = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, { headers: { accept: 'application/json' } });
        return { 상태: res.status, 글: await res.text() };
      }, 조직, trig);
      const 받은 = await 읽기();
      if (받은.상태 !== 200) { console.log('🔴 ' + 시 + '시 — 못 읽었다 (' + 받은.상태 + ')'); 탈 += 1; continue; }
      const 옛글 = JSON.parse(받은.글).trigger?.derived_state?.prompt;
      if (typeof 옛글 !== 'string' || !옛글) { console.log('🔴 ' + 시 + '시 — 지침 자리를 못 찾았다'); 탈 += 1; continue; }
      const r = 고치기(옛글);
      if (!r.바뀌었나) { console.log('⬜ ' + 시 + '시 — ' + r.까닭); continue; }
      if (!적는다) { console.log('🟡 ' + 시 + '시 — ' + 옛글.length + ' → ' + r.글.length + '자 · ' + r.까닭); continue; }
      const 답 = await page.evaluate(async (o, t, prompt) => {
        const res = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, {
          method: 'PATCH', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ prompt }),
        });
        return { 상태: res.status, 글: (await res.text()).slice(0, 300) };
      }, 조직, trig, r.글);
      if (답.상태 !== 200) { console.log('🔴 ' + 시 + '시 — 못 썼다 (' + 답.상태 + ') ' + 답.글.replace(/\s+/g, ' ')); 탈 += 1; continue; }
      /* 「썼다(200)」를 「들어갔다」로 읽지 않는다 — 세 자리를 다시 읽는다 */
      const t2 = JSON.parse((await 읽기()).글).trigger;
      const 모은글 = [
        t2.derived_state?.prompt,
        ...(t2.session_request?.events || []).map((e) => e?.payload?.internal_anthropic_catchall?.message?.content),
        ...(t2.job_config?.ccr?.events || []).map((e) => e?.data?.message?.content),
      ].map((x) => String(x || '')).filter(Boolean);
      const 든곳 = 모은글.filter((x) => x.includes(자국)).length;
      const 됐나 = 모은글.length > 0 && 든곳 === 모은글.length;
      console.log((됐나 ? '✅ ' : '🔴 ') + 시 + '시 — ' + 옛글.length + ' → ' + r.글.length + '자 · 세 자리 ' + 모은글.length + '곳 가운데 ' + 든곳 + '곳에 들었다');
      if (!됐나) 탈 += 1;
    }
  } finally { await page.close().catch(() => {}); b.disconnect(); }
  if (!적는다) console.log('\n   --적는다 로 실제로 써넣는다');
  process.exitCode = 탈 ? 1 : 0;
}

export default { 고치기, 회차, 자국, 머리절, 조직 };

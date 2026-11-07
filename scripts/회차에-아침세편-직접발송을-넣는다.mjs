#!/usr/bin/env node
/**
 * 회차에-아침세편-직접발송을-넣는다.mjs
 *   — **09시 회차(매일 08:25)가 날마다 «어제 남자농구 · 어제 여자배구 · 날씨»를 쓰고,
 *     스스로 데스킹해서 사장님께 Gmail 로 직접 보내게 한다. 롤드컵은 3세트까지 미리 쓴다.**
 *
 * 🔴 사장님 (2026-11-07 오전)
 *   「어제 남자농구, 여자배구, 날씨 기사부터 쓰게 해. 데스킹까지 중부매일계정이 해서 나한테
 *     메일 보내게 해. 사진은 KBL,KOVO에서 찾아서 링크와 사진설명도 같이 보내라고 해.」
 *   「내가 얘기하지 않아도 9시 정도에 기사를 받아 볼 수 있게 좀전에 내가 작업지시한 걸
 *     중부매일계정과 너의 메모리에 저장해서 매일 이렇게 하도록 해. 롤드컵은 3세트까지
 *     미리 써놓으라고 하고.」
 *
 * ⚠ 왜 «맨 앞에» 끼워 넣나 — 회차 지침이 4만 자 가까이 되고, 그 안의 「5번이 데스킹해서 보낸다」
 *   「롤드컵 > 날씨 > 여자배구 > 남자농구」 같은 옛 줄을 하나씩 고치면 반드시 한 곳이 남는다.
 *   ⇒ 「아래 어떤 글보다 이것이 먼저다」를 맨 앞에 못박는다. 아래 본문은 지우지 않는다.
 * ⚠ 2026-11-04 머리절(회차에-야구빼고-배구농구를-넣는다.mjs)은 이 머리절 «바로 아래»에 남는다.
 *   그 자를 다시 돌리면 「머리절이 맨 앞이 아닌 곳에 있다」로 서는 것이 맞다 — 손으로 본다.
 *
 * ✅ 두 번 돌려도 안전하다(있으면 걷고 다시 붙인다). ⛔ 크롬 창을 닫지 않는다 — 내 탭만 닫는다.
 *
 * 쓰는 법
 *   node scripts/회차에-아침세편-직접발송을-넣는다.mjs            무엇이 바뀌는지만 본다
 *   node scripts/회차에-아침세편-직접발송을-넣는다.mjs --적는다   실제로 써넣는다
 *   node scripts/회차에-아침세편-직접발송을-넣는다.mjs --자가시험
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const 조직 = '953d4e54-f96e-4d6d-b33e-33311fbd09ad';
export const 회차 = [['09', 'trig_01GeyrdjqmGjtu3cCt6ynZHm']]; // 전날 종합 · 매일 08:25
export const 자국 = '[사장님 2026-11-07] 아침 세 편을 직접 데스킹해 사장님께 메일로 보낸다';
export const 끝표 = '<!-- ⬆ 여기까지가 2026-11-07 아침 세 편 머리절이다 ⬇ -->';

export const 머리절 = [
  '# 🔴🔴 ' + 자국 + ' — 아래 어떤 글보다 먼저다',
  '',
  '사장님 말씀 그대로:',
  '「어제 남자농구, 여자배구, 날씨 기사부터 쓰게 해. 데스킹까지 중부매일계정이 해서 나한테 메일 보내게 해. 사진은 KBL,KOVO에서 찾아서 링크와 사진설명도 같이 보내라고 해.」',
  '「내가 얘기하지 않아도 9시 정도에 기사를 받아 볼 수 있게 … 매일 이렇게 하도록 해. 롤드컵은 3세트까지 미리 써놓으라고 하고.」',
  '',
  '이 회차는 날마다 아래를 한다. 사장님이 9시 무렵 메일함에서 받아 보시는 것이 목표다. 아래 본문에 「5번이 데스킹해서 보낸다」거나 다른 발행 차례가 적혀 있으면 이 머리절이 이긴다.',
  '',
  '## 1. 쓸 기사와 차례',
  '첫째  남자 프로농구 KBL — 어제 열린 경기 결과. 쿼터별 점수, 양 팀 최다 득점 선수와 기록, 두 팀 성적과 순위, 다음 경기 일정.',
  '둘째  여자 프로배구 V-리그 여자부 — 어제 열린 경기 결과. 세트 점수, 양 팀 최다 득점 선수와 기록, 두 팀 성적, 다음 경기 일정.',
  '셋째  날씨 — 충청권(청주·충주·대전·세종·천안). 기상청 예보로 맞추고 전날과 견줘 쓴다. 제목 맨 앞 [날씨], 제목에 날짜, 기온 숫자는 부제목으로.',
  '- 어제 그 종목 경기가 없었으면 「없었다」고 적고 그 기사는 쓰지 않는다. 빈칸을 다른 종목으로 메우지 않는다.',
  '- 경기가 여럿이면 경기마다 한 편씩 쓴다. 종목을 한 편에 묶지 않는다.',
  '- 결과와 일정은 외워서 쓰지 않는다. KBL 공식 기록, KOVO 공식 기록, 네이버 스포츠로 직접 확인한다. 한 매체에만 있는 내용은 쓰지 않는다.',
  '',
  '## 2. 롤드컵 — 3세트까지 미리 써 둔다',
  '- 롤드컵 경기는 한국시간 오전 7시에 시작해 이 회차가 도는 08:25 무렵에는 아직 진행 중인 날이 많다.',
  '- 오늘 롤드컵 경기가 있으면 위 세 편과 따로, 1세트부터 3세트까지의 흐름을 라이엇 공식 기록과 네이버 e스포츠로 확인해 본문으로 미리 써 둔다. 결과 문단은 비워 둔다.',
  '- 경기가 끝나면 이 대화로 「끝났다」는 지시가 온다. 그때 최종 세트 점수와 승부처를 맨 앞 문단에 넣어 완성하고, 아래 3·4절대로 데스킹해 메일로 보낸다.',
  '- 3세트에서 끝난 경기(3대0)면 써 둔 본문에 결과만 얹어 바로 완성한다.',
  '',
  '## 3. 사진',
  '- 농구는 KBL 공식 홈페이지, 배구는 KOVO 공식 홈페이지의 그 경기 사진을 찾는다. 롤드컵은 라이엇 게임즈 공식 사진(LoL Esports Flickr)을 찾는다.',
  '- 연합뉴스 사진, 엠블럼, 점수판은 쓰지 않는다.',
  '- 사진마다 링크(이미지 주소)와 사진 설명(캡션)을 함께 적는다. 캡션 끝에 「/ 한국농구연맹」「/ 한국배구연맹」「/ 라이엇 게임즈」.',
  '- 날씨 기사는 사진이 없으면 「사진 없음」이라고 적는다.',
  '',
  '## 4. 데스킹 — 이 회차가 직접 한다',
  '- 기준: 자체기사 지침 v7과 스타일북 2026.',
  '- 숫자를 공식 기록과 한 번 더 맞춘다. 출처에 없는 단정, 「최초·가장·선착」은 확인된 것만 둔다.',
  '- 순한글로 지어낸 말, 번역투, 금지 어미를 고친다. 마크다운 별표를 넣지 않는다.',
  '- KBL 팀 이름은 지역명을 앞에 쓴다. 제목 앞에 종목을 붙인다. 본문 1,000자 이상(1,300자를 겨냥).',
  '- 형식: [제목] [부제목] [사진 링크] [사진 설명] [본문] [추천 키워드 3개]. 본문 맨 앞 [중부매일 박인택 기자].',
  '',
  '## 5. 메일 — 이 회차가 직접 보낸다',
  '- 데스킹을 마친 기사를 Gmail로 parkintaek2@gmail.com 에 보낸다. 네이버 주소로는 보내지 않는다.',
  '- 한 편에 메일 한 통. 차례는 남자농구 → 여자배구 → 날씨. 롤드컵은 완성되는 대로 따로 보낸다.',
  '- 메일 제목: [중부매일] 기사 제목 (데스킹 완료)',
  '- 보낸 뒤 이 대화에 편마다 「보냈다」와 보낸 시각을 적는다. 보내기가 막히면 지어내지 말고 「못 보냈다」와 그 이유를 적고, 최종본을 이 대화에 낸다.',
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
  본다('차례가 남자농구 → 여자배구 → 날씨다', 머리절.indexOf('첫째  남자 프로농구') < 머리절.indexOf('둘째  여자 프로배구') && 머리절.indexOf('둘째  여자 프로배구') < 머리절.indexOf('셋째  날씨'));
  본다('롤드컵 3세트 미리쓰기가 있다', 머리절.includes('1세트부터 3세트까지'));
  본다('사진 링크와 사진 설명을 함께 적게 한다', 머리절.includes('링크(이미지 주소)와 사진 설명'));
  본다('KBL·KOVO 공식 사진을 찾게 한다', 머리절.includes('KBL 공식 홈페이지') && 머리절.includes('KOVO 공식 홈페이지'));
  본다('Gmail 로 사장님께 직접 보낸다', 머리절.includes('Gmail로 parkintaek2@gmail.com'));
  본다('⛔ 네이버로 보내지 않는다', 머리절.includes('네이버 주소로는 보내지 않는다'));
  본다('못 보냈으면 지어내지 않는다', 머리절.includes('지어내지 말고 「못 보냈다」'));
  본다('09시 회차 하나만 고친다', 회차.length === 1 && 회차[0][0] === '09');
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

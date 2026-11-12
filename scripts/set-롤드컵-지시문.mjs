#!/usr/bin/env node
/**
 * set-롤드컵-지시문.mjs — **내일(10/24 토) 롤드컵 10건을 회차에 시킨다.**
 *
 * ── 🔴 왜 (2026-10-23 · 사장님) ───────────────────────────────────
 * 「내일 롤드컵 경기마다 기사를 작성하게 해. 모두 8경기이니 경기 결과 및 내용을
 *  상세하게 8건 보도. 8경기가 다 끝나면 일요일에 바로 경기가 있으니 대진표를 중심으로
 *  경기일정에 대한 보도 1건. 모두 9건의 기사를 작성하게 해야 함」
 * 「여기에 날씨 기사 한건 총 10건의 기사를 중부매일계정에게 쓰게 잘 지시하도록.
 *  **네가 직접 쓰지마. 넌 기사를 너무 못써**」
 *
 * ── 10건을 어디에 싣나 ────────────────────────────────────────────
 * ```
 * 09시   롤드컵 2건 — 한국시간 02시(젠지-IG) · 03시(한화생명-TES)
 * 10시   날씨 1건 — 손대지 않는다. 이미 매일 돌고 권역별로 쓰게 고쳐 두었다
 * 11시   롤드컵 3건 — 04·05·06시 경기
 * 14시   롤드컵 3건 — 07시(TL-CFO) · 08시(LOS-T1) · 09시(TSW-LYON)
 * 15시   롤드컵 1건 — 일요일 2라운드 대진표 중심 일정 기사
 * ```
 * 모두 9 + 날씨 1 = **10건**.
 *
 * ⛔ **되돌려야 한다.** 회차 지시문은 영구적이라 내버려 두면 월요일에도 롤드컵을 쓴다.
 *   바꾸기 전 옛 지시문을 docs/백업-회차지시문/ 에 적어 두고, 일요일에 --되돌린다.
 *
 * ⭐ 쓴 뒤 **세 자리**를 다시 읽어 확인한다 (2026-10-15 에 배운 것) —
 *   derived_state.prompt · session_request.events[1]… · job_config.ccr.events[1]…
 *   PATCH 가 200 을 줘도 세 자리가 다 바뀌지 않으면 회차는 옛 지시문으로 돈다.
 * ⚠ 개별 조회는 `/scheduled-task/<id>` 페이지를 «먼저 연 뒤»에만 제대로 답한다.
 *   루트에서 부르면 빈 것을 돌려준다 — 그것을 「바꿀 것이 없다」로 읽으면 안 된다.
 *
 * 쓰는 법
 *   node scripts/set-롤드컵-지시문.mjs --본다
 *   node scripts/set-롤드컵-지시문.mjs --적는다
 *   node scripts/set-롤드컵-지시문.mjs --되돌린다
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 백업방 = path.join(뿌리, 'docs', '백업-회차지시문');

/**
 * 🔴 옛 지시문 «앞에» 붙이는 머리말. 덮지 않고 더한다.
 * ⚠ 옛 지시문에는 사장님이 오래 쌓아 오신 규칙이 들어 있다(09시 37,851자 · 15시 40,555자) —
 *   제목 짓는 법, 추천 키워드, 2026-10-18 질책 반영 등. 그것을 지우면 안 된다.
 */
export const 오늘머리 = '## 🔴🔴 [2026년 10월 25일 일요일 — 이 날 하루만] 오늘은 아래 «오늘 할 일»을 먼저 따릅니다.\n'
  + '오늘 할 일이 끝나면 더 쓰지 마십시오. 아래쪽 평소 지침의 제목 짓는 법, 추천 키워드,\n'
  + '순한글 금지, 바이라인, 금지 표현 규칙은 **그대로 지킵니다.**\n';

export const 아래는평소 = '## ⬇ 여기서부터는 평소 지침입니다. 위 「오늘 할 일」과 어긋나는 '
  + '소재·건수 지시만 오늘은 따르지 말고, 나머지 규칙은 모두 지키십시오.';

export const 맡길것 = [
  /* 🔴 [2026-10-25 일요일] 사장님 지시 세 건 —
     「1. 롤드컵 전 경기 종합+다음날 대진 일정 기사 1건
      2. 25일 KBL 프로농구 종합 중심으로 24일 경기결과 짧게 언급하는 기사 1건
      3. 다음날 날씨 중심 + 당일 날씨 부연 기사」
     ⬜ 날씨(10시)는 뼈대가 이미 「내일 중심·오늘은 짧게」라 손대지 않는다. */
  /* 🔴 [2026-10-24] **자리를 옮겼다.** 「09시 회차」는 이름만 09시이고 실제로는
     «08:25»에 뜬다 (CRON_TZ=Asia/Seoul 25 8 * * *). 그런데 롤드컵 마지막 경기가
     09:00 에 시작한다 — 끝나지도 않은 경기를 종합하라고 시킬 뻔했다.
     ⛔ 회차 «이름»을 뜨는 «시각»으로 읽지 않는다. cron 을 보고 맞춘다.
     ⇒ 롤드컵 종합은 10:25 에 뜨는 「스포츠 11시」로 옮기고, 08:25 은 쉬게 한다. */
  { 시: '09', id: 'trig_01GeyrdjqmGjtu3cCt6ynZHm', 글: 'docs/지시-일요일-09시-쉰다.txt', 몇건: 1 },
  { 시: '11', id: 'trig_01UW2RtJac77hBVz1tkgCQxN', 글: 'docs/지시-일요일-09시-롤드컵종합.txt', 몇건: 1 },
  { 시: '16', id: 'trig_01ErSZQm2VhuNYMRBi3MCufF', 글: 'docs/지시-일요일-16시-KBL.txt', 몇건: 1 },
  /* 🔴 [2026-10-24 19:3x · 사장님] 「내일 프로야구 플레이오프 1차전 2시에 대구에서
     삼성과 기아가 경기를 한다. 이것도 나중에 기사써야함..조치해놔」

     ⚠ **14시 경기는 17시를 넘겨 끝난다.** 일요일에 도는 회차 중 가장 늦은 것이
       「스포츠 16시」인데 그것도 실제로는 «15:25»에 뜬다 — 그때는 아직 3회쯤이다.
       ⛔ 또 회차 «이름»을 뜨는 «시각»으로 읽을 뻔했다. cron 을 보고 맞춘다.
     ⇒ 일요일에 «안 도는» 「스포츠 15시」(평일 14:25)를 빌려 **18:00 에 한 번만** 띄운다.
       시각은 set-야구PO-회차시각.mjs 가 바꾼다. 여기서는 «무엇을 쓸지»만 맡긴다.
     ⭐ 18시로 잡은 까닭 — 거두는 자는 10분마다 돌고, 10/25 는 19시까지 열려 있다
       (열여덟시여는날). 18:00 에 써서 18:20 쯤 거두면 마감까지 40분이 남는다. */
  { 시: '15', id: 'trig_01EwjhZx3AKXuEyHK82N9DEn', 글: 'docs/지시-일요일-18시-프로야구PO1.txt', 몇건: 1 },
];

/** 세 자리에 다 들어갔나 — 「썼다」를 「들어갔다」로 읽지 않는다 */
export function 세자리들어갔나(트리거, 바란글) {
  const 자리 = [
    트리거?.derived_state?.prompt,
    트리거?.session_request?.events?.[1]?.payload?.internal_anthropic_catchall?.message?.content,
    트리거?.job_config?.ccr?.events?.[1]?.data?.message?.content,
  ];
  const 본것 = 자리.map((x) => (typeof x === 'string' ? x : null));
  const 맞은수 = 본것.filter((x) => x && x.trim() === String(바란글).trim()).length;
  return { 맞은수, 잰자리: 본것.filter((x) => x != null).length, 자리: 본것 };
}

export function 자가시험() {
  let 통과 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통과++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };
  const 글 = '새 지시문';
  검('세 자리가 다 맞으면 3', 세자리들어갔나({
    derived_state: { prompt: 글 },
    session_request: { events: [null, { payload: { internal_anthropic_catchall: { message: { content: 글 } } } }] },
    job_config: { ccr: { events: [null, { data: { message: { content: 글 } } } ] } },
  }, 글).맞은수 === 3);
  검('🔴 한 자리만 바뀌면 1 — 그것을 「됐다」로 읽지 않는다', 세자리들어갔나({
    derived_state: { prompt: 글 },
    session_request: { events: [null, { payload: { internal_anthropic_catchall: { message: { content: '옛글' } } } }] },
    job_config: { ccr: { events: [null, { data: { message: { content: '옛글' } } } ] } },
  }, 글).맞은수 === 1);
  검('⛔ 빈 트리거는 0 — 「없다」가 아니라 「못 읽었다」다', 세자리들어갔나({}, 글).맞은수 === 0);
  검('⛔ 빈 트리거는 잰 자리도 0', 세자리들어갔나({}, 글).잰자리 === 0);
  검('앞뒤 공백은 같은 글로 본다',
    세자리들어갔나({ derived_state: { prompt: `${글}\n` } }, 글).맞은수 === 1);
  /* ⛔ 회차마다 «1건씩»이어야 한다 — 2026-10-24 에 09시에 3건을 시켰더니
     회차는 3건을 썼는데 거두는 자가 첫 건만 집고 나머지는 대화에 갇혔다.
     ⚠ 회차 수를 숫자로 못박지 않는다. 날마다 바뀌는 값을 시험에 적으면
       배분을 고칠 때마다 시험이 운다 — 지킬 것은 「1건씩」이지 「넷」이 아니다. */
  검('맡길 회차가 회차마다 1건씩이다',
    맡길것.length > 0 && 맡길것.every((x) => x.몇건 === 1));
  검('지시문 파일이 다 있다', 맡길것.every((x) => fs.existsSync(path.join(뿌리, x.글))));

  /* 🔴🔴 [2026-10-24] **하마터면 세 회차가 다 「주말이라 쉰다」로 끝날 뻔했다.**
     회차 셋의 평소 지침에 모두 이 줄이 들어 있다 —
       「토·일이면 여기서 멈추고 "주말이라 쉰다"만 답한다」
     내 머리말은 「소재·건수 지시만 오늘은 따르지 말라」고만 했다. 쉬라는 줄은
     소재도 건수도 아니라서 «덮이지 않는다». 사장님이 시키신 기사가 통째로 안 나간다.
     ⇒ 기사를 쓰라고 시키는 지시문에는 그 줄을 집어서 덮는 문장이 있어야 한다.
     ⛔ 「쉰다」고 시키는 지시문에는 그 문장이 있으면 안 된다 — 서로 어긋난다. */
  검('🔴 주말에 쓰라는 지시문은 「주말이라 쉰다」를 집어서 덮는다',
    맡길것.every((x) => {
      const 글 = fs.readFileSync(path.join(뿌리, x.글), 'utf8');
      const 쉬라는것 = /쓰지 마십시오|쉰다고만|쓰지 말고/.test(글.slice(0, 400));
      const 덮었나 = 글.includes('주말이라 쉰다') && /따르지 마십시오|반드시» 씁니다|반드시 씁니다/.test(글);
      return 쉬라는것 ? !덮었나 : 덮었나;
    }));

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통과} 통과`);
  return 탈 === 0;
}

async function 돈다(무엇) {
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));
  fs.mkdirSync(백업방, { recursive: true });
  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null, protocolTimeout: 300000 });
  const page = await b.newPage();
  let 탈 = 0;
  try {
    const 조직 = await page.evaluate(async () => {
      await fetch('/api/organizations');
      return null;
    }).catch(() => null);
    for (const { 시, id, 글: 글길, 몇건 } of 맡길것) {
      /* ⚠ 개별 조회는 이 페이지를 «먼저 연 뒤»에만 제대로 답한다 */
      await page.goto(`https://claude.ai/scheduled-task/${id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await 쉼(2500);
      const oid = await page.evaluate(async () => {
        const j = await (await fetch('/api/organizations', { headers: { accept: 'application/json' } })).json();
        return j[0]?.uuid;
      });
      const 받은 = await page.evaluate(async (o, t) => {
        const res = await fetch(`/api/organizations/${o}/cowork/scheduled_tasks/${t}`, { headers: { accept: 'application/json' } });
        return { 상태: res.status, 글: await res.text() };
      }, oid, id);
      if (받은.상태 !== 200) { console.log(`🔴 ${시}시 — 못 읽었다 (${받은.상태})`); 탈 += 1; continue; }
      const 트리거 = JSON.parse(받은.글).trigger;
      const 옛글 = 트리거?.derived_state?.prompt;
      if (typeof 옛글 !== 'string' || !옛글) { console.log(`🔴 ${시}시 — 지시문 자리를 못 찾았다`); 탈 += 1; continue; }

      const 백업길 = path.join(백업방, `${시}시-원래지시문.txt`);
      if (무엇 === '본다') {
        console.log(`　 ${시}시 「${트리거.name}」  지금 ${옛글.length}자 · 넣을 것 ${몇건}건`);
        console.log(`     ${옛글.replace(/\s+/g, ' ').slice(0, 90)}…`);
        continue;
      }
      let 넣을글;
      if (무엇 === '적는다') {
        if (!fs.existsSync(백업길)) fs.writeFileSync(백업길, 옛글, 'utf8');   /* 한 번만 백업 */
        /* 🔴🔴 [2026-10-23] **통째로 바꾸지 않는다. 앞에 덧붙인다.**
           옛 지시문이 09시 37,851자 · 15시 40,555자다. 그 안에 사장님이 쌓아 오신
           규칙이 다 들어 있다 — 제목 짓는 법, 추천 키워드, 2026-10-18 질책 반영 등.
           ⛔ 내 지시문 3천 자로 덮으면 그것이 통째로 사라진다. 하루 일로 한 해를 지운다. */
        if (옛글.includes(오늘머리)) { console.log(`⬜ ${시}시 — 이미 들어 있다`); continue; }
        넣을글 = `${오늘머리}\n${fs.readFileSync(path.join(뿌리, 글길), 'utf8').trim()}\n\n`
          + `${아래는평소}\n\n${옛글}`;
      } else {
        if (!fs.existsSync(백업길)) { console.log(`🔴 ${시}시 — 백업이 없다. 되돌릴 수 없다`); 탈 += 1; continue; }
        넣을글 = fs.readFileSync(백업길, 'utf8');
      }
      const 답 = await page.evaluate(async (o, t, prompt) => {
        const res = await fetch(`/api/organizations/${o}/cowork/scheduled_tasks/${t}`, {
          method: 'PATCH',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        return { 상태: res.status, 글: (await res.text()).slice(0, 200) };
      }, oid, id, 넣을글);
      if (답.상태 !== 200) { console.log(`🔴 ${시}시 — 못 썼다 (${답.상태}) ${답.글.replace(/\s+/g, ' ')}`); 탈 += 1; continue; }
      await 쉼(1200);
      const 다시 = await page.evaluate(async (o, t) => {
        const res = await fetch(`/api/organizations/${o}/cowork/scheduled_tasks/${t}`, { headers: { accept: 'application/json' } });
        return await res.text();
      }, oid, id);
      const 확 = 세자리들어갔나(JSON.parse(다시).trigger, 넣을글);
      const 됐나 = 확.맞은수 >= 1 && 확.맞은수 === 확.잰자리;
      if (!됐나) 탈 += 1;
      console.log(`${됐나 ? '✅' : '🔴'} ${시}시 「${트리거.name.slice(0, 28)}」`
        + `  ${옛글.length} → ${넣을글.length}자 · 세 자리 ${확.맞은수}/${확.잰자리}`);
      if (무엇 === '적는다') console.log(`     백업 ${path.relative(뿌리, 백업길)} · ${몇건}건을 시킨다`);
    }
  } finally { try { await page.close(); } catch (e) {} b.disconnect(); }
  return 탈;
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  const 무엇 = process.argv.includes('--적는다') ? '적는다'
    : process.argv.includes('--되돌린다') ? '되돌린다'
      : process.argv.includes('--본다') ? '본다' : null;
  if (!무엇) { console.log('쓰는 법: --본다 | --적는다 | --되돌린다 | --자가시험'); process.exit(1); }
  console.log(`■ 롤드컵 회차 지시문 — ${무엇}`);
  console.log('  (사장님 2026-10-23 「총 10건의 기사를 중부매일계정에게 쓰게 잘 지시하도록」)\n');
  const 탈 = await 돈다(무엇);
  if (탈) { console.log(`\n🔴 ${탈}개가 안 됐다`); process.exit(1); }
  if (무엇 === '적는다') {
    console.log('\n✅ 다 넣었다. ⛔ 일요일에 --되돌린다 를 꼭 돌린다 —');
    console.log('   회차 지시문은 영구적이라 두면 월요일에도 롤드컵을 쓴다.');
  }
}

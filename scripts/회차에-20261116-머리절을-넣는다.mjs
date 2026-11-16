#!/usr/bin/env node
/**
 * 회차에-20261116-머리절을-넣는다.mjs
 *   — **롤드컵을 걷고, 날씨를 10시 회차 하나로 몰고, 농구를 한 편으로 종합한다.**
 *
 * ## 🔴🔴 사장님 2026-11-16
 *   「**중부매일계정이 한참 지난 롤드컵 기사, 중복으로 보내는 날씨 기사 등 문제가 많다.
 *     예약 기사를 보고 수정 및 삭제해서 이런 일이 없도록 해라**」
 *   「**농구 게임 각각 기사를 쓰지 말고, 한 기사에 종합해서 다시 작성해서 보내**」
 *
 * ## 재서 나온 것 — 지침에 그 말이 몇 번 들어 있나
 *   ```
 *   회차            지침      롤드컵   날씨
 *   스포츠 09시     43,249자    14      12
 *   스포츠 11시     40,776자     7       6
 *   스포츠 14시     42,499자     9       7
 *   스포츠 15시     46,581자    21       7
 *   스포츠 16시     42,517자     7       7
 *   날씨   10시     32,232자     4      64
 *   ```
 *   ⇒ 날씨가 **여섯 회차 모두**에 들어 있으니 하루에 여러 통이 나간다.
 *     롤드컵은 2026-11-15 결승으로 끝났는데 다섯 회차가 아직 그것을 쓰라고 적고 있다.
 *
 * ## ⚠ 본문 4만 자를 고치지 않는다
 *   흩어진 대목을 하나씩 고치면 ① 한 곳을 빠뜨리고 ② 고친 자리끼리 어긋난다.
 *   「아래 어떤 글보다 이것이 먼저다」를 **맨 앞에** 못박는 쪽이 안전하다.
 *   ⛔ 아래 본문을 지우지 않는다 — 대회가 다시 열리면 이 머리절만 걷는다.
 *
 * ✅ 두 번 돌려도 안전하다. ⛔ 사장님 크롬 창을 닫지 않는다 — disconnect() 만.
 *
 * 쓰는 법
 *   node scripts/회차에-20261116-머리절을-넣는다.mjs            무엇이 바뀌는지만 본다
 *   node scripts/회차에-20261116-머리절을-넣는다.mjs --적는다   실제로 써넣는다
 *   node scripts/회차에-20261116-머리절을-넣는다.mjs --자가시험
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const 조직 = '953d4e54-f96e-4d6d-b33e-33311fbd09ad';

/** 🔴 2026-11-16 라이브에서 읽은 «켜져 있는» 회차 여섯. 로또는 종목과 무관해 뺐다. */
export const 회차 = [
  ['09', 'trig_01GeyrdjqmGjtu3cCt6ynZHm'], // 전날 종합 · 매일 08:25
  ['10', 'trig_01QLALBiamUfmxWngeTULv12'], // 날씨 · 매일 09:25
  ['11', 'trig_01UW2RtJac77hBVz1tkgCQxN'], // 국내 프로스포츠 · 평일 10:25
  ['14', 'trig_01RgAwm6L1q4nBhanUgz3s8N'], // 해외스포츠 · 평일 13:25
  ['15', 'trig_01EwjhZx3AKXuEyHK82N9DEn'], // 그날 남은 것 · 평일 14:25
  ['16', 'trig_01ErSZQm2VhuNYMRBi3MCufF'], // 기사가 많을 때만 · 평일 15:25
];

export const 끝표 = '<!-- ⬆ 여기까지가 2026-11-16 머리절이다. 대회가 다시 열리면 이 위를 걷는다 ⬇ -->';

/** 날씨를 쓰는 회차는 **10시 하나**다 */
export const 날씨회차 = '10';

export function 머리절만들기(어느회차) {
  const 날씨맡나 = String(어느회차) === 날씨회차;
  return [
    '# 🔴🔴 [사장님 2026-11-16] 롤드컵을 쓰지 않는다 · 날씨는 10시 한 번 · 농구는 한 편 — 아래 어떤 글보다 먼저다',
    '',
    '사장님 원문 —',
    '「**중부매일계정이 한참 지난 롤드컵 기사, 중복으로 보내는 날씨 기사 등 문제가 많다.',
    '  예약 기사를 보고 수정 및 삭제해서 이런 일이 없도록 해라**」',
    '「**농구 게임 각각 기사를 쓰지 말고, 한 기사에 종합해서 다시 작성해서 보내**」',
    '',
    '## ⛔ 1. 롤드컵(LoL 월드챔피언십)을 쓰지 않는다',
    '',
    '- **2026 롤드컵은 11월 15일 결승으로 끝났다.** 끝난 대회의 경기를 다음 날 아침에 쓰면',
    '  「한참 지난 기사」가 된다. 2026-11-16 오전에 실제로 그렇게 나가서 지적받았다.',
    '- 아래 본문에 「롤드컵을 3세트까지 미리 써 둔다」·「라이엇 공식 기록으로 확인한다」 같은',
    '  대목이 여러 곳 남아 있다. 그것은 **대회 기간에 쓴 지난 지시**다. 지금은 따르지 않는다.',
    '- e스포츠를 통째로 막는 것이 아니다. **오늘·어제 열린 경기**가 있으면 쓸 수 있다.',
    '  막는 것은 **이미 끝난 대회를 뒤늦게 쓰는 것**이다.',
    '- 2027년 대회가 열리면 그때 이 머리절을 걷고 되살린다.',
    '',
    '## ⛔ 2. 날씨 기사는 **10시 회차 하나만** 쓴다',
    '',
    날씨맡나
      ? '- **이 회차가 그 하나다.** 날씨는 여기서만 쓴다. 하루에 한 편이다.'
      : '- **이 회차는 날씨를 쓰지 않는다.** 아래 본문에 날씨 지침이 적혀 있어도 따르지 않는다.',
    '- 2026-11-16 에 하루 두 통이 나갔다(08:32 · 09:25). 여섯 회차 모두에 날씨 지침이',
    '  들어 있던 탓이다. **한 사람이 하루에 같은 주제를 두 번 받으면 그것은 중복이다.**',
    '- ⚠ 어제 보낸 날씨와 **같은 날짜의 예보**를 다시 쓰지 않는다. 11월 15일에 「17일 날씨」를',
    '  보내고 11월 16일에 또 「17일 날씨」를 보냈다. 제목이 달라도 같은 것이다.',
    '  쓰기 전에 **어제 보낸 제목과 날짜를 확인**한다.',
    '',
    '## ⛔ 3. 프로농구는 **하루치를 한 편으로 종합**한다',
    '',
    '- 사장님 2026-11-16 — 「농구 게임 각각 기사를 쓰지 말고, 한 기사에 종합해서」',
    '- 어제 KBL 경기가 셋이면 **세 편이 아니라 한 편**이다. 가장 이야기가 되는 경기를',
    '  앞에 놓고 나머지를 잇는다. 제목에는 그 가운데 가장 큰 것을 쓴다.',
    '- ⚠ 이것은 **농구 안에서의 종합**이다. **배구와 묶지 않는다** — 종목이 다르면 기사가 다르다.',
    '  (2026-11-04 사장님 「왜 농구와 배구가 종목이 다른데 한 개의 기사로 묶어 쓰나?」)',
    '- 여자 프로배구도 같다. 어제 여자부 경기가 여럿이면 한 편으로 종합한다.',
    '',
    '## ⛔ 4. 이름 표기 — 예외가 없다',
    '',
    '- 남자 프로농구(KBL) 팀 이름 앞에 **반드시 지역명**을 넣는다.',
    '  삼성(X) → 서울 삼성(O) · KCC(X) → 부산 KCC(O) · 소노(X) → 고양 소노(O)',
    '  ⭐ 서울 연고가 둘이라 「삼성」만 쓰면 어느 팀인지 모른다.',
    '- IBK기업은행은 **제목에서 「IBK」**로 쓴다. 본문은 첫머리에 IBK기업은행, 그 뒤로는 IBK.',
    '',
    '## ⛔ 5. 쓰기 전에 **어제 무엇을 보냈는지** 본다',
    '',
    '- 같은 소재를 이틀 연속 보내지 않는다. 제목이 달라도 소재가 같으면 중복이다.',
    '- 보낼 것이 없으면 **「오늘은 낼 것이 없다」고 적고 빈손으로 끝낸다.**',
    '  빈칸을 메우려고 끝난 대회나 어제 쓴 주제로 돌아가지 않는다.',
    '',
    '## ⚠ 아래 본문과 어긋날 때',
    '',
    '아래 본문이 이 머리절과 어긋나면 **이 머리절이 이긴다.**',
    '',
    끝표,
    '',
  ].join('\n');
}

/** 머리절의 첫 줄(제목)만 — 들어 있는지 알아보는 못 */
export const 머리못 = '# 🔴🔴 [사장님 2026-11-16] 롤드컵을 쓰지 않는다';

export function 고치기(옛글, 쓸머리절) {
  if (typeof 옛글 !== 'string' || !옛글) return { 바뀌었나: false, 까닭: '지침이 비어 있다', 글: 옛글 };
  const i = 옛글.indexOf(머리못);
  if (i === 0) {
    const 끝 = 옛글.indexOf(끝표);
    if (끝 < 0) return { 바뀌었나: false, 까닭: '앞서 붙인 머리절의 끝을 못 찾았다 — 손으로 본다', 글: 옛글 };
    const 본문 = 옛글.slice(끝 + 끝표.length).replace(/^\n+/, '');
    if (쓸머리절 + 본문 === 옛글) return { 바뀌었나: false, 까닭: '이미 같은 머리절이 들어 있다', 글: 옛글 };
    return { 바뀌었나: true, 까닭: '머리절을 갈아 끼웠다', 글: 쓸머리절 + 본문 };
  }
  if (i > 0) return { 바뀌었나: false, 까닭: '머리절이 맨 앞이 아닌 곳에 있다 — 손으로 본다', 글: 옛글 };
  return { 바뀌었나: true, 까닭: '머리절을 맨 앞에 붙였다', 글: 쓸머리절 + 옛글 };
}

const 이파일이진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (이파일이진입점 && process.argv.includes('--자가시험')) {
  let 탈 = 0;
  const 본다 = (이름, 참) => { if (참) console.log('  ✅ ' + 이름); else { console.log('  🔴 ' + 이름); 탈 += 1; } };
  console.log('■ 자가시험');

  const 원래 = '## 스포츠 회차 지침\n롤드컵을 3세트까지 미리 써 둔다.\n날씨를 쓴다.\n';
  const m9 = 머리절만들기('09');
  const a = 고치기(원래, m9);
  본다('처음 붙이면 바뀐다', a.바뀌었나);
  본다('맨 앞에 머리절이 온다', a.글.startsWith(머리못));
  본다('옛 본문을 지우지 않는다', a.글.includes('롤드컵을 3세트까지 미리 써 둔다.'));

  const b2 = 고치기(a.글, m9);
  본다('두 번 돌려도 안 바뀐다', !b2.바뀌었나);
  본다('두 번 돌려도 머리절이 한 벌이다', (a.글.match(/\[사장님 2026-11-16\]/g) || []).length === 1);

  /* 🔴 10시만 날씨를 맡는다 — 나머지는 「쓰지 않는다」가 들어가야 한다 */
  본다('10시 머리절은 날씨를 맡는다', 머리절만들기('10').includes('이 회차가 그 하나다'));
  본다('09시 머리절은 날씨를 안 쓴다', 머리절만들기('09').includes('이 회차는 날씨를 쓰지 않는다'));
  본다('11시 머리절은 날씨를 안 쓴다', 머리절만들기('11').includes('이 회차는 날씨를 쓰지 않는다'));
  본다('10시 머리절에 「쓰지 않는다」가 없다', !머리절만들기('10').includes('이 회차는 날씨를 쓰지 않는다'));

  /* 농구 종합은 넣되 배구와 묶지 말라는 줄이 함께 있어야 한다 */
  본다('농구 종합이 들어 있다', m9.includes('하루치를 한 편으로 종합'));
  본다('배구와 묶지 말라는 줄이 있다', m9.includes('배구와 묶지 않는다'));

  /* 머리절을 고친 뒤 다시 돌리면 갈아 끼워야 한다 */
  const 낡은 = 머리못 + ' — 옛판\n\n낡은 글\n\n' + 끝표 + '\n\n';
  const c = 고치기(낡은 + 원래, m9);
  본다('낡은 머리절은 갈아 끼운다', c.바뀌었나 && !c.글.includes('낡은 글'));
  본다('갈아 끼운 뒤에도 본문은 남는다', c.글.includes('롤드컵을 3세트까지 미리 써 둔다.'));
  본다('갈아 끼운 뒤 머리절은 한 벌이다', (c.글.match(/\[사장님 2026-11-16\]/g) || []).length === 1);

  본다('빈 지침은 손대지 않는다', !고치기('', m9).바뀌었나);
  /* 머리절이 가운데 있으면 손대지 않고 알린다 */
  본다('가운데 있으면 멈춘다', 고치기('앞글\n' + 머리못, m9).까닭.includes('맨 앞이 아닌'));

  console.log(탈 ? '🔴 ' + 탈 + '가지 탈' : '✅ 다 통과');
  process.exit(탈 ? 1 : 0);
}

/* ── 본 일 ── */
if (이파일이진입점) {
  const 적는다 = process.argv.includes('--적는다');
  const require2 = createRequire(path.join('C:\\Users\\User\\Documents\\GitHub\\klifemap', 'package.json'));
  const puppeteer = require2('puppeteer-core');
  const 포트 = process.env.KLM_CHROME_PORT || '9222';
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + 포트, defaultViewport: null, protocolTimeout: 240000 });
  const 탭들 = [];
  try {
    const p = await b.newPage(); 탭들.push(p);
    await p.goto('https://claude.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4000));

    for (const [때, id] of 회차) {
      const 읽음 = await p.evaluate(async (o, t) => {
        const res = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, { headers: { accept: 'application/json' } });
        if (!res.ok) return { 오류: res.status };
        const j = await res.json();
        const tr = j.trigger || j;
        const cfg = (tr.job_config || {}).ccr || {};
        const ev = cfg.events || [];
        let 어디 = -1;
        for (let i = 0; i < ev.length; i += 1) {
          const m = ev[i].data && ev[i].data.message;
          if (m && typeof m.content === 'string') { 어디 = i; break; }
        }
        if (어디 < 0) return { 오류: '지침 자리를 못 찾았다' };
        return { 어디, 글: ev[어디].data.message.content, 온것: JSON.stringify(j) };
      }, 조직, id);

      if (읽음.오류) { console.log('🔴 ' + 때 + '시 — 못 읽었다 (' + 읽음.오류 + ')'); continue; }
      const 결과 = 고치기(읽음.글, 머리절만들기(때));
      if (!결과.바뀌었나) { console.log('⬜ ' + 때 + '시 — ' + 결과.까닭); continue; }
      if (!적는다) { console.log('✏ ' + 때 + '시 — ' + 결과.까닭 + ' (' + 읽음.글.length + '자 → ' + 결과.글.length + '자)'); continue; }

      /* 🔴 PATCH 가 받는 칸은 `prompt` 하나다. job_config 를 통째로 보내면
         「At least one field must be set」 400 이 떨어진다(2026-11-16 에 여섯 번 맞았다).
         ⭐ 그리고 지침은 **세 자리**에 흩어져 산다 — 한 곳만 보고 「됐다」 하지 않는다. */
      const 썼나 = await p.evaluate(async (o, t, 새글, 못) => {
        const r2 = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ prompt: 새글 }),
        });
        if (!r2.ok) return { 오류: 'PATCH ' + r2.status + ' ' + (await r2.text()).slice(0, 160) };
        /* ⭐ 쓴 뒤 «다시 읽어» 들어갔는지 본다 — 「보냈다」는 「들어갔다」가 아니다 */
        const r3 = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, { headers: { accept: 'application/json' } });
        if (!r3.ok) return { 오류: '확인 읽기 ' + r3.status };
        const j3 = await r3.json();
        const tr3 = j3.trigger || j3;
        const 모은 = [
          tr3.derived_state && tr3.derived_state.prompt,
          ...((tr3.session_request && tr3.session_request.events) || [])
            .map((e) => e && e.payload && e.payload.internal_anthropic_catchall
              && e.payload.internal_anthropic_catchall.message
              && e.payload.internal_anthropic_catchall.message.content),
          ...((((tr3.job_config || {}).ccr || {}).events) || [])
            .map((e) => e && e.data && e.data.message && e.data.message.content),
        ].map((x) => String(x || '')).filter(Boolean);
        const 든곳 = 모은.filter((x) => x.startsWith(못)).length;
        return { 자리: 모은.length, 든곳, 들어갔나: 모은.length > 0 && 든곳 === 모은.length };
      }, 조직, id, 결과.글, 머리못);

      if (썼나.오류) console.log('🔴 ' + 때 + '시 — ' + 썼나.오류);
      else if (썼나.들어갔나) console.log('✅ ' + 때 + '시 — ' + 결과.까닭 + ' · 세 자리 ' + 썼나.자리 + '곳 모두에 들었다');
      else console.log('🔴 ' + 때 + '시 — ' + 썼나.자리 + '곳 가운데 ' + 썼나.든곳 + '곳에만 들었다. 손으로 본다');
    }
    if (!적는다) console.log('\n   --적는다 로 실제로 써넣는다');
  } catch (e) {
    console.log('🔴 오류 — ' + e.message);
    process.exitCode = 1;
  } finally {
    for (const x of 탭들) await x.close().catch(() => {});
    b.disconnect();
  }
}

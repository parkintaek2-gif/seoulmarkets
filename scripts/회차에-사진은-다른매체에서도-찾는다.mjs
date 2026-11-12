#!/usr/bin/env node
/**
 * 회차에-사진은-다른매체에서도-찾는다.mjs
 *   — 사장님 2026-11-12 지시를 여섯 회차 상시 지침에 박는다.
 *
 * 🔴 사장님 (2026-11-12)
 *   「**공식홈이 막혀 사진을 사용못한 배구, 농구는 앞으로 연합뉴스 등
 *     다른 매체 사진을 대신 찾아서 줘.**」
 *
 * 왜 필요한가 — 회차가 공식 홈페이지에서 사진을 못 구하면 그 자리에서 멈추고
 * 「사진 못 찾음」으로 기사를 넘겼다. 사장님은 그것을 **안 찾은 것**으로 보신다.
 * 막히면 다른 매체로 간다는 길을 지침에 적어 두어야 회차가 스스로 돈다.
 *
 * ✅ 두 번 돌려도 안전하다 — 자국이 있으면 건너뛴다.
 * ⛔ 사장님 크롬 창을 닫지 않는다 — disconnect() 만. 언제나 새 탭.
 *
 * 쓰는 법
 *   node scripts/회차에-사진은-다른매체에서도-찾는다.mjs            무엇이 바뀌는지만 본다
 *   node scripts/회차에-사진은-다른매체에서도-찾는다.mjs --적는다   실제로 써넣는다
 *   node scripts/회차에-사진은-다른매체에서도-찾는다.mjs --자가시험
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const 조직 = '953d4e54-f96e-4d6d-b33e-33311fbd09ad';

/** 회차를 늘리거나 줄이지 않는다 — 사장님이 여섯으로 정하셨다 */
export const 회차 = [
  ['09', 'trig_01GeyrdjqmGjtu3cCt6ynZHm'],
  ['10', 'trig_01QLALBiamUfmxWngeTULv12'],
  ['11', 'trig_01UW2RtJac77hBVz1tkgCQxN'],
  ['14', 'trig_01RgAwm6L1q4nBhanUgz3s8N'],
  ['15', 'trig_01EwjhZx3AKXuEyHK82N9DEn'],
  ['16', 'trig_01ErSZQm2VhuNYMRBi3MCufF'],
];

/** 들어갔는지 알아보는 자국 */
export const 자국 = '공식홈이 막히면 다른 매체에서 찾는다';

export const 새절 = `
### 🔴🔴 사진 — 공식홈이 막히면 다른 매체에서 찾는다 (사장님 2026-11-12)

사장님 — 「**공식홈이 막혀 사진을 사용못한 배구, 농구는 앞으로 연합뉴스 등
다른 매체 사진을 대신 찾아서 줘.**」

- 공식 홈페이지가 막혀 있어도 **거기서 멈추지 않습니다.** 연합뉴스를 먼저 보고,
  없으면 뉴시스·스포츠 전문지 순으로 찾습니다
- **「사진 못 찾음」은 안 찾은 것입니다.** 한 곳이 막혔다는 말은 보고가 아닙니다
- 찾은 사진은 **주소와 설명을 함께** 적습니다. 어느 매체에서 온 것인지 밝힙니다
- 배구(여자부)·농구(남자 KBL)에서 특히 그렇습니다. 공식 홈이 자주 막힙니다
- 그래도 한 장도 못 찾으면 **어디어디를 봤는지 적습니다.** 본 곳을 적지 않은
  「못 찾음」은 받지 않습니다
`;

/** 옛 글에 새 절을 더한다. 이미 있으면 그대로 둔다. */
export function 고치기(옛글) {
  if (typeof 옛글 !== 'string' || !옛글) return { 바뀌었나: false, 글: 옛글, 까닭: '지침이 비어 있다' };
  if (옛글.includes(자국)) return { 바뀌었나: false, 글: 옛글, 까닭: '이미 들어 있다' };
  const 글 = 옛글.replace(/\s*$/, '') + '\n' + 새절;
  return { 바뀌었나: true, 글, 까닭: '사진 절을 더했다' };
}

function 참(이름, 값) {
  if (값) { console.log('  ✅ ' + 이름); return true; }
  console.log('  🔴 ' + 이름); return false;
}

function 자가시험() {
  console.log('■ 자가시험');
  let 성함 = true;
  const a = 고치기('앞선 지침입니다.');
  성함 = 참('① 없던 곳에는 더한다', a.바뀌었나 && a.글.includes(자국)) && 성함;
  성함 = 참('② 옛 글을 지우지 않는다', a.글.includes('앞선 지침입니다.')) && 성함;
  const b = 고치기(a.글);
  성함 = 참('③ 두 번 돌려도 안 늘어난다', !b.바뀌었나 && b.글 === a.글) && 성함;
  성함 = 참('④ 빈 지침은 건드리지 않는다', !고치기('').바뀌었나) && 성함;
  성함 = 참('⑤ 사장님 말씀이 원문 그대로 들었다',
    새절.includes('공식홈이 막혀 사진을 사용못한 배구, 농구는 앞으로 연합뉴스 등')) && 성함;
  성함 = 참('⑥ 「못 찾음은 안 찾은 것」이 들었다', 새절.includes('안 찾은 것입니다')) && 성함;
  console.log(성함 ? '\n🟢 자가시험 통과' : '\n🔴 자가시험 실패');
  return 성함;
}

const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점 && process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
} else if (내가진입점) {
  const 적는다 = process.argv.includes('--적는다');
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');
  const puppeteer = require('puppeteer-core');
  const 포트 = process.env.KLM_CHROME_PORT || '9222';
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:' + 포트, defaultViewport: null, protocolTimeout: 240000 });
  const page = await b.newPage();
  let 탈 = 0;
  try {
    await page.goto('https://claude.ai/scheduled-task/' + 회차[0][1], { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 4000));

    for (const [시, trig] of 회차) {
      const 받은 = await page.evaluate(async (o, t) => {
        const res = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, { headers: { accept: 'application/json' } });
        return { 상태: res.status, 글: await res.text() };
      }, 조직, trig);
      if (받은.상태 !== 200) { console.log('🔴 ' + 시 + '시 — 못 읽었다 (' + 받은.상태 + ')'); 탈 += 1; continue; }

      const tr = JSON.parse(받은.글).trigger;
      const 옛글 = tr.derived_state?.prompt;
      if (typeof 옛글 !== 'string' || !옛글) { console.log('🔴 ' + 시 + '시 — 지침 자리를 못 찾았다'); 탈 += 1; continue; }

      const r = 고치기(옛글);
      if (!r.바뀌었나) { console.log('⬜ ' + 시 + '시 — ' + r.까닭); continue; }
      if (!적는다) { console.log('🟡 ' + 시 + '시 — ' + 옛글.length + ' → ' + r.글.length + '자 · ' + r.까닭); continue; }

      const 답 = await page.evaluate(async (o, t, prompt) => {
        const res = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, {
          method: 'PATCH',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        return { 상태: res.status, 글: (await res.text()).slice(0, 300) };
      }, 조직, trig, r.글);
      if (답.상태 !== 200) { console.log('🔴 ' + 시 + '시 — 못 썼다 (' + 답.상태 + ') ' + 답.글.replace(/\s+/g, ' ')); 탈 += 1; continue; }

      /* ⭐ 「썼다(200)」를 「들어갔다」로 읽지 않는다 — 다시 읽어서 센다 */
      const 다시 = await page.evaluate(async (o, t) => {
        const res = await fetch('/api/organizations/' + o + '/cowork/scheduled_tasks/' + t, { headers: { accept: 'application/json' } });
        return await res.text();
      }, 조직, trig);
      const t2 = JSON.parse(다시).trigger;
      const 모은글 = [
        t2.derived_state?.prompt,
        ...(t2.session_request?.events || []).map((e) => e?.payload?.internal_anthropic_catchall?.message?.content),
        ...(t2.job_config?.ccr?.events || []).map((e) => e?.data?.message?.content),
      ].map((x) => String(x || '')).filter(Boolean);
      const 든곳 = 모은글.filter((x) => x.includes(자국)).length;
      const 됐나 = 든곳 === 모은글.length;
      console.log((됐나 ? '✅ ' : '🔴 ') + 시 + '시 — ' + 옛글.length + ' → ' + r.글.length + '자 · '
        + '새것 ' + 모은글.length + '곳 가운데 ' + 든곳 + '곳');
      if (!됐나) 탈 += 1;
    }
  } finally { await page.close().catch(() => {}); b.disconnect(); }
  if (!적는다) console.log('\n   --적는다 로 실제로 써넣는다');
  process.exitCode = 탈 ? 1 : 0;
}

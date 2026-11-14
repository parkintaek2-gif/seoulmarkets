#!/usr/bin/env node
/**
 * 시킨다-내일주문.mjs — **예약 회차의 「⓿-오늘 주문」 칸만 갈아끼운다.**
 *
 * ── 🔴 왜 (2026-10-28 · 5번) ─────────────────────────────────────────
 * 사장님 — 「**내일 2시 발표 챙기게 해라. 바로 기사 전송하게 조치해**」
 *
 * 주문을 넣으려면 예약 회차의 지침을 고쳐야 하는데,
 * `set-jbnews-sports-prompt.mjs` 는 **정해 둔 칸들이 빠졌을 때만** 고친다.
 * 그래서 「⓿-오늘」 칸을 갈아도 그 자는 「그대로」라며 안 보낸다.
 * ⇒ 이 자는 그 한 칸만 본다. 다른 칸은 건드리지 않는다.
 *
 * ⚠ 그 칸에 **2026-10-14 자 옛 주문(이강인 경기)이 2주 동안 그대로 박혀 있었다.**
 *   지침 스스로 「지시가 바뀌면 옛 지시를 지운다」고 적어 두고도 안 지워졌다.
 *   ⇒ 이 자는 갈아끼울 때 옛것을 «지우고» 넣는다. 둘을 같이 두지 않는다.
 *
 * ⛔ 사장님 크롬 창을 닫지 않는다 — disconnect() 만. 언제나 새 탭.
 * ⭐ 「썼다」를 「들어갔다」로 읽지 않는다 — 다시 읽어 **세 자리**를 다 맞춘다.
 *
 * 쓰는 법
 *   node scripts/시킨다-내일주문.mjs --시험      무엇이 바뀌는지만 본다
 *   node scripts/시킨다-내일주문.mjs --적는다    실제로 써넣는다
 *   node scripts/시킨다-내일주문.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');

export const 조직 = '953d4e54-f96e-4d6d-b33e-33311fbd09ad';

/** 주문 칸의 처음과 끝 — 이 둘 사이만 갈아끼운다 */
export const 칸시작 = '**⓿-오늘';
export const 칸끝 = '① **아시안게임**';

/**
 * 🔴🔴 [2026-11-14 · 5번] **회차마다 지침의 생김새가 다르다 — 끝표도 다르다.**
 *   사장님이 내일 치 넷을 시키라 하셨는데(롤드컵·날씨·프로야구 FA·농구배구)
 *   **날씨 회차 하나만** 「⬜ 그대로 (끝표를 못 찾았다)」로 섰다.
 *   스포츠 지침에만 있는 「① **아시안게임**」을 날씨 지침에서 찾았기 때문이다.
 *   ⛔ 끝표를 코드에 하나로 박아 두면, 지침이 늘 때마다 그 회차가 조용히 빠진다.
 *   ⇒ 회차별 끝표를 표로 두고, 없으면 기본값을 쓴다. 손으로 고르지 않는다.
 */
export const 회차별끝표 = {
  '10': '## 중부매일 날씨 기사 — 10시 배송',   /* 날씨 회차 */
};

/** 이 회차의 끝표 — 표에 있으면 그것, 없으면 스포츠 기본값 */
export function 끝표고르기(회차, 표 = 회차별끝표) {
  return 표[String(회차)] || 칸끝;
}

/**
 * 지침에서 주문 칸을 새것으로 갈아끼운다.
 * 칸이 없으면(옛 주문이 이미 지워졌으면) 끝표 «앞»에 새로 넣는다.
 * @returns {{글:string, 바뀌었나:boolean, 까닭:string}}
 */
export function 갈아끼운다(옛글, 새칸, 끝표 = 칸끝) {
  const s = String(옛글 ?? '');
  const j = s.indexOf(끝표);
  if (j === -1) return { 글: s, 바뀌었나: false, 까닭: `끝표(${끝표})를 못 찾았다` };
  const i = s.indexOf(칸시작);
  const 앞 = (i !== -1 && i < j) ? s.slice(0, i) : s.slice(0, j);
  const 새 = 앞 + 새칸 + s.slice(j);
  if (새 === s) return { 글: s, 바뀌었나: false, 까닭: '이미 그 주문이 들어 있다' };
  return { 글: 새, 바뀌었나: true, 까닭: i === -1 ? '주문 칸이 없어 새로 넣는다' : '옛 주문을 걷고 새 주문을 넣는다' };
}

/** 주문문을 파일에서 읽는다 — 긴 글을 명령줄에 올리지 않는다 */
export function 주문읽기(길) {
  const 글 = fs.readFileSync(길, 'utf8').replace(/\s*$/, '') + '\n\n';
  if (!글.startsWith(칸시작)) {
    throw new Error(`주문문은 「${칸시작}」 으로 시작해야 한다 — 그래야 다음에 이 자가 그 칸을 찾아 걷는다`);
  }
  return 글;
}

if (process.argv.includes('--자가시험')) {
  let 총 = 0; let 흠 = 0;
  const 본다 = (이름, 참인가) => {
    총 += 1;
    if (참인가) console.log('  ✅ ' + 이름);
    else { 흠 += 1; console.log('  ❌ ' + 이름); }
  };
  const 옛 = '앞글\n\n**⓿-오늘 옛 주문입니다**\n줄\n\n① **아시안게임** — 뒤\n';
  const 새칸 = '**⓿-오늘 새 주문입니다**\n\n';
  const r = 갈아끼운다(옛, 새칸);
  본다('옛 주문이 사라진다', !r.글.includes('옛 주문입니다'));
  본다('새 주문이 들어간다', r.글.includes('새 주문입니다'));
  본다('앞뒤 글은 그대로다', r.글.startsWith('앞글') && r.글.includes('① **아시안게임** — 뒤'));
  본다('바뀐 것을 바뀌었다고 말한다', r.바뀌었나 === true);
  const 없는것 = 갈아끼운다('앞글\n\n① **아시안게임** — 뒤\n', 새칸);
  본다('칸이 없으면 새로 넣는다', 없는것.바뀌었나 && 없는것.글.includes('새 주문입니다'));
  const 두번 = 갈아끼운다(r.글, 새칸);
  본다('두 번 돌려도 또 안 바꾼다', 두번.바뀌었나 === false);
  const 끝표없음 = 갈아끼운다('아무 글', 새칸);
  본다('끝표가 없으면 손대지 않는다', 끝표없음.바뀌었나 === false);

  /* 🔴 [2026-11-14] 회차마다 끝표가 다르다 — 날씨 회차가 이것 때문에 섰다 */
  본다('날씨 회차는 제 끝표를 쓴다', 끝표고르기('10') === '## 중부매일 날씨 기사 — 10시 배송');
  본다('표에 없는 회차는 스포츠 끝표를 쓴다', 끝표고르기('15') === 칸끝);
  const 날씨옛 = '머리절\n\n## 중부매일 날씨 기사 — 10시 배송 (매일 · 1건)\n뒤';
  const 날씨r = 갈아끼운다(날씨옛, 새칸, 끝표고르기('10'));
  본다('🔴 날씨 지침에도 주문이 들어간다', 날씨r.바뀌었나 && 날씨r.글.includes('새 주문입니다'));
  본다('날씨 지침의 뒷글은 그대로다', 날씨r.글.includes('## 중부매일 날씨 기사 — 10시 배송 (매일 · 1건)'));
  본다('⛔ 스포츠 끝표로는 날씨 지침을 못 찾는다 — 그래서 표가 필요했다',
    갈아끼운다(날씨옛, 새칸).바뀌었나 === false);
  console.log(`\n  ${총 - 흠}/${총} 통과`);
  process.exit(흠 ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const 적는다 = process.argv.includes('--적는다');
  const 회차인자 = (process.argv.find((x) => x.startsWith('--회차=')) || '').split('=')[1];
  const 글인자 = (process.argv.find((x) => x.startsWith('--글=')) || '').split('=')[1];
  if (!회차인자 || !글인자) {
    console.error('⛔ 쓰는 법: node scripts/시킨다-내일주문.mjs --회차=15 --글=<주문문 파일> [--적는다]');
    process.exit(1);
  }

  const 수집기글 = fs.readFileSync(path.join(여기, 'collect-jbnews-sports-articles.mjs'), 'utf8');
  const 표 = [...수집기글.matchAll(/\['(\d{2})',\s*'(trig_[0-9A-Za-z]+)'\]/g)].map((m) => [m[1], m[2]]);
  const 찾은 = 표.find(([시]) => 시 === 회차인자);
  if (!찾은) {
    console.error(`🔴 ${회차인자}시 회차가 표에 없다 — 있는 것: ${표.map(([시]) => 시).join(' ')}`);
    process.exit(1);
  }
  const [시, trig] = 찾은;
  const 새칸 = 주문읽기(path.isAbsolute(글인자) ? 글인자 : path.join(뿌리, 글인자));

  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null });
  const page = await b.newPage();
  try {
    await page.goto(`https://claude.ai/scheduled-task/${trig}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 3000));

    const 받은 = await page.evaluate(async (조직, trig) => {
      const res = await fetch(`/api/organizations/${조직}/cowork/scheduled_tasks/${trig}`, { headers: { accept: 'application/json' } });
      return { 상태: res.status, 글: await res.text() };
    }, 조직, trig);
    if (받은.상태 !== 200) { console.log(`🔴 ${시}시 — 못 읽었다 (${받은.상태})`); process.exit(1); }

    /* 되돌릴 길을 먼저 쥔다 */
    const 되돌릴방 = path.join(뿌리, 'archive', 'raw', 'jbnews-sports-prompt', new Date().toLocaleDateString('sv-SE'));
    fs.mkdirSync(되돌릴방, { recursive: true });
    fs.writeFileSync(path.join(되돌릴방, `${시}시-주문고치기전.json`), 받은.글, 'utf8');

    const 트리거 = JSON.parse(받은.글).trigger;
    const 옛글 = 트리거.derived_state?.prompt;
    if (typeof 옛글 !== 'string' || !옛글) { console.log(`🔴 ${시}시 — 지침 자리를 못 찾았다`); process.exit(1); }

    const r = 갈아끼운다(옛글, 새칸, 끝표고르기(시));
    if (!r.바뀌었나) { console.log(`⬜ ${시}시 — 그대로 (${r.까닭})`); process.exit(0); }
    console.log(`🟡 ${시}시 — ${r.까닭} (${옛글.length} → ${r.글.length}자)`);
    if (!적는다) { console.log('   --적는다 로 써넣는다'); process.exit(0); }

    const 답 = await page.evaluate(async (조직, trig, prompt) => {
      const res = await fetch(`/api/organizations/${조직}/cowork/scheduled_tasks/${trig}`, {
        method: 'PATCH',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      return { 상태: res.status, 글: (await res.text()).slice(0, 300) };
    }, 조직, trig, r.글);
    if (답.상태 !== 200) { console.log(`🔴 ${시}시 — 못 썼다 (${답.상태}) ${답.글.replace(/\s+/g, ' ')}`); process.exit(1); }

    /* ⭐ 「썼다」를 「들어갔다」로 읽지 않는다 — 세 자리를 다 맞춘다 */
    const 다시 = await page.evaluate(async (조직, trig) => {
      const res = await fetch(`/api/organizations/${조직}/cowork/scheduled_tasks/${trig}`, { headers: { accept: 'application/json' } });
      return await res.text();
    }, 조직, trig);
    const t2 = JSON.parse(다시).trigger;
    const 세자리 = [
      t2.derived_state?.prompt,
      t2.session_request?.events?.[1]?.payload?.internal_anthropic_catchall?.message?.content,
      t2.job_config?.ccr?.events?.[1]?.data?.message?.content,
    ];
    const 든가 = 세자리.every((s) => String(s || '') === r.글);
    console.log(든가
      ? `✅ ${시}시 — 들어갔다. 세 자리가 보낸 글과 글자 그대로 같다`
      : `🔴 ${시}시 — 썼다는데 돌아온 글이 다르다. 세 자리 길이: ${세자리.map((s) => String(s || '').length).join(' / ')}`);
    process.exit(든가 ? 0 : 1);
  } finally {
    await b.disconnect();
  }
}

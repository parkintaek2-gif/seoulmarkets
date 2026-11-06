#!/usr/bin/env node
/**
 * 시킨다-중부매일-기사.mjs — **사장님이 그때 주문하신 기사를 중부매일 계정에 시킨다.**
 *
 * ── 🔴 왜 (2026-09-29 · 5번) ─────────────────────────────────────────
 * 사장님 — 「**아시안게임 종합 기사(어제 경기) 빨리 쓰라고 지시해라**」
 * 회차 규칙의 맨 앞자리가 바로 이것이다 — 「⓿ 사장님이 그때 주문하신 기사(최우선)」.
 * ⛔ 내가 직접 쓰지 않는다. 사장님이 「네가 직접 쓰면 문제가 많다」고 못박으셨다.
 *
 * ⛔ **「지금 실행」을 누르지 않는다.** 그것은 회차의 «원래 프롬프트»를 먼저 돌려서,
 *   답글로 얹은 지시를 그 뒤로 밀어 묻는다. 2026-09-28 에 그래서 16시 회차에
 *   기획이 아니라 경기 기사가 나갔다. ⇒ 회차 «대화»에 들어가 그 자리에서 시킨다.
 *
 * 🔴 **줄바꿈은 «전송키»다.** 여러 줄짜리 지시를 그냥 치면 줄마다 따로 보내진다 —
 *   처음 이 길을 냈을 때 지시 하나가 «열 토막»으로 나갔고, 받는 쪽은 첫 토막에
 *   답을 시작해 뒤에 붙인 조건(정본 출처·팩트 규칙)을 못 본 채 쓸 뻔했다.
 *   ⇒ 줄은 Shift+Enter 로 넣고, 다 친 뒤 Enter 를 «한 번만» 누른다.
 *
 * ⛔ 사장님 크롬 창을 닫지 않는다 — disconnect() 만. 언제나 새 탭.
 *
 * 쓰는 법
 *   node scripts/시킨다-중부매일-기사.mjs --회차 09 --글 docs/지시문.txt
 *   node scripts/시킨다-중부매일-기사.mjs --회차 09 --글 ... --찍는다 그림.png
 *   node scripts/시킨다-중부매일-기사.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 회차 표는 «수집기 하나»에서만 읽는다 — 두 곳에 적으면 한 곳만 고쳐진다.
 * 다만 그 수집기 안에 표가 **여럿**이다. 전부 읽는다.
 *
 * 🔴🔴 [2026-10-23 · 5번] 사장님이 「날씨기사 다시 줘」 하셨는데 시키지 못했다 —
 *   「🔴 10시 회차가 표에 없다 — 있는 것: 09 11 14 15 16」
 *   까닭은 이 함수가 «온회차»(스포츠)만 읽었기 때문이다. 날씨 회차는 일부러
 *   스포츠 표에서 빼 두었다 — 주말 자물쇠와 「오늘은 스포츠 그만」이 날씨를
 *   막으면 안 되기 때문이다.
 *   ⛔ 표를 나눈 것은 옳았다. **나뉜 줄 모르고 한쪽만 읽은 것**이 흠이다.
 */
export function 회차읽기(글) {
  const g = String(글 ?? '');
  const 모은것 = [];
  const 본것 = new Set();
  for (const m of g.matchAll(/const (?:온회차|날씨회차|로또회차|회차) = \[([\s\S]*?)\];/g)) {
    for (const x of m[1].matchAll(/\['(\d{2})',\s*'(trig_[0-9A-Za-z]+)'\]/g)) {
      if (본것.has(x[1])) continue;   /* 같은 시각이 두 표에 있으면 먼저 만난 것을 쓴다 */
      본것.add(x[1]);
      모은것.push([x[1], x[2]]);
    }
  }
  return 모은것;
}

/**
 * 「기록」 목록에서 «한 회차 줄»인가.
 * ⛔ 「다음 실행: 오늘 오전 9:00」은 앞으로 할 일이지 한 일이 아니다 — 거른다.
 */
export function 회차줄인가(t) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 60) return false;
  if (/다음 실행|예정/.test(s)) return false;
  return /(오늘|어제|\d+월 \d+일).*(오전|오후) \d+:\d+/.test(s);
}

/** 인자 하나 — ⛔ 값이 없으면 argv[0](노드 경로)를 집지 않게 -1 을 그대로 본다 */
export function 인자(이름, argv = process.argv) {
  const i = argv.indexOf(`--${이름}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참, 덧 = '') => 것.push({ 이름, 참: !!참, 덧 });

  본다('🔴 「다음 실행」 줄은 회차가 아니다', !회차줄인가('다음 실행: 오늘 오전 9:00'));
  본다('오늘 회차 줄은 잡는다', 회차줄인가('오늘 오전 9:03'));
  본다('어제 회차 줄도 잡는다', 회차줄인가('어제 오후 4:42'));
  본다('⛔ 긴 글은 회차 줄이 아니다', !회차줄인가('x'.repeat(80)));
  본다('⛔ 빈 것에 안 터진다', !회차줄인가(null) && !회차줄인가(''));

  본다('회차 표를 읽는다', 회차읽기("const 온회차 = [['09','trig_abc'],['10','trig_def']];").length === 2);
  본다('⛔ 표가 없으면 빈 것을 낸다', 회차읽기('아무 글').length === 0);

  본다('🔴 값 없는 인자에 노드 경로를 집지 않는다', 인자('글', ['node', '자.mjs', '--글']) === null);
  본다('인자 값을 제대로 집는다', 인자('회차', ['node', '자.mjs', '--회차', '09']) === '09');

  const 진짜 = 회차읽기(fs.readFileSync(path.join(뿌리, 'scripts', 'collect-jbnews-sports-articles.mjs'), 'utf8'));
  본다('🔴 진짜 회차 표가 비어 있지 않다', 진짜.length > 0, `${진짜.length}회차`);

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 시킨다-중부매일-기사 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}${x.덧 ? `  (${x.덧})` : ''}`);
  return 빨강.length === 0;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 회차번호 = 인자('회차');
  const 글길 = 인자('글');
  const 찍을곳 = 인자('찍는다');
  if (!회차번호 || !글길) {
    console.error('쓰는 법: node scripts/시킨다-중부매일-기사.mjs --회차 09 --글 <지시문.txt>');
    process.exit(1);
  }
  if (!fs.existsSync(글길)) { console.error(`🔴 지시문 파일이 없다 — ${글길}`); process.exit(1); }
  const 시킬글 = fs.readFileSync(글길, 'utf8').trim();
  if (시킬글.length < 30) { console.error(`🔴 지시문이 너무 짧다 (${시킬글.length}자) — 안 보낸다`); process.exit(1); }

  const 표 = 회차읽기(fs.readFileSync(path.join(뿌리, 'scripts', 'collect-jbnews-sports-articles.mjs'), 'utf8'));
  const 짝 = 표.find(([시]) => 시 === 회차번호);
  if (!짝) { console.error(`🔴 ${회차번호}시 회차가 표에 없다 — 있는 것: ${표.map((x) => x[0]).join(' ')}`); process.exit(1); }
  const TRIG = 짝[1];

  const 잠깐 = (ms) => new Promise((r) => setTimeout(r, ms));
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null });
  const page = await b.newPage();
  let 끝값 = 1;
  /* 🔴 [2026-09-29] 브라우저를 연 뒤의 일은 «함수 안»에 둔다.
     최상위에서는 `return` 을 못 쓰고, 그렇다고 `process.exit()` 을 부르면
     탭을 닫는 `finally` 가 안 돌아 탭이 남는다 — 그것이 오늘 PC 를 누른 까닭이다. */
  const 해본다 = async () => {
    await page.setViewport({ width: 1400, height: 950 });
    /* 🔴🔴 [2026-11-06 · 5번] **한 번 열어 보고 그만두지 않는다.**
       [무슨 일이] 이 goto 가 90초를 넘겨 터지면 이 자가 그대로 죽었다. 그 바람에
         거두는 자가 막힌 기사를 회차에 «되돌리는» 자리에서 「🔴 되돌리지 못했다」만 찍고
         기사를 버렸다. 같은 명령을 손으로 한 번 더 치니 바로 열렸다 — 고장이 아니라 «때»였다.
       ⇒ 세 번까지 다시 연다. 그래도 안 열리면 그때 터뜨린다 — 조용히 넘어가지 않는다. */
    {
      let 마지막탈 = null;
      for (let 번 = 1; 번 <= 3; 번 += 1) {
        try {
          await page.goto(`https://claude.ai/scheduled-task/${TRIG}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
          마지막탈 = null;
          break;
        } catch (e) {
          마지막탈 = e;
          console.log(`⚠ 회차 지면을 못 열었다 (${번}/3) — ${String(e && e.message ? e.message : e).slice(0, 60)}`);
          await 잠깐(5000);
        }
      }
      if (마지막탈) throw 마지막탈;
    }
    for (let i = 0; i < 20; i++) { await 잠깐(2000); if (await page.evaluate(() => /지금 실행/.test(document.body.innerText))) break; }
    await 잠깐(2000);

    const 자리 = await page.evaluate((판정글) => {
      const 꼴 = (0, eval)('(' + 판정글 + ')');
      const 다 = [...document.querySelectorAll('*')].filter((e) => 꼴(e.textContent || ''));
      const 안쪽 = 다.filter((e) => ![...e.children].some((c) => 꼴(c.textContent || '')));
      if (!안쪽.length) return null;
      const e = 안쪽.map((x) => ({ x, r: x.getBoundingClientRect() })).filter((s) => s.r.width > 0)
        .sort((a, z) => a.r.y - z.r.y)[0];
      if (!e) return null;
      e.x.scrollIntoView({ block: 'center' });
      const r = e.x.getBoundingClientRect();
      return { 글: e.x.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, 회차줄인가.toString());
    /* ⛔ 오늘 그 회차가 «아직» 안 돌았으면 시킬 대화가 없다. 고장이 아니다 */
    /* 🔴 [2026-09-29] 여기서 `process.exit()` 을 부르면 아래 `finally` 가 «안 돈다» —
       그래서 탭이 남는다. 오늘 그렇게 쌓인 탭이 157개가 되어 PC 메모리가 89% 까지 찼고
       배경 명령 셋이 죽었다. ⛔ 브라우저를 연 뒤에는 exit 하지 않는다. return 한다. */
    if (!자리) { console.log(`⬜ ${회차번호}시 회차 기록이 없다 — 그 회차가 아직 안 돌았다. 시키지 못했다`); return; }
    console.log(`회차 줄  ${자리.글}`);

    const 앞 = page.url();
    await page.mouse.click(자리.x, 자리.y);
    await 잠깐(9000);
    if (page.url() === 앞) { console.log('🔴 회차 대화가 안 열렸다'); return; }
    console.log(`대화     ${page.url()}`);

    /* 리치텍스트 입력칸 — value 를 넣으면 안 먹는다. 눌러서 «친다» */
    const 칸 = await page.$('div[contenteditable="true"]');
    if (!칸) { console.log('🔴 입력칸을 못 찾았다'); return; }
    await 칸.click();
    await 잠깐(700);

    /* 🔴 [2026-10-17] 한 글자씩 «치면» 긴 글이 안 들어간다 —
       준PO 1차전 지시문 2,815자를 delay 4ms 로 쳤더니 «1%»만 들어가고 섰다.
       치는 11초 동안 칸이 포커스를 잃는다. 글이 길수록 더 자주 깨진다.
       ⇒ CDP 의 Input.insertText(= sendCharacter) 로 «한 번에» 넣는다. 2,848자가 100% 들어갔다.
       ⭐ 줄바꿈이 키 이벤트가 아니라 «글자»로 들어가므로 중간에 전송되지 않는다 —
         Shift+Enter 를 끼워 넣을 까닭 자체가 사라진다. 위 머리글의 「줄바꿈은 전송키다」는
         «치는 길»에만 걸리는 말이었다.
       ⚠ 앞선 시도의 잔재가 칸에 남아 있으면 비율 계산이 흐려지므로 먼저 비운다. */
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await 잠깐(500);
    await page.keyboard.sendCharacter(시킬글);
    await 잠깐(1500);

    /* ⛔ 「쳤다」를 「들어갔다」로 읽지 않는다 — 칸에 실제로 얼마나 들어갔나를 센다 */
    const 친것 = await page.evaluate(() => document.querySelector('div[contenteditable="true"]')?.innerText ?? '');
    const 들어간비율 = 친것.replace(/\s/g, '').length / 시킬글.replace(/\s/g, '').length;
    if (들어간비율 < 0.9) {
      console.log(`🔴 글이 덜 들어갔다 (${Math.round(들어간비율 * 100)}%) — 보내지 않는다. 토막으로 나가느니 서는 것이 낫다`);
      return;
    }
    console.log(`친 글    ${친것.length}자 (${Math.round(들어간비율 * 100)}%)`);

    await page.keyboard.press('Enter');
    await 잠깐(6000);

    /* 눈으로 확인한다 — 내 말이 «한 덩이로» 올라갔나 */
    const 올랐나 = await page.evaluate(() => {
      const n = [...document.querySelectorAll('[data-testid="user-message"]')];
      return n.length ? n[n.length - 1].innerText.replace(/\s+/g, ' ').trim() : null;
    });
    if (!올랐나) { console.log('🔴 내 말이 대화에 안 보인다'); return; }
    console.log(`✅ 시켰다 — 한 덩이 ${올랐나.length}자`);
    끝값 = 0;
    if (찍을곳) await page.screenshot({ path: 찍을곳 });
  };
  try { await 해본다(); } finally { await page.close(); b.disconnect(); }
  process.exit(끝값);
}

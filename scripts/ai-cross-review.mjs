#!/usr/bin/env node
/**
 * ai-cross-review.mjs — 두 AI 가 «서로»를 점검하고, 그 수를 놓고 토론한다
 * ─────────────────────────────────────────────────────────────────────────────
 * 사장님 지시 (2026-09-24):
 *   「ai에 대한 중간 점검 내지는 평가를 해라.
 *     **에스마켓이 케이라이프맵ai를 점검, 평가하고 케이라이프맵이 투자ai를 점검, 평가해라.**」
 *   「**그걸 갖고 서로 토론을 해서 최적의 결과, 학습 및 구축 방향을 도출해서 적용해라**」
 *
 * [왜 «서로»인가 — 우리 회사가 이미 아는 이치]
 *   투자 AI 셋 가운데 리스크 관리자가 ①②와 «독립»이어야 하는 것과 같은 까닭이다.
 *   ⭐ **같은 것이 사고 같은 것이 「괜찮다」고 하면 통제가 아니다.**
 *   제 것을 제가 채점하면 제가 안 보는 자리는 영영 안 보인다.
 *
 * [무엇이 판정하고 무엇이 말하나]
 *   판정은 **규칙**이 한다(아래 잣대들). LLM 은 그 수를 읽고 «무엇을 먼저 고칠지»를 말한다.
 *   ⛔ LLM 이 점수를 매기지 않는다 — 매번 다른 점수가 나오면 그것은 자가 아니다.
 *
 * 쓰는 법
 *   node scripts/ai-cross-review.mjs             점검·평가만 (수를 낸다)
 *   node scripts/ai-cross-review.mjs --토론       + LLM 두 역할이 토론한다
 *   node scripts/ai-cross-review.mjs --적는다      + docs/ 에 기록을 남긴다
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
const 케맵 = path.join(뿌리, '..', 'klifemap');

/* ═══════════════════════════════════════════════════════════════════════════
   잣대 하나 — 「SeoulMarkets 가 KLifeMap AI 를 본다」
   ⭐ SeoulMarkets 의 눈은 «금융 데이터»의 눈이다. 그쪽이 늘 묻는 것을 여기에도 묻는다 —
      근거를 대나 · 못 잰 것을 못 잰다고 하나 · 한쪽으로 쏠렸나 · 비용이 얼마나 드나
   ═══════════════════════════════════════════════════════════════════════════ */

export function 케맵AI를_에스마켓이_본다() {
  const 항목 = [];
  const 잰다 = (이름, 값, 문턱, 말, 무엇을고치나) =>
    항목.push({ 이름, 값, 문턱, 통과: 값 >= 문턱, 말, 무엇을고치나 });

  /* ① 손님이 실제로 묻는 물음 가운데 «고전 대목이 서는» 비율.
     ⭐ SeoulMarkets 식으로 말하면 «커버리지»다. 자료가 있어도 안 걸리면 없는 것과 같다.
     ⚠ 다만 **우리가 안 다루는 것**은 세지 않는다 — 타로·신점·부적은 우리 상품이 아니고,
       사장님이 「신살·부적·굿은 다루지 않는다」고 정하셨다. 그것까지 세면 영원히 빨강이고,
       **헛빨간불은 빨간불을 죽인다.** 거두는 자리에서 거르지 않고 여기서 세지 않는다 —
       그 물음도 «커뮤니티에 무엇이 오가나»를 아는 자료이기 때문이다. */
  const 온질문 = 거둔질문읽기();
  const 질문들 = 온질문.filter((q) => !우리것이아닌가(q) && !성명학물음인가(q));
  let 걸린것 = 0;
  const 안걸린보기 = [];
  if (질문들.length) {
    const 결과 = 케맵에서돌린다(`
      const K=require('./ai/classics.js');
      const qs=${JSON.stringify(질문들.slice(0, 200))};
      let hit=0; const miss=[];
      for (const q of qs) { if (K.대목찾기(q).length) hit++; else if (miss.length<8) miss.push(q); }
      process.stdout.write(JSON.stringify({hit, total: qs.length, miss}));
    `);
    if (결과) {
      const r = JSON.parse(결과);
      걸린것 = Math.round((r.hit / Math.max(1, r.total)) * 100);
      안걸린보기.push(...r.miss);
    }
  }
  잰다('① 손님 물음에 고전이 서는 비율', 걸린것, 60,
    질문들.length ? `${걸린것}% (표본 ${Math.min(200, 질문들.length)})` : '⛔ 거둔 질문이 없어 못 쟀다',
    '주제표에 낱말을 더한다 — 안 걸린 물음을 읽고 거기 쓰인 말을 넣는다');

  /* ② 프롬프트가 얼마나 무거운가 — 값이 드는 자리다.
     ⚠ 「많이 실을수록 좋다」가 아니다. 길수록 모델이 앞쪽을 잊고 값도 오른다. */
  const 프롬프트 = 케맵에서돌린다(`
    const C=require('./ai/chatCoachEngine.js');
    const B=require('./ai/bossRules.js');
    const K=require('./ai/classics.js');
    const 고전=K.고전지시(K.대목찾기("용신이 뭔가요"));
    process.stdout.write(C._forMeasure.buildSystemPrompt("없음","","","ko",고전,B.지시글("상담",{lang:"ko"})));
  `) || '';
  const 글자 = 프롬프트.length;
  /* 짧을수록 좋으니 뒤집어 잰다 — 1.2만 자 넘으면 빨강 */
  잰다('② 프롬프트 무게 (1.2만 자 이하)', 글자 && 글자 <= 12000 ? 1 : 0, 1,
    `${글자.toLocaleString()}자`,
    '고전 대목 글자수를 줄이거나 한 번에 싣는 대목을 둘에서 하나로 줄인다');

  /* ③ 판정 근거가 «엔진»에서 오나 — 상담이 스스로 판정하면 우리 구조가 깨진다 */
  const 근거선 = ['엔진 판정', '새로운 명리학적 판정을 만들어', '새 판정을 만들지']
    .filter((s) => 프롬프트.includes(s)).length;
  잰다('③ 「판정은 엔진이 한다」가 못박혀 있나', 근거선, 2,
    `${근거선}/3 줄`, '프롬프트에 그 선을 다시 넣는다');

  /* ④ 못 잰 것을 못 잤다고 하나 — 회사 강령 ③ */
  const 모름 = ['모르면 모르는 대로', '지어내', '없는 고전을 지어내']
    .filter((s) => 프롬프트.includes(s)).length;
  잰다('④ 모르는 것을 지어내지 말라가 있나', 모름, 2,
    `${모름}/3 줄`, '「모르면 모른다고 한다」를 프롬프트에 넣는다');

  /* ⑤ 언어권이 한쪽으로 쏠렸나 — 쏠리면 그 언어 손님만 배운다 */
  const 말별 = 질문언어별();
  const 값들 = Object.values(말별);
  const 가장작은쪽 = 값들.length >= 3 ? Math.min(...값들) : 0;
  잰다('⑤ 가장 적은 언어권의 질문 수', 가장작은쪽, 20,
    Object.entries(말별).map(([k, v]) => `${k} ${v}`).join(' · ') || '없다',
    '얕은 언어권의 우물을 더 찾는다 — 지금은 중국어가 얕다');

  return { 보는쪽: 'SeoulMarkets(투자 AI)', 보이는쪽: 'KLifeMap AI', 항목, 안걸린보기 };
}

/* ═══════════════════════════════════════════════════════════════════════════
   잣대 둘 — 「KLifeMap 이 투자 AI 를 본다」
   ⭐ KLifeMap 의 눈은 «판정»의 눈이다. 그쪽이 늘 묻는 것을 여기에도 묻는다 —
      판정과 설명이 갈려 있나 · 한쪽으로 단정하나 · 근거를 붙이나 · 사람을 밀어붙이나
   ═══════════════════════════════════════════════════════════════════════════ */

export function 투자AI를_케맵이_본다() {
  const 항목 = [];
  const 잰다 = (이름, 값, 문턱, 말, 무엇을고치나) =>
    항목.push({ 이름, 값, 문턱, 통과: 값 >= 문턱, 말, 무엇을고치나 });

  const 신호들 = 신호읽기();

  /* ① 신호마다 근거가 붙어 있나 — KLifeMap 의 「근거를 못 대는 문장은 안 내보낸다」 */
  const 근거있음 = 신호들.filter((s) => s.evidence && Object.keys(s.evidence).length).length;
  const 근거율 = 신호들.length ? Math.round((근거있음 / 신호들.length) * 100) : 0;
  잰다('① 근거가 붙은 신호 비율', 근거율, 95,
    `${근거율}% (${근거있음}/${신호들.length})`,
    '근거 없는 신호는 만들지 않는다 — 만드는 자리에서 막는다');

  /* ② 방향이 한쪽으로 쏠렸나.
     ⭐ KLifeMap 이 「평균이 규범이 되면 압박이 된다」를 지키는 것과 같은 자리다.
       모든 종목에 「사라」가 붙으면 그것은 판정이 아니라 광고다.
     🔴 [2026-09-24 토론으로 고침] 처음엔 0 까지 섞어 세어 「97% 쏠림」이라 빨강을 냈다.
       그런데 0 이 많은 것은 **우리 강령대로**다 — 「우리가 바늘을 세우지 않는다.
       지형을 그려 놓고 바늘은 보는 사람이 세운다」. 종목 «상태»는 방향을 안 낸다.
       ⇒ 쏠림은 **방향을 내는 신호들 안에서만** 잰다. 0 은 따로 센다. */
  const 방향 = { '+1': 0, '0': 0, '-1': 0 };
  for (const s of 신호들) {
    const d = Number(s.direction);
    if (d > 0) 방향['+1']++; else if (d < 0) 방향['-1']++; else 방향['0']++;
  }
  const 방향낸것 = 방향['+1'] + 방향['-1'];
  const 쏠림 = 방향낸것 ? Math.round((Math.max(방향['+1'], 방향['-1']) / 방향낸것) * 100) : 0;
  잰다('② 방향 낸 신호의 쏠림 (85% 이하)', 방향낸것 && 쏠림 <= 85 ? 1 : 0, 1,
    `방향 낸 것 ${방향낸것} (+1 ${방향['+1']} · -1 ${방향['-1']}, 큰 쪽 ${쏠림}%) · 상태만 ${방향['0']}`,
    방향낸것 ? '판정 규칙을 다시 본다 — 한쪽만 나오면 자가 고장 난 것이다'
      : '방향을 내는 신호가 하나도 없다 — 공시 판독이 도는지 본다');

  /* ③ 「모르는 것」을 신호로 만들지 않나 */
  const 모르는갈래 = 신호들.filter((s) => s.kind === 'unknown' || s.source === 'unknown').length;
  잰다('③ 모르는 것을 신호로 만들지 않나', 모르는갈래 === 0 ? 1 : 0, 1,
    모르는갈래 ? `⛔ ${모르는갈래}건이 갈래 미상이다` : '0건 — 모르는 갈래는 안 만든다',
    '판독기에서 모르는 갈래를 건너뛰게 한다');

  /* ④ 🔴 리스크 축이 «독립»인가 — 사장님이 한시도 잊지 말라 하신 것 */
  const 리스크자리 = ['scripts/invest-ai/risk-manager.mjs', 'scripts/invest-ai/risk.mjs']
    .filter((p) => fs.existsSync(path.join(뿌리, p)));
  잰다('④ 리스크 관리자가 따로 있나', 리스크자리.length, 1,
    리스크자리.length ? 리스크자리.join(' ') : '⛔ 없다 — 판독·매매만 있고 멈추는 자가 없다',
    '리스크 축을 ①②와 «독립된 파일»로 짓는다. 사장님: 「셋째가 없으면 앞의 둘은 확신만 키운다」');

  /* ⑤ 오늘 새로 쌓였나 — 9일 멈춰 있던 것을 다시 겪지 않는다.
     ⚠ 신호의 `ts` 는 «자료의 날짜»(실적 기준일)이지 거둔 날이 아니다 — 20260914 처럼
       과거 날이 들어 있다. 처음에 ts 로 재서 「오늘 0건」이라는 헛빨간불을 냈다.
       ⇒ «오늘 날짜의 파일이 있고 거기 줄이 있나»로 잰다. */
  const 오늘파일 = path.join(뿌리, 'src', 'data', 'invest-ai',
    `signals-${오늘날짜().replace(/-/g, '')}.jsonl`);
  const 오늘것 = fs.existsSync(오늘파일)
    ? fs.readFileSync(오늘파일, 'utf8').split('\n').filter((l) => l.trim()).length : 0;
  잰다('⑤ 오늘 쌓인 신호', 오늘것, 1,
    `${오늘것}건`, '매시 작업(run-ai-learning.cmd)이 도는지 본다');

  return { 보는쪽: 'KLifeMap AI', 보이는쪽: 'SeoulMarkets(투자 AI)', 항목 };
}

/* ═══════════════════════════════════════════════════════════════════════════
   거들개
   ═══════════════════════════════════════════════════════════════════════════ */

function 케맵에서돌린다(한줄) {
  try {
    return execFileSync(process.execPath, ['-e', 한줄],
      { cwd: 케맵, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch { return null; }
}

export function 학습자료방() {
  const 집 = process.env.USERPROFILE || process.env.HOME || 'C:/Users/USER';
  return [path.join(집, 'OneDrive', 'KLifeMap 문서', '자체AI 학습자료'),
    path.join(집, 'OneDrive', 'Desktop', 'KLifeMap 문서', '자체AI 학습자료')]
    .find((d) => fs.existsSync(d)) || null;
}

/**
 * 우리가 «안 다루는» 물음인가 — 타로·신점·부적·수맥 따위.
 * 사장님: 「신살·부적·굿·살풀이는 다루지 않는다」
 * ⛔ 이 물음들을 커버리지에 세면 문턱은 영원히 안 찬다.
 */
export function 우리것이아닌가(글) {
  const g = String(글 || '');
  if (/타로|tarot|oracle(\s*(card|deck))?\b|塔羅|신점|무당|접신|부적|굿|퇴마|수맥|bone\s*casting|guardian\s*spirit|spirit\s*guide|crystal|pendulum|runes?\b|팜리딩|손금|관상|九宮格|泰佛/i.test(g)) return true;
  /* 🔴 [2026-09-24 · 사장님 지시로 24개를 갈라 보며 찾음]
     「그 역술인 용한가」·「어디 점집이 잘 보나」는 **우리 상품이 아니다.**
     우리는 사람을 소개하는 곳이 아니라 자료를 내는 곳이다(강령 — 나침반을 준다).
     ⛔ 이것을 「고전이 답 못 한 물음」으로 세면 영원히 안 차는 문턱이 된다. */
  if (/(용한|잘\s*보는|추천).{0,10}(점집|철학관|역술|선생님?|사주집)|算命師|점집\s*추천|사주\s*잘\s*보는/.test(g)) return true;
  /* 「누구 선생 들어 봤나」·「어디 추천」 — 사람을 소개하는 물음이다 */
  if (/(有人聽過|推薦|老師嗎|超準的算命)/.test(g)) return true;
  /* 「제가 봐 드릴게요」 — 손님의 물음이 아니라 남이 봐 주겠다는 글이다 */
  if (/(占い練習中|占わせて|占いをさせて)/.test(g)) return true;
  /* 민간 금기(「소고기 먹지 말라 했다」) — 우리가 다루지 않는다 */
  if (/不能吃|먹지\s*말라|하지\s*말라고\s*(했|하)/.test(g)) return true;
  return false;
}

/**
 * 「고전」이 아니라 «우리 강령»이 답하는 물음인가.
 * 🔴 [2026-09-24] 「점을 믿어도 되나요」·「대신 봐 주실 분」 같은 물음은
 *   고전에 대목이 없다. 그러나 **답이 없는 것이 아니다** — 사장님이 정하신 것이 답이다
 *   (「」·「답을 줘야지」·따듯하게).
 *   그 답은 boss-rules.json 을 통해 이미 프롬프트에 실린다.
 * ⇒ 이것을 「고전이 못 찾은 것」으로 세면 수가 거짓이 된다. 갈래를 나눈다.
 */
export function 강령이답하는가(글) {
  return /(믿어도\s*되|믿을\s*수\s*있|정말\s*맞나|맞는\s*건가|信じて|真的準|準不準|과학적|미신)/.test(String(글 || ''))
    || /(대신\s*봐|봐\s*주실\s*분|占ってい?ただけ|占いお願い|봐주세요만)/.test(String(글 || ''));
}

/**
 * 성명학 물음인가 — 우리 상품이 «맞지만» 고전 색인의 대상이 아니다.
 * ⭐ 성명학의 근거는 편(篇)으로 된 이론서가 아니라 «자전의 획수·부수»다(강희자전 등).
 *   그래서 이 물음에 고전 대목이 «안 서는 것이 맞다» — 상담은 성명학 지면으로 안내한다.
 * ⛔ 이것을 커버리지에 세면 영원히 안 차는 문턱이 된다. 헛빨간불은 빨간불을 죽인다.
 */
export function 성명학물음인가(글) {
  return /작명|개명|이름\s*풀이|이름을\s*짓|이름\s*바꾸|改名|取名|命名|naming|rename/i.test(String(글 || ''));
}

export function 거둔질문읽기() {
  const 방뿌리 = 학습자료방();
  if (!방뿌리) return [];
  const 것 = [];
  for (const 하위 of ['외국어질문', '외국어질문-점성학']) {
    const 방 = path.join(방뿌리, 하위);
    if (!fs.existsSync(방)) continue;
    for (const n of fs.readdirSync(방)) {
      if (!/^커뮤니티-.*\.jsonl$/.test(n)) continue;
      for (const 줄 of fs.readFileSync(path.join(방, n), 'utf8').split('\n')) {
        if (!줄.trim()) continue;
        try { const o = JSON.parse(줄); if (o.q) 것.push(o.q); } catch { /* 깨진 줄 */ }
      }
    }
  }
  return 것;
}

export function 질문언어별() {
  const 방뿌리 = 학습자료방();
  const 셈 = {};
  if (!방뿌리) return 셈;
  const 방 = path.join(방뿌리, '외국어질문');
  if (!fs.existsSync(방)) return 셈;
  for (const n of fs.readdirSync(방)) {
    if (!/^커뮤니티-.*\.jsonl$/.test(n)) continue;
    for (const 줄 of fs.readFileSync(path.join(방, n), 'utf8').split('\n')) {
      if (!줄.trim()) continue;
      try { const o = JSON.parse(줄); if (o.lang) 셈[o.lang] = (셈[o.lang] || 0) + 1; } catch { /* */ }
    }
  }
  return 셈;
}

export function 신호읽기() {
  /* ⚠ 자리를 짐작하지 않는다 — read-market-data.mjs 가 실제로 적는 곳이 여기다
     (archive/ 에 있을 줄 알고 썼다가 0건이 나왔다). */
  const 방 = path.join(뿌리, 'src', 'data', 'invest-ai');
  if (!fs.existsSync(방)) return [];
  const 것 = [];
  /* 🔴 «날짜가 든 것»만 읽는다. 처음에 `signals-*` 로 열었더니 `signals-fixture.jsonl`
     (결정론 층을 돌려 보려고 만든 «합성» 자료)이 알파벳 순으로 맨 뒤라 함께 잡혔다.
     그 파일은 스스로 「⛔ 실제 증권과 무관하다」고 적어 두고 있었다.
     ⛔ 시험용 자료로 실적을 재면 그 수는 전부 거짓이다. */
  for (const n of fs.readdirSync(방).filter((x) => /^signals-\d{8}\.jsonl$/.test(x)).sort().slice(-3)) {
    for (const 줄 of fs.readFileSync(path.join(방, n), 'utf8').split('\n')) {
      if (!줄.trim()) continue;
      try {
        const o = JSON.parse(줄);
        if (o._fixture) continue;       /* 한 겹 더 — 파일 이름이 바뀌어도 걸린다 */
        것.push(o);
      } catch { /* 깨진 줄 */ }
    }
  }
  return 것;
}

export function 오늘날짜() {
  const d = new Date();                 /* 이 PC 는 KST 다 */
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   토론 — 서로의 지적을 놓고 「무엇을 먼저 고칠까」를 정한다
   ⭐ 점수는 위에서 규칙이 이미 매겼다. 여기서 LLM 이 하는 일은 «순서를 정하는 말»뿐이다.
   ═══════════════════════════════════════════════════════════════════════════ */

export function 토론거리(둘) {
  const 빨강 = [];
  for (const 쪽 of 둘) {
    for (const h of 쪽.항목) {
      if (!h.통과) 빨강.push({ 누가본것: 쪽.보는쪽, 누구를: 쪽.보이는쪽, ...h });
    }
  }
  return 빨강;
}

export function 결론(빨강) {
  /* 우선순위 규칙 — 말이 아니라 규칙이 순서를 정한다.
     ① 돈이 걸린 것(리스크 축·결제) ② 손님이 바로 겪는 것 ③ 나머지 */
  const 무게 = (h) => {
    if (/리스크/.test(h.이름)) return 100;          /* 사장님: 「한시도 잊으면 안 된다」 */
    if (/쏠림|근거/.test(h.이름)) return 80;         /* 틀린 확신은 되돌리기 어렵다 */
    if (/고전이 서는|프롬프트/.test(h.이름)) return 60; /* 손님이 바로 겪는다 */
    return 40;
  };
  return [...빨강].sort((a, b) => 무게(b) - 무게(a));
}

/* ── 화면 ──────────────────────────────────────────────────────────────── */
function 그린다(쪽) {
  console.log(`\n■ ${쪽.보는쪽} 가 «${쪽.보이는쪽}» 을 본다`);
  for (const h of 쪽.항목) {
    const 불 = h.통과 ? '✅' : '🔴';
    console.log(`   ${불} ${h.이름.padEnd(34)} ${h.말}`);
    if (!h.통과) console.log(`      ⇒ ${h.무엇을고치나}`);
  }
  const 든것 = 쪽.항목.filter((h) => h.통과).length;
  console.log(`   ⇒ ${든것}/${쪽.항목.length}`);
}

const 이파일로실행 = process.argv[1] && process.argv[1].endsWith('ai-cross-review.mjs');
if (이파일로실행) {
  console.log('■ 두 AI 가 «서로»를 점검한다 — 사장님 2026-09-24');
  console.log('  「에스마켓이 케이라이프맵ai를 점검, 평가하고 케이라이프맵이 투자ai를 점검, 평가해라」');
  console.log('  ⭐ 제 것을 제가 채점하면 제가 안 보는 자리는 영영 안 보인다');

  const 하나 = 케맵AI를_에스마켓이_본다();
  const 둘 = 투자AI를_케맵이_본다();
  그린다(하나); 그린다(둘);

  if (하나.안걸린보기 && 하나.안걸린보기.length) {
    console.log('\n   ⬜ 고전이 «안 선» 물음 보기 — 주제표에 무엇을 더할지가 여기 있다');
    for (const q of 하나.안걸린보기.slice(0, 6)) console.log(`      · ${q.slice(0, 74)}`);
  }

  const 빨강 = 토론거리([하나, 둘]);
  console.log(`\n■ 토론 — 서로 짚은 빨간 칸 ${빨강.length}개`);
  if (!빨강.length) {
    console.log('   ✅ 없다. 다만 «둘 다 못 보는 것»이 있을 수 있다 — 잣대를 늘리는 것이 다음 일이다');
  } else {
    for (const [i, h] of 결론(빨강).entries()) {
      console.log(`   ${i + 1}. [${h.누가본것} → ${h.누구를}] ${h.이름}`);
      console.log(`      지금: ${h.말}`);
      console.log(`      할 일: ${h.무엇을고치나}`);
    }
  }

  if (process.argv.includes('--적는다') || process.argv.includes('--save')) {
    const 낼곳 = path.join(뿌리, 'docs', `AI-교차점검-${오늘날짜()}.md`);
    const 글 = [
      `# 두 AI 교차 점검 — ${오늘날짜()}`, '',
      '> 사장님 2026-09-24: 「에스마켓이 케이라이프맵ai를 점검, 평가하고 케이라이프맵이 투자ai를 점검, 평가해라」',
      '> 「그걸 갖고 서로 토론을 해서 최적의 결과, 학습 및 구축 방향을 도출해서 적용해라」', '',
      ...[하나, 둘].flatMap((쪽) => [
        `## ${쪽.보는쪽} → ${쪽.보이는쪽}`, '',
        '| | 잣대 | 지금 | 할 일 |', '|---|---|---|---|',
        ...쪽.항목.map((h) => `| ${h.통과 ? '✅' : '🔴'} | ${h.이름} | ${h.말} | ${h.통과 ? '—' : h.무엇을고치나} |`),
        '',
      ]),
      '## 토론 결과 — 고칠 순서', '',
      ...(빨강.length
        ? 결론(빨강).map((h, i) => `${i + 1}. **${h.이름}** (${h.누가본것} 가 짚음) — ${h.무엇을고치나}`)
        : ['빨간 칸이 없다. 잣대를 늘리는 것이 다음 일이다.']),
    ].join('\n');
    fs.writeFileSync(낼곳, 글 + '\n', 'utf8');
    console.log(`\n   ✅ 적었다 — docs/AI-교차점검-${오늘날짜()}.md`);
  }
}

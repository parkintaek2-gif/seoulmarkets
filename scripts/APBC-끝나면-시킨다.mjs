#!/usr/bin/env node
/**
 * APBC-끝나면-시킨다.mjs — **한국-대만 APBC 예선 3차전을 지켜보다가,
 *   8회가 되면 미리쓰기를, 경기가 끝나면 «이겼나 졌나에 따라 다른» 기사를 중부매일계정에 시킨다.**
 *
 * 🔴 사장님 (2026-11-14 20:2x) 「apbc 대만과 예선 3차전 진행중. 한국이 3:1로 앞서고 있음.
 *   이길 경우엔 결승 진출하는 지 먼저 확인해놔. 승리 시 결승 확정이면 일본과 언제 결승을 하는 지도
 *   기사안에 포함해. 질 경우엔 최악의 국제대회 주제로 기사를 써야 해.
 *   중부매일계정에 기사 작성, 데스킹, 이메일 전송까지 다 하라고 해. 1,000자 이상 쓰라고 해.」
 *
 * ── 먼저 확인한 것 (2026-11-14 · 5번) ────────────────────────────────
 * ⭐ **이기면 결승에 간다.** 일본이 호주를 16-1(7회 콜드)로 꺾어 3전 전승으로 결승을 확정했고,
 *   한국이 대만을 이기면 한국·대만·호주가 나란히 1승 2패가 되어 TQB 로 두 번째 자리를 가린다.
 *   한국은 «홈팀»이라 9회 초까지 리드를 지키면 9회 말 공격 없이 경기가 끝난다 — 그 꼴이면
 *   1점 차 승리로도 TQB 가 대만·호주를 앞선다(스포츠월드 2026-11-14).
 * ⚠ **끝내기 승리는 다르다.** 9회 말에 뒤집어 이기면 득점과 아웃카운트에 따라 TQB 가 달라진다.
 *   ⇒ 그 경우에는 「이겼으니 결승」이라고 단정하지 않는다. 공식 발표·보도로 확인하고 쓴다.
 *
 * 결승   2026-11-15(일) 19:00 KST · 도쿄돔      (KBO 공식 일정표)
 * 3·4위전 2026-11-15(일) 11:00 KST · 도쿄돔      (KBO 공식 일정표)
 *
 * 예선 결과 (네이버 스포츠 경기정보 실측)
 *   11-12 12:00  호주 8 : 7 한국        11-12 19:00  일본 5 : 0 대만
 *   11-13 12:00  대만 6 : 4 호주        11-13 19:00  한국 5 : 9 일본
 *   11-14 12:00  일본 16 : 1 호주 (7회 콜드)
 *
 * ⛔ 내가 직접 쓰지 않는다 — 사장님 「네가 직접 쓰면 문제가 많다」. 중부매일계정 회차에 내린다.
 * ⛔ 사장님 크롬 창을 닫지 않는다 — disconnect() 만. 내 탭만 닫는다.
 *
 * 쓰는 법
 *   node scripts/APBC-끝나면-시킨다.mjs --경기 88881114TWKR02026 --회차 16
 *   node scripts/APBC-끝나면-시킨다.mjs --경기 88881114TWKR02026 --짚기만
 *   node scripts/APBC-끝나면-시킨다.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
/**
 * 🔴🔴 [2026-11-14 · 5번] **지시문도 「밖으로 나가는 말」이다.**
 *   처음 쓴 미리쓰기 지시문이 관문에서 섰다 — 「내리 」와 「벼랑」이 들어 있었다.
 *   경기가 끝난 «뒤»에 섰다면 그 자리에서 기사가 통째로 안 나갔다.
 *   ⇒ 관문의 자를 자가시험에 끌어와, 글을 고칠 때마다 여기서 먼저 걸리게 둔다.
 */
import { 글을잰다 } from './밖으로나가는말-관문.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 인자 = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const 지금 = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });

export const 결승 = '11월 15일(일) 저녁 7시, 일본 도쿄돔';
export const 삼사위전 = '11월 15일(일) 오전 11시, 일본 도쿄돔';

/**
 * 한국이 이겼나 — **점수만 보고 정한다.** 「9회말」이라는 글자로 읽지 않는다.
 * ⚠ 한국은 홈팀이다(대진 「차이니스 타이베이 vs 대한민국」). away=대만, home=한국.
 */
export function 한국이겼나(g) {
  const 한 = Number(g?.homeTeamScore);
  const 대 = Number(g?.awayTeamScore);
  if (!Number.isFinite(한) || !Number.isFinite(대)) return null;
  if (한 === 대) return null;      /* ⛔ 동점을 「이겼다」로도 「졌다」로도 읽지 않는다 */
  return 한 > 대;
}

/**
 * **끝내기로 이겼나** — 9회 말(또는 연장 말)에 뒤집어 이긴 꼴.
 * 이 꼴이면 TQB 계산이 달라져 「이겼으니 결승」을 단정하면 안 된다.
 * ⚠ 못 가리면 null 을 낸다 — 못 가린 것을 「아니다」로 적지 않는다.
 */
export function 끝내기인가(g) {
  if (한국이겼나(g) !== true) return false;
  const s = String(g?.statusInfo ?? '');
  const m = /(\d+)회(초|말)/.exec(s);
  if (!m) return null;
  return m[2] === '말';          /* 홈팀이 이겼는데 「말」에서 끝났다 = 끝내기 */
}

export function 경기끝났나(g) {
  return ['RESULT', 'ENDED', 'CANCEL'].includes(String(g?.statusCode ?? ''));
}

export function 회수(g) {
  return Number(String(g?.statusInfo ?? '').match(/(\d+)회/)?.[1] ?? 0);
}

/* ── 시킬 글 ──────────────────────────────────────────────────────── */

export const 형식 = `형식은 평소대로 자체기사 지침 v7: [제목] [부제목] [본문] [추천 키워드 3개]. 본문은 사장님 지시로 1,000자 이상(1,300자를 겨냥), 본문 맨 앞에 [중부매일 박인택 기자].
숫자(점수, 이닝, 투구 수, 안타, 타점, 전적)는 KBO 공식 일정표와 네이버 스포츠 문자중계로 맞추고, 한 매체만 적은 내용은 쓰지 않습니다. 확인하지 못한 것은 지어내지 말고 빼십시오 — 「확인되지 않았다」는 문장도 기사에 넣지 않습니다.
순한글 조어·번역투·AI 말투를 쓰지 않습니다. 결론을 첫 줄에 요약해 버리지 말고, 무엇이 걸려 있던 경기였는지로 시작하십시오.`;

export const 마무리 = `데스킹까지 이 대화에서 마치고(자체기사 지침 v7·스타일북 2026), Gmail로 parkintaek2@gmail.com 에 바로 보내십시오. 메일 제목: [중부매일] 기사 제목 (데스킹 완료). ⛔ 네이버 주소(parkintaek@naver.com)로는 보내지 않습니다.
보낸 뒤 「보냈다」와 시각을 적으십시오. 막히면 지어내지 말고 「못 보냈다」와 그 이유를 적고 최종본을 이 대화에 내 주십시오.`;

export const 예선표 = `예선 결과(전부 도쿄돔): 11월 12일 호주 8-7 한국, 일본 5-0 대만. 11월 13일 대만 6-4 호주, 일본 9-5 한국. 11월 14일 일본 16-1 호주(7회 콜드게임). 일본은 3전 전승으로 결승 진출을 확정했습니다.`;

export function 미리쓰기글(g) {
  return `[사장님 지시 — 지금 바로] 2026 아시아프로야구챔피언십(APBC) 예선 3차전 한국-대만 기사를 미리 써 두십시오. 사장님 말씀 그대로: 「이길 경우엔 결승 진출하는 지 먼저 확인해놔. 승리 시 결승 확정이면 일본과 언제 결승을 하는 지도 기사안에 포함해. 질 경우엔 최악의 국제대회 주제로 기사를 써야 해. 기사 작성, 데스킹, 이메일 전송까지 다 해라. 1,000자 이상 써라.」

경기: 2026 APBC 예선 3차전 대만-한국, 11월 14일 저녁 7시 일본 도쿄돔. 지금 ${g.statusInfo}, 대만 ${g.awayTeamScore}대 ${g.homeTeamScore} 한국. 한국이 홈팀(후공)입니다.
${예선표}

1. 지금 바로 1회부터 지금까지의 흐름(두 팀 선발 투구 내용, 점수가 난 장면, 고비)을 본문으로 써 두십시오. 최원호 감독의 한국은 호주전과 일본전을 모두 내주고 이 경기를 맞았습니다.
2. 경기가 끝나면 이 대화로 「이겼다」 또는 「졌다」는 지시가 한 번 더 갑니다. 그때 결말을 얹어 완성합니다. 지금은 결과를 짐작해서 쓰지 마십시오.
3. 지금 답으로는 여기까지 쓴 본문만 내 주십시오. 메일은 아직 보내지 않습니다.
${형식}`;
}

export function 이겼을때(g, 끝내기) {
  const 꼬리 = 끝내기 === true
    ? `⚠ 이 경기는 9회 말(또는 연장 말) 끝내기로 끝났습니다. 끝내기 승리는 TQB(이닝당 득점에서 이닝당 실점을 뺀 수치) 계산이 달라져, 승리가 곧 결승행이라고 단정할 수 없습니다. ⛔ 결승 진출을 기정사실로 쓰지 마십시오. KBO·WBSC 공식 발표나 경기 직후 보도로 «한국의 결승 진출이 확정됐는지»를 먼저 확인하고, 확정됐으면 결승 기사로, 아니면 탈락 기사로 방향을 잡으십시오. 확인되지 않으면 그 대목을 아예 빼고 경기 자체로 기사를 완성하십시오.`
    : `한국은 9회 초까지 리드를 지켜 이겼습니다. 이 꼴이면 한국·대만·호주가 1승 2패로 묶이고 TQB에서 한국이 앞서 결승에 오릅니다. 다만 기사에 쓰기 전에 KBO·WBSC 공식 발표나 경기 직후 보도로 한국의 결승 진출 확정을 한 번 더 확인하십시오.`;

  return `[사장님 지시 — 지금 바로] APBC 예선 3차전이 끝났습니다. 한국이 대만을 ${g.homeTeamScore}대 ${g.awayTeamScore}로 이겼습니다. 사장님 말씀 그대로: 「승리 시 결승 확정이면 일본과 언제 결승을 하는 지도 기사안에 포함해. 중부매일계정에 기사 작성, 데스킹, 이메일 전송까지 다 해라. 1,000자 이상 써라.」

경기: 2026 APBC 예선 3차전 대만-한국, 11월 14일 저녁 7시 일본 도쿄돔. 최종 대만 ${g.awayTeamScore} - ${g.homeTeamScore} 한국(한국 홈팀).${g.winPitcherName ? ` 승리투수 ${g.winPitcherName}.` : ''}${g.losePitcherName ? ` 패전투수 ${g.losePitcherName}.` : ''}
${예선표}
${꼬리}

1. 써 둔 본문이 있으면 살리고, 최종 점수와 막판 장면, 승리·패전·세이브 투수를 앞에 넣어 완성하십시오. 두 경기를 모두 내주고 물러설 곳이 없던 팀이 무엇을 걸고 싸웠는지가 제목과 첫 문단에 들어가야 합니다. 수훈 선수(투수·타자)를 또렷이 세우십시오.
2. **결승 일정을 반드시 본문에 넣으십시오** — 상대는 3전 전승의 일본, ${결승}입니다. 한국은 13일 일본에 5-9로 졌으므로 2일 만의 재대결입니다. (3·4위 결정전은 ${삼사위전}입니다.)
3. 결승 전망은 단정하지 말고, 13일 한일전에서 무엇이 갈랐는지를 근거로 적으십시오.
${형식}
4. ${마무리}`;
}

export function 졌을때(g) {
  return `[사장님 지시 — 지금 바로] APBC 예선 3차전이 끝났습니다. 한국이 대만에 ${g.homeTeamScore}대 ${g.awayTeamScore}로 져 3전 전패로 탈락했습니다. 사장님 말씀 그대로: 「질 경우엔 최악의 국제대회 주제로 기사를 써야 해. 중부매일계정에 기사 작성, 데스킹, 이메일 전송까지 다 해라. 1,000자 이상 써라.」

경기: 2026 APBC 예선 3차전 대만-한국, 11월 14일 저녁 7시 일본 도쿄돔. 최종 대만 ${g.awayTeamScore} - ${g.homeTeamScore} 한국(한국 홈팀).${g.winPitcherName ? ` 승리투수 ${g.winPitcherName}.` : ''}${g.losePitcherName ? ` 패전투수 ${g.losePitcherName}.` : ''}
${예선표}
한국은 호주·일본·대만에 모두 패해 0승 3패로 예선 최하위가 됐고, ${삼사위전}에 열리는 3·4위 결정전으로 밀렸습니다. 결승은 일본과 대만이 ${결승}에 치릅니다.

1. 주제는 사장님이 정하셨습니다 — **「최악의 국제대회」**. 오늘 경기 자체(점수가 난 장면, 무너진 대목, 투수 운용)를 중심에 놓되, 왜 이번 대회가 최악으로 불리는지를 기록으로 받치십시오.
2. 🔴 **기록은 반드시 확인하고 쓰십시오.** 한국 야구가 APBC(2017·2023)와 최근 국제대회에서 어떤 성적을 냈는지를 WBSC·KBO 공식 기록으로 맞춘 뒤, 이번이 어디에 놓이는지 적습니다. ⛔ 「역대 최악」, 「사상 처음」 같은 말은 기록으로 확인된 경우에만 씁니다. 확인하지 못하면 그 표현을 쓰지 말고, 확인된 사실(3전 전패, 예선 최하위, 세 경기 실점)로만 씁니다.
3. 한 경기 탓으로 돌리지 말고 세 경기를 함께 보십시오 — 호주전 7-8, 일본전 5-9, 그리고 오늘. 무엇이 반복됐는지가 이 기사의 중심입니다.
4. ⛔ 선수 개인을 몰아세우지 않습니다. 사람이 아니라 경기와 운영을 적습니다.
5. 3·4위 결정전 일정(${삼사위전})과 상대를 끝 문단에 적으십시오.
${형식}
6. ${마무리}`;
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  const g = (a, h, s = '9회초', c = 'RESULT') => ({ awayTeamScore: a, homeTeamScore: h, statusInfo: s, statusCode: c, awayTeamName: '차이니스 타이베이', homeTeamName: '대한민국' });

  본다('한국이 더 내면 이긴 것이다', 한국이겼나(g(3, 4)) === true);
  본다('한국이 덜 내면 진 것이다', 한국이겼나(g(5, 2)) === false);
  본다('🔴 동점은 이긴 것도 진 것도 아니다', 한국이겼나(g(3, 3)) === null);
  본다('⛔ 점수가 없으면 null', 한국이겼나({}) === null && 한국이겼나(null) === null);

  본다('9회초에 끝난 승리는 끝내기가 아니다', 끝내기인가(g(3, 4, '9회초')) === false);
  본다('🔴 9회말에 끝난 승리는 끝내기다', 끝내기인가(g(3, 4, '9회말')) === true);
  본다('연장 말도 끝내기다', 끝내기인가(g(5, 6, '10회말')) === true);
  본다('진 경기는 끝내기를 따지지 않는다', 끝내기인가(g(7, 2, '9회말')) === false);
  본다('⛔ 회를 못 읽으면 null 이다 — 아니라고 적지 않는다', 끝내기인가(g(3, 4, '')) === null);

  본다('RESULT 는 끝난 것이다', 경기끝났나(g(3, 4)) === true);
  본다('STARTED 는 안 끝난 것이다', 경기끝났나(g(3, 3, '5회초', 'STARTED')) === false);
  본다('회를 센다', 회수(g(3, 3, '8회말', 'STARTED')) === 8);

  const 이김 = 이겼을때(g(3, 4), false);
  본다('🔴 이긴 글에 결승 일정이 들어 있다', 이김.includes('11월 15일(일) 저녁 7시') && 이김.includes('일본'));
  본다('이긴 글에 1,000자 지시가 있다', 이김.includes('1,000자 이상'));
  본다('이긴 글에 메일 주소가 있다', 이김.includes('parkintaek2@gmail.com'));
  본다('⛔ 이긴 글이 네이버 주소로 보내라고 하지 않는다', !/parkintaek@naver\.com 에/.test(이김));
  const 끝내기글 = 이겼을때(g(3, 4, '9회말'), true);
  본다('🔴 끝내기면 결승을 단정하지 말라고 적는다', 끝내기글.includes('단정할 수 없습니다'));

  const 짐 = 졌을때(g(5, 2));
  본다('🔴 진 글의 주제가 최악의 국제대회다', 짐.includes('최악의 국제대회'));
  본다('진 글에 3·4위전 일정이 있다', 짐.includes('오전 11시'));
  본다('🔴 진 글이 「역대 최악」을 확인 없이 쓰지 말라고 막는다', 짐.includes('기록으로 확인된 경우에만'));
  본다('진 글에 1,000자 지시가 있다', 짐.includes('1,000자 이상'));
  본다('두 글 모두 데스킹과 메일까지 시킨다', 이김.includes('데스킹까지') && 짐.includes('데스킹까지'));
  본다('⛔ 글에 확인 안 된 것을 기사에 쓰지 말라고 적는다', 이김.includes('지어내지 말고'));

  /* 🔴 세 지시문 모두 밖으로나가는말 관문을 통과해야 한다 — 서면 기사가 안 나간다 */
  for (const [이름, 글] of [['이긴 글', 이김], ['끝내기 글', 끝내기글], ['진 글', 짐], ['미리쓰기 글', 미리쓰기글(g(3, 3, '6회말', 'STARTED'))]]) {
    const 걸린것 = 글을잰다(글);
    본다(`🔴 ${이름}이 관문을 통과한다${걸린것.length ? ` — 걸린것: ${걸린것.map((x) => x.낱말 ?? x.말 ?? JSON.stringify(x)).join(' ')}` : ''}`, 걸린것.length === 0);
  }

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ APBC-끝나면-시킨다 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (!내가진입점) { /* 불러 쓰는 쪽은 여기서 멈춘다 */ } else {
if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

const 경기 = 인자('--경기', '88881114TWKR02026');
const 회차 = 인자('--회차', '16');
const 자국 = path.join(뿌리, 'docs', 'APBC-시킨자국.tsv');
const 시킨것 = () => (fs.existsSync(자국) ? fs.readFileSync(자국, 'utf8') : '');

const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
const puppeteer = require('puppeteer-core');

async function 상태() {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  const 받은 = [];
  p.on('response', async (r) => { if (r.url().includes('api-gw.sports.naver.com/schedule/games/' + 경기)) { try { 받은.push(await r.text()); } catch {} } });
  try {
    await p.goto('https://m.sports.naver.com/game/' + 경기 + '/relay', { waitUntil: 'networkidle2', timeout: 90000 });
    for (const t of 받은) { try { const g = JSON.parse(t).result.game; if (g) return g; } catch {} }
    return null;
  } finally { await p.close().catch(() => {}); b.disconnect(); }
}

function 시킨다(이름, 글) {
  const 파일 = path.join(뿌리, 'docs', `지시-중부매일-${지금().slice(0, 10).replaceAll('-', '')}-APBC-${이름}.txt`);
  fs.writeFileSync(파일, 글 + '\n');
  execFileSync('node', [path.join(뿌리, 'scripts', '밖으로나가는말-관문.mjs'), 파일], { stdio: 'inherit' });
  execFileSync('node', [path.join(뿌리, 'scripts', '시킨다-중부매일-기사.mjs'), '--회차', 회차, '--글', 파일], { stdio: 'inherit' });
  fs.appendFileSync(자국, `${지금()}\t${경기}\t${이름}\t${path.basename(파일)}\n`);
  console.log(`✅ 시켰다 — ${이름} · ${path.basename(파일)}`);
}

if (process.argv.includes('--짚기만')) {
  const g = await 상태();
  console.log(g ? `${g.statusCode} ${g.statusInfo} ${g.awayTeamName} ${g.awayTeamScore}:${g.homeTeamScore} ${g.homeTeamName} · 한국이겼나=${한국이겼나(g)} 끝내기=${끝내기인가(g)}` : '🔴 못 읽었다');
  process.exit(g ? 0 : 1);
}

while (!시킨것().includes(`${경기}\t결말`)) {
  let g = null;
  try { g = await 상태(); } catch (e) { console.log(지금(), '못 읽었다 —', e.message); }
  if (g) {
    console.log(지금(), g.statusCode, g.statusInfo, `${g.awayTeamName} ${g.awayTeamScore}:${g.homeTeamScore} ${g.homeTeamName}`);
    if (!경기끝났나(g) && 회수(g) >= 8 && !시킨것().includes(`${경기}\t미리쓰기`)) {
      시킨다('미리쓰기', 미리쓰기글(g));
    }
    if (경기끝났나(g)) {
      const 이김 = 한국이겼나(g);
      if (이김 === null) { console.log('🔴 이겼는지 졌는지 못 가렸다 — 시키지 않는다. 사람이 본다'); break; }
      시킨다('결말', 이김 ? 이겼을때(g, 끝내기인가(g)) : 졌을때(g));
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
}
console.log('끝 — 이 경기는 다 시켰다');
}

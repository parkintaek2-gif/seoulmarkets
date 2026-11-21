#!/usr/bin/env node
/**
 * check-운영사이트가-셋인가.mjs
 *   — 사장님이 2026-11-22 에 정하신 **사업 구조**가 코드에 그대로 서 있나 잰다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴🔴 사장님 원문 (2026-11-22 04:00)
 *   「**k컬쳐와이어는 더이상 운영안한다. 지금부터 당장. 배포 등 문제없게 되지?**
 *    **다음 구독부터는 너만 남고 1번 세션도 운영을 안한다.**
 *    **증요한 결정이다. 반드시 고정 지시로 해놓고 잘 마무리해.**
 *    **우리가 운영하는 사이트는 케이라이프맵에이아이, 백년지도, 서울마켓츠이다.**」
 *   「**케이라이프맵에이아이가 맞는거야. 케이라이프디자인에이아이는 없어.
 *     klifedesign.net이고. 여기엔 링크걸지마. 홈페이지 자체가 없잖아**」
 *
 * [왜 검사로 두나]
 *   말로 하는 규칙은 잊힌다. 2026-11-20 에 「도움말을 KLifeMap.AI 로 고치라」 하셨는데
 *   **별자리 쪽만 고쳐지고 띠별 쪽은 옛 글자가 남아** 2026-11-22 까지 그대로 나갔다.
 *   사장님이 「멍청하긴」이라 하셨다. 같은 일을 하는 자가 둘이면 한쪽만 고쳐진다.
 *   ⇒ 사람이 기억해서 지키는 구조를 만들지 않는다.
 *
 * [재는 것]
 *   ① 운영하는 사이트가 셋인가 (백년지도·KLifeMap·SeoulMarkets)
 *   ② K Culture Wire 가 운영중단으로 «표시»돼 있나 — 줄이 지워지면 까닭이 사라진다
 *   ③ 색인 요청이 멈춘 호스트를 보내기 전에 막나
 *   ④ 「KLifeDesign.AI」라는 없는 주소가 손님에게 나가는 자리에 없나
 *   ⑤ klifedesign.net «홈페이지» 링크가 없나 (메일 주소 mailto: 는 센다 — 그건 링크가 아니다)
 *   ⑥ CLAUDE.md 에 사이트 셋이 적혀 있나
 *
 * 쓰는 법
 *   node scripts/check-운영사이트가-셋인가.mjs
 *   node scripts/check-운영사이트가-셋인가.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const klifemap뿌리 = 'C:/Users/User/Documents/GitHub/klifemap';

export const 운영해야하는사이트 = ['백년지도', 'KLifeMap', 'SeoulMarkets'];
export const 없는주소 = 'KLifeDesign.AI';

/** 손님에게 나가는 글에 없는 주소가 들었나. 주석은 뺀다 — 주석은 손님이 안 본다 */
export function 없는주소가있나(글) {
  const 본문 = String(글 ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/^\s*\*.*$/gm, ' ');
  return /klifedesign\s*\.\s*ai/i.test(본문);
}

/** klifedesign.net 「홈페이지」 링크인가 — mailto: 는 메일 주소지 홈페이지가 아니다 */
export function 홈페이지링크인가(줄) {
  const s = String(줄 ?? '');
  if (/mailto:/i.test(s)) return false;
  return /https?:\/\/(www\.)?klifedesign\.net/i.test(s);
}

/** 한 폴더에서 손님에게 나가는 파일을 모은다 */
function 훑는다(밑, 걸러낼것 = []) {
  const 모음 = [];
  const 간다 = (곳) => {
    let 것들;
    try { 것들 = fs.readdirSync(곳, { withFileTypes: true }); } catch (e) { return; }
    for (const e of 것들) {
      const 길 = path.join(곳, e.name);
      if (e.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'tmp', 'archive', 'out'].includes(e.name)) continue;
        간다(길);
      } else if (/\.(html|js|mjs|astro|md)$/i.test(e.name)) {
        if (걸러낼것.some((x) => 길.replace(/\\/g, '/').includes(x))) continue;
        모음.push(길);
      }
    }
  };
  간다(밑);
  return 모음;
}

if (process.argv.includes('--자가시험')) {
  let 통 = 0; let 탈 = 0;
  const 본다 = (이름, 참) => { if (참) { 통 += 1; console.log('  ✅ ' + 이름); } else { 탈 += 1; console.log('  🔴 ' + 이름); } };
  본다('① 없는 주소를 잡는다', 없는주소가있나('도움말: KLifeDesign.AI'));
  본다('② 띄어쓰기가 끼어도 잡는다', 없는주소가있나('klifedesign . ai'));
  본다('🔴 ③ 주석 안은 안 센다 — 손님이 안 본다',
    !없는주소가있나('/* 옛 글자는 KLifeDesign.AI 였다 */')
    && !없는주소가있나('// KLifeDesign.AI 를 고쳤다')
    && !없는주소가있나('<!-- KLifeDesign.AI -->'));
  본다('④ 맞는 주소는 안 잡는다', !없는주소가있나('도움말: KLifeMap.AI'));
  본다('🔴 ⑤ mailto 는 홈페이지 링크가 아니다',
    !홈페이지링크인가('<a href="mailto:cs@klifedesign.net">cs@klifedesign.net</a>'));
  본다('🔴 ⑥ 홈페이지 링크는 잡는다',
    홈페이지링크인가('<a href="https://klifedesign.net">회사</a>')
    && 홈페이지링크인가('https://www.klifedesign.net/'));
  본다('⑦ 운영 사이트 목록이 셋이다', 운영해야하는사이트.length === 3);
  console.log(탈 ? '\n🔴 자가시험 ' + 탈 + '건 탈' : '\n✅ 자가시험 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

/* ── 실제로 잰다 ──────────────────────────────────────────────────────── */
let 탈 = 0;
const 알린다 = (성한가, 글) => { if (성한가) console.log('  ✅ ' + 글); else { 탈 += 1; console.log('  🔴 ' + 글); } };
console.log('━━━ 운영하는 사이트가 셋인가 ━━━━━━━━━━━━━━━━━━━━━━━━');

/* ① ② 유닛자리표 */
{
  const { 운영중, 자리표, 멈췄나 } = await import('../src/lib/유닛자리표.mjs');
  알린다(운영중.length === 3 && 운영해야하는사이트.every((n) => 운영중.some((x) => x.이름 === n)),
    '① 운영하는 사이트가 셋이다 — ' + 운영중.map((x) => x.이름).join(' · '));
  const kcw = 자리표.find((x) => x.이름 === 'K Culture Wire');
  알린다(!!kcw && !!kcw.운영중단 && !!kcw.까닭,
    '② K Culture Wire 가 까닭과 함께 운영중단으로 남아 있다');
  알린다(멈췄나('www.kculturewire.com') && !멈췄나('seoulmarkets.com'),
    '③ 멈췄나() 가 멈춘 곳만 가린다');
}

/* ④ 색인 요청 관문 */
{
  const 글 = fs.readFileSync(path.join(뿌리, 'scripts', 'ping-indexnow.mjs'), 'utf8');
  알린다(글.includes('멈췄나') && 글.includes('유닛자리표'),
    '④ 색인 요청이 멈춘 호스트를 보내기 전에 막는다');
}

/* ⑤ 없는 주소가 손님 글에 없나 — 두 저장소를 다 본다 */
{
  const 볼곳 = [
    [path.join(뿌리, 'src'), ['/src/data/']],
    [path.join(뿌리, 'public'), []],
    [path.join(klifemap뿌리, 'public'), []],
    [path.join(klifemap뿌리, 'astro'), []],
  ];
  const 걸린것 = [];
  for (const [밑, 걸러낼것] of 볼곳) {
    for (const f of 훑는다(밑, 걸러낼것)) {
      let 글; try { 글 = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
      if (없는주소가있나(글)) 걸린것.push(path.relative(path.dirname(밑), f));
    }
  }
  알린다(걸린것.length === 0, '⑤ 없는 주소(' + 없는주소 + ')가 손님 글에 없다'
    + (걸린것.length ? ' — ' + 걸린것.slice(0, 5).join(' · ') : ''));
}

/* ⑥ klifedesign.net 홈페이지 링크가 없나 */
{
  const 걸린것 = [];
  for (const 밑 of [path.join(뿌리, 'src'), path.join(뿌리, 'public'),
    path.join(klifemap뿌리, 'public')]) {
    for (const f of 훑는다(밑)) {
      let 글; try { 글 = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
      for (const 줄 of 글.split('\n')) {
        if (홈페이지링크인가(줄)) { 걸린것.push(path.basename(f)); break; }
      }
    }
  }
  알린다(걸린것.length === 0, '⑥ klifedesign.net 홈페이지 링크가 없다 (홈페이지가 없다)'
    + (걸린것.length ? ' — ' + [...new Set(걸린것)].slice(0, 5).join(' · ') : ''));
}

/* ⑦ CLAUDE.md 에 적혀 있나 */
{
  const 글 = fs.readFileSync(path.join(뿌리, 'CLAUDE.md'), 'utf8');
  알린다(글.includes('운영하는 사이트는') && 글.includes('kculturewire.com'),
    '⑦ CLAUDE.md 에 사이트 셋이 적혀 있다');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(탈 ? '🔴 ' + 탈 + '가지가 어긋났다' : '🟢 성하다 — 운영하는 사이트는 셋이다');
process.exit(탈 ? 1 : 0);

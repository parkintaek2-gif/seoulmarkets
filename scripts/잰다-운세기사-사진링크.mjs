#!/usr/bin/env node
/**
 * 잰다-운세기사-사진링크.mjs — 나간 띠별 운세 기사의 **대표 사진 링크가 성한가**를 잰다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-19 — 「**네가 해. 내 손 빌리지마**」 「**뭘 또 확인하니**」
 *   「대표 사진을 눌러 보시고 말씀 주십시오」라고 올린 것이 잘못이었다.
 *   눌러 보는 것은 **내 일**이다. 그래서 날마다 저절로 눌러 보는 자를 둔다.
 *
 * 무엇을 재나 — 셋 다 성해야 「됐다」다
 *   ① 나간 기사(www.jbnews.com)의 대표 사진이 `klifemap.ai/unse/` 로 감싸여 있나
 *   ② 그 주소가 열리나 (200)
 *   ③ 열린 지면이 «오늘 것»인가 — 어제 글이 걸려 있으면 봇이 어제 것을 본다
 *
 * ⛔ 「걸어 뒀다」를 「걸린다」로 읽지 않는다. 나간 지면을 받아서 센다
 * ⛔ 못 쟀으면 못 쟀다고 적는다. 0 으로 메우지 않는다
 *
 * 쓰는 법
 *   node scripts/잰다-운세기사-사진링크.mjs              오늘 자
 *   node scripts/잰다-운세기사-사진링크.mjs --날 2026-11-20
 *   node scripts/잰다-운세기사-사진링크.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

export const 기록파일 = 'docs/중부매일-띠별-등록기록.tsv';
export const 갈곳 = 'https://klifemap.ai/unse/';

/** ⛔ toISOString() 금지 — UTC 라 새벽에 하루가 어긋난다 */
export function 오늘글(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 등록 기록에서 그날 기사 번호를 집는다. 같은 날이 여럿이면 마지막 것이 산다 */
export function 그날번호(글, 날) {
  let 번호 = null;
  for (const 줄 of String(글 ?? '').split(/\r?\n/)) {
    if (!줄 || 줄.startsWith('#')) continue;
    const 칸 = 줄.split('\t');
    if ((칸[0] || '').trim() !== 날) continue;
    if ((칸[3] || '').trim() !== '됐다') continue;
    const 집힘 = /idxno=(\d+)/.exec(칸[5] || '');
    if (집힘) 번호 = 집힘[1];
  }
  return 번호;
}

/** 나간 지면에서 «대표 사진이 우리 주소로 감싸였나»를 본다 */
export function 사진이링크됐나(지면글, 주소 = 갈곳) {
  const 틀 = new RegExp('<a[^>]*href="' + 주소.replace(/[/.]/g, '\\$&') + '"[^>]*>\\s*(<[^>]+>\\s*)*<img[^>]*src="[^"]*\\/news\\/photo\\/', 'i');
  return 틀.test(String(지면글 ?? ''));
}

/**
 * 지면 글에 박힌 날짜를 집는다. ⛔ 못 집으면 null — 오늘로 메우지 않는다.
 * ⚠ 띠별 목록 지면은 `dateModified` 가 없고 제목에 「2026년 11월 19일」로 적힌다.
 *   그 꼴을 못 읽어 11-19 에 「날을 못 집었다」가 나왔다. 두 꼴을 다 읽는다.
 */
export function 박힌날(글) {
  const 본문 = String(글 ?? '');
  const 영문꼴 = /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})/.exec(본문);
  if (영문꼴) return 영문꼴[1];
  const 한글꼴 = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/.exec(본문);
  if (한글꼴) {
    const p = (n) => String(n).padStart(2, '0');
    return `${한글꼴[1]}-${p(한글꼴[2])}-${p(한글꼴[3])}`;
  }
  const 맨꼴 = /(\d{4}-\d{2}-\d{2})/.exec(본문);
  return 맨꼴 ? 맨꼴[1] : null;
}

/* ── 자체검사 ─────────────────────────────────────────────────────────── */
function 자체검사() {
  const 잰다 = [];
  const 본다 = (이름, 값) => 잰다.push([이름, !!값]);

  const 기록 = [
    '# 날\t올린때\t승인\t됐나\t그림수\t주소',
    '2026-11-20\t2026-11-19 00:48\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516329',
    '2026-11-21\t2026-11-19 00:52\t승인\t안됐다\t0\t',
  ].join('\n');
  본다('그날 번호를 집는다', 그날번호(기록, '2026-11-20') === '1516329');
  본다('⛔ 안 된 날은 안 집는다', 그날번호(기록, '2026-11-21') === null);
  본다('⛔ 없는 날은 null', 그날번호(기록, '2026-12-01') === null);

  const 걸린지면 = '<figure><a href="https://klifemap.ai/unse/" target="_blank"><img src="/news/photo/202611/a.png" /></a></figure>';
  본다('🔴 감싸인 것을 알아본다', 사진이링크됐나(걸린지면));
  본다('⛔ 링크가 없으면 아니다', !사진이링크됐나('<figure><img src="/news/photo/202611/a.png" /></figure>'));
  본다('⛔ 다른 그림에 걸린 것은 아니다',
    !사진이링크됐나('<a href="https://klifemap.ai/unse/"><img src="https://klifemap.ai/astro/ddi-color/01-rat.png"></a>'));
  본다('⛔ 남의 주소는 아니다',
    !사진이링크됐나('<a href="https://example.com/"><img src="/news/photo/202611/a.png"></a>'));

  본다('박힌 날을 집는다', 박힌날('{"dateModified":"2026-11-19","x":1}') === '2026-11-19');
  /* 🔴 띠별 목록 지면은 제목에 한글로 적힌다 — 이 꼴을 못 읽어 「못 집었다」가 나왔다 */
  본다('한글 날짜도 집는다', 박힌날('<title>2026년 11월 19일 띠별 오늘의 운세</title>') === '2026-11-19');
  본다('한 자리 달·날도 집는다', 박힌날('2026년 1월 5일') === '2026-01-05');
  본다('⛔ 없으면 null', 박힌날('아무 날도 없다') === null);
  본다('오늘을 KST 로 적는다', 오늘글(new Date(2026, 10, 20, 0, 1)) === '2026-11-20');

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자체검사 ${잰다.length} 통과`);
  process.exitCode = 진.length ? 1 : 0;
}

/* ── 실제로 잰다 ──────────────────────────────────────────────────────── */
async function 받기(주소) {
  try {
    const r = await fetch(주소, { redirect: 'follow' });
    return { 끝값: r.status, 글: await r.text() };
  } catch (못함) {
    return { 끝값: 0, 글: '', 탈: String(못함.message).slice(0, 80) };
  }
}

async function 본일() {
  const 자리 = process.argv.indexOf('--날');
  const 날 = 자리 >= 0 ? process.argv[자리 + 1] : 오늘글();
  const 기록 = fs.existsSync(path.join(뿌리, 기록파일))
    ? fs.readFileSync(path.join(뿌리, 기록파일), 'utf8') : '';
  const 번호 = 그날번호(기록, 날);
  console.log(`■ ${날} 띠별 운세 — 대표 사진 링크를 잰다`);
  if (!번호) { console.log('⚠ 그날 기사 번호를 기록에서 못 찾았다 — 못 쟀다'); process.exitCode = 1; return; }

  const 기사주소 = 'https://www.jbnews.com/news/articleView.html?idxno=' + 번호;
  const 기사 = await 받기(기사주소);
  console.log('   기사 ' + 기사주소 + ' → ' + (기사.끝값 || '못 받았다 ' + (기사.탈 || '')));
  if (기사.끝값 !== 200) { console.log('🔴 기사를 못 받았다'); process.exitCode = 1; return; }

  const 걸렸나 = 사진이링크됐나(기사.글);
  console.log('   ① 대표 사진이 우리 주소로 감싸였나 : ' + (걸렸나 ? '✅ 그렇다' : '🔴 아니다'));

  const 지면 = await 받기(갈곳);
  const 열리나 = 지면.끝값 === 200;
  console.log('   ② ' + 갈곳 + ' 가 열리나 : ' + (열리나 ? '✅ 200' : '🔴 ' + (지면.끝값 || 지면.탈)));

  const 박힘 = 박힌날(지면.글);
  const 오늘것 = 박힘 === 오늘글();
  console.log('   ③ 그 지면이 오늘 것인가 : ' + (박힘 ? (오늘것 ? '✅ ' + 박힘 : '🔴 ' + 박힘 + ' (오늘 ' + 오늘글() + ')') : '⚠ 날을 못 집었다'));

  const 다성한가 = 걸렸나 && 열리나 && 오늘것;
  console.log(다성한가 ? '\n✅ 셋 다 성하다' : '\n🔴 성하지 않다 — 위의 🔴 자리를 고친다');
  process.exitCode = 다성한가 ? 0 : 1;
}

/* 🔴 남이 불러 쓸 때 이 파일의 검사가 대신 돌면 안 된다 — 2026-11-19 에
   `중부매일-사진링크-채운다 --자체검사` 가 이 파일의 12가지를 먼저 찍었다.
   ⛔ `includes(이름)` 으로 재지 않는다. 파일 이름이 겹치면 또 걸린다 */
function 직접실행인가() {
  const 이름 = String(process.argv[1] || '').replace(/\\/g, '/').split('/').pop();
  return 이름 === '잰다-운세기사-사진링크.mjs';
}

if (직접실행인가()) {
  if (process.argv.includes('--자체검사')) 자체검사();
  else await 본일();
}

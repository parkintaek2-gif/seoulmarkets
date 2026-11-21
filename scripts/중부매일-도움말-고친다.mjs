#!/usr/bin/env node
/**
 * 중부매일-도움말-고친다.mjs
 *   — 이미 올려 둔 운세 기사의 **맨 끝 도움말 줄**을 고치고 링크를 건다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-20 —
 *   「**도움말: KLifeDesign.AI > 도움말: KLifeMap.AI 로 수정하고 KLifeMap.AI에 링크 걸어
 *     (21일 예약기사부터)**」 · 「**도움말도 고쳐**」 · 「**도움말에 링크 걸어**」
 *   「**미승인 하지말고**」 · 「**승인으로 저장**」
 *
 * [왜 따로 도나]
 *   기사는 이레치를 한꺼번에 올린다. 그 뒤에 규칙이 바뀌면 이미 올린 것들은 옛 글 그대로다.
 *   원고 짓는 자(klifemap/astro/cms원고*.js)는 고쳤지만, **이미 CMS 에 들어간 여덟 편**은
 *   그 자가 다시 짓지 않는다. 이 자가 그 여덟 편을 연다.
 *
 * ⛔ 도움말 줄 **말고는 한 글자도 바꾸지 않는다** — 나머지 글자를 재서 같아야 저장한다
 * ⛔ 이미 고쳐져 있으면 아무것도 안 한다. 같은 기사를 다시 저장하지 않는다
 * ⛔ 노출일·노출시각이 바뀌면 멈춘다
 * ⭐ 승인 상태는 **그대로 두고 저장한다** — 사장님 「승인으로 저장」
 * ⛔ 11-20 자 앞은 건드리지 않는다 — 이미 나간 기사다
 * ⛔ b.close() 금지 · 연 탭은 그 자리에서 닫는다
 *
 * 🔴🔴 사장님 2026-11-21 —
 *   ⑥ 「**도움말 링크는 https://klifemap.ai/unse** · 이미 올라간 기사의 도움말 링크도 같은 주소로」
 *   ⑦ 「**별자리 운세 기사는 «별자리 페이지»를 링크한다**」
 *   ⇒ 띠별은 /unse · 별자리는 /horoscope. 홈으로 보내지 않는다.
 *   ⚠ 홈 주소로 걸려 있던 기사는 「아직」으로 읽혀 다시 열린다.
 *
 * 쓰는 법
 *   node scripts/중부매일-도움말-고친다.mjs --날 2026-11-21
 *   node scripts/중부매일-도움말-고친다.mjs --부터 2026-11-21 --까지 2026-11-28
 *   node scripts/중부매일-도움말-고친다.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 새탭에서, 자리잡기, 재기 } from './lib/cdp.mjs';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');

/** 기록 파일 — 갈래마다 다르다 */
export const 기록파일 = {
  띠별: 'docs/중부매일-띠별-등록기록.tsv',
  별자리: 'docs/중부매일-별자리-올린기록.tsv',
};

/** ⛔ 이 날 앞은 건드리지 않는다 — 이미 나간 기사다 */
export const 첫날 = '2026-11-21';

/**
 * 🔴🔴 [2026-11-21 · 사장님] **갈래마다 가는 곳이 다르다.**
 *   ⑥ 「도움말 링크는 https://klifemap.ai/unse」
 *   ⑦ 「별자리 운세 기사는 «별자리 페이지»를 링크한다」
 * ⛔ 홈(klifemap.ai/)으로 보내지 않는다 — 손님이 읽던 것을 다시 찾아야 한다.
 * ⚠ 두 주소 다 열어서 200 인 것을 보고 적었다(2026-11-21 실측). 지어낸 주소가 아니다.
 */
export const 도움말주소 = {
  띠별: 'https://klifemap.ai/unse',
  별자리: 'https://klifemap.ai/horoscope',
};

/** 갈래에 맞는 도움말 줄. 모르는 갈래면 띠별 주소를 쓴다(홈으로는 안 보낸다) */
export function 새도움말(갈래) {
  const 주소 = 도움말주소[갈래] || 도움말주소.띠별;
  return '도움말: <a href="' + 주소 + '" target="_blank" rel="noopener">KLifeMap.AI</a>';
}

export function 서식주소(번호) {
  return 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;
}

/** 도움말 줄을 뺀 나머지 글자 — 이것이 달라지면 안 된다 */
export function 도움말뺀글자(글) {
  return String(글 ?? '')
    .replace(/<p[^>]*>\s*도움말:[\s\S]*?<\/p>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 이미 고쳐져 있나 — 글자가 KLifeMap.AI 이고 링크가 걸려 있어야 한다 */
/* 🔴 [2026-11-21] 갈래에 맞는 주소가 걸려 있어야 「고쳐졌다」로 본다.
   ⛔ 홈 주소(klifemap.ai/)는 이제 «아직»이다 — 그래야 옛 기사가 다시 열린다. */
export function 이미고쳤나(글, 갈래) {
  const 주소 = (도움말주소[갈래] || 도움말주소.띠별).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const 무늬 = new RegExp('<p[^>]*>\\s*도움말:\\s*<a[^>]*href="' + 주소 + '"[^>]*>\\s*KLifeMap\\.AI\\s*</a>\\s*</p>', 'i');
  return 무늬.test(String(글 ?? ''));
}

/**
 * 도움말 줄을 바꾼다. `<p>` 의 style 은 그대로 둔다.
 * @returns {{글:string, 센것:number}}
 */
export function 도움말고치기(글, 갈래) {
  /* 🔴 [2026-11-21] 둘째 인자가 갈래다. 예전에는 글자 그 자체를 받았다 —
     갈래마다 가는 곳이 달라졌으므로 글자가 아니라 «어느 갈래인가»를 받는다. */
  const 새것 = 새도움말(갈래);
  let 센것 = 0;
  const 새글 = String(글 ?? '').replace(
    /(<p[^>]*>)\s*도움말:[\s\S]*?(<\/p>)/gi,
    (m, 앞, 뒤) => { 센것 += 1; return 앞 + 새것 + 뒤; },
  );
  return { 글: 새글, 센것 };
}

/** 기록에서 그날 기사 번호를 집는다 */
export function 그날번호(기록글, 날) {
  let 찾음 = null;
  for (const 줄 of String(기록글 ?? '').split(/\r?\n/)) {
    if (!줄.trim() || 줄.startsWith('#')) continue;
    const 칸 = 줄.split('\t');
    if (칸[0] !== 날) continue;
    const m = /idxno=(\d+)/.exec(칸[5] || '');
    if (m) 찾음 = m[1];          /* 같은 날이 여럿이면 마지막 것이 최신이다 */
  }
  return 찾음;
}

export function 날더하기(날글, 더할날) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(날글 || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + Number(더할날));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0')
    + '-' + String(d.getUTCDate()).padStart(2, '0');
}

export function 날들만들기(부터, 까지) {
  const 것 = [];
  let 이제 = 날더하기(부터, 0);
  const 끝 = 날더하기(까지, 0);
  if (!이제 || !끝) return 것;
  while (이제 <= 끝 && 것.length < 60) { 것.push(이제); 이제 = 날더하기(이제, 1); }
  return 것;
}

/* ── 자체검사 ─────────────────────────────────────────────────────────── */
function 자체검사() {
  const 잰다 = [];
  const 본다 = (이름, 값) => 잰다.push([이름, !!값]);

  const 옛 = '<p style="font-size:16px;">앞 글</p>\n<p style="font-size:16px;">도움말: KLifeDesign.AI</p>';
  const { 글: 새, 센것 } = 도움말고치기(옛, '띠별');
  본다('도움말 줄을 한 줄 고친다', 센것 === 1);
  본다('🔴 KLifeMap.AI 로 바뀐다', 새.includes('>KLifeMap.AI</a>'));
  본다('🔴🔴 띠별은 띠별 운세 페이지로 간다 (사장님 ⑥)', 새.includes('href="https://klifemap.ai/unse"'));
  본다('⛔ 홈으로 보내지 않는다', !새.includes('href="https://klifemap.ai/"'));
  본다('⛔ style 을 그대로 둔다', 새.includes('<p style="font-size:16px;">도움말:'));
  본다('⛔ 앞 글은 그대로다', 새.includes('<p style="font-size:16px;">앞 글</p>'));
  본다('🔴 고친 뒤에는 「이미 고쳤다」로 읽힌다', 이미고쳤나(새, '띠별'));
  본다('⛔ 옛 글은 「아직」으로 읽힌다', !이미고쳤나(옛, '띠별'));
  본다('⛔ 두 번 고쳐도 같다', 도움말고치기(새, '띠별').글 === 새);

  /* 🔴🔴 [2026-11-21 · 사장님 ⑦] 별자리 기사는 «별자리 페이지»로 간다 */
  const { 글: 별 } = 도움말고치기(옛, '별자리');
  본다('🔴🔴 별자리는 별자리 페이지로 간다 (사장님 ⑦)', 별.includes('href="https://klifemap.ai/horoscope"'));
  본다('⛔ 별자리 글을 띠별 기준으로 보면 「아직」이다', !이미고쳤나(별, '띠별'));
  본다('⛔ 띠별 글을 별자리 기준으로 보면 「아직」이다', !이미고쳤나(새, '별자리'));
  본다('🔴 별자리도 제 기준으로는 「고쳤다」', 이미고쳤나(별, '별자리'));
  /* ⛔ 홈 주소로 고쳐 둔 옛 기사는 «아직»으로 읽혀야 다시 열린다 — 사장님 ⑥ */
  const 홈판 = '<p>도움말: <a href="https://klifemap.ai/" target="_blank" rel="noopener">KLifeMap.AI</a></p>';
  본다('🔴 홈으로 걸린 옛 기사는 「아직」으로 읽힌다', !이미고쳤나(홈판, '띠별') && !이미고쳤나(홈판, '별자리'));

  본다('🔴 도움말 말고는 글자가 같다', 도움말뺀글자(옛) === 도움말뺀글자(새));
  본다('⛔ 다른 글자가 바뀌면 알아챈다',
    도움말뺀글자('<p>가</p><p>도움말: x</p>') !== 도움말뺀글자('<p>나</p><p>도움말: x</p>'));

  본다('⛔ 도움말이 없으면 0 이다', 도움말고치기('<p>글만</p>').센것 === 0);
  본다('⛔ 빈 것에 안 터진다', 도움말고치기(null).센것 === 0 && 도움말뺀글자(null) === '');

  const 기록 = ['# 날\t올린때\t승인\t됐나\t그림수\t주소',
    '2026-11-21\tx\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516332',
    '2026-11-21\ty\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516399'].join('\n');
  본다('기록에서 번호를 집는다 — 같은 날이 여럿이면 마지막', 그날번호(기록, '2026-11-21') === '1516399');
  본다('⛔ 없는 날은 null', 그날번호(기록, '2026-12-25') === null);

  본다('날을 더한다', 날더하기('2026-11-30', 1) === '2026-12-01');
  본다('날 목록을 만든다', 날들만들기('2026-11-21', '2026-11-23').join(',') === '2026-11-21,2026-11-22,2026-11-23');
  본다('🔴 11-20 앞은 건드리지 않는다 (사장님 「21일 예약기사부터」)', 첫날 === '2026-11-21');

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자체검사 ${잰다.length} 통과`);
  process.exitCode = 진.length ? 1 : 0;
}

/* ── 실제로 고친다 ────────────────────────────────────────────────────── */
const 편집기있나 = '(() => !!(window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.FCKeditor1))()';
const 본문읽기 = '(() => CKEDITOR.instances.FCKeditor1.getData())()';
const 상태읽기 = [
  '(() => JSON.stringify({',
  '  제목: (document.querySelector("[name=title]") || {}).value || "",',
  '  승인: ["recog-e","recog-c","recog-r"].find((id) => (document.getElementById(id) || {}).checked) || "",',
  '  날: (document.querySelector("#embargo_date") || {}).value || "",',
  '  시각: (document.querySelector("#embargo_time") || {}).value || "",',
  '}))()',
].join('\n');
const 저장누르기 = [
  '(() => {',
  '  const b = document.querySelectorAll("button");',
  '  for (let i = 0; i < b.length; i++) if ((b[i].innerText || "").trim() === "저장") { b[i].click(); return "눌렀다"; }',
  '  return "저장 단추를 못 찾았다";',
  '})()',
].join('\n');

async function 편집기기다리기(붙음) {
  for (let i = 0; i < 40; i += 1) {
    /* 🔴 [2026-11-20] 15초로는 모자랐다 — 그림 12장이 든 화면이라 무겁다 */
    try {
      if (String(await 재기(붙음, 편집기있나, 45000)) === 'true') return true;
    } catch (e) { /* 한 번 늦었다고 그만두지 않는다 */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function 한편고치기(붙음, 날, 번호, 갈래) {
  await 자리잡기(붙음, { 최대: 45000 });
  await new Promise((r) => setTimeout(r, 4000));
  if (!await 편집기기다리기(붙음)) return '편집기를 못 찾았다';

  let 상태 = {};
  try { 상태 = JSON.parse(String(await 재기(붙음, 상태읽기, 20000))); } catch { 상태 = {}; }
  if (!new RegExp(갈래).test(상태.제목 || '')) {
    return 갈래 + ' 기사가 아니다 — ' + (상태.제목 || '제목을 못 읽었다');
  }
  if (상태.날 !== 날) return '노출일이 ' + 상태.날 + ' 이다 — 건드리지 않는다';

  const 앞글 = String(await 재기(붙음, 본문읽기, 25000));
  if (!앞글) return '본문을 못 읽었다';
  if (이미고쳤나(앞글, 갈래)) return '이미 고쳐져 있다';

  const { 글: 새글, 센것 } = 도움말고치기(앞글, 갈래);
  if (!센것) return '도움말 줄이 없다';
  if (도움말뺀글자(새글) !== 도움말뺀글자(앞글)) return '🔴 다른 글자가 바뀌어 멈췄다';

  await 재기(붙음, '(() => { CKEDITOR.instances.FCKeditor1.setData(' + JSON.stringify(새글) + '); return "넣었다"; })()', 30000);
  await new Promise((r) => setTimeout(r, 1500));
  const 눌렀나 = String(await 재기(붙음, 저장누르기, 20000));
  if (눌렀나 !== '눌렀다') return 눌렀나;
  await new Promise((r) => setTimeout(r, 7000));

  /* 되읽는다 — 「눌렀다」를 「됐다」로 읽지 않는다 */
  /* 🔴 [2026-11-20] 되읽으러 갈 때도 넉넉히 준다 — 그림 12장이라 무겁다 */
  try { await 재기(붙음, 'location.href = ' + JSON.stringify(서식주소(번호)), 60000); } catch (e) { /* 떠나는 중이라 답이 안 올 수 있다 */ }
  await new Promise((r) => setTimeout(r, 6000));
  await 자리잡기(붙음);
  if (!await 편집기기다리기(붙음)) return '저장은 눌렀는데 되읽기를 못 했다';
  const 뒤글 = String(await 재기(붙음, 본문읽기, 25000));
  let 뒤상태 = {};
  try { 뒤상태 = JSON.parse(String(await 재기(붙음, 상태읽기, 20000))); } catch { 뒤상태 = {}; }
  if (!이미고쳤나(뒤글, 갈래)) return '🔴 저장했는데 도움말이 그대로다';
  if (도움말뺀글자(뒤글) !== 도움말뺀글자(앞글)) return '🔴 다른 글자가 바뀌었다';
  if (뒤상태.날 !== 상태.날 || 뒤상태.시각 !== 상태.시각) return '🔴 노출시간이 바뀌었다';
  const 승인말 = 뒤상태.승인 === 상태.승인 ? '' : ' · ⚠ 승인이 ' + 상태.승인 + ' → ' + 뒤상태.승인;
  return '고쳤다' + 승인말;
}

async function 본일() {
  const 인자 = (이름) => {
    const i = process.argv.indexOf('--' + 이름);
    return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
  };
  const 한날 = 인자('날');
  const 부터 = 인자('부터');
  const 까지 = 인자('까지');
  const 날들 = 한날 ? [한날] : (부터 && 까지 ? 날들만들기(부터, 까지) : []);
  if (!날들.length) {
    console.log('쓰는 법: --날 2026-11-21  또는  --부터 2026-11-21 --까지 2026-11-28');
    process.exit(1);
  }

  const 할것 = [];
  for (const 날 of 날들) {
    if (날 < 첫날) { console.log(`⬜ ${날} — 이미 나간 기사다. 건드리지 않는다`); continue; }
    for (const 갈래 of ['띠별', '별자리']) {
      const 길 = path.join(뿌리, 기록파일[갈래]);
      const 기록 = fs.existsSync(길) ? fs.readFileSync(길, 'utf8') : '';
      const 번호 = 그날번호(기록, 날);
      if (!번호) { console.log(`⚠ ${날} ${갈래} — 기록에 기사가 없다`); continue; }
      할것.push([날, 번호, 갈래]);
    }
  }
  if (!할것.length) { console.log('할 것이 없다'); return; }

  /* ⛔ 한 편마다 «새 탭»을 연다. 연 탭은 새탭에서 가 그 자리에서 닫는다 */
  for (const [날, 번호, 갈래] of 할것) {
    let 결과;
    try {
      await 새탭에서(서식주소(번호), async (붙음) => {
        결과 = await 한편고치기(붙음, 날, 번호, 갈래);
      });
    } catch (e) {
      결과 = '🔴 터졌다 — ' + String(e && e.message ? e.message : e).slice(0, 90);
    }
    console.log(`${/고쳤다|이미/.test(결과 || '') ? '✅' : '🔴'} ${날} ${갈래} ${번호} — ${결과}`);
    await new Promise((r) => setTimeout(r, 2500));
  }
}

/* 🔴🔴 [2026-11-21] **import 만 해도 이 아래가 돌았다.**
   사진 설명 고치는 자가 여기서 함수 몇 개를 가져왔는데, 그것만으로 도움말 고치기가
   통째로 돌아 기사 16편을 다시 열었다. 이번에는 「이미 고쳐져 있다」로 끝나 탈이
   없었지만, 고칠 것이 남아 있었다면 **부르지도 않은 저장이 일어났을 것**이다.
   ⇒ 들머리는 이 파일을 «직접» 돌렸을 때만 돈다. 가져다 쓰는 쪽은 함수만 받는다. */
const 직접돌렸나 = (() => {
  const 시킨것 = String(process.argv[1] || '').replace(/\\/g, '/');
  return 시킨것.endsWith('중부매일-도움말-고친다.mjs');
})();

if (직접돌렸나) {
  if (process.argv.includes('--자체검사')) 자체검사();
  else await 본일();
}

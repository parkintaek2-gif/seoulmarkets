#!/usr/bin/env node
/**
 * 중부매일-사진링크-채운다.mjs
 *   — 올려 둔 띠별 운세 기사의 **대표 사진에 우리 지면 주소를 건다.**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 사장님 2026-11-19 — 「대표 이미지에만 넣으라고」 · 「링크 잘 걸렸다 말했잖아」
 *   · 「**네가 해. 내 손 빌리지마**」
 *
 * [왜 따로 도나]
 *   기사는 이레치를 한꺼번에 올린다. 그 뒤에 규칙이 바뀌면 이미 올린 것들은 비어 있다.
 *   11-21~11-28 자 여덟 편이 그렇게 비었다. 사람 손으로 여덟 번 여는 대신 이 자가 돈다.
 *
 * ⚠ **00:02 에 돈다 — 기사가 나가는 00:05 «앞»이다.**
 *   나간 뒤에 고치면 그것이 「수정」이 된다. 나가기 전이면 예약 기사를 다듬는 것이다.
 *   사장님: 「저장만 하고 나오는 건 상관없어. 예약시간이 안되면 외부 표출안됨」
 *
 * ⛔ 본문 글은 한 글자도 바꾸지 않는다 — `<img>` 를 `<a>` 로 감싸기만 한다
 * ⛔ 이미 걸려 있으면 아무것도 안 한다. 날마다 같은 기사를 다시 저장하지 않는다
 * ⛔ 11-19 자는 건드리지 않는다 — 사장님 「더 이상 건들지마」
 * ⛔ b.close() 금지 · 연 탭은 그 자리에서 닫는다
 *
 * 쓰는 법
 *   node scripts/중부매일-사진링크-채운다.mjs            오늘·내일 자
 *   node scripts/중부매일-사진링크-채운다.mjs --날 2026-11-21
 *   node scripts/중부매일-사진링크-채운다.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 탭붙기, 자리잡기, 재기 } from './lib/cdp.mjs';
import { 대표링크걸기, 대표사진링크, 링크걸날인가 } from './중부매일-띠별-등록.mjs';
import { 그날번호, 오늘글 } from './잰다-운세기사-사진링크.mjs';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.join(여기, '..');
export const 기록파일 = 'docs/중부매일-띠별-등록기록.tsv';

/** 내일 — ⛔ toISOString() 금지 */
export function 내일글(오늘 = new Date()) {
  const d = new Date(오늘.getFullYear(), 오늘.getMonth(), 오늘.getDate() + 1);
  return 오늘글(d);
}

export function 서식주소(번호) {
  return 'https://cms.jbnews.com/news/adminArticleWriteForm.html?mode=modify&idxno=' + 번호;
}

/** 글자만 남긴다 — 링크를 걸어도 이것이 달라지면 안 된다 */
export function 글자만(글) {
  return String(글 ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** 이미 걸려 있나 */
export function 이미걸렸나(글, 주소 = 대표사진링크) {
  const 틀 = new RegExp('<a[^>]*href="' + 주소.replace(/[/.]/g, '\\$&') + '"[^>]*>\\s*<img[^>]*\\/news\\/photo\\/', 'i');
  return 틀.test(String(글 ?? ''));
}

/* ── 자체검사 ─────────────────────────────────────────────────────────── */
function 자체검사() {
  const 잰다 = [];
  const 본다 = (이름, 값) => 잰다.push([이름, !!값]);

  본다('내일을 KST 로 센다', 내일글(new Date(2026, 10, 19, 23, 59)) === '2026-11-20');
  본다('달을 넘겨도 센다', 내일글(new Date(2026, 10, 30)) === '2026-12-01');
  본다('서식 주소를 만든다', 서식주소('1516332').endsWith('mode=modify&idxno=1516332'));

  const 사진 = '<figure class="photo-layout"><img alt="x" src="/news/photo/202611/a.png" />'
    + '<figcaption>x</figcaption></figure><p><img src="https://klifemap.ai/astro/ddi-color/01-rat.png"> 쥐띠</p>';
  본다('아직 안 걸린 것을 알아본다', !이미걸렸나(사진));
  const { 글: 건것, 센것 } = 대표링크걸기(사진, 대표사진링크);
  본다('대표 사진 한 장을 건다', 센것 === 1);
  본다('🔴 건 뒤에는 「이미 걸렸다」로 읽힌다', 이미걸렸나(건것));
  본다('⛔ 두 번 걸지 않는다', 대표링크걸기(건것, 대표사진링크).센것 === 0);
  본다('🔴 글자는 한 글자도 안 바뀐다', 글자만(건것) === 글자만(사진));
  본다('⛔ 띠 그림은 안 건드린다', !/<a[^>]*><img[^>]*ddi-color/.test(건것));
  본다('⛔ 11-19 자는 안 건다', !링크걸날인가('2026-11-19'));
  본다('다른 날은 건다', 링크걸날인가('2026-11-21'));

  const 기록 = ['# 날\t올린때\t승인\t됐나\t그림수\t주소',
    '2026-11-21\tx\t승인\t됐다\t12\thttps://cms.jbnews.com/news/articleView.html?idxno=1516332'].join('\n');
  본다('기록에서 그날 번호를 집는다', 그날번호(기록, '2026-11-21') === '1516332');

  const 진 = 잰다.filter(([, v]) => !v);
  for (const [이름, v] of 잰다) console.log(`${v ? '✅' : '🔴'} ${이름}`);
  console.log(진.length ? `\n🔴 ${진.length}/${잰다.length} 떨어졌다` : `\n✅ 자체검사 ${잰다.length} 통과`);
  process.exitCode = 진.length ? 1 : 0;
}

/* ── 실제로 건다 ──────────────────────────────────────────────────────── */
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
    if (String(await 재기(붙음, 편집기있나, 15000)) === 'true') return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function 한편걸기(붙음, 날, 번호) {
  await 재기(붙음, 'location.href = ' + JSON.stringify(서식주소(번호)), 15000);
  await new Promise((r) => setTimeout(r, 6000));
  await 자리잡기(붙음);
  if (!await 편집기기다리기(붙음)) return '편집기를 못 찾았다';

  let 상태 = {};
  try { 상태 = JSON.parse(String(await 재기(붙음, 상태읽기, 20000))); } catch { 상태 = {}; }
  if (!/띠별/.test(상태.제목 || '')) return '띠별 기사가 아니다 — ' + (상태.제목 || '제목을 못 읽었다');
  if (상태.날 !== 날) return '노출일이 ' + 상태.날 + ' 이다 — 건드리지 않는다';

  const 앞글 = String(await 재기(붙음, 본문읽기, 25000));
  if (!앞글) return '본문을 못 읽었다';
  if (이미걸렸나(앞글)) return '이미 걸려 있다';

  const { 글: 새글, 센것 } = 대표링크걸기(앞글, 대표사진링크);
  if (!센것) return '대표 사진이 없다';
  if (글자만(새글) !== 글자만(앞글)) return '🔴 글자가 바뀌어 멈췄다';

  await 재기(붙음, '(() => { CKEDITOR.instances.FCKeditor1.setData(' + JSON.stringify(새글) + '); return "넣었다"; })()', 30000);
  await new Promise((r) => setTimeout(r, 1500));
  const 눌렀나 = String(await 재기(붙음, 저장누르기, 20000));
  if (눌렀나 !== '눌렀다') return 눌렀나;
  await new Promise((r) => setTimeout(r, 7000));

  /* 되읽는다 — 「눌렀다」를 「됐다」로 읽지 않는다 */
  await 재기(붙음, 'location.href = ' + JSON.stringify(서식주소(번호)), 15000);
  await new Promise((r) => setTimeout(r, 6000));
  await 자리잡기(붙음);
  if (!await 편집기기다리기(붙음)) return '저장은 눌렀는데 되읽기를 못 했다';
  const 뒤글 = String(await 재기(붙음, 본문읽기, 25000));
  let 뒤상태 = {};
  try { 뒤상태 = JSON.parse(String(await 재기(붙음, 상태읽기, 20000))); } catch { 뒤상태 = {}; }
  if (!이미걸렸나(뒤글)) return '🔴 저장했는데 링크가 없다';
  if (뒤상태.승인 !== 상태.승인) return '🔴 승인이 바뀌었다 — ' + 뒤상태.승인;
  if (뒤상태.날 !== 상태.날 || 뒤상태.시각 !== 상태.시각) return '🔴 노출시간이 바뀌었다';
  if (글자만(뒤글) !== 글자만(앞글)) return '🔴 글자가 바뀌었다';
  return '걸었다';
}

async function 본일() {
  const 자리 = process.argv.indexOf('--날');
  const 날들 = 자리 >= 0 ? [process.argv[자리 + 1]] : [오늘글(), 내일글()];
  const 기록 = fs.existsSync(path.join(뿌리, 기록파일))
    ? fs.readFileSync(path.join(뿌리, 기록파일), 'utf8') : '';

  const 할것 = [];
  for (const 날 of 날들) {
    if (!링크걸날인가(날)) { console.log(`⬜ ${날} — 거는 날이 아니다`); continue; }
    const 번호 = 그날번호(기록, 날);
    if (!번호) { console.log(`⚠ ${날} — 기록에 기사가 없다`); continue; }
    할것.push([날, 번호]);
  }
  if (!할것.length) { console.log('할 것이 없다'); return; }

  const 붙음 = await 탭붙기();
  try {
    for (const [날, 번호] of 할것) {
      const 결과 = await 한편걸기(붙음, 날, 번호);
      console.log(`${/걸었다|이미/.test(결과) ? '✅' : '🔴'} ${날} ${번호} — ${결과}`);
    }
  } finally {
    try { await 붙음.닫기(); } catch (e) { /* 이미 닫혔다 */ }
  }
}

if (process.argv.includes('--자체검사')) 자체검사();
else await 본일();

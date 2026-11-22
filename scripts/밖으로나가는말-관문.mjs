#!/usr/bin/env node
/**
 * 밖으로나가는말-관문.mjs — **손님·사장님께 나가는 글을 한 자리에서 막는다.**
 *
 * 🔴🔴🔴 사장님 (2026-10-28)
 *   「순한글, IT용어, 이상한 번역투 사용금지 원칙을 철저히 적용해.
 *     **웹, 업무보고서, pdf 등 모든 부분에서** 철저히 사용금지 원칙을
 *     **절대적으로 적용하기 위한 강제조치도 마련해**」
 *   「우리가 운영하는 모든 서비스, 모든 사이트」
 *
 * ── 무엇이 비어 있었나 ────────────────────────────────────────────────
 *   금지어 목록(순한글-금지어.mjs · 92개)은 이미 한 곳에 모여 있었다.
 *   그런데 **그 목록을 보는 자리가 기사 편지 하나뿐**이었다.
 *     · send-mail.mjs 는 `기사편지인가(글)` 가 참일 때만 쟀다 — 업무보고·감명서는 안 쟀다
 *     · 그나마 갈래 셋(비유·화면·까닭)만 봤다 — 제일 큰 갈래 「우리말」 33개를 안 봤다
 *     · 첨부(워드·PDF·슬라이드) 속은 한 번도 안 봤다
 *   ⇒ 「검사기는 있는데 안 돌린 것」이 결함이었다. 이 자는 **돌리지 않을 수 없게** 만든다.
 *
 * ── 어디서 막나 ───────────────────────────────────────────────────────
 *   ① 메일   send-mail.mjs 가 보내기 «직전»에 본문과 첨부 전부를 이 자로 잰다
 *   ② 배포   각 사이트 배포 스크립트가 손님 화면 글을 이 자로 잰다
 *   ③ 손으로 node scripts/밖으로나가는말-관문.mjs <파일…>
 *
 * ⛔ 걸린 것이 있으면 **1 로 끝낸다.** 0 으로 끝내면 `&&` 가 안 막는다
 *   (2026-10-22 에 그 결함으로 「지면」이 든 메일이 사장님께 나갔다).
 * ⚠ 코드 주석·개발 문서는 보지 않는다 — 적용 범위는 「고객 대상·외부 대상」이다.
 *
 * 쓰는 법
 *   node scripts/밖으로나가는말-관문.mjs 보고.md 보고.docx 감명서.pdf
 *   node scripts/밖으로나가는말-관문.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const { 재기, 금지어 } = await import('file://' + path.join(여기, '순한글-금지어.mjs').replace(/\\/g, '/'));

export { 금지어 };

/** 글자만 남긴다 — 태그·속성은 손님이 읽는 글이 아니다 */
export function 태그벗기기(글) {
  return String(글 ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * 묶음 파일(워드·슬라이드·엑셀)에서 글자를 꺼낸다.
 * ⚠ 이 파일들은 모두 zip 이다. 바깥 꾸러미를 더 들이지 않고 중앙 목록을 직접 읽는다.
 * ⛔ 못 읽으면 «빈 글»을 돌려주지 않는다 — 빈 글은 「깨끗하다」로 읽히기 때문이다.
 *   못 읽었다는 것을 던져서 부르는 쪽이 막게 한다.
 */
export function 묶음에서글자(버퍼, 볼것 = /\.xml$/i) {
  const b = Buffer.isBuffer(버퍼) ? 버퍼 : Buffer.from(버퍼);
  /* 중앙 목록 끝표(EOCD) 를 뒤에서 찾는다 — 주석이 붙어 있을 수 있어 끝에서 훑는다 */
  let 끝표 = -1;
  for (let i = b.length - 22; i >= 0 && i > b.length - 70000; i -= 1) {
    if (b.readUInt32LE(i) === 0x06054b50) { 끝표 = i; break; }
  }
  if (끝표 < 0) throw new Error('zip 중앙 목록을 못 찾았다');
  const 칸수 = b.readUInt16LE(끝표 + 10);
  let p = b.readUInt32LE(끝표 + 16);
  const 조각 = [];
  for (let n = 0; n < 칸수; n += 1) {
    if (b.readUInt32LE(p) !== 0x02014b50) break;
    const 누름 = b.readUInt16LE(p + 10);
    const 누른길이 = b.readUInt32LE(p + 20);
    const 이름길이 = b.readUInt16LE(p + 28);
    const 덧길이 = b.readUInt16LE(p + 30);
    const 말길이 = b.readUInt16LE(p + 32);
    const 머리자리 = b.readUInt32LE(p + 42);
    const 이름 = b.toString('utf8', p + 46, p + 46 + 이름길이);
    p += 46 + 이름길이 + 덧길이 + 말길이;
    if (!볼것.test(이름)) continue;
    /* 제 자리의 머리에서 이름·덧 길이를 다시 읽어야 속이 어디서 시작하는지 안다 */
    const 속시작 = 머리자리 + 30 + b.readUInt16LE(머리자리 + 26) + b.readUInt16LE(머리자리 + 28);
    const 속 = b.subarray(속시작, 속시작 + 누른길이);
    조각.push(누름 === 0 ? 속.toString('utf8') : zlib.inflateRawSync(속).toString('utf8'));
  }
  if (!조각.length) throw new Error('zip 안에서 읽을 글이 없었다');
  return 태그벗기기(조각.join(' '));
}

/** PDF 에서 글자를 꺼낸다 — pdfjs-dist 는 이 저장소가 이미 쓰고 있다 */
export async function PDF에서글자(길) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const 문서 = await getDocument({ data: new Uint8Array(fs.readFileSync(길)), useSystemFonts: true }).promise;
  const 조각 = [];
  for (let n = 1; n <= 문서.numPages; n += 1) {
    const 쪽 = await 문서.getPage(n);
    const 글 = await 쪽.getTextContent();
    조각.push(글.items.map((x) => x.str).join(' '));
  }
  return 조각.join(' ');
}

export const 글자로볼것 = new Set(['.md', '.txt', '.csv', '.tsv', '.html', '.htm', '.json', '.xml', '.srt', '.vtt']);
export const 묶음으로볼것 = new Set(['.docx', '.dotx', '.pptx', '.potx', '.xlsx']);

/** 한 파일에서 손님이 읽을 글자를 꺼낸다 */
export async function 글자뽑기(길) {
  const 꼬리 = path.extname(길).toLowerCase();
  if (꼬리 === '.pdf') return PDF에서글자(길);
  if (묶음으로볼것.has(꼬리)) {
    const 볼것 = 꼬리 === '.xlsx' ? /(sharedStrings|sheet\d+)\.xml$/i
      : 꼬리.startsWith('.p') ? /slide\d+\.xml$/i
        : /document\.xml$/i;
    return 묶음에서글자(fs.readFileSync(길), 볼것);
  }
  if (글자로볼것.has(꼬리)) {
    const 글 = fs.readFileSync(길, 'utf8');
    return (꼬리 === '.html' || 꼬리 === '.htm' || 꼬리 === '.xml') ? 태그벗기기(글) : 글;
  }
  return null;    /* 그림·영상 등 — 읽을 글이 없다 */
}

/**
 * 글 한 덩이를 잰다. 돌려주는 것은 걸린 낱말 목록이다.
 * ⚠ 갈래를 가리지 않는다 — 「우리말」 33개를 빼고 재던 것이 이 사고의 뿌리였다.
 */
export function 글을잰다(글) {
  return 재기(String(글 ?? ''), { 주석도본다: true });
}

/* 🔴 [2026-11-22] 사장님 — 「**한자어만 써**」 「**한자어가 현대 한국어가 아닌 지만 보면 되고**」
   내가 적어 둔 목록만 재면 «적지 않은 말»이 그대로 나간다. 11월 22일에 사장님이
   「간추림」·「사이」·「낳고」를 짚으셨는데 셋 다 목록에 없었다.
   국립국어원 표준국어대사전의 «어종»으로도 잰다 — 등록하지 않아도 잡힌다.
   ⛔ 사전 자료가 없으면 «조용히 통과시키지 않는다». 못 쟀다고 밝힌다. */
let 사전재기 = null;
export async function 사전으로잰다(글) {
  if (!사전재기) {
    try {
      const m = await import('file://' + path.join(여기, '잰다-한자어로-썼나.mjs').replace(/\\/g, '/'));
      const 짝 = await import('file://' + path.join(여기, '..', 'data', '바꿀만한-짝.js').replace(/\\/g, '/'));
      const 고 = await import('file://' + path.join(여기, '..', 'data', '사전-고유어-전부.js').replace(/\\/g, '/'));
      const 겪은표 = {};
      for (const x of 금지어) if (x && x.말 && x.대신) 겪은표[x.말] = x.대신;
      사전재기 = (g) => m.잰다(g, { 짝표: 짝.바꿀만한짝, 고유어: 고.사전고유어, 겪은표 });
    } catch (e) {
      사전재기 = () => ({ 바꿀것: [], 짝없는것: [], 못쟀다: e.message });
    }
  }
  return 사전재기(글);
}

/** 파일 여럿을 잰다 — 돌려주는 것은 [{길, 걸린것}] 과 못 읽은 것, 그리고 인용만 든 것 */
export async function 파일들을잰다(길들) {
  const 걸린파일 = [];
  const 못읽은것 = [];
  /* 🔴 [2026-11-18] 인용은 «막지 않는다». 그래서 걸린파일에 넣으면 안 된다 —
     넣는 순간 통과하던 글이 빨강이 되어 일이 선다. 따로 모아 눈에만 보인다. */
  const 인용든것 = [];
  const 사전걸린것 = [];
  for (const 길 of 길들) {
    let 글 = null;
    try { 글 = await 글자뽑기(길); } catch (e) { 못읽은것.push({ 길, 왜: e.message }); continue; }
    if (글 === null) continue;
    const 걸린것 = 글을잰다(글);
    const 사전잰것 = await 사전으로잰다(글);
    if (사전잰것.못쟀다) 못읽은것.push({ 길, 왜: '사전으로 못 쟀다 — ' + 사전잰것.못쟀다 });
    else if (사전잰것.바꿀것.length) 사전걸린것.push({ 길, 바꿀것: 사전잰것.바꿀것 });
    /* 🔴 [2026-11-18] 인용 안의 것은 막지 않지만 «숨기지도» 않는다 —
       「인용으로 감싸면 통과한다」가 빠져나갈 구멍이 되지 않게 사람 눈에 보인다. */
    const 인용속 = Array.isArray(걸린것?.인용속) ? 걸린것.인용속 : [];
    if (인용속.length) 인용든것.push({ 길, 인용속 });
    if (걸린것.length) 걸린파일.push({ 길, 걸린것 });
  }
  return { 걸린파일, 못읽은것, 인용든것, 사전걸린것 };
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 재본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });

  재본다('🔴 「까닭」을 잡는다 — 갈래가 「우리말」이라 전에는 메일에서 안 걸렸다',
    글을잰다('그 까닭을 적었습니다').length === 1);
  재본다('🔴 「잣대」도 잡는다', 글을잰다('하나의 잣대로 줄 세우지 않습니다').length === 1);
  재본다('⛔ 깨끗한 글은 안 잡는다',
    글을잰다('오늘 순방문자는 53명입니다. 이유는 아래에 적었습니다.').length === 0);
  재본다('⛔ 낱말 안에 우연히 든 것은 안 잡는다(무너지면서)',
    글을잰다('벽이 무너지면서 길이 막혔습니다').length === 0);
  재본다('태그를 벗기고 잰다', 글을잰다(태그벗기기('<p>그 까닭은</p>')).length === 1);
  재본다('⛔ 빈 것에 안 터진다', 글을잰다(null).length === 0 && 글을잰다(undefined).length === 0);
  재본다('⛔ zip 이 아닌 것을 묶음으로 읽으면 «빈 글»이 아니라 오류를 던진다',
    (() => { try { 묶음에서글자(Buffer.from('안녕')); return false; } catch (e) { return true; } })());

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ 밖으로나가는말-관문 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  const 길들 = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  if (!길들.length) {
    console.log('쓰는 법: node scripts/밖으로나가는말-관문.mjs <파일…>');
    process.exit(2);
  }
  const { 걸린파일, 못읽은것, 인용든것 = [], 사전걸린것 = [] } = await 파일들을잰다(길들);
  for (const x of 못읽은것) console.log(`⚠ 못 읽었다 — ${x.길} (${x.왜})`);
  /* 🔴 [2026-11-18] 인용 안은 막지 않지만 눈에는 보인다 —
     ⛔ 「낫표로 감싸면 통과한다」가 빠져나갈 구멍이 되지 않게 한다.
     사장님 말씀 원문·선수 인터뷰·대체표의 「쓰지 않는다」 칸이 여기 들어온다. */
  for (const x of 인용든것) {
    console.log(`⬜ 인용 ${x.인용속.length}곳은 안 쟀다 — ${x.길}`);
    for (const q of x.인용속.slice(0, 5)) console.log(`     ${q.replace(/\s+/g, ' ').slice(0, 70)}`);
    if (x.인용속.length > 5) console.log(`     … 그 밖에 ${x.인용속.length - 5}곳`);
  }
  if (!걸린파일.length && !못읽은것.length && !사전걸린것.length) {
    console.log(`✅ ${길들.length}개 깨끗하다 — 금지어 ${금지어.length}개와 표준국어대사전으로 다 쟀다.`);
    process.exit(0);
  }
  for (const f of 걸린파일) {
    console.log(`\n🔴 ${f.길}`);
    for (const w of f.걸린것) {
      console.log(`   ⛔ 「${w.말}」 ${w.수}번 → ${w.대신}`);
      console.log(`      … ${w.보기} …`);
    }
  }
  /* 🔴 [2026-11-22] 사전으로 잡은 것 — 목록에 적지 않았어도 어종이 고유어면 잡힌다.
     ⛔ **막지는 않는다.** 사전이 적어 둔 짝에는 「이시」·「우조」·「어근」처럼
       현대 한국어가 아닌 말이 아직 섞여 있다. 그대로 막으면 손님 화면을 해친다.
       사장님 2026-11-22 — 「한자어가 현대 한국어가 아닌 지만 보면 되고」
     ⚠ 겪은표(금지어 316개)가 짝을 가진 말은 위에서 «막는다». 여기는 사전만 아는 말이다.
     ⇒ 문턱을 더 다듬어 사어가 빠지면 그때 막는 쪽으로 올린다. */
  for (const f of 사전걸린것) {
    console.log(`\n⚠ ${f.길} — 표준국어대사전이 고유어로 판정한 말 (막지 않는다)`);
    for (const w of f.바꿀것) {
      console.log(`   ⛔ 「${w.말}」 ${w.수}번 → ${w.짝}`
        + (w.어디서 === '사전' ? '   (사전이 적은 짝이다. 더 나은 한자어가 있으면 그것을 쓴다)' : ''));
    }
  }
  /* 못 읽은 것도 빨강이다 — 「못 쟀다」를 「깨끗하다」로 읽지 않는다 */
  process.exit(걸린파일.length || 못읽은것.length ? 1 : 0);
}

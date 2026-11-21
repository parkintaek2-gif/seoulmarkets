#!/usr/bin/env node
/**
 * collect-dart-segments.mjs — **한국 상장기업 «사업부문별» 정보를 받는다.**
 *
 * ── 🔴 왜 만드나 (2026-09-28) ─────────────────────────────────────────
 * 사장님이 한경에이셀(한국경제신문 계열)을 보라 하셨고, 그쪽이 파는 68개 가운데
 * 「한국 상장 기업 사업부문별 손익」이 있었다. 사장님: 「네가 판단한대로 잘 만들어봐」
 *
 * ⭐ 이것을 고른 까닭 셋 —
 *   ① 우물이 이미 우리 손에 있다. DART 를 이미 긁고 있다
 *   ② 우리 주력(영어판 FnGuide)에 바로 붙는다
 *   ③ 한 회사를 사업부문으로 쪼개 «영문»으로 내는 곳이 없다 — 남이 안 센 것을 센다
 *
 * ── ⚠ 어디에 있나 (짐작하지 않고 재서 알아냈다) ──────────────────────
 *   fnlttSinglAcntAll(전체 재무제표)   계정 229개 중 «부문»이 든 것 0개 — 이 길로는 못 얻는다
 *   사업보고서 주요정보 창구들          부문 관련 없음
 *   ✅ 공시서류 «원문»(document.xml)   zip 안에 6.3MB 본문. 「보고부문」 15번·「부문별」 20번
 *      삼성전자 2024 사업보고서에서 DX·DS·SDC·Harman 이 그대로 나온다
 *
 * ── 무엇을 내나 ───────────────────────────────────────────────────────
 *   ① 회사가 «어떤 부문으로 나뉘나» (부문 이름 · 주요 제품)
 *   ② 부문별 표가 있는 자리와 그 표 글자
 *   ⛔ 수를 «지어내지» 않는다. 표 꼴이 회사마다 달라 못 뽑은 것은 「못 뽑았다」고 적는다.
 *     맞는지 모르는 수로 확신을 만드는 것은 우리 강령에 어긋난다.
 *
 * ── ⚠ 지키는 것 ──────────────────────────────────────────────────────
 * ⛔ DART_API_KEY 는 공용이고 하루 한도가 있다 — 한 번에 다 받지 않는다(--몇개 로 끊는다)
 * ⛔ 열쇠를 화면·로그에 찍지 않는다
 * ⚠ 원문은 한 회사에 600KB~1MB 다. 받은 zip 은 지우고 «뽑은 것»만 남긴다
 *
 * 쓰는 법
 *   node scripts/collect-dart-segments.mjs --재본다              한 회사로 무엇이 뽑히나 본다
 *   node scripts/collect-dart-segments.mjs --해 2025 --몇개 20 --적는다
 *   node scripts/collect-dart-segments.mjs --자가시험
 */
import { 시가총액표 } from './시가총액읽기.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 낼곳 = path.join(뿌리, 'archive', 'raw', 'dart-segments');

/* ── 판정하는 부분은 따로 뺀다 — 인터넷 없이 시험할 수 있어야 한다 ───── */

/** 본문에서 태그를 걷어 읽을 수 있는 글로 만든다 */
export function 글로만들기(s) {
  return String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 「부문」이 실제로 있는 문서인가 — 없는 회사도 많다(단일 부문) */
export function 부문이있나(글) {
  const s = String(글 ?? '');
  return /보고부문|영업부문|부문별/.test(s);
}

/**
 * 부문 이름을 뽑는다.
 * ⚠ 「DX 부문」·「반도체부문」처럼 «앞말 + 부문» 꼴을 집는다.
 * ⛔ 「각 부문별」·「부문 정보」처럼 이름이 아닌 것은 거른다.
 *
 * 🔴 [2026-09-28 실측] 삼성전자 원문으로 처음 돌렸더니 이름 자리에
 *   「매출실적은」·「경영위원회는」·「하고」·「위하여」·「개」가 섞여 나왔다.
 *   까닭은 둘이다 —
 *     ① 「…매출실적은 «부문별»로」처럼 «부문별» 앞말을 이름으로 오인했다
 *        ⇒ 「부문」 뒤에 「별」이 오면 그 앞말은 이름이 아니다
 *     ② 조사·어미로 끝나는 말을 그대로 집었다 ⇒ 끝소리로 거른다
 *   ⛔ 이름 목록을 손으로 늘려 막지 않는다 — 회사마다 다른 말이 나오므로 끝이 없다.
 *     «꼴»로 거른다.
 */
export const 이름아닌것 = new Set(['각', '해당', '이', '그', '동', '본', '전', '위', '아래',
  '보고', '영업', '사업', '주요', '기타', '개', '가지', '단일', '연결', '해외', '국내',
  /* 🔴 [2026-09-28] 상장사 8곳으로 처음 돌려서 «실제로» 이름 자리에 나온 일반어들이다.
     「관련」·「재무」·「발생」·「수익」·「및」·「총」 — 회사 부문이 아니라 문장 조각이다 */
  '관련', '재무', '발생', '수익', '매출', '자산', '부채', '손익', '이익', '비용',
  '구분', '합계', '내용', '현황', '정보', '요약', '별도', '전체', '당사', '회사',
  '지배', '종속', '제품', '지역', '국가', '부문', '단일영업', '경우', '다음', '상기',
  '당기', '전기', '최근', '이상', '이하', '또는', '그리고']);
/** 조사·어미로 끝나면 이름이 아니다 (「…매출실적은」·「하고」·「위하여」)
 *  ⛔ 「이」를 여기 넣었다가 «디스플레이»가 통째로 걸렸다 — 자가시험이 그 자리에서 잡았다.
 *    조사 하나를 막으려다 진짜 부문 이름을 잃으면 잘못 막은 것이다. */
export const 이름끝이아닌것 = /(은|는|가|을|를|에|의|도|와|과|로|으로|고|여|며|서|만|까지|부터|보다)$/;
/**
 * 🔴 [2026-09-28 실측] 상한이 12 였다. 그랬더니 부문을 많이 쪼개는 회사가 «전부 12»로 나왔다 —
 *   KB금융도 12, 삼성물산도 12, 두산에너빌리티도 12. 그것은 그 회사의 수가 아니라 «내 자»의 수다.
 *   ⛔ 우리 자에 걸린 값을 사실처럼 내지 않는다. 지면에 「12개 부문」이라 적으면 거짓을 파는 것이다.
 *   ⇒ 상한을 40 으로 올리고, 그래도 잘리면 부르는 쪽이 알 수 있게 «잘렸다»를 함께 돌려준다.
 */
export function 부문이름뽑기(글, 최대 = 40) {
  const s = String(글 ?? '');
  const 나온것 = new Map();
  /* ⚠ 「부문별」은 세지 않는다 — 그 앞말은 이름이 아니다 */
  for (const m of s.matchAll(/([A-Za-z가-힣][A-Za-z가-힣0-9·\-]{0,14}?)\s*부문(?!별)/g)) {
    const 이름 = m[1].trim();
    if (!이름 || 이름.length < 1) continue;
    if (이름아닌것.has(이름)) continue;
    if (/^\d+$/.test(이름)) continue;
    /* ⛔ 한글 «한 글자»는 이름이 아니다 — 「및 부문」·「총 부문」이 실측으로 나왔다.
       영문은 두 글자도 진짜 이름이라(DX·DS) 이 잣대를 안 댄다 */
    if (/^[가-힣]$/.test(이름)) continue;
    /* 영문·숫자만인 이름(DX·DS·Harman)은 우리말 끝소리 잣대를 대지 않는다 */
    if (/[가-힣]/.test(이름) && 이름끝이아닌것.test(이름)) continue;
    나온것.set(이름, (나온것.get(이름) ?? 0) + 1);
  }
  /* 자주 나온 차례로 — 한 번만 스친 말은 이름이 아닐 때가 많다 */
  const 걸러진것 = [...나온것.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);
  const 낸것 = 걸러진것.slice(0, 최대).map(([이름, 몇번]) => ({ 이름, 몇번 }));
  /* ⭐ 상한에 걸렸으면 «걸렸다»고 알린다. 안 알리면 부르는 쪽이 그 수를 사실로 읽는다 */
  낸것.잘렸나 = 걸러진것.length > 최대;
  낸것.본디몇개 = 걸러진것.length;
  return 낸것;
}

/**
 * 「우리는 부문이 하나다」라고 «적어 둔» 회사인가.
 * ⭐ 이것은 «못 뽑은 것»이 아니라 «뽑은 사실»이다. 둘을 섞지 않는다 —
 *   부문이 하나인 것과 우리가 이름을 못 집은 것은 전혀 다른 말이다.
 */
export function 단일보고부문인가(글) {
  return /단일\s*(의)?\s*(영업|보고)?\s*부문|하나의\s*(영업|보고)?\s*부문|부문이\s*하나/.test(String(글 ?? ''));
}

/** 부문별 표로 보이는 대목을 잘라 온다 */
export function 부문대목뽑기(글, 길이 = 1200) {
  const s = String(글 ?? '');
  const i = s.search(/부문별\s*(요약)?\s*(재무|손익|영업|매출)|보고부문|영업부문/);
  if (i < 0) return null;
  return s.slice(Math.max(0, i - 150), i + 길이).trim();
}

/** 한 회사에서 뽑은 것을 한 줄로 갠다 */
export function 갠다({ 고유번호, 이름, 접수번호, 해, 글 }) {
  const 본문 = 글로만들기(글);
  const 있나 = 부문이있나(본문);
  const 하나뿐인가 = 있나 && 단일보고부문인가(본문);
  const 이름들 = 있나 ? 부문이름뽑기(본문) : [];
  return {
    고유번호, 이름, 접수번호, 해,
    부문있나: 있나,
    단일보고부문이라적었나: 하나뿐인가,
    /* ⚠ 이것은 «확정된 부문 이름»이 아니라 글에서 집어 올린 «후보»다.
       그렇게 이름 붙여 두지 않으면 다음 사람이 확정으로 읽는다 */
    부문들: 이름들,
    이름뽑았나: 이름들.length > 0,
    /* ⛔ 우리 자에 걸려 잘린 수를 사실처럼 내지 않는다 — 부르는 쪽이 「12+」로 적을 수 있게 */
    이름잘렸나: !!이름들.잘렸나,
    대목: 있나 ? 부문대목뽑기(본문) : null,
    /* ⛔ 수는 아직 안 뽑는다. 못 뽑은 것을 「0」으로 적지 않는다 */
    수뽑았나: false,
    못뽑은까닭: !있나 ? '이 회사는 부문을 나눠 적지 않는다'
      : 하나뿐인가 ? '보고부문이 하나라고 회사가 스스로 적었다 — 회계 기준상 하나일 뿐, 제품군은 여럿일 수 있다'
      : '표 꼴이 회사마다 달라 아직 수는 안 뽑는다',
  };
}

/* ── 받아 오는 부분 ───────────────────────────────────────────────── */
function 열쇠() {
  try {
    const m = fs.readFileSync(path.join(뿌리, '.env'), 'utf8').match(/^DART_API_KEY=(.*)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  } catch (e) { return null; }
}

/** DART 원문 zip 을 받아 본문 xml 을 글로 돌려준다.
 *  ⚠ [2026-09-28] 처음에 `tar -xf` 로 풀려다 실패했다 — Git Bash 의 tar 는 zip 을 못 푼다.
 *    윈도 PowerShell 의 Expand-Archive 로 푼다(실측으로 풀린 길이다).
 *    ⛔ 새 라이브러리를 깔지 않는다 — 윈도에 이미 있는 것으로 푼다. */
async function 원문받기(KEY, 접수번호) {
  const r = await fetch(`https://opendart.fss.or.kr/api/document.xml?crtfc_key=${KEY}&rcept_no=${접수번호}`);
  if (!r.ok) return { 왜: `원문 ${r.status}` };
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.slice(0, 2).toString() !== 'PK') return { 왜: 'zip 이 아니다' };

  const 임시 = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-seg-'));
  try {
    const zip길 = path.join(임시, 'doc.zip');
    fs.writeFileSync(zip길, buf);
    const 푼곳 = path.join(임시, 'out');
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -LiteralPath '${zip길}' -DestinationPath '${푼곳}' -Force`], { stdio: 'ignore' });
    const 것들 = fs.readdirSync(푼곳).filter((f) => f.endsWith('.xml'))
      .map((f) => ({ f, 크기: fs.statSync(path.join(푼곳, f)).size }))
      .sort((a, b) => b.크기 - a.크기);
    if (!것들.length) return { 왜: 'xml 이 없다' };
    const 날것 = fs.readFileSync(path.join(푼곳, 것들[0].f));
    let 글 = 날것.toString('utf8');
    if (!/[가-힣]/.test(글.slice(0, 20000))) 글 = new TextDecoder('euc-kr').decode(날것);
    return { 글, 크기: 날것.length };
  } catch (e) {
    return { 왜: String(e.message).slice(0, 80) };
  } finally {
    try { fs.rmSync(임시, { recursive: true, force: true }); } catch (e) {}
  }
}

/** 그 해 사업보고서의 접수번호를 찾는다 */
async function 접수번호찾기(KEY, 고유번호, 해) {
  const r = await fetch(`https://opendart.fss.or.kr/api/list.json?crtfc_key=${KEY}&corp_code=${고유번호}`
    + `&bgn_de=${해}0101&end_de=${해}1231&pblntf_detail_ty=A001&page_count=10`);
  const j = await r.json().catch(() => ({}));
  if (j.status !== '000' || !j.list?.length) return null;
  const 것 = j.list.find((x) => /사업보고서/.test(x.report_nm || ''));
  return 것 ? { 접수번호: 것.rcept_no, 이름: 것.corp_name, 낸날: 것.rcept_dt } : null;
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참, 덧 = '') => 것.push({ 이름, 참: !!참, 덧 });

  본다('태그를 걷어낸다', 글로만들기('<p>가 <b>나</b></p>') === '가 나');
  본다('⛔ 빈 것에 안 터진다', 글로만들기(null) === '' && 부문이있나(null) === false);

  const 삼성 = '각 부문별 주요 제품은 다음과 같습니다. DX 부문 TV, 모니터 DS 부문 DRAM, NAND '
    + '보고부문 DX 부문 DS 부문 SDC Harman 매출액 영업이익 DX 부문 매출 1,000 DS 부문 매출 2,000';
  본다('🔴 부문이 있는 글을 알아본다', 부문이있나(삼성) === true);
  const 이름들 = 부문이름뽑기(삼성).map((x) => x.이름);
  본다('🔴 실제 부문 이름을 뽑는다 (DX·DS)', 이름들.includes('DX') && 이름들.includes('DS'), 이름들.join(','));
  본다('⛔ 「각」·「보고」 같은 말을 이름으로 집지 않는다',
    !이름들.includes('각') && !이름들.includes('보고'), 이름들.join(','));
  본다('⛔ 한 번만 스친 말은 이름이 아니다',
    !부문이름뽑기('어쩌다 한번나온 부문 이야기').map((x) => x.이름).includes('한번나온'));

  /* 🔴 아래 넷은 «삼성전자 원문을 실제로 돌려서» 나온 쓰레기다. 시험으로 굳힌다 */
  const 실제쓰레기 = '매출실적은 부문별로 다음과 같습니다. 매출실적은 부문별 현황입니다. '
    + '경영위원회는 부문별로 둡니다. 경영위원회는 부문별 심의를 합니다. '
    + '생산하고 부문별 판매를 하고 부문별로 나눕니다. '
    + '위하여 부문별 관리를 하고 위하여 부문별로 봅니다. 4개 부문 5개 부문';
  const 쓰레기뽑힘 = 부문이름뽑기(실제쓰레기).map((x) => x.이름);
  본다('🔴 「…부문별」 앞말을 이름으로 집지 않는다 (실측: 매출실적은·경영위원회는)',
    !쓰레기뽑힘.includes('매출실적은') && !쓰레기뽑힘.includes('경영위원회는'), 쓰레기뽑힘.join(',') || '없음');
  본다('🔴 조사·어미로 끝나는 말은 이름이 아니다 (실측: 하고·위하여)',
    !쓰레기뽑힘.includes('하고') && !쓰레기뽑힘.includes('위하여'), 쓰레기뽑힘.join(',') || '없음');
  본다('⛔ 「개」 같은 셈 단위를 이름으로 집지 않는다', !쓰레기뽑힘.includes('개'));
  본다('⚠ 그래도 영문 이름은 살아남는다 (Harman 은 끝소리 잣대를 안 댄다)',
    부문이름뽑기('Harman 부문 매출. Harman 부문 이익.').map((x) => x.이름).includes('Harman'));
  본다('⚠ 「반도체」·「디스플레이」처럼 멀쩡한 우리말 이름은 살아남는다',
    (() => { const n = 부문이름뽑기('반도체 부문 매출. 반도체 부문 이익. 디스플레이 부문 매출. 디스플레이 부문 이익.')
      .map((x) => x.이름); return n.includes('반도체') && n.includes('디스플레이'); })());

  /* 🔴 실측 — 상한이 12 였을 때 부문 많은 회사가 «전부 12»로 나왔다. 내 자의 수였다. */
  const 많은글 = Array.from({ length: 20 }, (_, i) => `사업${i}부문 매출. 사업${i}부문 이익.`).join(' ');
  const 다섯만 = 부문이름뽑기(많은글, 5);
  본다('🔴 상한에 걸리면 «걸렸다»고 알린다 — 그 수를 사실로 읽지 않게',
    다섯만.length === 5 && 다섯만.잘렸나 === true && 다섯만.본디몇개 === 20);
  본다('상한에 안 걸리면 잘렸다고 하지 않는다',
    부문이름뽑기(많은글, 40).잘렸나 === false);
  본다('🔴 갠 결과에도 «잘렸나»가 실린다',
    갠다({ 고유번호: 'z', 이름: '많은회사', 해: '2025', 글: '보고부문 ' + 많은글 }).이름잘렸나 === false);

  본다('⛔ 한글 한 글자는 이름이 아니다 (실측: 「및 부문」·「총 부문」)',
    !부문이름뽑기('및 부문 및 부문 총 부문 총 부문').map((x) => x.이름).some((n) => /^[가-힣]$/.test(n)));
  본다('⛔ 「관련」·「재무」 같은 일반어를 이름으로 집지 않는다 (실측)',
    !부문이름뽑기('관련 부문 관련 부문 재무 부문 재무 부문').map((x) => x.이름).length);

  본다('🔴 「단일 영업부문」을 알아본다', 단일보고부문인가('당사는 단일 영업부문으로 구성되어 있습니다') === true);
  본다('⛔ 부문이 여럿인 글을 단일이라 하지 않는다', 단일보고부문인가(삼성) === false);
  const g3 = 갠다({ 고유번호: 'y', 이름: '한부문회사', 해: '2025',
    글: '당사는 단일 영업부문이며 보고부문은 하나입니다. 보고부문 매출액.' });
  본다('🔴 단일부문은 «못 뽑은 것»이 아니라 «뽑은 사실»로 적는다',
    g3.단일보고부문이라적었나 === true && /하나라고 회사가 스스로 적었다/.test(g3.못뽑은까닭));

  본다('부문 대목을 잘라 온다', (부문대목뽑기(삼성) || '').includes('보고부문'));
  본다('⛔ 부문이 없으면 대목도 없다', 부문대목뽑기('부문 이야기가 없는 글') === null);

  const g = 갠다({ 고유번호: '00126380', 이름: '삼성전자', 접수번호: '2025…', 해: '2025', 글: 삼성 });
  본다('갠 것에 부문들이 담긴다', g.부문있나 === true && g.부문들.length >= 2);
  본다('🔴 수를 못 뽑았으면 «못 뽑았다»고 적는다 — ',
    g.수뽑았나 === false && !!g.못뽑은까닭);
  const g2 = 갠다({ 고유번호: 'x', 이름: '단일부문회사', 해: '2025', 글: '우리는 한 가지 일만 합니다' });
  본다('⛔ 부문이 없는 회사를 «있다»고 하지 않는다', g2.부문있나 === false && g2.부문들.length === 0);
  본다('그 까닭도 적는다', /나눠 적지 않는다/.test(g2.못뽑은까닭));

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ collect-dart-segments 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}${x.덧 ? `  (${x.덧})` : ''}`);
  return 빨강.length === 0;
}

/* ── 진입점 ───────────────────────────────────────────────────────── */
const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  const 인자 = process.argv.slice(2);
  const 값 = (이름, 기본) => { const i = 인자.indexOf(이름); return i >= 0 ? 인자[i + 1] : 기본; };

  if (인자.includes('--자가시험') || 인자.includes('--selftest')) {
    process.exit(자가시험() ? 0 : 1);
  }

  const KEY = 열쇠();
  if (!KEY) { console.error('🔴 DART_API_KEY 를 못 찾았다'); process.exit(1); }
  const 해 = 값('--해', '2025');

  if (인자.includes('--재본다')) {
    /* 삼성전자 하나로 무엇이 뽑히는지 본다 */
    const 찾은것 = await 접수번호찾기(KEY, '00126380', 해);
    if (!찾은것) { console.error('🔴 그 해 사업보고서를 못 찾았다'); process.exit(1); }
    console.log(`■ ${찾은것.이름} ${해} 사업보고서 (${찾은것.낸날})`);
    const 원문 = await 원문받기(KEY, 찾은것.접수번호);
    if (원문.왜) { console.error(`🔴 원문을 못 받았다 — ${원문.왜}`); process.exit(1); }
    console.log(`   원문 ${원문.크기.toLocaleString()}바이트`);
    const g = 갠다({ 고유번호: '00126380', 이름: 찾은것.이름, 접수번호: 찾은것.접수번호, 해, 글: 원문.글 });
    console.log(`   부문 있나 ${g.부문있나}`);
    console.log(`   부문들 ${g.부문들.map((x) => `${x.이름}(${x.몇번})`).join(' · ') || '(없음)'}`);
    console.log(`   수 뽑았나 ${g.수뽑았나} — ${g.못뽑은까닭}`);
    if (g.대목) console.log(`\n   ── 부문 대목 앞 400자 ──\n   ${g.대목.slice(0, 400)}`);
    process.exit(0);
  }

  if (인자.includes('--적는다')) {
    const 몇개 = Number(값('--몇개', '20'));
    const 시장들 = String(값('--시장', 'Y,K')).split(',').map((s) => s.trim());

    /* 회사 목록 — 상장사만 (Y 유가증권 · K 코스닥) */
    const 목록길 = path.join(뿌리, 'archive', 'raw', 'dart-company', 'company.ndjson');
    if (!fs.existsSync(목록길)) { console.error('🔴 회사목록이 없다 — npm run collect:company 먼저'); process.exit(1); }
    let 회사들 = fs.readFileSync(목록길, 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch (e) { return null; } })
      .filter((x) => x && 시장들.includes(x.시장) && x.corp);

    /* ⭐ 시가총액이 큰 회사부터 받는다.
       * 회사목록 차례대로 받으면 아무도 안 찾는 회사부터 채워져 상품이 늦게 선다.
       ⚠ 시총을 못 찾은 회사는 «버리지 않고» 뒤로 보낸다 — 못 쟀다고 빼면 자료가 준다 */
    /* 🔴 [2026-10-06 · 사장님] 「우회적으로 받지 않았나?」 — 여기도 archive/raw/krx 였다.
       포털 판(archive/raw/stocks)에 시가총액이 이미 있다. 같은 자로 읽는다. */
    const { 표: 시총, 못읽음: 시총못읽음 } = 시가총액표();
    if (시총못읽음) console.log(`   ⚠ 시가총액을 못 읽었다 — ${시총못읽음}. 목록 차례로 받는다`);
    if (시총.size) {
      회사들 = 회사들.slice().sort((a, b) => (시총.get(b.종목) ?? -1) - (시총.get(a.종목) ?? -1));
      const 붙은것 = 회사들.filter((x) => 시총.has(x.종목)).length;
      console.log(`   시가총액 큰 차례로 세웠다 — ${붙은것}/${회사들.length}곳에 시총이 붙었다`);
    }

    /* 이미 받은 것은 건너뛴다 — 하루 한도가 있어 이어받기가 중요하다.
     * 🔴 [2026-09-28] `--다시 <수>` 를 붙이면 «부문 이름이 그 수 이상 뽑힌 회사»만 다시 받는다.
     *   까닭 — 옛 상한이 12 였던 판으로 받은 줄은 부문 많은 회사가 전부 12 로 잘려 있다.
     *   그 수를 지면에 내면 우리 자의 수를 회사의 수라고 파는 것이 된다.
     *   ⛔ 전부 다시 받지 않는다. 걸린 것만 다시 받는다 — DART 한도는 공용이다. */
    fs.mkdirSync(낼곳, { recursive: true });
    const 낼길 = path.join(낼곳, `segments-${해}.ndjson`);
    const 다시자리 = 인자.indexOf('--다시');
    const 다시문턱 = 다시자리 >= 0 ? Number(인자[다시자리 + 1]) : null;
    const 이미 = new Set();
    const 살릴줄 = [];
    if (fs.existsSync(낼길)) {
      for (const l of fs.readFileSync(낼길, 'utf8').split('\n')) {
        if (!l.trim()) continue;
        let j; try { j = JSON.parse(l); } catch (e) { continue; }
        const 다시받나 = Number.isFinite(다시문턱) && j.받았나 && (j.부문들 ?? []).length >= 다시문턱;
        if (다시받나) continue;          /* 건너뛸 목록에 안 넣는다 = 다시 받는다 */
        이미.add(j.고유번호);
        살릴줄.push(l);
      }
      if (Number.isFinite(다시문턱)) {
        const 뺀수 = fs.readFileSync(낼길, 'utf8').split('\n').filter((x) => x.trim()).length - 살릴줄.length;
        /* ⛔ 옛 줄을 지우기 «전»에 살릴 것을 다 읽었다. 순서를 바꾸면 자료를 잃는다 */
        fs.writeFileSync(낼길, 살릴줄.length ? 살릴줄.join('\n') + '\n' : '');
        console.log(`   ⚠ 부문 이름 ${다시문턱}개 이상인 ${뺀수}곳을 «다시» 받는다 (옛 상한에 잘린 줄)`);
      }
    }
    const 할것 = 회사들.filter((x) => !이미.has(x.corp)).slice(0, 몇개);
    console.log(`■ 사업부문 수집 ${해} — 상장사 ${회사들.length}곳 · 이미 ${이미.size}곳 · 이번에 ${할것.length}곳`);
    if (!할것.length) { console.log('   더 받을 것이 없다'); process.exit(0); }

    let 부문있음 = 0, 부문없음 = 0, 못받음 = 0;
    for (const [i, 회사] of 할것.entries()) {
      const 앞 = `   ${String(i + 1).padStart(3)}/${할것.length} ${(회사.이름 || '').slice(0, 14).padEnd(14)}`;
      const 찾은것 = await 접수번호찾기(KEY, 회사.corp, 해);
      if (!찾은것) {
        console.log(`${앞} — 그 해 사업보고서 없음`);
        /* ⛔ 「없다」를 「부문이 없다」로 적지 않는다. 못 받은 것은 못 받았다고 적는다 */
        fs.appendFileSync(낼길, JSON.stringify({
          고유번호: 회사.corp, 종목: 회사.종목, 이름: 회사.이름, 영문: 회사.영문, 해,
          받았나: false, 못받은까닭: '그 해 사업보고서를 못 찾았다',
        }) + '\n');
        못받음 += 1;
        continue;
      }
      const 원문 = await 원문받기(KEY, 찾은것.접수번호);
      if (원문.왜) {
        console.log(`${앞} — 🔴 원문 ${원문.왜}`);
        fs.appendFileSync(낼길, JSON.stringify({
          고유번호: 회사.corp, 종목: 회사.종목, 이름: 회사.이름, 영문: 회사.영문, 해,
          접수번호: 찾은것.접수번호, 받았나: false, 못받은까닭: `원문을 못 받았다 — ${원문.왜}`,
        }) + '\n');
        못받음 += 1;
        continue;
      }
      const g = 갠다({ 고유번호: 회사.corp, 이름: 회사.이름, 접수번호: 찾은것.접수번호, 해, 글: 원문.글 });
      const 줄 = {
        ...g, 종목: 회사.종목, 영문: 회사.영문, 시장: 회사.시장, 업종명: 회사.업종명,
        낸날: 찾은것.낸날, 원문크기: 원문.크기, 받았나: true, 받은때: new Date().toLocaleString('ko-KR'),
      };
      fs.appendFileSync(낼길, JSON.stringify(줄) + '\n');
      if (g.부문있나) {
        부문있음 += 1;
        const 꼬리 = g.단일보고부문이라적었나 ? '단일 영업부문(회사가 그렇게 적었다)'
          : g.부문들.map((x) => x.이름).slice(0, 6).join('·') || '(이름 못 뽑음)';
        console.log(`${앞} ✅ ${꼬리}`);
      }
      else { 부문없음 += 1; console.log(`${앞} — 부문을 나눠 적지 않는다`); }
      await new Promise((r) => setTimeout(r, 400));   /* ⚠ 우물을 두드리는 사이를 둔다 */
    }
    console.log(`\n■ 끝 — 부문 있음 ${부문있음} · 없음 ${부문없음} · 못 받음 ${못받음}`);
    console.log(`   ${path.relative(뿌리, 낼길)}`);
    process.exit(0);
  }

  console.log('⛔ --재본다 · --적는다 · --자가시험 가운데 하나를 붙인다. 맨몸으로는 아무것도 하지 않는다.');
}

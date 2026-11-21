#!/usr/bin/env node
/**
 * report-unit-content-check.mjs — **매일 22시 · 전 유닛 점검 보고.**
 *
 * 🔴 [2026-09-29 · 사장님] 「**23시 업무보고를 22시로 조정할 것**」
 *   ⇒ 23시 → 22시. 재료 만들기(정기업무-예약)도 22:50 → 21:50 으로 함께 당겼다.
 *   ⚠ 아래 2026-09-03 지시 원문의 「23시」는 «그때 하신 말씀»이라 그대로 둔다 —
 *     원문을 고치면 무엇이 바뀌었는지 알 길이 없어진다. 바뀐 것은 이 머리글이 말한다.
 *
 * ── 🔴 왜 있나 (2026-09-03) ─────────────────────────────────
 * 사장님 지시 원문:
 * > 「매일 23시에 공격형(이슈화, 이슈를 만드는), seo, geo 맞춤형 콘텐트 생산 여부,
 * >  외부 반응 등에 대한 보고를 해라. **전 유닛 꺼 네가 체크한 결과를 토대로**
 * >  업무보고(**이메일 전송 포함**)해」
 *
 * 같은 날 사장님이 먼저 물으신 것 — 「각 유닛들이 공격적인 콘테트 생산 열심히 하고 있는 지도
 * 체크해」 · 「텍스트, 영상 등 seo, geo에 맞춤형으로」 · 「오늘 말고 어제 꺼 봐」.
 * 그래서 이 자는 **어제(완결된 하루)**를 센다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ **커밋 수를 콘텐트 수라고 부르지 않는다.** 2026-09-03 에 재 보니 한 유닛은 55커밋에
 *   발행 0편, 다른 유닛은 124커밋에 발행 4편이었다. 커밋만 세면 일한 것처럼 보인다.
 *   그래서 둘을 **나란히** 낸다.
 * ⛔ **못 잰 것은 「못 쟀다」로 낸다.** 
 * ⛔ 「공격형」을 우리가 판정했다고 말하지 않는다. 자동으로 가를 수 있는 것은 **대리 지표**뿐이고,
 *   그 규칙을 지면에 그대로 적는다. 읽는 사람이 규칙을 보고 스스로 깎아 읽을 수 있어야 한다.
 * ⛔ `--보낸다` 없이는 메일이 한 통도 안 나간다.
 *
 * 쓰는 법
 *   node scripts/report-unit-content-check.mjs --자가시험
 *   node scripts/report-unit-content-check.mjs                     보고서만 만든다
 *   node scripts/report-unit-content-check.mjs --받는곳=a@b.com --보낸다
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LF = String.fromCharCode(10);

/* ── 유닛과 사이트 — 한 곳에서만 정한다 ──
 *
 * 🔴🔴 [2026-09-18 · 사장님] 「**내일부터 1, 2, 5번 세션만 보고해라**」
 *   보고에 담는 자리를 셋으로 좁혔다. 3번·4번·6번은 뺀다.
 *   ⛔ 「보고에서 빼는 것」과 「일을 접는 것」은 다르다 — 그 유닛들의 일은 그대로 돈다.
 *
 * 🔴🔴 그리고 이 목록이 **자리가 바뀐 것을 두 주 가까이 안 따라갔다.**
 *   2026-09-12 업무분장에서 사장님이 옮기셨다 —
 *     「u1에게 케이컬쳐를 맡기고, U2에게 케이라이프맵을 맡겨라」
 *   그런데 여기는 1번=KLifeMap · 5번=K Culture Wire 인 옛 배정 그대로였다.
 *   ⇒ 어제 보고에 **「5번이 6편 냈다」**고 나갔지만 그 6편은 «1번(KCW)» 것이었다.
 *     사장님께 유닛별 실적이 **뒤바뀐 채** 올라가고 있었다.
 *   ⭐ 자리를 옮기면 그 자리를 «보는 자»까지 따라가 고친다. 문서만 고치면 자가 옛말을 한다.
 */
export const 유닛들 = [
  /* 🔴🔴 [2026-09-18 밤 · 사장님] 「**2번은 그럼 놀잖아. 그리고 GEO,SEO 맞춤 페이지는
   *   어떡하려고?**」 → 「**2번한테 케이라이프맵 콘텐트 발행, s마켓츠 개발 업무 분담시켜라.
   *   1번한테 나머지 사이트 콘텐트를 다 만들라고 해라. 당분간 에스마켓츠 개발 완료될
   *   때까지 이렇게 해라**」
   *   ⛔ 내가 2번 칸을 「그 몫이 없는 유닛」으로 비워 두었더니 사장님이 노는 자리로
   *     읽으셨다. 재는 칸이 비면 그 자리는 노는 자리가 된다.
   *   ⇒ 2번에게 KLifeMap 콘텐트 발행 몫을 준다. 1번은 «나머지 사이트 전부»를 낸다. */
  /* 🔴 [2026-09-19 · 사장님] 「**1번한테 모든 사이트의 콘텐트를 만들라고 지시했다.
     총 24개, 매일**」 ⇒ 네 사이트 × 6편. KLifeMap 이 2번에서 1번으로 옮겨졌다.
     ⚠ KLifeMap 은 형제 저장소에 있어 여기서 경로로 못 센다. 사이트 수만 더해
       몫을 24로 잡고, 실제 편수는 그 저장소를 보는 2번 줄에서 센다.
       ⛔ 못 세는 것을 0 으로 적지 않는다 — 몫과 실적을 갈라 둔다. */
  { 번호: '1번', 이름: '모든 사이트 콘텐트', 도메인: 'www.kculturewire.com',
    콘텐트: ['content/kculturewire', 'content/articles'],
    아스트로지면: ['src/pages/100y'],
    맡은사이트수: 4,
    영상: ['public/wikitip/video', 'public/video', 'public/100y/video'],
    카드: ['public/wikitip/cardnews', 'archive/social', 'public/cardnews', 'public/100y/cardnews'] },
  /* KLifeMap 지면은 마크다운이 아니라 .html 이라 「지면」으로 센다. content/ 는 감명
     지면이 링크로 거는 글 자리다(klifemap.ai/content/…) — 거기 새로 들어온 글도 함께 센다. */
  /* 영상은 public/media/<갈래>/<번호>_제목/영상/*.mp4 에, 카드는 그 옆 카드/ 와
     public/cardnews 에 쌓인다(2026-09-19 에 폴더를 열어 보고 확인했다).
     ⛔ 없는 폴더를 적으면 무엇을 만들든 0 으로 나온다 — 이 파일이 세 번 겪은 병이다. */
  { 번호: '2번', 이름: 'KLifeMap · SeoulMarkets 개발', 도메인: 'klifemap.ai',
    콘텐트: [], 영상: [], 카드: [], 지면: [], 저장소: '../klifemap',
    대신몫: 'SeoulMarkets 개발 분담' },
  /* 🔴 2026-09-03 21:5x · 3번 — 콘텐트·카드 경로가 «존재하지 않는 자리»를 가리키고
   * 있었다. content/100yearmap 은 이 저장소에 없다(3번 지면은 Astro다, 마크다운이
   * 아니다) · public/100y/card 도 없다(실제는 public/100y/cardnews). 그 결과 09-02에
   * 실제로 새 지면 3장을 냈는데도(divorce-age·wage-distribution·tutoring-income,
   * curl 로 라이브 200 확인) 이 자는 «발행 0편»으로 셌다 — 없는 경로를 «세서 0건»과
   * 헷갈린 것이다(⛔ 이 파일 스스로 금지한 바로 그 것). 3번이 직접 고쳤다.
   * 콘텐트는 비워 두고(마크다운이 없으니) 아래 「아스트로지면」으로 따로 센다 —
   * klifemap(1번)이 «지면이 마크다운이 아니다」를 손댄 .html 로 대신 센 것과 같은 결. */
  /* 🔴 [2026-09-05 · 5번] **3번이 9/3 에 고친 것과 «똑같은 결함»이 5번·6번에 남아 있었다.**
   *   3번은 자기 줄(`public/100y/card` → `cardnews`)만 고치고 옆 두 줄을 안 봤다.
   *   그래서 오늘 내 카드가 세 벌 나갔는데 이 자는 «기타 0/1» 로 셌다. 재 보고 알았다 —
   *     public/wikitip/card        🔴 없는 폴더   → public/wikitip/cardnews  ✅ 1,439개
   *     public/card                🔴 없는 폴더   ┐ 6번 카드는 실제로
   *     public/seoulmarkets/card   🔴 없는 폴더   ┘ public/cardnews 에 쌓인다(자 10곳이 그리 쓴다)
   *   ⇒ **6번의 「기타」는 무엇을 만들든 늘 0 이었다.** 유닛 하나가 몇 주째 억울했을 수 있다.
   *
   * ⛔ 이것이 이 파일 스스로 금지한 「없는 경로를 세서 0건과 헷갈리는 것」이다.
   *   같은 결함이 세 줄에 있었는데 한 줄만 고쳐서 두 줄이 남았다 —
   *   **고쳤으면 그 결함 이름으로 저장소를 훑는다**(사장님 「하나를 고치면 인용한 곳까지 따라간다」).
   * ✅ 그래서 아래 `없는카드길()` 자가시험이 «세 유닛 전부»를 훑는다. 한 줄만 고치면 다시 걸린다.
   */
    /* 5번은 총괄이다 — 감수·개발이 몫이라 콘텐트 편수 몫이 없다. 그래도 표에는 둔다:
     빠뜨리면 사장님이 「5번은 왜 없나」를 물으시게 된다. */
  /* 5번의 몫은 편수가 아니라 SeoulMarkets 개발이다(사장님 2026-09-18
     「s마켓츠, 개발은 누가 하나? 5번 네 담당이지?」). 칸을 비워 두면 노는 자리로
     읽히므로, 무엇이 몫인지를 그 칸에 적는다. */
  { 번호: '5번', 이름: '총괄', 도메인: null, 콘텐트: [], 영상: [],
    대신몫: 'SeoulMarkets 개발 · 감수' },
];

/**
 * 🔴 «없는 폴더»를 가리키는 카드 경로를 찾아낸다. 있으면 그 유닛의 「기타」는
 *   무엇을 만들든 0 으로 나온다 — 그것이 2026-09-02(3번)·09-05(5번·6번)에 실제로 일어난 일이다.
 * ⚠ 「0건」과 「못 셌다」는 다르다. 이 자는 그 둘을 가르라고 있는 것인데,
 *   경로가 틀리면 자 스스로 그 둘을 섞는다.
 */
/**
 * 카드 파일 목록을 **「벌」로 묶는다.**
 *
 * 🔴 [2026-09-08 · 5번] 이 자가 카드를 «파일 수»로 셌다. 그런데 하루 몫은 «한 벌»이다
 *   (카드뉴스 한 편 = 정사각 열 장 + 세로 몇 장). 그래서 09-07 보고에 이렇게 나갔다 —
 *   ```
 *   5번 기타 200 / 1   ← 파일 200장. 실제로는 «20벌»이었다 (10배로 부푼 수)
 *   ```
 *   ⛔ 사장님께 가는 표에 10배 부푼 수를 실을 수 없다. 몫이 1인 칸에 200 이 뜨면
 *     그 칸 자체를 아무도 안 믿게 된다.
 *   ⚠ 보내기 «전»에 보고서를 눈으로 읽어서 잡았다. 파일 크기·종료코드로 판정하지 않았다.
 *
 * ⚠ 갈래마다 이름 꼴이 다르다. `-sq-3.png`·`-v-1.png` 꼴이면 그 앞을 벌 이름으로 삼고,
 *   그런 꼴이 아닌 것(archive/social 등)은 «파일 하나가 한 벌»로 둔다 — 묶을 근거가 없으니
 *   지어내지 않는다.
 */
export function 벌로묶기(파일들) {
  if (!Array.isArray(파일들)) return null;              // 못 읽었으면 null — 0 으로 안 채운다
  const 벌 = new Set();
  for (const f of 파일들) {
    const 이름 = String(f).split(/[\\/]/).pop();
    if (!이름) continue;
    벌.add(이름.replace(/-(sq|v)-\d+\.png$/i, ''));
  }
  return [...벌];
}

/**
 * PDF 쪽수를 «파일에서» 센다 — 표지 한 장짜리를 보내지 않기 위한 자.
 *
 * ⚠ 두 곳을 다 본다. `/Count n` 은 쪽나무 뿌리에 적힌 수이고, `/Type /Page` 는 실제 쪽
 *   객체다. 둘 중 «작은 쪽»을 쓴다 — 하나가 부풀려져 있어도 속지 않는다.
 * ⛔ 못 세면 0 이 아니라 **null** 이다. 「못 쟀다」로 막지 않는다 — 못 잰 하나가
 *   보낼 수 있는 백 개를 가리면 안 된다(강령 ③).
 */
/**
 * 워드(.docx) 안의 **진짜 표**가 몇 개인지 센다 — 첨부 관문의 자.
 *
 * 🔴 [2026-10-03] 첨부를 PDF 에서 워드로 바꾸자 `쪽수재기` 가 늘 null 을 돌려주어
 *   「표지 한 장짜리를 막는」 관문이 **죽은 채로 통과**하게 됐다.
 *   ⛔ 관문을 갈아끼울 때 «그 관문이 아직 무엇을 막고 있나»를 먼저 센다.
 *
 * docx 는 zip 이고 안의 `word/document.xml` 은 **deflate 로 눌려 있다.**
 * ⚠ 통째 바이트에서 `<w:tbl` 자국을 세려다 늘 0 이 나왔다 — 눌린 것은 안 보인다.
 *   그것을 「표가 없다」로 읽었으면 관문이 거꾸로 돌 뻔했다. 풀어서 센다.
 * 못 풀면 null 을 돌려준다. ⛔ (강령 ③).
 *
 * @returns {number|null} 표 개수, 못 쟀으면 null
 */
export function 워드표세기(길, 읽기 = fs.readFileSync) {
  let 통;
  try { 통 = 읽기(길); } catch { return null; }
  if (!Buffer.isBuffer(통) || 통.subarray(0, 2).toString('latin1') !== 'PK') return null;
  try {
    const 속 = 집에서글꺼내기(통, 'word/document.xml');
    if (속 === null) return null;
    return (속.match(/<w:tbl[ >]/g) || []).length;
  } catch { return null; }
}

/** zip 안의 한 파일을 글로 꺼낸다. 못 꺼내면 null */
export function 집에서글꺼내기(통, 이름) {
  /* 끝 쪽의 중앙 디렉터리를 쓰지 않고 지역 헤더를 훑는다 — 작은 파일이라 충분하다 */
  const 머리 = Buffer.from('PK\x03\x04', 'latin1');
  let i = 통.indexOf(머리, 0);
  while (i >= 0) {
    const 방식 = 통.readUInt16LE(i + 8);
    const 눌린크기 = 통.readUInt32LE(i + 18);
    const 이름길이 = 통.readUInt16LE(i + 26);
    const 더길이 = 통.readUInt16LE(i + 28);
    const 속이름 = 통.toString('utf8', i + 30, i + 30 + 이름길이);
    const 시작 = i + 30 + 이름길이 + 더길이;
    if (속이름 === 이름 && 눌린크기 > 0) {
      const 몸 = 통.subarray(시작, 시작 + 눌린크기);
      if (방식 === 0) return 몸.toString('utf8');
      if (방식 === 8) return zlib.inflateRawSync(몸).toString('utf8');
      return null;
    }
    i = 통.indexOf(머리, 시작 + Math.max(1, 눌린크기));
  }
  return null;
}

/**
 * 메일로 넘길 인자를 만든다. **떼어 낸 까닭은 «시험할 수 있게» 하기 위해서다.**
 *
 * 🔴🔴 [2026-10-03] 이 자리가 두 번 막혔고 둘 다 «조용히» 안 보내고 끝났다 —
 *   ① `--봤다` 를 send-mail 에 **안 넘겨** 첨부 관문이 늘 막았다.
 *      같은 날 16시 업무보고 자에서도 똑같은 결함을 고쳤다. 두 자가 같은 자리에서 걸렸다.
 *   ② `--글` 을 뿌리 기준 **상대 경로**로 넘겼는데, 원드라이브 사본은 뿌리 «밖»이라
 *      경로가 뿌리 위로 거슬러 올라가 send-mail 이 파일을 못 찾았다. 절대 경로로 넘긴다.
 *
 * ⚠ 둘 다 «보고가 안 나간다»로 끝나는 결함인데 화면에는 긴 오류 더미만 떴다.
 *   그래서 문장이 아니라 **검사**로 둔다 (강령 ④).
 */
export function 보낼인자만들기({ 받는곳, 날, 총편수, 총반응, 총만듦, md, 붙일것, 봤다 = false }) {
  const 인자 = ['scripts/send-mail.mjs', `--받는곳=${받는곳}`,
    `--제목=[전 유닛 점검] ${날} · 발행 ${총편수}편 · 이슈화 ${총반응} · 이슈생성 ${총만듦}`,
    `--글=${path.resolve(md)}`];
  if (붙일것) 인자.push(`--첨부=${붙일것}`);
  if (봤다) 인자.push('--봤다');
  인자.push('--보낸다');
  return 인자;
}

export function 쪽수재기(길, 읽기 = fs.readFileSync) {
  let 글;
  try { 글 = String(읽기(길, 'latin1')); } catch { return null; }
  if (!글.startsWith('%PDF')) return null;
  const 쪽객체 = (글.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const 셈들 = [...글.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1])).filter((n) => n > 0);
  const 후보 = [쪽객체, ...셈들].filter((n) => n > 0);
  return 후보.length ? Math.min(...후보) : null;
}

export function 없는카드길(뿌리, 있나 = fs.existsSync) {
  const 나쁜것 = [];
  for (const u of 유닛들) {
    for (const 길 of (u.카드 ?? [])) {
      if (!있나(path.join(뿌리, 길))) 나쁜것.push({ 유닛: u.번호, 길 });
    }
  }
  return 나쁜것;
}

/** 어제(KST). ⚠ 이 PC 가 이미 KST 다. toISOString 을 쓰지 않는다 */
export function 어제(오늘 = new Date()) {
  const d = new Date(오늘.getTime());
  d.setDate(d.getDate() - 1);
  const p = (n) => String(n).padStart(2, '0');
  return [d.getFullYear(), p(d.getMonth() + 1), p(d.getDate())].join('-');
}

/** 앞말(frontmatter)에서 한 칸 읽기. 없으면 null — 빈 문자열로 채우지 않는다 */
export function 앞말(글, 열쇠) {
  const 첫 = String(글 ?? '').split('---');
  if (첫.length < 3) return null;
  for (const l of 첫[1].split(LF)) {
    const i = l.indexOf(':');
    if (i < 0) continue;
    if (l.slice(0, i).trim() !== 열쇠) continue;
    let v = l.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    return v || null;
  }
  return null;
}

/** 두 날짜 사이 일수. 못 읽으면 null */
export function 날수(앞, 뒤) {
  const a = Date.parse(String(앞 ?? '').slice(0, 10));
  const b = Date.parse(String(뒤 ?? '').slice(0, 10));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

/**
 * 「공격형」 갈래 — 🔴 **2026-09-03 사장님이 기준을 직접 고치셨다.** 원문:
 * > 「**이슈메이킹 = 콘텐트의 제목 자체가 사람들에게 관심을 확 불러일으키는 지, 그래서**
 * >  **방문자 수가 평균보다 많은 지가 평가 기준.**
 * >  **이슈화 = 타 사이트의 콘텐트 발행 시간으로부터 12시간 이내 생산. 배포를 기준으로 바꿔**」
 *
 * 그래서 둘 다 바뀌었다.
 * ```
 * 옛  반응   자료 기준일이 «발행일»에서 7일 안
 * 새  반응   **«배포 시각»**이 바깥 자료 시각에서 **12시간** 안
 *
 * 옛  만듦   제목에 수가 있다            ← 셀 수는 있지만 «관심»과는 다른 것이었다
 * 새  만듦   1. **제목이 관심을 확 끄는가**(판단) **그리고**
 *            2. **그 지면의 방문이 우리 평균보다 많은가**(잰 수 — GA4 지면열림)
 * ```
 * ⛔ 1.은 «판단»이고 2.는 «잰 수»다. 섞어서 「측정했다」고 말하지 않는다.
 *   2.를 못 잰 지면(GA4 에 줄이 없는 것)은 **0 이 아니라 「못 쟀다」**로 둔다.
 *   자가 대신 판단해 주는 척하지 않는다 — 사장님이 표를 보고 뒤집으실 수 있어야 한다.
 */

/**
 * 표 칸에 들어갈 글로 다듬는다 — 세로막대는 표를 깨뜨린다.
 *
 * 🔴 첫 판이 **글자 s 를 통째로 지웠다** — 「repeats」가 「repeat」, 「Securities」가
 *   「Securitie」로 나갔다. 정규식을 넣다가 역슬래시가 먹혀 «공백»을 뜻하던 것이 «글자 s»가 됐다.
 *   사장님께 나갈 표에서 남의 회사 이름이 틀리는 자리다.
 * ⛔ 그래서 이 함수는 **정규식을 안 쓴다.** 글자 코드로 가른다.
 */
export function 칸글(t, 길이 = 96) {
  const 뭉갠 = [...String(t ?? '')]
    .map((c) => (c === '|' ? '/' : (c.charCodeAt(0) <= 32 ? ' ' : c)))
    .join('');
  const s = 뭉갠.split(' ').filter(Boolean).join(' ').trim();
  return s.length > 길이 ? s.slice(0, 길이 - 1) + '…' : s;
}

/** 두 시각 사이 시간(h). 못 읽으면 null */
export function 시간차(앞, 뒤) {
  const a = Date.parse(앞); const b = Date.parse(뒤);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / 3600000;
}

/**
 * 사장님 기준 — 🔴 **[2026-09-05] 12시간 → 6시간으로 줄었다.**
 *   원문: 「이슈화 12시간이 아닌 **6시간**으로 기준을 조정함」
 * ⚠ 이 수를 안 고쳤으면 «옛 기준으로 잰 수»를 사장님께 올릴 뻔했다.
 *   **지시가 바뀌면 그 지시를 «재는 자»도 같이 바뀌어야 한다.**
 * ⛔ 아래 자가시험이 이 수를 박아 두고 검사한다. 또 바뀌면 시험부터 걸린다.
 */
export const 반응한도 = 6;

/**
 * 이슈화 칸을 낸다.
 * ⛔ [2026-09-09 · 5번] **「0」·「못 쟀다」·「해당 없음」 셋을 섞지 않는다.**
 *   섞으면 3번처럼 «잴 시계가 없는» 자리가 「안 했다」로 읽힌다. 어제 실제로 그랬다.
 */
export function 반응표시(p, 텍스트있나, 짧게 = false) {
  if (!텍스트있나) return '—';
  if (p?.반응못잼) return 짧게 ? '못 쟀다' : '⬜ 못 쟀다';
  const 없 = Number(p?.반응해당없음 ?? 0);
  if (!없) return String(p?.반응 ?? 0);
  return `${p?.반응 ?? 0} (해당 없음 ${없}장)`;
}


/**
 * 제목이 관심을 «확» 끄는가 — 판단을 돕는 표시들. ⛔ 이것으로 판정하지 않는다.
 * 제목을 그대로 함께 내서 사람이 보게 한다.
 */
export function 제목표시(제목) {
  const t = String(제목 ?? '');
  return {
    수: /[0-9]/.test(t),
    놀람: /(never|only|no one|first|most|least|beat|outdrew|nobody|한 번도|처음|유일)/i.test(t),
    대비: /( vs | than |보다|대신|아니라|not )/i.test(t),
    이름: /[A-Z][a-z]+/.test(t),
    길이: t.length,
  };
}

export function 공격형갈래(글, 배포시각 = null, 열림 = null, 평균열림 = null) {
  /**
   * 🔴🔴 [2026-09-05 22:2x · 5번] **이 자가 진짜 이슈화를 «구조적으로» 0 으로 세고 있었다.**
   *
   * 사장님 정의는 이것이다 — 「이슈화 = **타 사이트의 콘텐트 발행 시간**으로부터 6시간 이내 생산」.
   * 그런데 이 자는 그 시각 대신 `dataAsOf`(우리 «자료»의 기준일)를 써 왔다.
   *
   * ⛔ 둘은 다른 것이다. 오늘 실제로 이렇게 어긋났다 —
   * ```
   *   바깥 이슈   r/kpop 컴백 무대   2026-09-05 16:38 KST
   *   우리 배포                       2026-09-05 21:2x   ⇒ 약 5시간. 사장님 기준으로 «이슈화»다
   *   dataAsOf   2026-09-04          ⇒ 이 자가 재면 약 45시간. «아니다»로 셌다
   * ```
   * ⇒ **위키미디어처럼 하루 늦게 채워지는 자료로 만든 글은 아무리 빨라도 영영 못 센다.**
   *   오늘 내가 5시간 만에 낸 두 편이 그래서 0 으로 찍혔다.
   *
   * ⭐ 그래서 기사에 **`issueAt`**(반응한 바깥 발행 시각)을 적고, 있으면 그것으로 잰다.
   * ⛔ 없으면 예전대로 `dataAsOf` 로 물러서되 **무엇으로 쟀는지 함께 낸다.**
   *   조용히 물러서면 「0 이 맞는 수인지 못 잰 수인지」를 아무도 모른다.
   */
  const 이슈시각 = 앞말(글, 'issueAt');
  const 잰날 = 이슈시각 ?? 앞말(글, 'dataAsOf');
  /* ⭐ 우리 쪽 시계는 이제 «배포»다. 배포 시각을 못 찾으면 발행일로 물러서고, 그렇다고 적는다 */
  const 우리쪽 = 배포시각 ?? 앞말(글, 'pubDate');
  const 시차 = 시간차(잰날, 우리쪽);
  const 반응 = 시차 !== null && 시차 >= 0 && 시차 <= 반응한도;
  const 제목 = 앞말(글, 'title') ?? '';
  /* 2. 방문이 평균보다 많은가 — 못 재면 null 이다(0 이 아니다) */
  const 평균넘나 = (열림 === null || 평균열림 === null || !평균열림) ? null : 열림 > 평균열림;
  return {
    반응,
    시차,
    /* ⛔ 무엇으로 쟀는지 밝힌다 — 「0」이 맞는 수인지 못 잰 수인지 사람이 가려야 한다 */
    잰기준: 이슈시각 ? 'issueAt' : (앞말(글, 'dataAsOf') ? 'dataAsOf(대리)' : '못 잼'),
    열림,
    평균넘나,
    배포기준: !!배포시각,
    제목,
    표시: 제목표시(제목),
    지면걸음: /^pages:/m.test(String(글 ?? '')),
  };
}
/**
 * 🔴🔴 [2026-09-09 00:2x · 5번] **3번(백년지도)의 공격형 콘텐트를 구조적으로 못 재고 있었다.**
 *
 * 어제 23시 점검에서 3번 지면 여섯 장이 발행일·이슈화·이슈생성을 «한 칸도» 못 쟀다.
 * 까닭은 3번 잘못이 아니라 이 자의 한계였다 — 이 자는 마크다운 앞말(frontmatter)에서
 * 제목·dek·pubDate 를 읽는데, 3번 지면은 **Astro(.astro)** 라 그 칸이 아예 없다.
 * ⛔ 그런데 합계에는 3번분이 0 으로 들어갔다. 그러면 전 유닛 이슈반응이 실제보다 적게 보인다.
 *
 * 위쪽 주석에 「이 잣대를 3번에 어떻게 바꿔 낼지는 사람 판단(5번·사장님)」이라 적혀 있었다.
 * **5번이 정한다.** 아래 셋으로 가른다.
 *
 * ```
 * 발행일     ⛔ 하드코딩 false 였다 → ✅ 배포시각찾기(길) 를 «부른다». 자는 이미 있었다
 * 제목·dek   ⛔ 「dek 앞말 없음」 → ✅ 지면의 title={…}·const desc 를 «틀 그대로» 읽는다
 *            ⚠ ${…} 는 빌드 때 채워지므로 「…」로 남긴다. 채운 척하지 않는다
 * 이슈화     ⛔ 「못 쟀다」 → ✅ **「해당 없음」과 「못 쟀다」를 가른다**
 * ```
 *
 * ⭐ 이슈화를 왜 「해당 없음」으로 두나 — 사장님 정의는 「**타 사이트의 콘텐트 발행 시간**으로부터
 *   6시간 이내」다. 3번 자료는 국가통계(연간·격년 조사)라 그 시계가 **아예 없다.**
 *   ⛔ 없는 시계에 6시간 창을 대면 영영 0 이고, 그 0 이 「안 했다」로 읽힌다.
 *   ⛔ 그렇다고 3번만 「7일 창」 같은 딴 자를 몰래 만들면 KCW 의 6시간과 섞여 아무도 못 읽는다.
 *   ✅ 그래서 창을 바꾸지 않고 **분모에서 뺀다.** 「이슈화 0 · 해당 없음 6장」으로 낸다.
 *
 * ⭐ 그리고 3번에게 «들어올 길»을 낸다 — 지면에 `issueAt` 한 줄만 적으면(주석이어도 된다)
 *   그 장은 KCW 와 **똑같은 6시간 자**로 재어 이슈화로 센다. 자를 3번용으로 무르게 하지 않는다.
 */
export const 자료날후보 = ['만든때', '만든날', '받은때', '기준일', '조사회차', 'dataAsOf', 'asOf', 'generated', '공시연도'];

/** 자료 뭉치에서 「언제 것인가」를 찾는다. 이름이 갈리므로 후보를 차례로 본다 */
export function 자료기준일(자료) {
  if (!자료 || typeof 자료 !== 'object') return null;
  const 본다 = (뭉치) => {
    if (!뭉치 || typeof 뭉치 !== 'object') return null;
    for (const k of 자료날후보) {
      const v = 뭉치[k];
      if (typeof v === 'string' && /^[0-9]{4}/.test(v.trim())) return v.trim();
    }
    return null;
  };
  return 본다(자료) ?? 본다(자료['출처']) ?? null;
}

/** 따온 글토막들을 이어 붙이고 ${…} 는 「…」로 남긴다. ⛔ 값을 채운 척하지 않는다 */
export function 틀속글(조각) {
  const 글자 = String(조각 ?? '');
  const 토막 = [];
  const 무늬 = /`([^`]*)`|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = 무늬.exec(글자)) !== null) 토막.push(m[1] ?? m[2] ?? m[3] ?? '');
  if (!토막.length) return null;
  const 낸다 = 토막.join('').replace(/\$\{[^{}]*\}/g, '…').replace(/\s+/g, ' ').trim();
  return 낸다 || null;
}

/** Astro 지면의 const desc = … 를 읽는다 */
export function 아스트로설명(글) {
  const 글자 = String(글 ?? '');
  const 시 = 글자.match(/(?:^|\n)[ \t]*const[ \t]+desc[ \t]*=/);
  if (!시) return null;
  const 앞 = 글자.indexOf(시[0]) + 시[0].length;
  const 끝 = 글자.indexOf(';', 앞);
  if (끝 < 0) return null;
  return 틀속글(글자.slice(앞, 끝));
}

/** Astro 지면의 title={…} 을 읽는다. ${…} 안에 중괄호가 있으므로 짝을 센다 */
export function 아스트로제목(글) {
  const 글자 = String(글 ?? '');
  const 시 = 글자.match(/(?:^|\n)[ \t]*title=\{/);
  if (!시) return null;
  const 앞 = 글자.indexOf(시[0]) + 시[0].length;
  let 깊이 = 1;
  let i = 앞;
  for (; i < 글자.length; i += 1) {
    const c = 글자[i];
    if (c === '{') 깊이 += 1;
    else if (c === '}') { 깊이 -= 1; if (!깊이) break; }
  }
  if (깊이) return null;
  return 틀속글(글자.slice(앞, i));
}

/**
 * 지면이 「바깥 이슈에 반응한 것」이라고 스스로 밝혔나. ⭐ 3번이 들어올 길이다 —
 * `issueAt: 2026-09-09T14:00:00+09:00` 한 줄이면 주석이어도 읽는다.
 */
export function 아스트로이슈시각(글) {
  const m = String(글 ?? '').match(/issueAt[ \t]*[:=][ \t]*['"`]?([0-9]{4}-[0-9]{2}-[0-9]{2}(?:[T ][0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:[.0-9]*)?(?:Z|[+-][0-9]{2}:?[0-9]{2})?)?)/);
  return m ? m[1].trim() : null;
}

/** 지면이 어느 자료를 들여왔나 — 저장소 뿌리 기준 길로 낸다 */
export function 자료길찾기(글, 지면길) {
  const m = String(글 ?? '').match(/import[ \t]+[^;]*?from[ \t]*['"]([^'"]*[.]json)['"]/);
  if (!m) return null;
  const 상대 = m[1];
  if (!상대.startsWith('.')) return null;
  const 방 = String(지면길 ?? '').split('/').slice(0, -1).join('/');
  const 칸 = [];
  for (const 조각 of `${방}/${상대}`.split('/')) {
    if (조각 === '' || 조각 === '.') continue;
    if (조각 === '..') { 칸.pop(); continue; }
    칸.push(조각);
  }
  return 칸.join('/') || null;
}

const 내가 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };
  /* 🔴 쪽수 관문 — 표지 한 장짜리가 세 번 나갔다. 이 자에는 관문이 «없었다» */
  const 가짜pdf = (본문) => () => '%PDF-1.4' + LF + 본문;
  검('쪽수: /Count 를 읽는다', 쪽수재기('x', 가짜pdf('/Type /Pages /Count 8')) === 8);
  검('쪽수: 쪽 객체를 센다',
    쪽수재기('x', 가짜pdf('/Type /Page /Type /Page /Type /Page ')) === 3);
  검('⭐ 쪽수: 둘이 어긋나면 «작은 쪽»을 쓴다 — 부풀려진 수에 속지 않는다',
    쪽수재기('x', 가짜pdf('/Count 99 /Type /Page ')) === 1);
  검('🔴 쪽수: 표지 한 장은 1 이다 — 이 값이 관문을 막는다',
    쪽수재기('x', 가짜pdf('/Type /Pages /Count 1')) === 1);
  검('⛔ 쪽수: 못 읽으면 0 이 아니라 null 이다',
    쪽수재기('x', () => { throw new Error('없다'); }) === null);
  검('⛔ 쪽수: PDF 가 아니면 null 이다 (0 으로 막지 않는다)',
    쪽수재기('x', () => 'PK 그냥 zip 이다') === null);
  검('⛔ 쪽수: 쪽 표시가 하나도 없으면 null 이다', 쪽수재기('x', 가짜pdf('아무것도 없다')) === null);

  /* 🔴 [2026-10-03] 첨부가 PDF → 워드로 바뀌었다. 관문이 «죽은 채로» 통과하지 않게 잰다 */
  {
    const 워드길 = path.join(뿌리, 'tmp', '_관문시험.docx');
    try {
      execFileSync(process.execPath, [path.join(뿌리, 'scripts/md-to-docx.mjs'),
        '-', '--out', 워드길], { cwd: 뿌리, stdio: 'pipe', input: '' });
    } catch { /* 아래에서 직접 짓는다 */ }
    try {
      fs.mkdirSync(path.dirname(워드길), { recursive: true });
      const 보기md = path.join(뿌리, 'tmp', '_관문시험.md');
      fs.writeFileSync(보기md, '# 시험\n\n| 가 | 나 |\n|---|---|\n| 1 | 2 |\n\n| 다 | 라 |\n|---|---|\n| 3 | 4 |\n', 'utf8');
      execFileSync(process.execPath, [path.join(뿌리, 'scripts/md-to-docx.mjs'), 보기md,
        '--out', 워드길], { cwd: 뿌리, stdio: 'pipe' });
      검('🔴 워드 안의 «진짜 표»를 센다 — 눌린 zip 을 풀어서', 워드표세기(워드길) === 2);
      fs.unlinkSync(보기md); fs.unlinkSync(워드길);
    } catch (e) {
      검('🔴 워드 안의 표를 센다 — ' + String(e.message).slice(0, 50), false);
    }
    검('⛔ PDF 를 주면 «0 이 아니라» 못 쟀다(null) 로 답한다',
      워드표세기('x', () => Buffer.from('%PDF-1.4 아무것도 없다', 'latin1')) === null);
    검('⛔ 없는 파일에도 안 터진다', 워드표세기('없다.docx', () => { throw new Error('없다'); }) === null);
    검('⛔ zip 이 아니면 null 이다', 워드표세기('x', () => Buffer.from('그냥 글', 'utf8')) === null);
  }

  /* 🔴 [2026-10-03] 보고가 두 번 «조용히» 안 나갔다. 그 둘을 여기서 막는다 */
  {
    const 짓기 = (더) => 보낼인자만들기({
      받는곳: 'a@b.c', 날: '2026-10-02', 총편수: 2, 총반응: 0, 총만듦: 0,
      md: 'C:/Users/User/OneDrive/콘텐트 점검/콘텐트 점검_20261002.md',
      붙일것: 'C:/x/보고.docx', ...더,
    });
    const 글인자 = (인자) => 인자.find((x) => x.startsWith('--글='));
    검('🔴 --봤다 를 send-mail 에 그대로 넘긴다', 짓기({ 봤다: true }).includes('--봤다'));
    검('⛔ --봤다 가 없으면 안 넘긴다 — 관문을 몰래 열지 않는다',
      !짓기({ 봤다: false }).includes('--봤다'));
    검('🔴 --글 은 «절대 경로»다 — 뿌리 밖(원드라이브) 파일도 찾을 수 있어야 한다',
      !/(^|[/\\])\.\.([/\\]|$)/.test(글인자(짓기({}))));
    검('⛔ 첨부가 없으면 --첨부 를 안 붙인다', !짓기({ 붙일것: null }).some((x) => x.startsWith('--첨부=')));
    검('⛔ --보낸다 가 언제나 맨 끝이다', 짓기({ 봤다: true }).at(-1) === '--보낸다');
  }

  검('어제를 낸다', 어제(new Date(2026, 8, 3)) === '2026-09-02');
  검('달을 넘어도 맞다', 어제(new Date(2026, 8, 1)) === '2026-08-31');
  검('해를 넘어도 맞다', 어제(new Date(2026, 0, 1)) === '2025-12-31');
  const 견본 = ['---', 'title: "가"', 'pubDate: 2026-09-02', 'dataAsOf: 2026-09-01T00:00:00+09:00',
    'pages:', '  - "/titles"', '---', '본문'].join(LF);
  검('앞말을 읽는다', 앞말(견본, 'pubDate') === '2026-09-02');
  검('따옴표를 벗긴다', 앞말(견본, 'title') === '가');
  검('⛔ 없는 칸은 null — 빈 문자열이 아니다', 앞말(견본, '없는칸') === null);
  검('⛔ 앞말이 없어도 안 터진다', 앞말('그냥 글', 'pubDate') === null);
  /* 🔴 [2026-09-05] 카드 경로가 «없는 폴더»를 가리키면 그 유닛의 「기타」는 늘 0 이 된다.
     3번이 9/3 에 자기 줄만 고쳐 5번·6번 줄이 남아 있었다 — 이 시험이 그것을 막는다.
     ⚠ 실제 파일 시스템을 본다. 폴더 이름이 바뀌면 «다음 사람이 알기 전에» 여기서 걸린다. */
  const 나쁜길 = 없는카드길(뿌리);
  검(`⛔ 카드 경로가 다 실재한다 (없으면: ${나쁜길.map((x) => `${x.유닛} ${x.길}`).join(', ') || '없음'})`,
    나쁜길.length === 0);
  검('없는 길을 넣으면 잡아낸다',
    없는카드길('/없는뿌리', () => false).length > 0);
  검('있는 길만 있으면 빈 배열', 없는카드길('/아무데나', () => true).length === 0);

  /* 🔴 카드는 «벌»로 센다 — 파일로 세면 09-07 처럼 「기타 200/1」이 나간다 */
  검('⭐ 정사각 열 장이 한 벌이다',
    벌로묶기(Array.from({ length: 10 }, (_, i) => `public/wikitip/cardnews/가-sq-${i + 1}.png`)).length === 1);
  검('정사각과 세로가 섞여도 한 벌이다',
    벌로묶기(['x/가-sq-1.png', 'x/가-sq-2.png', 'x/가-v-1.png']).length === 1);
  검('두 벌은 두 벌이다',
    벌로묶기(['x/가-sq-1.png', 'x/나-sq-1.png']).length === 2);
  검('⭐ 그 꼴이 아닌 것은 파일 하나가 한 벌 — 묶을 근거를 지어내지 않는다',
    벌로묶기(['archive/social/아무거나.png', 'archive/social/또다른것.png']).length === 2);
  검('폴더가 달라도 이름이 같으면 한 벌로 본다',
    벌로묶기(['a/가-sq-1.png', 'b/가-sq-1.png']).length === 1);
  검('빈 목록은 0벌', 벌로묶기([]).length === 0);
  검('⛔ 배열이 아니면 null — 0 으로 안 채운다', 벌로묶기(null) === null);
  검('⭐ 09-07 실측을 되짚는다 — 파일 200장이면 벌은 그보다 «훨씬 적다»',
    벌로묶기(Array.from({ length: 200 }, (_, i) => `x/벌${Math.floor(i / 10)}-sq-${(i % 10) + 1}.png`)).length === 20);
  검('날수를 센다', 날수('2026-09-01', '2026-09-02') === 1);
  검('같은 날은 0', 날수('2026-09-02', '2026-09-02') === 0);
  검('⛔ 못 읽으면 null', 날수('아무것', '2026-09-02') === null);
  /* ── 사장님이 2026-09-03 에 고치신 새 기준 · 🔴 2026-09-05 에 12→6시간으로 다시 줄었다 ── */
  검('🔴 반응 한도는 6시간이다 (2026-09-05 지시)', 반응한도 === 6);
  /* 견본의 dataAsOf 는 2026-09-01T00:00:00+09:00 이다 */
  검('6시간 안이면 반응', 공격형갈래(견본, '2026-09-01T05:00:00+09:00').반응 === true);
  검('⛔ 6시간을 넘으면 반응이 아니다 — 옛 기준(12시간)이면 통과하던 자리',
    공격형갈래(견본, '2026-09-01T09:00:00+09:00').반응 === false);
  검('⛔ 12시간을 넘으면 당연히 반응이 아니다',
    공격형갈래(견본, '2026-09-03T06:00:00+09:00').반응 === false);
  검('⛔ 바깥 자료 시각을 못 읽으면 반응이 아니다(0 이 아니라 못 잰 것)',
    공격형갈래(['---', 'title: "가"', 'pubDate: 2026-09-02', '---'].join(LF), '2026-09-02T06:00:00+09:00').시차 === null);
  검('배포 시각을 주면 배포기준으로 표시된다',
    공격형갈래(견본, '2026-09-01T06:00:00+09:00').배포기준 === true);
  검('⛔ 배포 시각이 없으면 배포기준이 아니라고 밝힌다', 공격형갈래(견본).배포기준 === false);
  검('시간차를 센다', 시간차('2026-09-01T00:00:00+09:00', '2026-09-01T12:00:00+09:00') === 12);
  검('⛔ 못 읽으면 null', 시간차('아무것', '2026-09-01T00:00:00+09:00') === null);
  /* 🔴 [2026-09-05] 여기가 12로 박혀 있어 «옛 기준»을 지키고 있었다. 지시가 바뀌면 시험도 바뀐다 */
  검('한도는 6시간이다 (2026-09-05 지시로 12→6)', 반응한도 === 6);

  /* 🔴🔴 [2026-09-05 22:2x] **issueAt — 오늘 이 자가 진짜 이슈화를 0 으로 세던 자리** */
  {
    /* 하루 늦게 채워지는 자료(dataAsOf 9/4)로, 바깥 이슈(9/5 16:38)에 5시간 만에 반응한 글 */
    const 늦은자료 = ['---', 'title: "가"', 'pubDate: 2026-09-05',
      'dataAsOf: 2026-09-04T00:00:00+09:00',
      'issueAt: 2026-09-05T16:38:00+09:00', '---'].join(LF);
    검('🔴 issueAt 이 있으면 그것으로 잰다 — 5시간이면 이슈화다',
      공격형갈래(늦은자료, '2026-09-05T21:20:00+09:00').반응 === true);
    검('🔴 무엇으로 쟀는지 밝힌다',
      공격형갈래(늦은자료, '2026-09-05T21:20:00+09:00').잰기준 === 'issueAt');
    /* ⛔ 같은 글을 issueAt 없이 재면 45시간이 되어 «아니다»가 된다 — 그것이 오늘의 결함이었다 */
    const issueAt없음 = 늦은자료.split(LF).filter((l) => !l.startsWith('issueAt:')).join(LF);
    검('⛔ issueAt 이 없으면 dataAsOf 로 물러서고, 그래서 놓친다(오늘 실제로 그랬다)',
      공격형갈래(issueAt없음, '2026-09-05T21:20:00+09:00').반응 === false);
    검('⛔ 물러섰다는 것을 조용히 넘기지 않고 적는다',
      공격형갈래(issueAt없음, '2026-09-05T21:20:00+09:00').잰기준 === 'dataAsOf(대리)');
    검('⛔ issueAt 이 있어도 6시간을 넘으면 이슈화가 아니다',
      공격형갈래(늦은자료, '2026-09-06T06:00:00+09:00').반응 === false);
    검('⛔ 둘 다 없으면 「못 잼」이라 적는다',
      공격형갈래(['---', 'title: "가"', 'pubDate: 2026-09-05', '---'].join(LF), '2026-09-05T21:20:00+09:00').잰기준 === '못 잼');
  }

  검('방문이 평균보다 많으면 참', 공격형갈래(견본, null, 50, 10).평균넘나 === true);
  검('평균 이하면 거짓', 공격형갈래(견본, null, 5, 10).평균넘나 === false);
  검('⛔ 지면 수를 못 재면 null — 0 이 아니다', 공격형갈래(견본, null, null, 10).평균넘나 === null);
  검('⛔ 평균을 못 재도 null', 공격형갈래(견본, null, 50, null).평균넘나 === null);

  검('제목 표시 — 수가 있으면 잡는다', 제목표시('421 titles').수 === true);
  검('제목 표시 — 놀람말을 잡는다', 제목표시('Nobody charted it first').놀람 === true);
  검('⛔ 빈 것도 안 터진다', 제목표시(undefined).길이 === 0);

  {
    const 표 = [{ 열림: 30, 자리: "a/article/가-나-다" }, { 열림: 7, 자리: "b/article/딴것" }];
    검('지면을 슬러그로 찾는다', 지면찾기(표, '가-나-다') === 30);
    검('⛔ 없으면 null — 0 이 아니다', 지면찾기(표, '없는것') === null);
    검('⛔ 표가 없어도 안 터진다', 지면찾기(null, '가') === null);
  }
  {
    const out = ["   ▼ 지면 전부 (지면열림)", "      120  a/article/가", "        7  b/article/나", "   ▲ 지면 전부 끝"].join(String.fromCharCode(10));
    검('지면 전부를 읽는다', (지면전부파서(out) ?? []).length === 2);
    검('⛔ 덩어리가 없으면 null', 지면전부파서('아무것') === null);
  }
  /* 🔴 [2026-09-09 · 5번] 3번(백년지도) Astro 지면을 못 재던 자리 — 자가시험으로 굳힌다 */
  {
    const 지면 = [
      "import 원본 from '../../../data/100yearmap/university-enrollment-fill.json';",
      '',
      'const desc =',
      '  `대학알리미가 공시한 재학생충원율을 ${전체.곳수}곳에 대해 다시 계산했습니다. ` +',
      '  `정원보다 적은 곳이 ${정원미달.곳수}곳입니다.`;',
      '---',
      '<HundredYear',
      '  title={`대학 재학생충원율 — 적은 곳이 ${전체.곳수}곳 중 ${정원미달.곳수}곳`}',
      '  description={desc}',
      '>',
    ].join(LF);
    검('Astro 지면의 dek 을 읽는다', (아스트로설명(지면) ?? '').startsWith('대학알리미가 공시한'));
    검('⭐ ${…} 는 채운 척하지 않고 「…」로 남긴다', (아스트로설명(지면) ?? '').includes('…곳에 대해'));
    검('⛔ dek 이 없으면 null — 빈 글이 아니다', 아스트로설명('아무것') === null);
    검('Astro 지면의 제목을 읽는다', (아스트로제목(지면) ?? '').startsWith('대학 재학생충원율'));
    검('제목의 ${…} 짝을 세어 끝까지 읽는다', (아스트로제목(지면) ?? '').endsWith('곳'));
    검('⛔ 제목이 없으면 null', 아스트로제목('아무것') === null);
    검('들여온 자료 길을 저장소 뿌리 기준으로 낸다',
      자료길찾기(지면, 'src/pages/100y/university-enrollment-fill/index.astro')
        === 'src/data/100yearmap/university-enrollment-fill.json');
    검('⛔ 들여온 자료가 없으면 null', 자료길찾기('아무것', 'src/pages/x/index.astro') === null);
    검('⛔ 이슈 시계가 없으면 null — false 가 아니다', 아스트로이슈시각(지면) === null);
    검('⭐ 3번이 issueAt 을 적으면(주석이어도) 읽는다',
      아스트로이슈시각('/* issueAt: 2026-09-09T14:00:00+09:00 */') === '2026-09-09T14:00:00+09:00');
    검('날짜만 적어도 읽는다', 아스트로이슈시각('const issueAt = "2026-09-09"') === '2026-09-09');
  }
  {
    검('자료의 만든때를 기준일로 읽는다', 자료기준일({ 만든때: '2026-08-06' }) === '2026-08-06');
    검('출처 안쪽도 본다', 자료기준일({ 출처: { 받은때: '2026-08-06' } }) === '2026-08-06');
    검('공시연도만 있어도 읽는다', 자료기준일({ 공시연도: '2025' }) === '2025');
    검('⛔ 날짜 칸이 없으면 null — 오늘로 채우지 않는다', 자료기준일({ 이름: '가' }) === null);
    검('⛔ 자료가 없어도 안 터진다', 자료기준일(null) === null);
    검('⛔ 「미확인」 같은 글자는 날짜로 안 읽는다', 자료기준일({ 만든때: '미확인' }) === null);
  }
  {
    검('이슈화 칸 — 콘텐트 몫이 없는 자리는 줄표다', 반응표시({ 반응: 0 }, 0) === '—');
    검('⛔ 못 쟀으면 0 으로 안 쓴다', 반응표시({ 반응못잼: true, 반응: 0 }, 1) === '⬜ 못 쟀다');
    검('센 것이 있으면 그 수를 낸다', 반응표시({ 반응: 3 }, 1) === '3');
    검('⭐ 해당 없는 장 수를 함께 낸다', 반응표시({ 반응: 0, 반응해당없음: 6 }, 1) === '0 (해당 없음 6장)');
    검('⛔ 해당 없음과 못 쟀다를 섞지 않는다', 반응표시({ 반응: 0, 반응해당없음: 6 }, 1) !== 반응표시({ 반응못잼: true }, 1));
  }
  검('유닛 목록에 번호가 다 있다', 유닛들.every((u) => /^[1-9]번$/.test(u.번호)));
  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}${LF}${실.map((s) => `   · ${s}`).join(LF)}`);
    process.exit(1);
  }
  console.log(`✅ 전 유닛 점검 보고 자가시험 통과 (${통})`);
  process.exit(0);
}

/* ── 여기서부터 실제로 잰다 ── */

function 발행센다(날, 유닛, 지면표 = null, 평균열림 = null) {
  const 결과 = { 편수: 0, 반응: 0, 만듦: 0, 제목들: [], 편들: [] };
  /* 영상·카드는 git 이 그날 «새로 들인» 파일로 센다 */
  const 영상 = 그날새파일(날, 유닛.영상, '.mp4');
  결과.영상수 = 영상 === null ? null : 영상.length;
  const 카드 = 유닛.카드 ? 그날새파일(날, 유닛.카드.filter((x) => fs.existsSync(path.join(뿌리, x))), '.png') : [];
  /* ⭐ 파일이 아니라 «벌»로 센다 — 하루 몫이 「카드뉴스 한 벌」이기 때문이다.
     파일로 세면 정사각 열 장이 10 으로 잡혀 09-07 처럼 「기타 200/1」이 나간다. */
  const 카드벌 = 벌로묶기(카드);
  결과.카드수 = 카드벌 === null ? null : 카드벌.length;
  결과.카드파일수 = 카드 === null ? null : 카드.length;

  /* 🔴 3번(백년지도) — 지면이 마크다운이 아니라 Astro(.astro)라 위 앞말 판정이 안 맞는다.
   * git 이 그날 «새로 들인» index.astro 를 새 지면으로 센다.
   * ⭐ [2026-09-09 · 5번] 세 칸을 다 재게 고쳤다 — 까닭과 판단 근거는 아스트로설명() 위 주석에 있다.
   *   발행일 = 배포 도장 · 제목·dek = 지면에서 틀 그대로 · 이슈화 = 「해당 없음」과 「못 쟀다」를 가름 */
  if (유닛.아스트로지면) {
    const 새 = 그날새파일(날, 유닛.아스트로지면, 'index.astro');
    if (새 === null) {
      결과.편수못잼 = true;
    } else {
      결과.편수 += 새.length;
      결과.시계없음 = 0;
      for (const 길 of 새) {
        const 슬러그 = 길.split('/').slice(-2, -1)[0] ?? 길;
        let 글 = '';
        try { 글 = fs.readFileSync(path.join(뿌리, 길), 'utf8'); } catch { 글 = ''; }
        const 배포 = 배포시각찾기(길);
        const 이슈시각 = 아스트로이슈시각(글);
        /* 자료 기준일은 «이슈 시계가 아니다» — 언제 것인지 보여 주기 위해서만 낸다 */
        let 자료날 = null;
        const 자료길 = 자료길찾기(글, 길);
        if (자료길) {
          try { 자료날 = 자료기준일(JSON.parse(fs.readFileSync(path.join(뿌리, 자료길), 'utf8'))); } catch { 자료날 = null; }
        }
        /* 우리 쪽 시계는 배포 도장. 못 찾으면 그날 끝으로 물러서고 배포기준=false 로 밝힌다 */
        const 우리쪽 = 배포 ?? `${날}T23:59:59+09:00`;
        const 시차 = 이슈시각 ? 시간차(이슈시각, 우리쪽) : null;
        const 반응 = 시차 !== null && 시차 >= 0 && 시차 <= 반응한도;
        if (반응) 결과.반응 += 1;
        if (!이슈시각) 결과.시계없음 += 1;
        const 제목 = 아스트로제목(글) ?? 슬러그;
        결과.제목들.push(제목);
        const 열림 = 지면찾기(지면표, 슬러그);
        const 평균넘나 = (열림 === null || 평균열림 === null || !평균열림) ? null : 열림 > 평균열림;
        if (평균넘나 === true) 결과.만듦 += 1;
        결과.편들.push({
          제목,
          무엇: 아스트로설명(글),
          시차, 배포기준: !!배포,
          표시: 제목표시(제목), 열림, 평균넘나, 슬러그,
          갈래: null,
          /* ⛔ 이슈 시계가 없는 장은 false 가 아니라 null — 「안 했다」와 「해당 없음」은 다르다 */
          반응: 이슈시각 ? 반응 : null,
          기준일: 자료날,
          이슈시계: 이슈시각 ?? null,
        });
      }
      /* ⛔ 「못 쟀다」로 뭉개지 않는다. 이슈 시계가 없는 장 수를 세어 분모에서 뺀다 */
      결과.반응해당없음 = 결과.시계없음;
      결과.반응못잼 = false;
    }
  }

  for (const 방 of 유닛.콘텐트) {
    const d = path.join(뿌리, 방);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.md'))) {
      const 길 = path.join(방, f).split(path.sep).join('/');
      const 글 = fs.readFileSync(path.join(d, f), 'utf8');
      if (앞말(글, 'pubDate') !== 날) continue;
      if (앞말(글, 'draft') === 'true') continue;
      결과.편수 += 1;
      const 슬러그 = f.replace(/[.]md$/, '');
      const 열림 = 지면찾기(지면표, 슬러그);
      const g = 공격형갈래(글, 배포시각찾기(길), 열림, 평균열림);
      if (g.반응) 결과.반응 += 1;
      if (g.평균넘나 === true) 결과.만듦 += 1;
      const 제목 = 앞말(글, 'title') ?? f;
      결과.제목들.push(제목);
      결과.편들.push({
        제목,
        무엇: 앞말(글, 'dek') ?? 앞말(글, 'description') ?? null,
        시차: g.시차, 배포기준: g.배포기준, 표시: g.표시, 열림: g.열림, 평균넘나: g.평균넘나, 슬러그,
        갈래: 앞말(글, 'category'),
        반응: g.반응,
        기준일: 앞말(글, 'dataAsOf'),

      });
    }
  }
  return 결과;
}

/**
 * 🔴 [2026-09-03] 사장님: 「못 잰 것 … **해결해**」. 셋 다 «자리를 몰라서» 못 쟀던 것이지
 *   잴 수 없는 것이 아니었다. 자리를 찾아 적으니 세어진다.
 * ⛔ 파일 «시각»으로 세지 않는다 — 손대기만 해도 바뀐다. **git 이 그날 새로 들인 것**만 센다.
 */
/**
 * 🔴 [2026-09-05 · 5번] **한글 이름 파일을 못 세고 있었다 — core.quotepath 때문에 못 세던 자리다.**
 *   git 은 기본으로 non-ASCII 경로를 따옴표로 감싸 내놓는다.
 *   그래서 끝글 검사(.mp4)가 떨어지고, 3번이 오늘 실제로 낸 영상
 *   (나이대별가장흔한병.mp4)이 «영상 0/1»로 찍혔다.
 * ⚠ 오늘 이 자에서 같은 결의 결함을 이미 하나 고쳤다(카드 경로가 없는 폴더를 가리킴).
 *   ⇒ 이 자는 「0건」과 「못 셌다」를 가르라고 있는데, 스스로 그 둘을 섞고 있었다.
 * ✅ 모든 git 호출에 -c core.quotepath=false 를 붙였다.
 */
function 그날새파일(날, 방들, 끝글, 저장소 = '.') {
  if (!방들 || !방들.length) return [];
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'log', `--since=${날} 00:00`, `--until=${날} 23:59:59`,
      '--diff-filter=A', '--name-only', '--format=', '--', ...방들],
      { cwd: path.join(뿌리, 저장소), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const 본것 = new Set();
    for (const l of out.split(String.fromCharCode(10))) {
      const t = l.trim();
      if (!t || !t.endsWith(끝글)) continue;
      본것.add(t);
    }
    return [...본것];
  } catch { return null; }   /* null 은 «못 쟀다» — 0 과 다르다 */
}

/** 그날 손댄(고친 것 포함) 파일 — klifemap 처럼 지면이 마크다운이 아닌 곳을 재려고 */
function 그날손댄파일(날, 방들, 끝글, 저장소 = '.') {
  if (!방들 || !방들.length) return [];
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'log', `--since=${날} 00:00`, `--until=${날} 23:59:59`,
      '--name-only', '--format=', '--', ...방들],
      { cwd: path.join(뿌리, 저장소), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const 본것 = new Set();
    for (const l of out.split(String.fromCharCode(10))) {
      const t = l.trim();
      if (!t || !t.endsWith(끝글)) continue;
      본것.add(t);
    }
    return [...본것];
  } catch { return null; }
}

/** GA4 「어느 지면이 열렸나」 — 기사가 실제로 열린 수. 외부 반응의 바닥값이다 */
/** 「▼ 지면 전부」 덩어리를 읽는다 — 없으면 top15 라도 읽는다 */
export function 지면전부파서(out) {
  const 줄들 = String(out ?? '').split(String.fromCharCode(10));
  const i = 줄들.findIndex((l) => l.includes('▼ 지면 전부'));
  if (i < 0) return null;
  const 표 = [];
  for (const l of 줄들.slice(i + 1)) {
    const t = l.trim();
    if (t.includes('▲ 지면 전부 끝')) break;
    const m = t.match(/^([0-9,]+)[ ]+(.+)$/);
    if (!m) continue;
    표.push({ 열림: Number(m[1].split(',').join('')), 자리: m[2].trim() });
  }
  return 표.length ? 표 : null;
}

/** 지면 표에서 그 글의 주소를 찾는다. 없으면 null —  */
export function 지면찾기(표, 슬러그) {
  if (!표 || !슬러그) return null;
  const 걸린 = 표.filter((r) => r.자리.includes(슬러그));
  if (!걸린.length) return null;
  return 걸린.reduce((a, r) => a + r.열림, 0);
}

export function 지면열림파서(out) {
  const 줄들 = String(out ?? '').split(String.fromCharCode(10));
  const i = 줄들.findIndex((l) => l.includes('어느 지면이 열렸나'));
  if (i < 0) return null;
  const 표 = [];
  for (const l of 줄들.slice(i + 1)) {
    const t = l.trim();
    if (!t) break;
    const m = t.match(/^([0-9,]+)[ ]+(.+)$/);
    if (!m) break;
    표.push({ 열림: Number(m[1].split(',').join('')), 자리: m[2].trim() });
  }
  return 표.length ? 표 : null;
}

/**
 * 🔴 사장님: 「**배포를 기준으로 바꿔**」. 우리 배포의 기록은 「배포 도장」 커밋이다
 *   (deploy.mjs 가 배포를 마치고 스스로 남긴다). 어떤 파일이 처음 들어온 커밋 «뒤»의
 *   첫 배포 도장이 그 글이 손님에게 나간 시각이다.
 * ⛔ 도장을 못 찾으면 **null** — 발행일로 슬쩍 바꿔 놓고 배포 기준이라 하지 않는다.
 */
function 배포시각찾기(파일길) {
  try {
    const 들어온때 = execFileSync('git', ['-c', 'core.quotepath=false', 'log', '--diff-filter=A', '-1', '--format=%cI', '--', 파일길],
      { cwd: 뿌리, encoding: 'utf8' }).trim();
    if (!들어온때) return null;
    const 도장 = execFileSync('git', ['-c', 'core.quotepath=false', 'log', '--format=%cI', '--grep=배포 도장', `--since=${들어온때}`],
      { cwd: 뿌리, encoding: 'utf8' }).trim().split(String.fromCharCode(10)).filter(Boolean);
    /* --since 는 새것부터 내려온다 — 가장 «오래된» 것이 그 글 뒤 첫 배포다 */
    return 도장.length ? 도장[도장.length - 1] : null;
  } catch { return null; }
}

function 커밋센다(날) {
  const 셈 = {};
  for (const repo of ['.', '../klifemap']) {
    let out = '';
    try {
      out = execFileSync('git', ['-c', 'core.quotepath=false', 'log', `--since=${날} 00:00`, `--until=${날} 23:59:59`, '--format=%s'],
        { cwd: path.join(뿌리, repo), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    } catch { continue; }
    for (const l of out.split(LF).filter(Boolean)) {
      const m = l.match(/^\[?(?:진행\]?\s*)?([1-9])번/) || l.match(/^\[([1-9])번\s*(?:→|-)/);
      if (!m) continue;
      const u = `${m[1]}번`;
      셈[u] = (셈[u] ?? 0) + 1;
    }
  }
  return 셈;
}

async function 한줄재기(주소) {
  try {
    const r = await fetch(주소, { redirect: 'follow', signal: AbortSignal.timeout(12000) });
    const t = r.ok ? await r.text() : '';
    return { 코드: r.status, 줄: t ? t.split(LF).length : 0 };
  } catch (e) { return { 코드: null, 줄: 0, 탈: String(e.message ?? e).slice(0, 40) }; }
}

async function geo재기() {
  const 표 = [];
  for (const u of 유닛들) {
    if (!u.도메인) { 표.push({ ...u, 못쟀다: '사이트가 없는 몫이다(유입 담당)' }); continue; }
    const llms = await 한줄재기(`https://${u.도메인}/llms.txt`);
    const rob = await 한줄재기(`https://${u.도메인}/robots.txt`);
    const site = await 한줄재기(`https://${u.도메인}/sitemap.xml`);
    표.push({ ...u, llms, rob, site });
  }
  return 표;
}

/**
 * 🔴 [2026-09-03] 첫 판은 ga4 출력의 **꼬리 14줄을 그대로 붙였다.** 그래서 사장님이
 *   「표 항목이 뭔지 모르니 각 열마다 항목명을 써」라고 하셨다 — **머리줄이 잘려 나갔던 것**이다.
 * ⛔ 남의 출력을 잘라 붙이지 않는다. **읽어서 우리 표로 다시 짠다.**
 */
export function ga4파서(out) {
  const 줄들 = String(out ?? '').split(LF);
  const i = 줄들.findIndex((l) => l.includes('사이트별로 갈라 잰 것'));
  if (i < 0) return null;
  const 표 = [];
  for (const l of 줄들.slice(i + 2)) {
    const t = l.trim();
    if (!t) break;
    if (t.startsWith('⭐') || t.startsWith('🔴') || t.startsWith('⚠') || t.startsWith('⛔')) break;
    const 조각 = t.split(/[ ]{2,}/).filter(Boolean);
    if (조각.length < 4) continue;
    const 호스트 = 조각[0];
    const 수 = 조각.slice(1).join(' ').split(' ').filter((x) => /^[0-9,]+$/.test(x)).map((x) => Number(x.split(',').join('')));
    if (수.length < 3) continue;
    표.push({ 호스트, 순방문: 수[0], 세션: 수[1], 지면열림: 수[2] });
  }
  return 표.length ? 표 : null;
}

/**
 * 🔴 [2026-09-06] **`--지면전부` 를 안 주고 있었다.**
 * 보고서 4절이 「기사가 일으킨 반응 — 해결했습니다. `--지면전부` 로 지면 하나하나를 받는다」고
 * 적어 놓고, 정작 이 자리에서 그 깃발을 «안 넘겼다». 그래서 지면표가 늘 null 이 되고
 * 1-5 표의 「지면열림」 칸이 **한 줄도 빠짐없이 ⬜ 못 쟀다**로 나갔다.
 *
 * ⛔ 「해결했다」고 적은 칸이 매번 비어 있으면, 그 문장이 보고 전체를 못 믿게 만든다.
 *   0 으로 채우지 않는 것은 맞지만, **잴 수 있는 것을 안 재고 못 쟀다고 적는 것은 다른 문제다.**
 */
function ga4읽기() {
  try {
    const out = execFileSync('node', ['scripts/ga4-report.mjs', '--지면전부'],
      { cwd: 뿌리, encoding: 'utf8', timeout: 180000 });
    return { 표: ga4파서(out), 원문: out };
  } catch (e) { return null; }
}

if (내가) {
  const 인자 = (이름) => {
    const p = process.argv.find((x) => x.startsWith(`--${이름}=`));
    return p ? p.slice(이름.length + 3) : null;
  };
  const 날 = 인자('날') ?? 어제();
  const 지금 = new Date();
  const ga4 = ga4읽기();
  const 지면표 = ga4 ? 지면전부파서(ga4.원문) : null;
  /* 평균은 «우리 기사 지면»만으로 낸다 — 첫 화면·목록이 섞이면 평균이 부풀어 비교가 죽는다 */
  const 기사지면 = (지면표 ?? []).filter((r) => /[/](article|kculturewire)[/]/.test(r.자리));
  const 평균열림 = 기사지면.length
    ? Math.round(기사지면.reduce((a, r) => a + r.열림, 0) / 기사지면.length) : null;
  const 발행 = new Map(유닛들.map((u) => [u.번호, 발행센다(날, u, 지면표, 평균열림)]));
  const 커밋 = 커밋센다(날);
  const geo = await geo재기();

  const 총편수 = [...발행.values()].reduce((a, x) => a + x.편수, 0);
  const 총반응 = [...발행.values()].reduce((a, x) => a + x.반응, 0);
  const 총만듦 = [...발행.values()].reduce((a, x) => a + x.만듦, 0);

  const 줄 = [];
  const 쓴다 = (...x) => 줄.push(...x);
  쓴다(`# 전 유닛 점검 보고 — ${날} (완결된 하루)`, '');
  /* 🔴 [2026-09-22 · 5번] 「총괄대행」 → 「총괄」. 사장님이 정하신 자리다 —
     5번은 «대행»이 아니라 총괄이고, 2번·4번이 없어지므로 모든 유닛에 개입한다.
     ⛔ 사장님께 나가는 보고서에 옛 직함이 남아 있으면 그 자리가 안 바뀐 것으로 읽힌다. */
  쓴다(`작성 ${지금.toLocaleString('ko-KR')} KST · 총괄 5번 · 사장님 지시 2026-09-03 「매일 23시」 · 2026-09-29 「22시로 조정」`, '');
  쓴다('> 이 보고는 각 유닛의 자기 실적 보고(16시)와 다른 것입니다 — **총괄이 전 유닛을 재서 점검한 결과**입니다.', '');

  쓴다('## 1. 공격형 콘텐트 — 어제 «발행된» 것', '');
  쓴다('### 1-1. 유닛별', '');
  쓴다('| 유닛 | 사이트 | 발행 편수 | 이슈화 | 이슈를 만듦 | 어제 커밋 |');
  쓴다('| --- | --- | ---: | ---: | ---: |');
  for (const u of 유닛들) {
    const p = 발행.get(u.번호);
    const 텍스트있나 = u.콘텐트.length || u.아스트로지면?.length;
    const 몫 = 텍스트있나 ? String(p.편수) : '—';
    const 반응칸 = 반응표시(p, 텍스트있나);
    const 만듦칸 = !텍스트있나 ? '—' : p.만듦;
    쓴다(`| ${u.번호} | ${u.이름} | **${몫}** | ${반응칸} | ${만듦칸} | ${커밋[u.번호] ?? 0} |`);
  }
  쓴다('', `합계 — 발행 **${총편수}편** · 이슈 반응 ${총반응} · 이슈 생성 ${총만듦}`, '');
  /* 🔴 [2026-09-09 · 5번] 옛 각주는 「3번은 이슈화를 못 잰다 · 12시간 창 · 합계에 0으로 들어간다」였다.
   * 셋 다 이제 틀린 말이다 — 한도는 6시간이고, 「못 쟀다」가 아니라 «해당 없음»이며, 분모에서 뺀다. */
  쓴다('⚠ 「—」와 「0」은 다릅니다 — **0 은 잰 결과 없다는 뜻**이고, 「—」는 그 자리를 재는', '');
  쓴다('  잣대가 아직 없다는 뜻입니다. 5번(총괄)은 감수·개발이 몫이라 편수로 재지 않습니다.', '');
  쓴다('  ⛔ 재는 칸이 비면 그 자리는 노는 자리로 읽힙니다. 「—」가 보이면 그 자리의 몫을', '');
  쓴다('  정의하는 것이 먼저입니다(사장님 2026-09-18 「2번은 그럼 놀잖아」).', '');
  쓴다(`  「이슈화」는 바깥 이슈가 뜨고 ${반응한도}시간 안에 받았나이고, 「이슈생성」(방문이 평균보다`, '');
  쓴다('  많은가)은 시계가 없어도 GA4 지면열림으로 잽니다.', '');
  /* 🔴 [2026-09-18 · 사장님] 「내일부터 1, 2, 5번 세션만 보고해라」
     ⭐ 범위가 바뀐 것을 보고에 적어 둔다. 안 적으면 수가 줄어든 것이
       「실적이 줄었다」로 읽힌다 — 그것은 사실이 아니다. */
  쓴다('', '⚠ **2026-09-19 부터 보고에 담는 자리는 1번·2번·5번 셋입니다**(사장님 지시).', '');
  쓴다('  3번·4번·6번은 표에서 뺐습니다 — 일을 접은 것이 아니라 보고 범위가 좁아진 것입니다.', '');
  /* 🔴 [2026-09-18 · 사장님] 「너와 에스마켓츠는 마켓데이터 수집하니까 콘텐트를 당분간 1/3로 줄여서 해」
     ⇒ 5번·6번만 3분의 1이다. 다른 유닛은 그대로다 — 넓혀 읽지 않는다.
     ⚠ 「당분간」이라 사장님이 다시 정하시면 되돌린다. 내가 임의로 되돌리지 않는다. */
  /* 🔴 [2026-09-18 밤] 분장이 바뀌어 이 집합의 뜻을 다시 잡았다.
   *   옛 집합은 ['5','6'] 이었다 — 그때 5번이 K Culture Wire 를 맡고 있었고,
   *   사장님이 「너와 에스마켓츠는 마켓데이터 수집하니까 콘텐트를 당분간 1/3로」 하셨다.
   *   지금은 KCW 가 1번에게 갔고 6번은 보고에서 빠졌다. 그대로 두면 아무 데도 안 걸린다.
   * ⇒ 3분의 1은 «콘텐트 말고 큰 일을 함께 진 자리»에 걸리는 것이다. 지금 그 자리는 2번이다 —
   *   사장님: 「2번한테 케이라이프맵 콘텐트 발행, s마켓츠 개발 업무 분담시켜라」
   *   1번은 나머지 사이트를 «전부» 맡았지만 유닛은 하나이므로 몫은 6·1·1 그대로다.
   *   그 6편을 여러 사이트에 나눠 내면 된다(사장님 2026-09-03 의 몫은 «유닛당»이다).
   * ⚠ 이 갈래는 내가 판단한 것이다. 사장님께 보고하며 밝혔다 — 다시 정해 주시면 따른다. */
  /* 🔴 [2026-09-19] 1번이 모든 사이트를 맡으면서 KLifeMap 콘텐트가 1번으로 갔다.
     2번은 SeoulMarkets 개발만 진다 — 콘텐트 몫을 3분의 1로 두던 갈래가 없어졌다. */
  const 줄인유닛 = new Set([]);
  /* 🔴🔴 [2026-09-19 · 사장님이 내 판단을 바로잡으셨다] 「**1번은 세 유닛*6=18편 제작**」
   *   나는 「유닛은 하나이므로 몫도 6편이고 그것을 세 사이트에 나눠 내면 된다」고
   *   보고드렸는데 그 자리에서 바로잡히셨다. **몫은 «유닛당»이 아니라 «사이트당»이다.**
   *   1번이 세 사이트를 맡았으니 텍스트 18 · 영상 3 · 기타 3 이다.
   * ⭐ 사이트 수를 손으로 박지 않고 «맡은 자리 수»에서 센다 — 사이트가 늘거나 줄면
   *   이 수가 저절로 따라간다. 손으로 박으면 다음에 또 어긋난다. */
  const 맡은사이트수 = (u) => {
    /* 사이트 수를 손으로 적어 둔 자리가 있으면 그것이 먼저다 — 형제 저장소에 있는
       사이트는 여기서 경로로 셀 수 없기 때문이다(KLifeMap). */
    if (Number(u.맡은사이트수) > 0) return Number(u.맡은사이트수);
    const 갈래 = [u.콘텐트, u.아스트로지면, u.지면].filter((x) => x && x.length);
    const 길수 = 갈래.reduce((a, x) => a + x.length, 0);
    return Math.max(1, 길수);
  };
  const 몫고르기 = (u) => {
    const 번호 = u.번호;
    if (줄인유닛.has(String(번호).replace(/번$/, ''))) {
      return { 텍스트: 2, 영상: 1, 기타: 1, 꼬리: ' (3분의 1 · s마켓츠 개발 분담)' };
    }
    const n = 맡은사이트수(u);
    return n > 1
      ? { 텍스트: 6 * n, 영상: n, 기타: n, 꼬리: ` (사이트 ${n}곳 × 6편)` }
      : { 텍스트: 6, 영상: 1, 기타: 1, 꼬리: '' };
  };
  쓴다('### 1-2. 하루 몫 세 줄 — **사이트마다 텍스트 6 · 영상 1 · 기타 1**', '');
  쓴다('⚠ 몫은 «유닛당»이 아니라 **«사이트당»**입니다 — 사장님 2026-09-19 「1번은 세 유닛*6=18편 제작」', '');
  쓴다('⚠ 2번은 s마켓츠 개발을 함께 분담하므로 **당분간 3분의 1**입니다 — 텍스트 2편 (사장님 2026-09-18)', '');
  쓴다('| 유닛 | 텍스트 | 영상 | 기타·카드 |');
  쓴다('| --- | --- | --- | --- |');
  for (const u of 유닛들) {
    const p = 발행.get(u.번호);
    const 칸 = (수, 몫) => (수 === null ? '⬜ 못 쟀다' : `${수} / ${몫}` + (수 >= 몫 ? ' ✅' : ' 🔴'));
    /* ⛔ [2026-09-18 · 사장님 「2번은 그럼 놀잖아」] 「그 몫이 없는 유닛」이라고 적으면
       그 자리는 노는 자리로 읽힌다. 무엇이 몫인지를 «그 칸에서» 말한다. */
    const 없음 = (자리) => (자리 && 자리.length ? null : (u.대신몫 || '— (잣대 없음)'));
    const 텍스트자리 = (u.콘텐트.length || u.아스트로지면?.length) ? [1] : [];
    const 몫 = 몫고르기(u);
    쓴다(`| ${u.번호} ${u.이름}${몫.꼬리} | ${없음(텍스트자리) ?? 칸(p.편수, 몫.텍스트)}`
      + ` | ${없음(u.영상) ?? 칸(p.영상수, 몫.영상)} | ${없음(u.카드) ?? 칸(p.카드수, 몫.기타)} |`);
  }
  쓴다('');
  쓴다('⛔ **셋을 따로 셉니다.** 텍스트를 일곱 편 내고 영상을 안 냈으면 그날 몫은 못 채운 것입니다.');
  쓴다('⛔ 파일 «시각»이 아니라 **git 이 그날 새로 들인 파일**을 셉니다 — 손대기만 해도 바뀌는 수를 쓰지 않습니다.', '');

  쓴다('### 1-3. ⛔ 커밋 수는 콘텐트가 아닙니다', '');
  쓴다('두 칸을 나란히 둔 까닭입니다. 커밋에는 로그·보고·수집이 다 섞여 있어, 커밋만 세면');
  쓴다('일한 것처럼 보입니다. **오른쪽 「발행 편수」가 손님에게 실제로 나간 것**입니다.', '');
  쓴다('### 1-4. 「공격형」을 우리가 어떻게 갈랐나 — 규칙을 그대로 적습니다', '');
  쓴다('⚠ **이것은 판정이 아니라 대리 지표입니다.** 자동으로 잴 수 있는 것만 셌습니다.', '');
  쓴다('```');
  쓴다('이슈화    자료 기준일(dataAsOf)이 발행일에서 7일 안 — 살아 있는 일에 붙었다');
  쓴다('이슈를 만듦    제목에 우리가 잰 «수»가 있다 — 남이 낸 이야기를 옮긴 것이 아니다');
  쓴다('```');
  쓴다('');
  쓴다('🔴 첫 판은 「이슈를 만듦」을 `pages:` 앞말로 쟀는데, 재 보니 그 칸은 KCW 142편 전부에 있고');
  쓴다('SeoulMarkets 111편에 **하나도 없었습니다.** 그러면 6번은 규칙상 언제나 0 이 됩니다.');
  쓴다('그래서 **두 사이트에 다 걸리는 것**으로 바꿨습니다. 헛도는 자는 없는 자보다 나쁩니다.', '');
  /* ⛔ [2026-10-03] 굵게(**)를 «두 줄에 걸쳐» 쓰지 않는다 — 여는 별표와 닫는 별표가
     서로 다른 문단으로 갈려 별표가 글자로 샌다. PDF 2쪽에서 실제로 그렇게 찍혔다. */
  쓴다('한 편이 둘 다일 수 있고 둘 다 아닐 수 있어 겹쳐 셉니다.');
  쓴다('**「기사가 실제로 이슈를 일으켰나」는 이 자로 못 잽니다 — 그것은 3의 외부 반응에서 봅니다.**', '');
  /**
   * 🔴 사장님 지시 (2026-09-03): 「**이슈화 │ 이슈를 만듦 >>> 어떤 내용인 지 알고 싶다.
   *   별도 표로 만들어라. 같은 파일 내에**」
   * ⛔ 앞의 표는 «몇 편»만 말한다. 그것만으로는 무엇을 낸 하루였는지 알 수 없다.
   * ⛔ 갈래만 ✅ 로 찍지 않는다 — **왜 그렇게 갈렸는지**(늦음 며칠 · 제목에 든 수)를 같이 낸다.
   */
  쓴다('### 1-5. 어제 나간 글 한 편씩 — 무엇이고, 어느 갈래인가', '');
  const 편전부 = 유닛들.flatMap((u) => (발행.get(u.번호).편들 ?? []).map((x) => ({ ...x, 유닛: u.번호 })));
  if (!편전부.length) {
    쓴다('⬜ **어제 나간 글이 없습니다.** 0 편입니다 — 못 쟀다가 아니라 «없다»입니다.', '');
  } else {
  쓴다('| 유닛 | 제목 | 무엇을 말한 글인가 | 반응 | 만듦 |');
    쓴다('| --- | --- | --- | :-: | :-: |');
    for (const x of 편전부) {
      쓴다(`| ${x.유닛} | ${칸글(x.제목, 70)} | ${x.무엇 ? 칸글(x.무엇, 150) : '⬜ 앞말에 dek 이 없다'}`
        + ` | ${x.반응 ? '✅' : '—'} | ${x.만듦 ? '✅' : '—'} |`);
    }
    쓴다('');
    쓴다('#### 왜 그 갈래로 갈렸나 — 근거를 그대로 냅니다', '');
    쓴다('| 유닛 | 제목 | 바깥 자료 시각 | 우리 배포 시각 기준 | 시차 | 지면열림 | 평균 넘나 |');
    쓴다('| --- | --- | --- | --- | ---: | ---: | :-: |');
    for (const x of 편전부) {
      쓴다(`| ${x.유닛} | ${칸글(x.제목, 40)} | ${x.기준일 ?? '⬜ 없다'}`
        + ` | ${x.배포기준 ? '배포 도장' : '⚠ 발행일(도장 못 찾음)'}`
        + ` | ${x.시차 === null ? (x.이슈시계 === null ? '— 해당 없음' : '⬜ 못 쟀다') : `${x.시차.toFixed(1)}시간`}`
        + ` | ${x.열림 === null ? '⬜ 못 쟀다' : x.열림}`
        /* ⛔ [2026-10-03] 이 칸만 「⬜」를 «홀로» 찍어 흰 바탕에서 뜻이 안 읽혔다.
           PDF 3쪽에서 보라 네모 하나로만 보였다. 말로 적는다. */
        + ` | ${x.평균넘나 === null ? '못 쟀다' : (x.평균넘나 ? '✅' : '—')} |`);
    }
    쓴다('');
    쓴다('**사장님이 2026-09-03 에 고치신 기준 그대로입니다.**', '');
    쓴다('```');
    쓴다(`이슈화   바깥 콘텐트 발행 시각에서 **${반응한도}시간 안**에 우리가 냈나.`);
    쓴다('             우리 쪽 시계는 **배포**다(「배포 도장」 커밋). 발행일이 아닙니다.');
    쓴다('이슈 메이킹   1. 제목이 관심을 확 끄나(**판단**) 2. 그래서 방문이 **평균보다 많나**(**잰 수**)');
    쓴다(`             평균은 우리 기사 지면 ${기사지면.length}개의 지면열림 평균 = ${평균열림 ?? '⬜ 못 쟀다'}`);
    쓴다('```');
    쓴다('⛔ 2.를 못 잰 지면은 **0 이 아니라 ⬜(못 쟀다)** 입니다 — GA4 에 줄이 없으면 수를 지어내지 않습니다.');
    쓴다('');
    쓴다('🔴 **다만 이 ⬜ 를 「모르겠다」로 읽지 마십시오.** GA4 는 열림이 0 인 지면에는 줄 자체를 안 냅니다.');
    쓴다('   그러니 지면이 살아 있는데 줄이 없다는 것은, 대개 **아무도 안 열었다**는 뜻입니다.');
    쓴다('   ⚠ 그래도 0 으로 안 적는 까닭 — 어제 낸 지면은 창(28일 · 어제까지) 안에 하루도 채 못 있었고,');
    쓴다('   GA4 는 마지막 하루치가 덜 들어와 있습니다. **「0 이다」와 「0 인 듯하다」를 가릅니다.**');
    쓴다('   ⇒ 며칠 뒤 같은 자로 다시 재면 그때는 0 인지 아닌지가 갈립니다. 그 재기를 거르지 않습니다.');
    쓴다('⛔ 1.은 제가 «읽고 매긴 판단»입니다. 제목을 위 표에 그대로 실어 두었으니 뒤집으실 수 있습니다.', '');
  }

  쓴다('## 2. SEO·GEO 맞춤 — 라이브에서 잰 것', '');
  쓴다(`잰 시각 ${지금.toLocaleString('ko-KR')} KST`, '');
  쓴다('| 유닛 | 사이트 | llms.txt (GEO) | robots.txt | sitemap.xml |');
  쓴다('| --- | --- | --- | --- | --- |');
  for (const g of geo) {
    if (g.못쟀다) { 쓴다(`| ${g.번호} | ${g.이름} | — | — | ${g.못쟀다} |`); continue; }
    const 칸 = (x) => (x.코드 === 200 ? `✅ 200${x.줄 ? ` · ${x.줄}줄` : ''}` : x.코드 ? `🔴 ${x.코드}` : `⬜ 못 쟀다(${x.탈})`);
    쓴다(`| ${g.번호} | ${g.도메인} | ${칸(g.llms)} | ${칸(g.rob)} | ${칸(g.site)} |`);
  }
  쓴다('');
  const 빵 = geo.filter((g) => g.llms && g.llms.코드 !== 200);
  if (빵.length) {
    쓴다(`🔴 **llms.txt 가 없는 사이트 ${빵.length}곳** — ${빵.map((g) => `${g.도메인}(${g.번호})`).join(' · ')}`);
    쓴다('AI 크롤러가 우리 사이트를 안내받을 길이 그만큼 막혀 있습니다.', '');
  }

  /* 진짜 손님 자료 — 없거나 낡으면 «못 쟀다»로 적는다.  */
  let 진짜손님 = null;
  try {
    const 길 = path.join(뿌리, 'src', 'data', 'real-readers.json');
    if (fs.existsSync(길)) 진짜손님 = JSON.parse(fs.readFileSync(길, 'utf8'));
  } catch (e) { 진짜손님 = null; }
  쓴다('## 3. 외부 반응 — 사람이 실제로 왔나 (GA4 · 28일)', '');
  if (ga4 && ga4.표) {
    쓴다('| 사이트(호스트) | 유닛 | 순방문자 | 방문 횟수 | 지면 열림 |');
    쓴다('| --- | --- | ---: | ---: | ---: | ---: |');
    const 임자 = (h) => (유닛들.find((u) => u.도메인 && h.includes(u.도메인.replace(/^www[.]/, '')))?.번호) ?? '—';
    for (const r of ga4.표) {
      쓴다(`| ${r.호스트} | ${임자(r.호스트)} | **${r.순방문.toLocaleString('en-US')}** | ${r.세션.toLocaleString('en-US')}`
        + ` | ${r.지면열림.toLocaleString('en-US')} |`);
    }
    쓴다('');
    쓴다('**열이 무슨 뜻인가** — 이름만 보고 헷갈리지 않게 적습니다.', '');
    쓴다('| 열 | 뜻 | 헷갈리기 쉬운 것 |');
    쓴다('| --- | --- | --- |');
    쓴다('| 사이트(호스트) | 방문이 일어난 «주소». 같은 사이트라도 www 유무·임시주소가 따로 잡힙니다 | 같은 사이트가 두 줄로 나뉠 수 있습니다 |');
    쓴다('| 유닛 | 그 호스트를 맡은 유닛 | 임시주소·localhost 는 임자가 없습니다 |');
    쓴다('| 순방문자 | 28일 동안 «서로 다른 사람» 수 (GA4 totalUsers) | 같은 사람이 열 번 와도 1 입니다 |');
    쓴다('| 방문 횟수 | 그 사람들이 «몇 번» 왔나 (sessions) | 사람 수보다 큽니다 |');
    쓴다('| 지면 열림 | 지면이 «몇 번» 열렸나 (screenPageViews) | 방문 횟수보다 큽니다 |');
    쓴다('⛔ 「하루 몇 명꼴」 칸은 없앴습니다 — 28일을 28로 나눈 수는 사장님이 금하셨습니다(2026-10-16).');
    쓴다('   하루 수는 바로 아래 3-1 에 «어제 실측»으로 적습니다.');
    쓴다('');
    쓴다('⚠ `localhost` · `127.0.0.1` · `port-0-…cloudtype.app` 은 **손님이 아닙니다** — 우리가 만들며 연 것과');
    쓴다('임시 주소입니다. `parkintaek2-gif.github.io` 는 백업 경로입니다. 셋을 손님 수에 넣지 않습니다.', '');
    /* 🔴🔴 [2026-09-23 · 5번] **이 표가 「우리」를 「방문자」로 세고 있었다.**
     *
     * 사장님이 2026-09-22 에 바로 이 자리를 짚어 주셨다 —
     *   내가 「방문자가 189% 늘었습니다」라고 올리자 사장님: 「**그제까진 감명서 감수
     *   때문에 우리가 많았겠지만..**」
     * 갈라서 재 보니 사장님 말씀이 그대로 맞았다. klifemap.ai 의 날마다 수 —
     *   09-16  진짜 손님 14 / 우리로 보임 77
     *   09-18  진짜 손님  4 / 우리로 보임 84
     *   09-21  진짜 손님  2 / 우리로 보임 75
     * 곧 「574명 방문」의 대부분이 **우리가 라이브를 확인하러 들어간 것**이었다.
     *
     * ⇒ 이 표에 «진짜 손님» 칸을 세운다. 없으면 이 보고서가 날마다 사장님께
     *   부풀려진 수를 올린다. 9월 목표는 유닛당 하루 1,000명이고, 그 목표에 다가가는지를
     *   재는 수가 틀리면 그 위에 세운 판단이 다 틀린다.
     * ⛔ 전체 수를 지우지는 않는다 — 숨기면 「못 쟀다」가 되어 더 나쁘다. 나란히 낸다.
     * ⚠ 「Direct = 우리」는 «어림»이다. 손님도 주소를 친다. 방문자가 수백이 되면 못 쓴다. */
    쓴다('', '### 3-1. 🔴 그 가운데 «진짜 손님»은 몇인가');
    쓴다('');
    쓴다('검색·AI 답변·소셜을 타고 들어온 사람만 셉니다. 주소를 바로 친 것(Direct)과');
    쓴다('갈래를 모르는 것(Unassigned)은 **우리가 라이브를 확인한 것일 수 있어** 갈라 둡니다.', '');
    /* 🔴🔴🔴 [2026-10-25 · 사장님] 「네이버 애널리틱스상 어제 케이라이프맵 방문자수가 22명인데
         너는 방문자수를 **2명도 아닌 2.1이라고 업무보고** 했네」
       ─────────────────────────────────────────────────────────────────────
       [무엇이 잘못이었나] 여기 적히던 수는 두 가지가 한꺼번에 어긋나 있었다.
         ① **28일 합을 28로 나눈 평균**이었다 — 사람은 소수점이 될 수 없다
         ② **2026-10-15 에 잰 값**이 파일에 그대로 굳어 날마다 복사돼 나갔다
       두 가지 다 사장님이 2026-10-16 에 금하신 것이다 —
         「왜 자꾸 하루방문자가 아닌 28일치를 언급하나. 앞으론 절대 금지」
       ⇒ 어제 «하루» 수를 **그 자리에서 다시 재서** 적는다. 자는 하나다(잰다-하루방문자.mjs).
       ⛔ 묵은 파일(real-readers.json)로 되돌리지 않는다. 못 재면 못 쟀다고 적는다. */
    let 어제손님 = null;
    try {
      const 자 = await import('./잰다-하루방문자.mjs');
      const 것 = await 자.재온다(1);
      if (것 && 것.손님 && 것.손님.length) {
        const 잰날 = [...new Set(것.손님.map((r) => r.날))].sort().pop();
        const 그날 = 것.손님.filter((r) => r.날 === 잰날);
        어제손님 = { 날: 잰날, 줄: 자.사이트별하루(그날), 목표대비: 자.목표대비 };
      }
    } catch (e) { 어제손님 = null; }

    if (어제손님 && 어제손님.줄.length) {
      const 보기좋게 = (날) => (날 && 날.length === 8
        ? `${날.slice(0, 4)}-${날.slice(4, 6)}-${날.slice(6)}` : 날);
      쓴다(`어제(${보기좋게(어제손님.날)}) **하루** 수입니다. 28일 합도, 나눗셈 평균도 쓰지 않습니다.`, '');
      쓴다('| 사이트 | 어제 하루 손님 | 목표(1,000명) 대비 | 어디서 왔나 |');
      쓴다('| --- | ---: | ---: | --- |');
      for (const r of 어제손님.줄) {
        const 갈래 = Object.entries(r.갈래).sort((a, b) => b[1] - a[1])
          .map(([c, n]) => `${c} ${n}`).join(' · ') || '없음';
        쓴다(`| ${r.사이트} | **${r.명.toLocaleString('en-US')}명** | ${어제손님.목표대비(r.명)}% | ${갈래} |`);
      }
      쓴다('');
      쓴다('⚠ GA4 하나만 보는 수입니다. **한글 사이트는 네이버 애널리틱스도 함께** 봐야 합니다 —');
      쓴다('   두 자는 세는 법이 달라 수가 갈립니다(2026-10-25 KLifeMap: GA4 45명 · 네이버 22명).');
      쓴다('⛔ 위 표의 큰 수를 「방문자」라고 읽지 않습니다. 이 표가 목표와 견줄 수 있는 수입니다.', '');
    } else {
      쓴다('⬜ **못 쟀습니다** — GA4 에서 어제 하루 줄을 못 받았습니다. 0 으로도, 묵은 값으로도 적지 않습니다.');
      쓴다('되살리는 법: `node scripts/잰다-하루방문자.mjs --날수 1`', '');
    }
  } else {
    쓴다('⬜ **못 쟀습니다** — GA4 보고가 이 자리에서 안 돌았습니다. 0 으로 적지 않습니다.', '');
  }
  쓴다('⚠ GA4 는 광고차단·쿠키거부로 **덜 세는 쪽**입니다. 바닥값으로 읽습니다.', '');

  쓴다('## 4. 앞서 「못 쟀다」던 셋 — **해결했습니다** (사장님 2026-09-03 「해결해」)', '');
  쓴다('| 무엇 | 전에는 | 지금은 어떻게 재나 |');
  쓴다('| --- | --- | --- |');
  쓴다('| 영상 편수 | 사이트마다 자리가 달라 못 셈 | 유닛마다 «영상 두는 자리»를 목록에 적었습니다. `public/video`(6번)·`public/wikitip/video`(5번)·`public/100y/video`(3번). git 이 그날 새로 들인 `.mp4` 를 셉니다 |');
  쓴다('| 기사가 일으킨 반응 | 세는 길이 없음 | GA4 «지면열림»을 지면 하나하나까지 받아(`--지면전부`) 그 글의 수를 붙였습니다. 위 1-5 표의 「지면열림」 칸입니다 |');
  /* ⛔ [2026-10-03] 코드칸(``) 안에 ** 를 넣지 않는다 — 굵게가 어긋나 별표가 글자로 샌다 */
  쓴다('| klifemap 발행 | 지면이 마크다운이 아니라 못 셈 | 마크다운을 세는 대신 **git 이 그날 손댄 public/ 의 .html** 을 셉니다 — 손님에게 나가는 지면이 그것입니다 |');
  쓴다('');
  {
    const kl = 그날손댄파일(날, ['public'], '.html', '../klifemap');
    쓴다(`**1번 klifemap — ${날} 에 손댄 지면(.html): ${kl === null ? '⬜ 못 쟀다' : `${kl.length}개`}**`);
    if (kl && kl.length) {
      쓴다('');
      for (const x of kl.slice(0, 12)) 쓴다(`- ${x}`);
      if (kl.length > 12) 쓴다(`- … 그 밖 ${kl.length - 12}개`);
    }
    쓴다('');
    쓴다('⚠ 「손댄 것」은 「새로 낸 것」과 다릅니다. klifemap 은 지면을 고쳐 쓰는 사이트라 새로 들인 것만 세면');
    쓴다('   거의 늘 0 이 됩니다. 그래서 **고친 것까지** 셉니다 — 그 사실을 감추지 않고 이렇게 적습니다.', '');
  }
  쓴다('### 아직도 못 재는 것 — ', '');
  쓴다('- **남이 우리를 인용했나** — AI 답변·기사에서의 인용을 세는 길이 아직 없습니다. 4번이 `measure-ai-citations.mjs` 로 첫 기록을 시작했습니다.');
  쓴다('- **제목이 관심을 끄는가** — 이것은 잰 수가 아니라 «판단»입니다. 제목을 표에 그대로 실어 뒤집으실 수 있게 했습니다.', '');

  /**
   * 🔴 사장님 지시 (2026-09-03) 두 마디를 그대로 따른다 —
   *   「**업무보고에 어제 점검 결과를 파일로 저장해. 콘텐트 점검_날짜 파일로**」
   *   「**콘텐트 점검 폴더를 만들어라**」 · 「**업무보고와 같은 레벨**」
   *   → `OneDrive\콘텐트 점검\콘텐트 점검_YYYYMMDD.md` (업무보고와 «나란히» 둔다)
   * ⚠ 저장소 쪽에도 한 벌 둔다. 원드라이브가 안 붙은 기계에서도 남아야 한다.
   */
  const 원드라이브 = path.join(process.env.USERPROFILE ?? '', 'OneDrive');
  const 점검방 = path.join(원드라이브, '콘텐트 점검');
  const 이름 = `콘텐트 점검_${날.split('-').join('')}`;
  const 낼곳 = fs.existsSync(원드라이브) ? 점검방 : path.join(뿌리, 'docs/보고/전유닛-점검');
  fs.mkdirSync(낼곳, { recursive: true });
  const md = path.join(낼곳, `${이름}.md`);
  fs.writeFileSync(md, 줄.join(LF) + LF, 'utf8');
  const 사본방 = path.join(뿌리, 'docs/보고/전유닛-점검');
  fs.mkdirSync(사본방, { recursive: true });
  fs.writeFileSync(path.join(사본방, `${이름}.md`), 줄.join(LF) + LF, 'utf8');
  console.log(`보고서를 냈다 — ${md}`);
  console.log(`저장소 사본 — docs/보고/전유닛-점검/${이름}.md`);
  console.log(`발행 ${총편수}편 · 이슈화 ${총반응} · 이슈생성 ${총만듦} · llms.txt 빠진 곳 ${빵.length}`);

  /*
   * 🔴 [2026-09-03 21:3x · 5번] **PDF 가 «조용히» 안 나오고 있었다.**
   *
   *   사장님 지시로 보고서는 PDF 로 드려야 한다 — 마크다운은 표가 깨져서 못 보신다.
   *   그런데 이 자리가 늘 「⬜ PDF 는 못 냈다」를 찍고 있었고, 아무도 «왜»를 몰랐다.
   *
   *   까닭 둘.
   *   1) `path.relative(뿌리, md)` 가 «쓰레기 경로»를 냈다 —
   *      `뿌리` 는 슬래시, `md` 는 역슬래시라 섞였고 결과가 이랬다:
   *        UsersUserOneDrive콘텐트 점검콘텐트 점검_20260902.md
   *      그러니 md-to-pdf 가 그 파일을 못 찾는 것이 당연하다.
   *      ⭐ 그리고 낼 곳은 OneDrive 인데 «저장소 뿌리 기준 상대 경로»를 넘기고 있었다.
   *   2) `catch { pdf = null }` 가 오류를 **먹었다.** 무엇이 틀렸는지 한 줄도 안 남겼다.
   *      ⛔ 조용히 성공한 척하는 것이 제일 나쁘다 — 오늘 하루 이 병을 여러 곳에서 고쳤다.
   *
   *   ✅ 고침: «절대 경로»를 넘기고, 실패하면 «까닭을 찍는다».
   *   ✅ 그리고 저장소 사본으로 만든 뒤 OneDrive 로 «복사»한다 —
   *      OneDrive 경로에 공백·한글이 섞여 있어 그쪽에서 바로 만드는 것보다 안전하다.
   */
  /**
   * 🔴🔴 [2026-09-05 23:2x] 사장님: 「**.md 파일 표 다 깨져. 엑셀로 보내던지 pdf로 보내던지.**」
   *
   * PDF 는 이미 낸다(오늘치 8쪽을 재서 확인했다). 그래도 **엑셀을 함께 낸다** —
   * PDF 는 «읽는» 것이고 엑셀은 «따져 보는» 것이다. 사장님은 수를 정렬하고 걸러 보신다.
   *
   * ⭐ 엑셀 라이브러리를 새로 들이지 않았다. **CSV 에 UTF-8 BOM** 을 붙이면 엑셀이
   *   한글을 안 깨뜨리고 칸을 제대로 나눠 연다. 의존성 하나가 늘면 그것도 언젠가 깨진다.
   * ⛔ BOM 을 빼면 엑셀이 한글을 깨뜨린다 — 그 한 바이트가 이 칸의 전부다.
   */
  const csv칸 = (v) => {
    const s = String(v ?? '').replace(/\r?\n/g, ' ');
    return /[",]/.test(s) ? `"${s.split('"').join('""')}"` : s;
  };
  const csv줄들 = [['유닛', '사이트', '발행 편수', '이슈화', '이슈를 만듦', '어제 커밋',
    '텍스트(몫 6)', '영상(몫 1)', '기타·카드(몫 1)']];
  for (const u of 유닛들) {
    const p = 발행.get(u.번호);
    const 텍스트있나 = u.콘텐트.length || u.아스트로지면?.length;
    csv줄들.push([
      `${u.번호}번`, u.사이트 ?? '',
      텍스트있나 ? p.편수 : '—',
      반응표시(p, 텍스트있나, true),
      !텍스트있나 ? '—' : p.만듦,
      p.커밋 ?? '',
      p.텍스트 ?? '', p.영상 ?? '', p.기타 ?? '',
    ]);
  }
  const csv길 = path.join(사본방, `${이름}.csv`);
  try {
    fs.writeFileSync(csv길, '﻿' + csv줄들.map((r) => r.map(csv칸).join(',')).join('\r\n'), 'utf8');
    console.log(`   엑셀로 열 수 있게 CSV 도 냈다 — ${path.basename(csv길)}`);
    const 원드csv = md.replace(/\.md$/, '.csv');
    try { fs.copyFileSync(csv길, 원드csv); console.log(`   OneDrive 에도 놓았다 — ${path.basename(원드csv)}`); }
    catch (e) { console.log(`   🔴 CSV 를 OneDrive 에 못 놓았다 — ${String(e.code || e.message).slice(0, 24)}`); }
  } catch (e) {
    console.log(`   🔴 CSV 를 못 냈다 — ${String(e.message).slice(0, 60)}`);
  }

  /**
   * 🔴🔴 사장님 지시 (2026-10-03 밤, 원문): 「**표가 다 깨진다. 슬라이드나 워드로 보내**」
   *
   *   이 자는 2026-09-05 지시(「.md 파일 표 다 깨져. 엑셀로 보내던지 pdf로 보내던지」)로
   *   PDF 를 붙여 왔다. 그런데 **사장님 화면에서는 PDF 도 표가 깨진다.**
   *   ⇒ 나중 지시가 앞선 것을 덮는다. **워드(.docx)** 로 낸다.
   *
   * ⚠ PDF 는 더 만들지 않는다 — 둘을 다 붙이면 어느 것을 보실지 헷갈리신다.
   * ⭐ 판별법 — 그 글에 표가 들어 있으면 PDF·마크다운으로 보내지 않는다.
   */
  let pdf = null;
  const 사본md = path.join(사본방, `${이름}.md`);
  try {
    execFileSync(process.execPath, [path.join(뿌리, 'scripts/md-to-docx.mjs'), 사본md],
      { cwd: 뿌리, stdio: 'pipe' });
    const 만든것 = 사본md.replace(/\.md$/, '.docx');
    if (fs.existsSync(만든것)) {
      pdf = 만든것;
      /*
       * OneDrive 쪽에도 같은 PDF 를 둔다 — 사장님이 그 폴더를 보신다.
       * 🔴 [2026-09-03 실측] 덮어쓰기가 **EBUSY** 로 막힌다. OneDrive 가 그 파일을 붙잡고 있다.
       *   ⛔ 그때 조용히 넘기면 사장님 폴더에는 «옛 판»이 남는다. 오늘 실제로 07:09 자
       *      277KB 판이 남아 있었고, 새로 만든 371KB 판은 저장소에만 있었다.
       *   ✅ 그러니 막히면 **딴 이름으로라도 새 판을 넣는다.** 없는 것보다 낫고,
       *      이름에 시각이 들어가니 어느 것이 새 것인지 사장님이 바로 아신다.
       */
      const 원드라이브pdf = md.replace(/\.md$/, '.docx');
      let 놓았나 = null;
      try { fs.copyFileSync(만든것, 원드라이브pdf); 놓았나 = 원드라이브pdf; }
      catch (e1) {
        const 두자 = (n) => String(n).padStart(2, '0');
        const 때 = new Date(); /* ⚠ 이 PC 는 이미 KST 다 */
        const 딴이름 = 원드라이브pdf.replace(/\.docx$/, `_${두자(때.getHours())}${두자(때.getMinutes())}.docx`);
        try { fs.copyFileSync(만든것, 딴이름); 놓았나 = 딴이름; }
        catch (e2) {
          console.log(`   🔴 OneDrive 에 못 놓았다 — 덮기: ${String(e1.code || e1.message).slice(0, 20)}`
            + ` · 딴이름: ${String(e2.code || e2.message).slice(0, 20)}`);
        }
      }
      if (놓았나) console.log(`   OneDrive 에도 놓았다 — ${path.basename(놓았나)}`);
    }
  } catch (e) {
    /* ⛔ 먹지 않는다. 무엇이 틀렸는지 남긴다 */
    console.log(`   🔴 워드를 만들다 걸렸다 — ${String(e.message).slice(0, 160)}`);
  }
  console.log(pdf
    ? `워드로 냈다 — ${path.basename(pdf)} (${Math.round(fs.statSync(pdf).size / 1024)}KB)`
    : '🔴 워드를 못 냈다 — md 로만 낸다. ⛔ 사장님은 md 표를 못 보신다. 위 까닭을 고쳐야 한다');

  /**
   * 🔴 받는 주소를 **소스에 박지 않는다.** `send-mail.mjs` 가 처음부터 못박아 둔 규칙이고
   *   (「받는 사람 주소를 저장소에 커밋하지 않는다 — 인자로 받는다」) 나는 그걸 알면서
   *   2026-09-03 에 기본값으로 박았다가 바로 물렸다.
   * ⚠ 그때 내가 고른 주소도 틀렸다 — 저장소에 있던 것은 **사이트 관리자 로그인 아이디**였고,
   *   사장님이 주신 보고 받는 곳은 다른 주소였다. **저장소에서 찾은 주소가 곧 보고처가 아니다.**
   * ✅ 순서: --받는곳= → `.보고받는곳`(커밋 안 됨) → 없으면 **세운다**
   */
  const 주소파일 = path.join(뿌리, '.보고받는곳');
  const 받는곳 = 인자('받는곳')
    ?? (fs.existsSync(주소파일) ? fs.readFileSync(주소파일, 'utf8').trim() : null);
  if (!process.argv.includes('--보낸다')) {
    console.log(LF + '⭐ 메일은 안 보냈다. 보내려면 --받는곳=… --보낸다');
    process.exit(0);
  }
  if (!받는곳 || !받는곳.includes('@')) {
    console.error('⛔ 받는곳이 없다. 짐작으로 안 보낸다.');
    console.error('   고치는 법 — .보고받는곳 파일에 주소 한 줄을 적거나 --받는곳= 을 준다');
    process.exit(1);
  }
  /**
   * 🔴 [2026-09-03 23:3x] **사장님: 「pdf첨부 빠짐」** — 그 지적은 send-mail.mjs 쪽만 고쳐졌고
   *   이 자는 안 고쳐져 있었다. 그래서 23:33 에 보낸 두 통이 «둘 다 첨부 없이» 나갔다.
   *
   *   까닭 둘 —
   *     · 위에서 PDF 를 만들어 놓고도 send-mail 에 넘기지 않았다
   *     · 손으로 준 `--첨부=…` 는 이 자의 인자() 가 «조용히 버렸다»
   *
   * ⭐ 사장님은 md 표를 못 보신다(그 지시가 이 자를 만든 까닭이다). PDF 는 옵션이 아니라
   *   «본문»이다. 있으면 언제나 붙인다.
   * ⚠ 손으로 준 --첨부 는 길이 실제로 있는지 보고, 없으면 안 보낸다 —
   *   오타 하나로 첨부가 빠지는 것보다 서는 것이 낫다(send-mail 이 간 길과 같다).
   */
  const 손첨부 = 인자('첨부');
  if (손첨부 && !fs.existsSync(손첨부)) {
    console.error(LF + '⛔ --첨부 로 준 길에 파일이 없다 — **안 보낸다.**');
    console.error('   준 길: ' + 손첨부);
    console.error('   ⚠ 조용히 첨부 없이 보내지 않는다. 길을 고쳐 다시 돌리십시오.');
    process.exit(1);
  }
  const 붙일것 = 손첨부 || pdf || null;

  /**
   * 🔴 [2026-09-09 23:3x] **쪽수 관문을 여기에도 붙인다.**
   *
   * 사장님이 사흘 연속으로 같은 지적을 하셨다 —
   *   09-05 「.md 파일 표 다 깨져... pdf 보낸건 1페이지야」
   *   09-06 「업무보고 제대로 안하나. pdf 표지 한장이잖아」
   *   09-09 「pdf는 표지만 있고...자꾸 동일한 실수할래?」
   *
   * ⛔ 그때 관문을 `send-1600-report.mjs` «한 자에만» 붙였다. 이 자에는 0개였다.
   *   그러니 이 자로 보내면 표지 한 장도 그냥 나간다. **같은 구멍이 다른 문에 남아 있었다.**
   *   ⭐ 2026-09-03 에도 똑같은 무늬였다 — 「pdf첨부 빠짐」 지적이 send-mail 쪽만 고쳐지고
   *     이 자는 안 고쳐져서 두 통이 첨부 없이 나갔다(위 주석). **세 번째다.**
   *
   * ⇒ 결함을 고칠 때 «같은 일을 하는 다른 자»까지 따라간다(강령 ⑤).
   */
  if (붙일것) {
    /* 🔴 [2026-10-03] 첨부가 PDF 에서 워드로 바뀌었다. 쪽수재기 는 PDF 전용이라
       그대로 두면 관문이 «죽은 채로» 늘 통과한다 — 그것이 표지 한 장을 세 번 내보낸 꼴이다.
       ⇒ 워드에는 워드의 자를 댄다: 안에 «진짜 표»가 둘 이상 들어 있나. */
    if (/\.docx$/i.test(붙일것)) {
      const 표수 = 워드표세기(붙일것);
      if (표수 !== null && 표수 < 2) {
        console.error(LF + `⛔ 워드 안에 표가 ${표수}개뿐이다 — **안 보낸다.** 표지 한 장짜리가 세 번 나갔다.`);
        console.error('   ' + 붙일것);
        process.exit(1);
      }
      console.log(LF + `✅ 첨부 관문 — 워드 안의 표 ${표수 === null ? '수를 못 쟀다(그래도 막지 않는다)' : 표수 + '개'}`);
    } else {
      const 쪽 = 쪽수재기(붙일것);
      if (쪽 !== null && 쪽 < 2) {
        console.error(LF + `⛔ PDF 가 ${쪽}쪽이다 — **안 보낸다.** 표지 한 장짜리가 세 번 나갔다.`);
        console.error('   ' + 붙일것);
        console.error('   ⚠ 먼저 열어서 안에 유닛 표가 들어 있는지 보십시오.');
        process.exit(1);
      }
      console.log(LF + `✅ 쪽수 관문 — PDF ${쪽 === null ? '쪽수를 못 쟀다(그래도 막지 않는다)' : 쪽 + '쪽'}`);
    }
  }

  /* 아래 보낼인자만들기() 로 옮겼다 — 시험할 수 있게 하려고.
     🔴🔴 [2026-10-03] 이 자리가 두 번 막혔다. 둘 다 «조용히» 안 보내고 끝났다 —
     ① --봤다 를 send-mail 에 «안 넘겨» 첨부 관문이 늘 막았다.
        (16시 업무보고 자에서도 오늘 같은 결함을 고쳤다. 두 자가 같은 자리에서 걸렸다)
     ② --글 을 뿌리 기준 «상대 경로»로 넘겼는데, 원드라이브 사본은 뿌리 «밖»이라
        ......OneDrive… 가 되어 send-mail 이 못 찾았다. 절대 경로로 넘긴다. */
  const 보낼인자 = 보낼인자만들기({ 받는곳, 날, 총편수, 총반응, 총만듦, md, 붙일것,
    봤다: process.argv.includes('--봤다') });
  if (!붙일것) console.log(LF + '⚠ 붙일 워드가 없다 — 본문만 보낸다. 사장님은 md 표를 못 보신다.');
  execFileSync('node', 보낼인자, { cwd: 뿌리, stdio: 'inherit' });
}

#!/usr/bin/env node
/**
 * collect-100y-culture-attendance.mjs — **나이대별 문화예술 관람 — 무엇을, 얼마나 보나**
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 사장님 지시(2026-09-17): 「어떤 메뉴는 너무 얇고 어떤 메뉴는 너무 깊다, 밸런스를
 * 맞추는 것을 우선순위로」. 실측하니 「문화」 축이 /travel 한 장뿐이었다(다른 축은
 * 예체능 7장 등). /travel과 같은 문체부 계열 조사(국민여가활동조사, ORG 113)에서
 * 나이대별 문화예술 관람 표를 찾아 이 축을 보탠다 — «더 깊이 파는» 것이 아니라
 * «맞추는»것이 목적이라 한 장만 낸다.
 *
 * ── 표 하나, 3년치 · 나이대·장르별(복수응답) ──────────────────────
 *   DT_113_STBL_1029803  문화체육관광부 「국민여가활동조사」 문화예술행사별 관람률
 *   2023~2025 세 해. 영화·대중음악/연예·뮤지컬·연극·미술전시회·문학행사·
 *   서양음악 연주회·전통예술 공연·무용 아홉 갈래 + 「관람 안 함」.
 *
 * ── ⚠ 이 자료가 못 가르는 것 ───────────────────────────────────
 * · 복수응답이다 — 아홉 갈래 비율을 다 더해도 100%가 안 된다(한 사람이 여러 장르를 본다)
 * · 「관람 안 함」은 2023년 조사엔 이 항목 자체가 없었다(err — 다른 코드 체계였을 수
 *   있다) — 2023년 값은 비워 두고 2024~2025만 쓴다. 
 * · 표본조사다(전수조사 아님) — 나이대·장르로 잘게 갈릴수록 표본이 작아진다
 *
 * 쓰는 법  node scripts/collect-100y-culture-attendance.mjs [--selftest]
 */
import fs from 'node:fs';
import { 오늘 } from './_kst.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ORG = '113';
export const TBL = 'DT_113_STBL_1029803';

export function 수로(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, '').trim();
  if (!s || s === '-' || s === 'X') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** ⭐ 나이가 들수록 값이 계속 오르는지(모든 인접 구간에서 감소하지 않음) */
export function 단조증가(순서값들) {
  for (let i = 1; i < 순서값들.length; i++) {
    if (순서값들[i] == null || 순서값들[i - 1] == null) continue;
    if (순서값들[i] < 순서값들[i - 1]) return false;
  }
  return true;
}

/** ⭐ 나이가 들수록 값이 계속 낮아지는지 */
export function 단조감소(순서값들) {
  for (let i = 1; i < 순서값들.length; i++) {
    if (순서값들[i] == null || 순서값들[i - 1] == null) continue;
    if (순서값들[i] > 순서값들[i - 1]) return false;
  }
  return true;
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
  const 본다 = (말, 참) => { console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };
  본다('① 빈칸을 0 으로 만들지 않는다', 수로('-') === null && 수로('') === null && 수로(null) === null);
  본다('② 소수를 읽는다', 수로('10.15') === 10.15);
  본다('③ 콤마 섞인 값도 읽는다', 수로('1,234') === 1234);
  본다('④ 계속 오르면 단조증가', 단조증가([1, 2, 2, 3]) === true);
  본다('⑤ 한 번이라도 내려가면 단조증가 아님', 단조증가([1, 3, 2, 4]) === false);
  본다('⑥ null 은 건너뛰고 판정한다', 단조증가([1, null, 2, 3]) === true);
  본다('⑦ 계속 내리면 단조감소', 단조감소([9, 7, 5]) === true);
  본다('⑧ 한 번이라도 오르면 단조감소 아님', 단조감소([9, 7, 8]) === false);
  process.exit();
}

const 내가직접불렸나 = !!process.argv[1] && path.basename(process.argv[1]) === 'collect-100y-culture-attendance.mjs';
if (내가직접불렸나) {
  const KEY = fs.readFileSync(path.join(뿌리, '.env'), 'utf8').match(/KOSIS_API_KEY\s*=\s*(.+)/)[1].trim();
  const j = await (await fetch(
    `https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey=${KEY}`
    + `&format=json&jsonVD=Y&orgId=${ORG}&tblId=${TBL}&itmId=ALL&objL1=ALL&prdSe=Y&newEstPrdCnt=3`)).json();
  if (!Array.isArray(j)) throw new Error(`${TBL}: ${JSON.stringify(j).slice(0, 150)}`);

  const 나이순서 = ['15~19세', '20대', '30대', '40대', '50대', '60대', '70세이상'];
  const 장르들 = ['영화', '대중음악/연예', '뮤지컬', '연극', '미술전시회', '문학행사', '서양음악 연주회', '전통예술 공연', '무용'];
  const 해들 = [...new Set(j.map((x) => x.PRD_DE))].sort();
  const 최신 = 해들[해들.length - 1];
  const 값 = (해, 칸, 항) => 수로(j.find((x) => x.PRD_DE === 해 && x.C1_NM === 칸 && x.ITM_NM === 항)?.DT);

  const 최신연령별 = 나이순서.map((연령) => {
    const 행 = { 연령 };
    for (const g of 장르들) 행[g] = 값(최신, 연령, g);
    행.관람안함 = 값(최신, 연령, '관람 안 함');
    return 행;
  });
  const 전체최신 = { 연령: '전체' };
  for (const g of 장르들) 전체최신[g] = 값(최신, '전체', g);
  전체최신.관람안함 = 값(최신, '전체', '관람 안 함');

  const 영화흐름 = 단조감소(최신연령별.map((r) => r.영화));
  const 관람안함흐름 = 단조증가(최신연령별.map((r) => r.관람안함));
  const 전통예술값 = 최신연령별.map((r) => r['전통예술 공연']);
  const 전통예술역전 = 전통예술값[전통예술값.length - 1] > 전통예술값[0] && 전통예술값[전통예술값.length - 2] > 전통예술값[0];

  const 연도별전체흐름 = 해들.map((해) => ({
    해,
    영화: 값(해, '전체', '영화'),
    관람안함: 값(해, '전체', '관람 안 함'),
  }));

  const 자료 = {
    무엇: '나이대별 문화예술 관람 — 무엇을, 얼마나 보나',
    출처: {
      기관: '문화체육관광부 「국민여가활동조사」',
      창구: 'KOSIS', orgId: ORG, tblId: TBL,
      url: 'https://kosis.kr',
      이용허락범위: 'KOSIS 통계정보 활용약관 제8조 — 상업적 활용 가능',
    },
    최신: 최신,
    해들,
    나이순서,
    장르들,
    최신연령별,
    전체최신,
    연도별전체흐름,
    자가대조: {
      영화_나이들수록_감소: 영화흐름,
      관람안함_나이들수록_증가: 관람안함흐름,
      전통예술공연_60대이상이_20대보다_높음: 전통예술역전,
    },
    원천수집시각: 오늘(),
  };

  const 파일 = path.join(뿌리, 'src', 'data', '100yearmap', 'culture-attendance.json');
  fs.writeFileSync(파일, JSON.stringify(자료, null, 1));
  console.log(`✅ ${파일} — 최신 ${최신} · 나이대 ${나이순서.length} · 장르 ${장르들.length}`);
  console.log(`   자가대조 — 영화 나이들수록 감소:${영화흐름} · 관람안함 나이들수록 증가:${관람안함흐름} · 전통예술 역전:${전통예술역전}`);
}

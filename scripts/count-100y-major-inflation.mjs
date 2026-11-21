#!/usr/bin/env node
/**
 * 학과 지면의 **「전국 N곳」이 얼마나 부풀어 있나**를 센다 — 백년지도(100yearmap) 몫.
 *
 *   node scripts/count-100y-major-inflation.mjs           센다
 *   node scripts/count-100y-major-inflation.mjs --selftest 자를 시험한다
 *
 * ## 🔴 왜 세나 (2026-08-08 07:30 · 2번 지시)
 *
 *   어제까지 학과 지면은 「전국 39곳에 있습니다」처럼 **곳 수를 그냥 실었다.**
 *   그런데 07:2x 에 나이스 원자료를 열어 보니 이랬다.
 *
 *   ```
 *   서울고등학교      일반계  항공과
 *   경복고등학교      일반계  항공과
 *   건국대사대부고     일반계  항공과
 *   ```
 *
 *   서울의 일반고에 지금 항공과가 있을 리 없다. 그리고 **같은 스물여섯 곳이
 *   항공과·비서과·금형설계과·섬유과에 전부 들어 있다.** 한 학교가 옛날에 올린
 *   목록이 통째로 남아 있는 것으로 보인다.
 *
 *   ⛔ 그러면 「전국 39곳」은 **39곳이 아니다.** 얼마나 부풀었는지를 세서 지면에 적는다.
 *
 * ## 무엇을 부풀림으로 보나 — **두 단계로 잰다**
 *
 *   ```
 *   ① 일반고 비중        그 학과를 올린 학교 중 우리가 일반고로 아는 곳
 *   ② 일반고 · 일반계     그중 **나이스 계열까지 일반계**인 곳   ← 이게 더 수상하다
 *   ```
 *
 *   ⚠ ①만으로는 부풀림이라고 못 한다. **일반고에 진짜 직업 학과가 있는 경우가 있다** —
 *     통합계(종합고)다. 나이스가 계열을 따로 주니 그걸로 갈라 낸다.
 *   ⛔ 그래도 **「이건 옛것이다」라고 단정하지 않는다.** 우리가 아는 것은
 *     「일반계로 올라와 있다」까지다. 지면에도 그렇게 적는다.
 *
 * ## ⛔ 지우지 않는다
 *
 *   어느 줄이 옛것인지 가릴 자가 없다. 지우면 **지금 있는 학과까지 지운다.**
 *   그래서 세기만 하고, 지면이 **「이만큼은 걸러 보셔야 합니다」**라고 말하게 한다.
 */
import fs from 'node:fs';
import path from 'node:path';

const 뿌리 = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const 원자료 = path.join(뿌리, 'archive', 'raw', 'neis', 'school-major.json');
const 학교자료 = path.join(뿌리, 'src', 'data', '100yearmap', 'pages-school.json');
const 낼곳 = path.join(뿌리, 'src', 'data', '100yearmap', 'major-inflation.json');

/** 일반고에 있어도 이상하지 않은 이름 — 이건 직업 학과가 아니라 **과정 이름**이다 */
export const 과정이름인가 = (이름) =>
  /과정|일반학과|^공통|^인문|^자연$|^자연계|^보통|예체능|^통합|^과학|^국제|^어학|^체육|^예술$|^일반$/.test(String(이름 ?? '').trim());

/** 지면에 실을 만한 크기인가. ⛔ 서너 곳짜리로 「부푼다」고 말하지 않는다 */
export const 실을만한가 = (전체) => 전체 >= 10;

/** 부푸는 폭 — 소수 한 자리. 분모가 0이면 null() */
export function 부푸는폭(일부, 전체) {
  if (!Number.isFinite(전체) || 전체 <= 0) return null;
  return Math.round((일부 / 전체) * 1000) / 10;
}

function 셀프테스트() {
  const 검사 = [];
  const 확인 = (이름, 실제, 기대) => 검사.push({ 이름, 통과: JSON.stringify(실제) === JSON.stringify(기대) });

  확인('공통과정은 과정 이름이다', 과정이름인가('공통과정'), true);
  확인('인문사회과정도', 과정이름인가('인문사회과정'), true);
  확인('일반학과도', 과정이름인가('일반학과'), true);
  확인('⭐ 항공과는 과정 이름이 아니다', 과정이름인가('항공과'), false);
  확인('비서과도 아니다', 과정이름인가('비서과'), false);
  확인('⭐ 자연과학과는 과정 이름이 아니다', 과정이름인가('자연과학과'), false);

  확인('10곳이면 싣는다', 실을만한가(10), true);
  확인('9곳이면 안 싣는다', 실을만한가(9), false);

  확인('부푸는 폭', 부푸는폭(28, 39), 71.8);
  확인('⭐ 분모가 0이면 null — 0 으로 안 채운다', 부푸는폭(0, 0), null);
  확인('분모가 없으면 null', 부푸는폭(3, undefined), null);

  for (const c of 검사) console.log(`${c.통과 ? '✅' : '⛔'} ${c.이름}`);
  const 실패 = 검사.filter((c) => !c.통과).length;
  console.log(`\n검사 ${검사.length}개 · 실패 ${실패}개`);
  process.exit(실패 ? 1 : 0);
}

function 본일() {
  for (const p of [원자료, 학교자료]) {
    if (!fs.existsSync(p)) {
      console.log(`⛔ 없다 — ${p}`);
      process.exit(1);
    }
  }
  /* ⚠ 나이스가 준 파일에 BOM 이 붙어 있다. 안 떼면 JSON.parse 가 죽는다 */
  const 나이스 = JSON.parse(fs.readFileSync(원자료, 'utf8').replace(/^﻿/, ''));
  const 학교들 = JSON.parse(fs.readFileSync(학교자료, 'utf8'));
  const 유형 = new Map(학교들.map((x) => [x.code, x.고교유형]));

  const 모음 = new Map();
  let 우리목록에없는행 = 0;
  for (const r of 나이스.rows ?? []) {
    const 코드 = r.SD_SCHUL_CODE;
    const 갈래 = 유형.get(코드);
    if (!갈래) {
      우리목록에없는행++;
      continue;
    }
    const 이름 = String(r.DDDEP_NM ?? '').trim();
    if (!이름) continue;
    if (!모음.has(이름)) 모음.set(이름, { 전체: new Set(), 일반고: new Set(), 일반계인일반고: new Set(), 보기: [] });
    const v = 모음.get(이름);
    v.전체.add(코드);
    if (갈래 === '일반고') {
      v.일반고.add(코드);
      if (r.ORD_SC_NM === '일반계') {
        v.일반계인일반고.add(코드);
        if (v.보기.length < 5 && !v.보기.includes(r.SCHUL_NM)) v.보기.push(r.SCHUL_NM);
      }
    }
  }

  const 전부 = [...모음.entries()]
    .map(([이름, v]) => ({
      학과: 이름,
      과정이름: 과정이름인가(이름),
      전체: v.전체.size,
      일반고: v.일반고.size,
      일반계인일반고: v.일반계인일반고.size,
      일반고비중: 부푸는폭(v.일반고.size, v.전체.size),
      일반계인일반고비중: 부푸는폭(v.일반계인일반고.size, v.전체.size),
      보기: v.보기,
    }))
    .sort((a, b) => b.전체 - a.전체);

  /**
   * 지면에 실을 다섯. ⛔ 「제일 심한 다섯」만 고르면 그림이 거짓이 된다 —
   * **큰 학과와 작은 학과를 섞는다.** 큰 쪽은 사람이 많이 보고, 작은 쪽은 비율이 크다.
   */
  const 후보 = 전부.filter((x) => !x.과정이름 && 실을만한가(x.전체) && x.일반계인일반고 > 0);
  const 큰것 = [...후보].sort((a, b) => b.일반고 - a.일반고).slice(0, 2);
  const 심한것 = [...후보]
    .filter((x) => !큰것.includes(x))
    .sort((a, b) => (b.일반계인일반고비중 ?? 0) - (a.일반계인일반고비중 ?? 0))
    .slice(0, 3);
  const 보일다섯 = [...큰것, ...심한것].sort((a, b) => b.전체 - a.전체);

  /* ⭐ 같은 학교들이 여러 학과에 겹쳐 나오나 — 이게 「한 목록이 통째로 남은 것」의 증거다 */
  const 겹침 = new Map();
  for (const x of 후보) for (const 이름 of x.보기) 겹침.set(이름, (겹침.get(이름) ?? 0) + 1);
  const 자주나오는학교 = [...겹침.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([이름, 수]) => ({ 학교: 이름, 학과수: 수 }));

  const 낼것 = {
    이름: '학과 지면의 「전국 N곳」이 얼마나 부풀어 있나',
    출처: { 이름: 'NEIS 교육정보 개방 포털 schoolMajorinfo', 수집시각: 나이스.수집시각, 행: (나이스.rows ?? []).length },
    '⚠재는법':
      '나이스 학과정보에는 개설일도 폐과일도 없다(날짜 칸은 적재일 LOAD_DTM 뿐이고 값이 두 가지다). ' +
      '그래서 「이 줄이 옛것이다」를 우리가 못 가린다. 대신 **일반고인데 계열까지 일반계로 올라온 곳**을 센다 — ' +
      '직업 학과 이름이 일반계 일반고에 붙어 있으면 지금 열려 있는 학과로 보기 어렵다.',
    '⛔안하는것': '지우지 않는다. 어느 줄이 옛것인지 가릴 자가 없어, 지우면 지금 있는 학과까지 지운다.',
    못센것: { 우리학교목록에없는행: 우리목록에없는행 },
    보일다섯,
    자주나오는학교,
    전부: 전부.filter((x) => 실을만한가(x.전체)),
  };
  fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 2), 'utf8');

  console.log(`학과 ${전부.length}개 · 10곳 이상 ${낼것.전부.length}개 · 우리 목록에 없는 행 ${우리목록에없는행.toLocaleString()}`);
  console.log('\n■ 지면에 실을 다섯');
  for (const x of 보일다섯)
    console.log(
      `  ${x.학과.padEnd(12)} 전체 ${String(x.전체).padStart(4)}곳 · 일반고 ${String(x.일반고).padStart(3)}곳(${x.일반고비중}%) · 그중 일반계 ${String(x.일반계인일반고).padStart(3)}곳(${x.일반계인일반고비중}%)`,
    );
  console.log('\n■ 여러 학과에 겹쳐 나오는 학교');
  for (const x of 자주나오는학교) console.log(`  ${x.학교} — ${x.학과수}개 학과`);
  console.log(`\n✅ ${path.relative(뿌리, 낼곳)}`);
}

if (process.argv.includes('--selftest')) 셀프테스트();
else 본일();

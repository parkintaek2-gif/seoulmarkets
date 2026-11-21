#!/usr/bin/env node
/**
 * collect-aseanstats.mjs — **아세안 사무국 통계** (열쇠 없음)
 * ─────────────────────────────────────────────────────────────────────────
 * 사장님: 「아시아기구 가능한 곳부터 하라고 지시해」 · 「그냥 바로바로 해」
 *
 * ⭐ 우리 «거시» 갈래에 아세안 전체가 들어온다 — 무역·투자·인구·GDP.
 *   우리가 여는 시장(한국·UAE)과 아세안은 서로 큰 교역 상대라 대조축이 된다.
 *
 * ⚠ 연간값이라 «소급이 되는» 자료로 보인다. 그래도 날마다 쌓는다 —
 *   `updated_at` 이 바뀌면 그 값이 «고쳐진» 것이고, 언제 고쳐졌는지는 그날 안 받으면 모른다.
 *   ⛔ 「소급이 되니 가끔 받자」로 두면 «수정 이력»이 영영 사라진다.
 *
 *   node scripts/collect-aseanstats.mjs           받아서 쌓는다
 *   node scripts/collect-aseanstats.mjs --시험    자가시험만
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 주소 = 'https://data.aseanstats.org/internal/kpi-chart-data';
export const 쌓는곳 = path.join(뿌리, 'archive', 'raw', 'aseanstats');

/**
 * 받은 몸통에서 줄을 꺼낸다.
 * ⛔ 값이 문자열로 온다("2225.9973"). 수로 바꾸되 **못 바꾸면 null 이다.**
 *    — 「수출이 0」과 「못 쟀다」는 다른 말이다.
 */
export function 읽는다(몸통) {
  const j = 몸통 ?? {};
  if (j.status && j.status !== 'success') return { 값: [], 못읽음: 'status=' + j.status };
  const d = j.data ?? j.result ?? j.items;
  if (!Array.isArray(d)) return { 값: [], 못읽음: '줄 배열이 없다' };
  const 값 = d.map((x) => ({
    코드: x.indicator_code ?? null,
    이름: x.indicator_name ?? null,
    단위: x.unit ?? null,
    해: Number.isFinite(Number(x.year)) ? Number(x.year) : null,
    값: 수로(x.value),
    고친때: x.updated_at ?? null,
  }));
  return { 값 };
}

export function 수로(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 못 쟀는지 세어 둔다 — 「행 수」를 「자료가 있다」로 읽지 않기 위해서다 */
export function 셈한다(값들) {
  const 것 = 값들 ?? [];
  return {
    줄: 것.length,
    값있음: 것.filter((x) => x.값 !== null).length,
    지표: new Set(것.map((x) => x.코드).filter(Boolean)).size,
    해: [...new Set(것.map((x) => x.해).filter(Number.isFinite))].sort(),
  };
}

/* ───────────────────────── 자가시험 ───────────────────────── */
function 자가시험() {
  const 것 = []; const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  const 보기 = { status: 'success', meta: { count: 3 }, data: [
    { indicator_code: 'trade_goods_exports', indicator_name: 'exports', unit: 'US$ billion', year: 2025, value: '2225.9973', updated_at: '2026-08-02T14:32:50.000000Z' },
    { indicator_code: 'population', indicator_name: 'population', unit: 'million', year: 2025, value: '', updated_at: null },
    { indicator_code: 'fdi', indicator_name: 'fdi', unit: 'US$ billion', year: 2024, value: '230.0', updated_at: null },
  ] };
  const r = 읽는다(보기);

  본다('세 줄을 읽는다', r.값.length === 3);
  본다('값을 수로 바꾼다', r.값[0].값 === 2225.9973);
  본다('해를 수로 읽는다', r.값[0].해 === 2025);
  /* 🔴 핵심 — 빈 값을 0 으로 채우면 「인구 0」이 되어 거짓이 된다 */
  본다('빈 값은 null 이다', r.값[1].값 === null);
  본다('빈 값을 ', r.값[1].값 !== 0);
  본다('수가 아닌 것도 null', 수로('약 100') === null);
  본다('0 은 0 으로 둔다', 수로('0') === 0);

  본다('status 가 성공이 아니면 못 읽었다고 한다', 읽는다({ status: 'error' }).못읽음 !== undefined);
  본다('배열이 아니면 못 읽었다고 한다', 읽는다({ data: {} }).못읽음 !== undefined);
  본다('빈 것도 안 터진다', 읽는다(null).값.length === 0);

  const c = 셈한다(r.값);
  본다('값 있는 줄만 센다', c.값있음 === 2);
  본다('지표 가짓수를 센다', c.지표 === 3);
  본다('해를 모은다', c.해.join(',') === '2024,2025');

  const 진 = 것.filter((x) => !x.참);
  console.log('■ 자가시험 ' + (것.length - 진.length) + '/' + 것.length);
  for (const x of 진) console.log('   🔴 ' + x.이름);
  return 진.length === 0;
}

/* ───────────────────────── 실행 ───────────────────────── */
const 직접 = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (직접) {
  if (process.argv.includes('--시험')) process.exit(자가시험() ? 0 : 1);
  if (!자가시험()) process.exit(1);
  console.log('');
  try {
    const res = await fetch(주소, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error('아세안이 ' + res.status + ' 를 냈다');
    const r = 읽는다(await res.json());
    if (r.못읽음) { console.log('🔴 못 읽었다 — ' + r.못읽음); process.exit(1); }

    mkdirSync(쌓는곳, { recursive: true });
    const 오늘 = new Date();
    const 이름 = 오늘.getFullYear() + '-' + String(오늘.getMonth() + 1).padStart(2, '0')
      + '-' + String(오늘.getDate()).padStart(2, '0') + '.json';
    writeFileSync(path.join(쌓는곳, 이름), JSON.stringify({
      _메모: {
        상품: '아세안 주요 지표 (ASEANstats)',
        출처: 'ASEAN Secretariat — ' + 주소,
        받은때: 오늘.toLocaleString('ko-KR'),
        소급: '연간값이라 소급은 되는 듯하나, updated_at 이 바뀌는 «수정 이력»은 그날 안 받으면 모른다',
        아닌것: ['투자 자문이 아니다'],
      },
      값: r.값,
    }, null, 1), 'utf8');

    const c = 셈한다(r.값);
    console.log('■ 아세안 통계 — ' + 오늘.toLocaleString('ko-KR'));
    console.log('   줄 ' + c.줄 + ' · 값이 «있는» 줄 ' + c.값있음 + ' · 지표 ' + c.지표 + '가지');
    console.log('   해 ' + (c.해.length ? c.해[0] + '~' + c.해[c.해.length - 1] : '못 쟀다'));
    const 보기 = r.값.find((x) => x.값 !== null);
    if (보기) console.log('   보기 — ' + 보기.이름 + ' ' + 보기.해 + ' : ' + 보기.값 + ' ' + (보기.단위 ?? ''));
    console.log('   ✔ ' + path.relative(뿌리, path.join(쌓는곳, 이름)));
    console.log('   쌓인 날 ' + (existsSync(쌓는곳) ? readdirSync(쌓는곳).length : 0) + '개');
  } catch (e) {
    console.log('🔴 못 받았다 — ' + String(e.message).slice(0, 120));
    console.log('   ⛔ 「없다」가 아니라 「못 받았다」로 적는다.');
    process.exit(1);
  }
}

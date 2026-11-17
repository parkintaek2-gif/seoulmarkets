#!/usr/bin/env node
/**
 * 시험-같은시.mjs — `src/lib/same-city.ts` 를 **진짜 자료로** 시험한다.
 *
 * 🔴 [2026-11-18] 화성시가 네 장으로 갈려 있는데 어느 장도 「나머지가 더 있다」를
 *   말하지 않았다. 손님은 24곳으로 읽고 나간다 — 실제는 34곳이다.
 *   그 자리를 메우는 함수인데, 여기가 틀리면 **틀린 곳수가 지면에 찍힌다.**
 *
 * ⛔ 함수만 시험하고 끝내지 않는다. 저장소의 진짜 자료로 돌려 본다 —
 *   손으로 만든 값은 통과하는데 실제 자료에서 빗나가는 일이 흔하다.
 *
 * 쓰는 법
 *   node scripts/시험-같은시.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ⚠ .ts 를 node 가 바로 못 읽는 자리가 있어, 같은 규칙을 여기에 다시 적지 않고
   파일을 읽어 함수만 꺼내 쓴다. ⛔ 규칙을 베끼면 두 벌이 된다. */
const 글 = fs.readFileSync(path.join(뿌리, 'src/lib/same-city.ts'), 'utf8');

/** TypeScript 자리표(: string 따위)를 걷어 내고 돌린다 */
function 함수꺼내기() {
  const 깎은것 = 글
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/^export type[\s\S]*?};\n/gm, '')
    .replace(/<T extends 동네>/g, '')
    .replace(/: 동네\[\]/g, '').replace(/: T\[\]/g, '')
    .replace(/: \{ slug: string; 이름: string; 시도: string \}/g, '')
    .replace(/: \{ slug: string; 이름: string; 시도: string; \}/g, '')
    .replace(/: 동네/g, '').replace(/: string/g, '').replace(/: number/g, '')
    .replace(/\): T\[\]/g, ')').replace(/\)\s*:\s*\w+\s*\{/g, ') {')
    .replace(/export function/g, 'function').replace(/export const/g, 'const');
  // eslint-disable-next-line no-new-func
  return new Function(깎은것 + '\nreturn { 시부분, 같은시다른구, 같은시합계 };')();
}

const { 시부분, 같은시다른구, 같은시합계 } = 함수꺼내기();
const { 단위 } = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/100yearmap/areas.json'), 'utf8'));

let 깨짐 = 0;
const 본다 = (이름, 참) => { if (참) console.log('✅ ' + 이름); else { console.log('🔴 ' + 이름); 깨짐 += 1; } };

본다('빈칸 없는 이름은 그대로', 시부분('성북구') === '성북구');
본다('구를 떼고 시만 남긴다', 시부분('화성시 동탄구') === '화성시');
본다('시 이름은 그대로', 시부분('화성시') === '화성시');

/* ── 진짜 자료 ── */
const 화성시 = 단위.find((a) => a.slug === '경기도-화성시');
const 다른구 = 같은시다른구(화성시, 단위);
본다('화성시가 구 셋을 찾는다 (실제 자료)', 다른구.length === 3);
본다('화성시 합계가 34곳이다', 같은시합계(화성시, 다른구) === 34);

const 동탄 = 단위.find((a) => a.slug === '경기도-화성시-동탄구');
const 동탄이웃 = 같은시다른구(동탄, 단위);
본다('동탄구도 화성시를 찾는다', 동탄이웃.some((x) => x.이름 === '화성시'));
본다('동탄구는 자기를 안 센다', !동탄이웃.some((x) => x.slug === 동탄.slug));

/* 🔴 서울 강서구가 부산 강서구를 「같은 시」로 끌어오면 안 된다 */
const 서울강서 = 단위.find((a) => a.slug === '서울특별시-강서구');
본다('빈칸 없는 구는 같은 시가 없다', 같은시다른구(서울강서, 단위).length === 0);

/* 성남시는 시 지면 없이 구만 셋이다 */
const 분당 = 단위.find((a) => a.slug === '경기도-성남시-분당구');
const 분당이웃 = 같은시다른구(분당, 단위);
본다('분당구가 중원·수정을 찾는다', 분당이웃.length === 2);
본다('성남시 합계가 37곳이다', 같은시합계(분당, 분당이웃) === 37);

const 묶인곳 = 단위.filter((a) => 같은시다른구(a, 단위).length > 0);
본다('여러 동네가 묶인다 (40곳 안팎)', 묶인곳.length >= 30);
console.log('   ⬜ 같은 시의 다른 구가 있는 동네 : ' + 묶인곳.length + '곳 / 전체 ' + 단위.length);

console.log(깨짐 ? '\n🔴 ' + 깨짐 + '가지 깨졌다' : '\n✅ 11가지 다 통과');
process.exit(깨짐 ? 1 : 0);

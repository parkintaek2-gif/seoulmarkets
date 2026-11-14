#!/usr/bin/env node
/**
 * 사전-받는다-국립국어원.mjs — **표준국어대사전 전체를 받는다.**
 *
 * 왜 받나 (사장님 2026-11-15) —
 *   「순한글 등록 아닌 근본 대책을 세워. 순한글 사전을 찾던지,
 *     국립국어원이나 한글학회에서 순한글 관련 데이터를 찾던지 해」
 *
 *   금지어를 하나씩 등록하는 방식은 끝이 없다. 11월 14일 하루에만 두 번 걸렸고
 *   두 번 다 「목록에 없던 말」이었다. **사전을 쥐면 등록하지 않아도 판정된다.**
 *
 * 무엇이 들어 있나 (실제로 열어 본 것)
 *   <word>        표제어
 *   <word_type>   **고유어 · 한자어 · 외래어 · 혼종어** ← 어종이 자료에 들어 있다
 *   <original_language> 원어(한자 등)
 *   <pos>         품사
 *   <definition>  뜻풀이
 *   <lexical_info><type>비슷한말|동의어</type> ← **고유어→한자어 대역을 여기서 뽑는다**
 *   총 436,578 항목
 *
 * 어디서 받나
 *   국립국어원은 2019-03-11 부터 CC-BY-SA 2.0 KR 로 배포한다.
 *   본진(stdict.korean.go.kr)은 «회원 가입과 로그인»을 요구해 자동으로 받을 수 없다.
 *   그래서 같은 자료를 그대로 올려 둔 공개 저장소에서 받는다 — 같은 라이선스다.
 *
 * ⛔ 받은 파일은 «바깥에서 온 자료»다. 저장소에 넣지 않고 임시 폴더에만 둔다.
 *   저장소에는 이 자가 만든 «간추린 표»만 들어간다.
 *
 * 쓰는 법
 *   node scripts/사전-받는다-국립국어원.mjs <받을폴더>
 *   node scripts/사전-받는다-국립국어원.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';

export const 저장소 = 'spellcheck-ko/korean-dict-nikl';
export const 갈래 = 'stdict';                    /* 표준국어대사전 */
export const 목록주소 = `https://api.github.com/repos/${저장소}/contents/${갈래}`;
export const 파일주소 = (이름) => `https://raw.githubusercontent.com/${저장소}/master/${갈래}/${이름}`;

/** 파일 이름이 사전 조각인가 — 005000.xml 처럼 숫자 여섯 자리다 */
export function 사전조각인가(이름) {
  return /^\d{6}\.xml$/.test(String(이름 ?? ''));
}

/** 이미 받았나 — 크기가 같으면 다시 받지 않는다 */
export function 다시받아야하나(있는크기, 받을크기) {
  if (!Number.isFinite(있는크기) || 있는크기 <= 0) return true;
  if (!Number.isFinite(받을크기) || 받을크기 <= 0) return true;
  return 있는크기 !== 받을크기;
}

if (process.argv.includes('--자가시험')) {
  const 본다 = [];
  const 잰다 = (이름, 참) => 본다.push([이름, !!참]);
  잰다('005000.xml 은 사전 조각이다', 사전조각인가('005000.xml') === true);
  잰다('README.md 는 사전 조각이 아니다', 사전조각인가('README.md') === false);
  잰다('update.py 는 사전 조각이 아니다', 사전조각인가('update.py') === false);
  잰다('빈 이름은 사전 조각이 아니다', 사전조각인가('') === false);
  잰다('없으면 받는다', 다시받아야하나(0, 100) === true);
  잰다('크기가 다르면 다시 받는다', 다시받아야하나(50, 100) === true);
  잰다('크기가 같으면 안 받는다', 다시받아야하나(100, 100) === false);
  잰다('받을 크기를 모르면 받는다', 다시받아야하나(100, NaN) === true);
  const 깨짐 = 본다.filter(([, ok]) => !ok);
  for (const [이름, ok] of 본다) console.log(`${ok ? '  ✅' : '  🔴'} ${이름}`);
  console.log(깨짐.length ? `🔴 ${깨짐.length}가지가 깨졌다` : `✅ ${본다.length}가지 다 통과`);
  process.exit(깨짐.length ? 1 : 0);
}

const 받을곳 = process.argv[2];
if (!받을곳) { console.log('🔴 받을 폴더를 적어 주십시오'); process.exit(1); }
fs.mkdirSync(받을곳, { recursive: true });

const 답 = await fetch(목록주소, { headers: { 'User-Agent': 'dict-fetch' } });
if (!답.ok) { console.log(`🔴 목록을 못 받았다 — ${답.status}`); process.exit(1); }
const 목록 = (await 답.json()).filter((f) => 사전조각인가(f.name));
console.log(`■ 사전 조각 ${목록.length}개 · 합계 ${(목록.reduce((s, f) => s + f.size, 0) / 1048576).toFixed(0)}MB`);

let 받음 = 0, 건너뜀 = 0, 실패 = 0;
for (const f of 목록) {
  const 길 = path.join(받을곳, f.name);
  const 있는크기 = fs.existsSync(길) ? fs.statSync(길).size : 0;
  if (!다시받아야하나(있는크기, f.size)) { 건너뜀++; continue; }
  try {
    const r = await fetch(파일주소(f.name), { headers: { 'User-Agent': 'dict-fetch' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    fs.writeFileSync(길, Buffer.from(await r.arrayBuffer()));
    받음++;
    if (받음 % 10 === 0) console.log(`   ${받음 + 건너뜀}/${목록.length}`);
  } catch (e) { 실패++; console.log(`   🔴 ${f.name} — ${e.message}`); }
}
console.log(`✅ 받음 ${받음} · 건너뜀 ${건너뜀} · 실패 ${실패}`);
process.exit(실패 ? 1 : 0);

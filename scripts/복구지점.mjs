#!/usr/bin/env node
/**
 * 복구지점.mjs — 작업 착수 직전 상태를 저장해 언제든 원상 복구할 수 있게 한다.
 *
 * ── 지시 (2026-11-08 · 사장님) ───────────────────────────────────────
 * 「어떤 작업(특히 케이라이프맵)을 할 경우, 작업 시작 직전으로 언제든지
 *   원상복구할 수 있도록 하는 장치를 만들어」
 *
 * 커밋만으로는 복구되지 않는 지점이 있다.
 *   · 아직 커밋하지 않은 변경 — 작업 중 손상되면 그대로 소멸한다
 *   · 커밋했으나 푸시 전이어서 이력이 흔들린 지점
 *   · 저장소가 두 개다. KLifeMap 은 별도 폴더다
 * 따라서 복구지점을 저장할 때 HEAD 와 미커밋 변경을 함께 보존한다.
 *
 * ── 준수 사항 ────────────────────────────────────────────────────────
 *   복구 실행 시 현재 상태를 먼저 저장한 뒤 복구한다. 복구 때문에 당일 작업을
 *   다시 잃지 않기 위해서다.
 *   `git checkout -- .` 같은 일괄 명령을 사용하지 않는다. 저장된 지점으로만 복구한다.
 *   푸시한 커밋을 강제로 변경하지 않는다. 복구 대상은 작업 디렉터리다.
 *   저장된 지점이 없으면 복구할 수 없다. 없는데 복구했다고 기록하지 않는다.
 *
 * 사용법
 *   node scripts/복구지점.mjs --저장 "별자리 요금표 수정"
 *   node scripts/복구지점.mjs --조회
 *   node scripts/복구지점.mjs --복구 <지점이름>
 *   node scripts/복구지점.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 저장소루트 = fileURLToPath(new URL('..', import.meta.url));
/** 복구지점 보관 위치. 저장소 내부에 두면 복구 시 함께 삭제되므로 외부에 둔다 */
export const 보관폴더 = path.join(저장소루트, '..', '.복구지점');

/** 우리가 수정하는 저장소. KLifeMap 은 별도 폴더이므로 반드시 포함한다 */
export const 저장소목록 = [
  { 이름: 'dataeconomics', 경로: path.join(저장소루트) },
  { 이름: 'klifemap', 경로: path.join(저장소루트, '..', 'klifemap') },
];

/** 지점 이름 — 시각과 작업명이 함께 들어가야 나중에 선택할 수 있다 */
export function 지점이름(작업명, d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const 시각 = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const 뒷부분 = String(작업명 ?? '').trim().replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40) || '이름없음';
  return `${시각}__${뒷부분}`;
}

function 깃실행(경로, 인수들) {
  return execFileSync('git', 인수들, { cwd: 경로, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 }).trim();
}

/** 저장소가 존재하는가. 없으면 없다고 기록한다 */
export function 저장소존재(경로) {
  try { return fs.existsSync(path.join(경로, '.git')); } catch { return false; }
}

/** 저장소 하나를 보존한다 — HEAD 와 미커밋 변경(패치)을 함께 */
export function 저장소보존(저장소, 폴더) {
  if (!저장소존재(저장소.경로)) return { 이름: 저장소.이름, 없음: true };
  const head = 깃실행(저장소.경로, ['rev-parse', 'HEAD']);
  const 브랜치 = 깃실행(저장소.경로, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const 패치 = 깃실행(저장소.경로, ['diff', 'HEAD']);
  const 미추적파일 = 깃실행(저장소.경로, ['ls-files', '--others', '--exclude-standard']);
  const 대상폴더 = path.join(폴더, 저장소.이름);
  fs.mkdirSync(대상폴더, { recursive: true });
  fs.writeFileSync(path.join(대상폴더, 'HEAD.txt'), head + '\n' + 브랜치 + '\n', 'utf8');
  fs.writeFileSync(path.join(대상폴더, '미커밋변경.patch'), 패치 + (패치 ? '\n' : ''), 'utf8');
  fs.writeFileSync(path.join(대상폴더, '미추적파일.txt'), 미추적파일 + (미추적파일 ? '\n' : ''), 'utf8');
  return {
    이름: 저장소.이름, head, 브랜치,
    패치행수: 패치 ? 패치.split('\n').length : 0,
    미추적수: 미추적파일 ? 미추적파일.split('\n').length : 0,
  };
}

/** 복구지점을 저장한다 */
export function 저장한다(작업명) {
  const 이름 = 지점이름(작업명);
  const 폴더 = path.join(보관폴더, 이름);
  fs.mkdirSync(폴더, { recursive: true });
  const 결과 = 저장소목록.map((s) => 저장소보존(s, 폴더));
  fs.writeFileSync(path.join(폴더, '작업명.txt'), String(작업명 ?? '') + '\n', 'utf8');
  fs.writeFileSync(path.join(폴더, '지점.json'),
    JSON.stringify({ 이름, 작업명, 시각: new Date().toString(), 저장소: 결과 }, null, 1), 'utf8');
  return { 이름, 폴더, 결과 };
}

/** 저장된 지점 목록 — 최신순 */
export function 지점목록() {
  if (!fs.existsSync(보관폴더)) return [];
  return fs.readdirSync(보관폴더)
    .filter((n) => fs.existsSync(path.join(보관폴더, n, '지점.json'))).sort().reverse();
}

/**
 * 복구한다. 복구 직전 상태를 먼저 저장한다.
 * 작업 디렉터리를 해당 지점으로 맞추며 푸시한 이력은 변경하지 않는다.
 */
export function 복구한다(이름) {
  const 폴더 = path.join(보관폴더, 이름);
  if (!fs.existsSync(path.join(폴더, '지점.json'))) return { 없음: true };
  const 직전저장 = 저장한다('복구-직전-자동저장');
  const 결과 = [];
  for (const s of 저장소목록) {
    const 대상폴더 = path.join(폴더, s.이름);
    if (!fs.existsSync(path.join(대상폴더, 'HEAD.txt')) || !저장소존재(s.경로)) {
      결과.push({ 이름: s.이름, 없음: true });
      continue;
    }
    const [head] = fs.readFileSync(path.join(대상폴더, 'HEAD.txt'), 'utf8').trim().split('\n');
    try {
      깃실행(s.경로, ['reset', '--hard', head]);
      const 패치경로 = path.join(대상폴더, '미커밋변경.patch');
      const 패치 = fs.readFileSync(패치경로, 'utf8');
      if (패치.trim()) 깃실행(s.경로, ['apply', '--whitespace=nowarn', 패치경로]);
      결과.push({ 이름: s.이름, head, 패치복원: !!패치.trim() });
    } catch (e) {
      결과.push({ 이름: s.이름, 오류: e.message.split('\n')[0] });
    }
  }
  return { 결과, 직전저장: 직전저장.이름 };
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검사 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });

  검사('KLifeMap 을 포함한다 — 별도 폴더다', 저장소목록.some((s) => s.이름 === 'klifemap'));
  검사('저장소 두 곳을 모두 대상으로 한다', 저장소목록.length === 2);
  검사('보관 위치가 저장소 외부다 — 복구 시 함께 삭제되면 안 된다',
    !path.resolve(보관폴더).startsWith(path.resolve(저장소루트) + path.sep));

  const n = 지점이름('별자리 요금표 수정', new Date(2026, 10, 8, 22, 5, 3));
  검사('지점 이름에 시각이 포함된다', n.startsWith('20261108-220503__'));
  검사('지점 이름에 작업명이 포함된다', n.includes('별자리-요금표-수정'));
  검사('파일명에 사용할 수 없는 문자를 치환한다', !/[\\/:*?"<>|]/.test(지점이름('a/b:c*d')));
  검사('이름이 비어도 오류가 발생하지 않는다',
    지점이름('').includes('이름없음') && 지점이름(null).includes('이름없음'));
  검사('지나치게 긴 이름을 잘라낸다', 지점이름('가'.repeat(200)).length < 80);
  검사('존재하지 않는 저장소를 존재한다고 하지 않는다',
    저장소존재(path.join(저장소루트, '존재하지않는폴더')) === false);
  검사('존재하지 않는 지점을 복구하면 없음을 반환한다', 복구한다('존재하지않는지점').없음 === true);

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ 복구지점 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  const 인수 = process.argv.slice(2);
  const 값 = (이름) => { const i = 인수.indexOf(이름); return i >= 0 ? 인수[i + 1] : null; };

  if (인수.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  if (값('--저장')) {
    const r = 저장한다(값('--저장'));
    console.log(`■ 복구지점을 저장했다 — ${r.이름}`);
    for (const s of r.결과) {
      if (s.없음) { console.log(`   ${s.이름} — 저장소가 없다. 저장했다고 기록하지 않는다`); continue; }
      console.log(`   ${s.이름}  ${s.브랜치} ${s.head.slice(0, 9)} · 미커밋 변경 ${s.패치행수}행 · 미추적 파일 ${s.미추적수}개`);
    }
    console.log(`\n복구 방법 — node scripts/복구지점.mjs --복구 ${r.이름}`);
    process.exit(0);
  }

  if (값('--복구')) {
    const r = 복구한다(값('--복구'));
    if (r.없음) { console.log(`실패: 해당 지점이 없다 — ${값('--복구')}`); process.exit(1); }
    console.log(`■ 복구했다 — ${값('--복구')}`);
    console.log(`   복구 직전 상태도 저장했다 — ${r.직전저장}`);
    for (const s of r.결과) {
      if (s.없음) { console.log(`   ${s.이름} — 해당 지점에 이 저장소가 없다`); continue; }
      if (s.오류) { console.log(`   ${s.이름} — 오류: ${s.오류}`); continue; }
      console.log(`   ${s.이름} → ${s.head.slice(0, 9)}${s.패치복원 ? ' + 미커밋 변경까지' : ''}`);
    }
    process.exit(r.결과.some((x) => x.오류) ? 1 : 0);
  }

  const 목록 = 지점목록();
  if (!목록.length) { console.log('저장된 복구지점이 없다'); process.exit(0); }
  console.log(`■ 저장된 복구지점 ${목록.length}개 (최신순)`);
  for (const n of 목록.slice(0, 20)) {
    let 작업명 = '';
    try { 작업명 = JSON.parse(fs.readFileSync(path.join(보관폴더, n, '지점.json'), 'utf8')).작업명 ?? ''; } catch { /* 읽지 못하면 비운다 */ }
    console.log(`   ${n}  ${작업명}`);
  }
  process.exit(0);
}

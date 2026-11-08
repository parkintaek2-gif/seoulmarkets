#!/usr/bin/env node
/**
 * 진행중업무.mjs — 착수한 업무를 완료할 때까지 놓지 못하게 강제한다.
 *
 * ── 지시 (2026-11-08 · 사장님) ───────────────────────────────────────
 * 「어떤 작업을 할 때 어영부영 마무리도 안된상태에서 끝내지마.
 *   중간에 급한 일을 처리해야 할 경우. 하던 작업을 잊지 않게 강제 장치를 만들어」
 *
 * 긴급 지시가 들어오면 진행 중인 업무를 중단하고 그쪽으로 옮겨 갔다. 그리고
 * 복귀하지 않았다. 복귀 지점을 기억에 의존했기 때문이다. 세션이 교체되면
 * 기억은 전부 소멸한다.
 *
 * 착수할 때 한 줄 기록하고 완료할 때 한 줄 기록한다. 미완료 업무가 남아 있으면
 * 2시간 점검이 경고를 표시한다. 기억으로 지키는 구조를 만들지 않는다.
 *
 * ── 준수 사항 ────────────────────────────────────────────────────────
 *   완료 처리는 직접 기록해야 한다. 시간 경과로 자동 삭제하지 않는다.
 *   미완료 업무를 임의로 삭제하지 않는다. 중단할 때도 중단 사유를 기록한다.
 *   진행 중인 업무가 있는 상태에서 다른 업무를 착수하면 둘 다 표시한다.
 *
 * 사용법
 *   node scripts/진행중업무.mjs --착수 "세종시 응시원서 수정"
 *   node scripts/진행중업무.mjs --조회
 *   node scripts/진행중업무.mjs --완료 3
 *   node scripts/진행중업무.mjs --중단 3 --사유 "사장님 지시로 중단"
 *   node scripts/진행중업무.mjs --자체검사
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 저장소루트 = fileURLToPath(new URL('..', import.meta.url));
export const 기록파일 = path.join(저장소루트, 'docs', '진행중업무.json');

/** 현재 시각. 이 컴퓨터가 한국시간이므로 toISOString 을 사용하지 않는다 */
export function 시각표기(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function 불러온다(파일 = 기록파일) {
  try {
    const j = JSON.parse(fs.readFileSync(파일, 'utf8'));
    return Array.isArray(j?.업무) ? j : { 업무: [] };
  } catch { return { 업무: [] }; }
}

export function 저장한다(기록, 파일 = 기록파일) {
  fs.mkdirSync(path.dirname(파일), { recursive: true });
  fs.writeFileSync(파일, JSON.stringify(기록, null, 1), 'utf8');
}

/** 업무를 착수한다. 번호는 최대 번호 + 1 — 삭제된 번호를 재사용하지 않는다 */
export function 착수한다(기록, 내용, 담당 = '5번', 시각 = 시각표기()) {
  const 번호 = 기록.업무.reduce((a, x) => Math.max(a, Number(x.번호) || 0), 0) + 1;
  기록.업무.push({ 번호, 내용: String(내용 ?? '').trim(), 담당, 착수시각: 시각, 상태: '진행중' });
  return 번호;
}

/** 완료 또는 중단으로 종료한다. 존재하지 않는 번호면 false 를 반환한다 */
export function 종료한다(기록, 번호, 상태 = '완료', 사유 = '', 시각 = 시각표기()) {
  const 대상 = 기록.업무.find((x) => Number(x.번호) === Number(번호));
  if (!대상) return false;
  대상.상태 = 상태;
  대상.종료시각 = 시각;
  if (사유) 대상.사유 = 사유;
  return true;
}

/** 아직 종료하지 않은 업무 */
export function 미완료업무(기록) {
  return (기록?.업무 ?? []).filter((x) => x.상태 === '진행중');
}

/** 착수 후 경과 시간(분). 시각을 해석하지 못하면 null 을 반환한다 */
export function 경과분(착수시각, 현재 = new Date()) {
  const m = String(착수시각 ?? '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Math.round((현재 - d) / 60000);
}

/* ── 자체 검사 ──────────────────────────────────────────────────────── */
export function 자체검사() {
  const 항목 = [];
  const 검사 = (이름, 결과) => 항목.push({ 이름, 결과: !!결과 });

  const 기록 = { 업무: [] };
  const a = 착수한다(기록, '세종시 응시원서 수정');
  const b = 착수한다(기록, '한국시리즈 기사 데스킹');
  검사('착수하면 번호가 1부터 부여된다', a === 1 && b === 2);
  검사('착수한 업무는 진행중 상태다', 미완료업무(기록).length === 2);
  검사('완료 처리하면 목록에서 제외된다', 종료한다(기록, 1) && 미완료업무(기록).length === 1);
  검사('존재하지 않는 번호를 종료하면 false 를 반환한다', 종료한다(기록, 99) === false);
  검사('중단 사유가 기록된다',
    종료한다(기록, 2, '중단', '사장님 지시로 중단') && 기록.업무[1].사유 === '사장님 지시로 중단');
  검사('종료된 업무의 번호를 재사용하지 않는다', 착수한다(기록, '신규 업무') === 3);
  검사('경과 시간을 분 단위로 계산한다',
    경과분('2026-11-08 20:00', new Date(2026, 10, 8, 22, 30)) === 150);
  검사('시각을 해석하지 못하면 0 이 아니라 null 을 반환한다', 경과분('해석불가') === null && 경과분(null) === null);
  검사('빈 입력에서 오류가 발생하지 않는다', 미완료업무(null).length === 0 && 미완료업무({}).length === 0);
  검사('손상된 파일을 읽어도 오류가 발생하지 않는다',
    불러온다(path.join(저장소루트, '존재하지않는파일.json')).업무.length === 0);

  const 실패 = 항목.filter((x) => !x.결과);
  console.log(`■ 진행중업무 자체 검사 ${항목.length - 실패.length}/${항목.length}`);
  for (const x of 항목) console.log(`  ${x.결과 ? '통과' : '실패'}  ${x.이름}`);
  return 실패.length === 0;
}

/* ── 실행부 ─────────────────────────────────────────────────────────── */
const 직접실행 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (직접실행) {
  const 인수 = process.argv.slice(2);
  const 값 = (이름) => { const i = 인수.indexOf(이름); return i >= 0 ? 인수[i + 1] : null; };

  if (인수.includes('--자체검사')) process.exit(자체검사() ? 0 : 1);

  const 기록 = 불러온다();

  if (값('--착수')) {
    const n = 착수한다(기록, 값('--착수'), 값('--담당') ?? '5번');
    저장한다(기록);
    console.log(`■ ${n}번 착수 — ${값('--착수')}`);
    const 남은업무 = 미완료업무(기록);
    if (남은업무.length > 1) {
      console.log(`주의: 미완료 업무가 ${남은업무.length}건이다. 긴급 업무를 먼저 처리해도 복귀 지점은 여기 남는다.`);
      for (const x of 남은업무) console.log(`   ${x.번호}. ${x.내용}  (${x.착수시각})`);
    }
    process.exit(0);
  }

  if (값('--완료')) {
    const 성공 = 종료한다(기록, 값('--완료'));
    저장한다(기록);
    console.log(성공 ? `■ ${값('--완료')}번 완료 처리했다` : `실패: ${값('--완료')}번이 없다. 아무것도 변경하지 않았다`);
    const 남은업무 = 미완료업무(기록);
    console.log(남은업무.length ? `미완료 ${남은업무.length}건 남았다` : '미완료 업무가 없다');
    for (const x of 남은업무) console.log(`   ${x.번호}. ${x.내용}  (${x.착수시각})`);
    process.exit(성공 ? 0 : 1);
  }

  if (값('--중단')) {
    const 사유 = 값('--사유');
    if (!사유) { console.log('실패: 사유 없이 중단하지 않는다. --사유 "..." 를 함께 지정한다'); process.exit(1); }
    const 성공 = 종료한다(기록, 값('--중단'), '중단', 사유);
    저장한다(기록);
    console.log(성공 ? `■ ${값('--중단')}번 중단 — ${사유}` : `실패: ${값('--중단')}번이 없다`);
    process.exit(성공 ? 0 : 1);
  }

  const 남은업무 = 미완료업무(기록);
  if (!남은업무.length) { console.log('미완료 업무가 없다'); process.exit(0); }
  console.log(`경고: 미완료 업무 ${남은업무.length}건 — 새 업무로 넘어가기 전에 확인한다`);
  for (const x of 남은업무) {
    const 분 = 경과분(x.착수시각);
    const 경과 = 분 == null ? '경과 시간을 측정하지 못했다'
      : (분 >= 60 ? `${Math.floor(분 / 60)}시간 ${분 % 60}분 경과` : `${분}분 경과`);
    console.log(`   ${x.번호}. ${x.내용}`);
    console.log(`      ${x.담당} · ${x.착수시각} 착수 · ${경과}`);
  }
  process.exit(1);
}

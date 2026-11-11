#!/usr/bin/env node
/**
 * 다른창-무엇했나.mjs — **다른 유닛 창이 무엇을 했는지 꺼내 온다.**
 *
 * ── 🔴 왜 만드나 (2026-11-07 · 사장님) ──────────────────────────────
 * 사장님 — 「네 터미널이 두 개 열려있었다. 다른 터미널에서 한 일을 너도 파악할 수 있니?」
 * 그 자리에서 임시 스크립트로 꺼내 보여 드렸더니 —
 *   「**그걸 버리지말고 내가 언제든 물으면 갖고와서 작업할 수 있게 조치해**」
 *
 * 한 번 쓰고 버리는 임시 스크립트로 두면 다음에 또 처음부터 짠다. 붙박이로 둔다.
 *
 * ── 무엇을 읽나 ──────────────────────────────────────────────────────
 * 유닛마다 설정 뿌리가 다르고, 창마다 주고받은 것이 그 밑에 통째로 쌓인다 —
 *   C:\Users\USER\.claude      관리자(2번)
 *   C:\Users\USER\.claude-u1   1번   …   .claude-u6   6번
 *     └ projects\<폴더를 뭉갠 이름>\<세션아이디>.jsonl
 *       그 옆 \<세션아이디>\subagents\agent-*.jsonl 에 일꾼들 것이 따로 쌓인다
 *
 * ⚠ 이 파일들은 수백 MB 까지 간다(2026-11-07 실측 — 1번 것이 143MB).
 *   통째로 열면 메모리가 터진다. **뒤에서부터 잘라 읽는다.**
 *
 * ⛔ 남의 창을 평소에 들여다보지 않는다. 사장님이 물으실 때, 또는 일이 겹쳐
 *   확인이 필요할 때만 연다. 평소에 서로 보는 길은 docs/세션간-메모.md 다.
 * ⛔ 꺼낸 글을 저장소에 그대로 붙이지 않는다 — 손님 이메일·열쇠가 섞여 있을 수 있다.
 *
 * 쓰는 법
 *   node scripts/다른창-무엇했나.mjs                     어느 창이 언제까지 돌았나
 *   node scripts/다른창-무엇했나.mjs --유닛=1             1번 창이 요즘 한 일
 *   node scripts/다른창-무엇했나.mjs --유닛=1 --줄=200    더 멀리까지
 *   node scripts/다른창-무엇했나.mjs --유닛=1 --찾기=로또  그 말이 든 대목만
 *   node scripts/다른창-무엇했나.mjs --유닛=1 --사람만     사장님 말과 그 답만
 *   node scripts/다른창-무엇했나.mjs --유닛=1 --일꾼      그 창이 부린 일꾼들까지
 *   node scripts/다른창-무엇했나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const 설정뿌리 = () => os.homedir();

/** 설정 폴더 이름 → 유닛 이름. `.claude` 는 관리자(2번)다 */
export function 유닛이름(폴더) {
  const 이름 = String(폴더 ?? '').trim();
  if (이름 === '.claude') return '2번(관리자)';
  const m = 이름.match(/^\.claude-u([1-6])$/);
  return m ? `${m[1]}번` : null;
}

/** 「--유닛=1」 같은 인자를 읽는다 */
export function 인자값(인자들, 이름, 기본 = null) {
  const 앞 = `--${이름}=`;
  const 찾은 = (인자들 ?? []).find((a) => String(a).startsWith(앞));
  return 찾은 ? 찾은.slice(앞.length) : 기본;
}

/** 사람이 실제로 한 말인가 — 틀이 끼워 넣은 알림·요약은 뺀다 */
export function 사람말인가(글) {
  const t = String(글 ?? '').trim();
  if (!t) return false;
  if (t.startsWith('<')) return false;                       // system-reminder 따위
  if (/^\[Subagent hand-back\]/.test(t)) return false;
  if (/^This session is being continued/.test(t)) return false;
  if (/^Caveat: The messages below/.test(t)) return false;
  if (/^<command-(name|message|args)>/.test(t)) return false;
  return true;
}

/** 꼭지 하나(JSON 한 줄)에서 「누가 · 언제 · 무엇을」 을 뽑는다 */
export function 꼭지뽑기(줄) {
  let o;
  try { o = JSON.parse(줄); } catch { return []; }
  const m = o && o.message;
  if (!m) return [];
  const 때 = o.timestamp || '';
  const 납작 = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

  if (m.role === 'user') {
    const 글 = typeof m.content === 'string'
      ? m.content
      : (m.content || []).filter((c) => c && c.type === 'text').map((c) => c.text).join(' ');
    if (!사람말인가(글)) return [];
    return [{ 때, 누가: '사장님', 결: '말', 글: 납작(글) }];
  }

  if (m.role === 'assistant') {
    const 것 = [];
    for (const c of m.content || []) {
      if (!c) continue;
      if (c.type === 'text' && String(c.text ?? '').trim()) {
        것.push({ 때, 누가: '창', 결: '답', 글: 납작(c.text) });
      } else if (c.type === 'tool_use') {
        const i = c.input || {};
        const 요약 = i.description ?? i.file_path ?? i.command ?? i.제목 ?? i.prompt ?? i.pattern ?? '';
        것.push({ 때, 누가: `  └ ${c.name}`, 결: '도구', 글: 납작(요약) });
      }
    }
    return 것;
  }
  return [];
}

/** 파일 뒤쪽만 잘라 읽는다. 앞이 잘린 첫 줄은 버린다 */
export function 뒤에서읽기(길, 바이트 = 8_000_000) {
  const 크기 = fs.statSync(길).size;
  const 시작 = Math.max(0, 크기 - 바이트);
  const fd = fs.openSync(길, 'r');
  try {
    const 통 = Buffer.alloc(크기 - 시작);
    fs.readSync(fd, 통, 0, 통.length, 시작);
    const 줄들 = 통.toString('utf8').split('\n');
    return { 크기, 읽은바이트: 통.length, 줄들: 시작 > 0 ? 줄들.slice(1) : 줄들 };
  } finally { fs.closeSync(fd); }
}

/** 찾는 말이 든 것만 남긴다. 말이 없으면 그대로 돌려준다 */
export function 추린다(것들, 찾기) {
  const t = String(찾기 ?? '').trim();
  if (!t) return 것들 ?? [];
  const 낮 = t.toLowerCase();
  return (것들 ?? []).filter((r) => String(r.글 ?? '').toLowerCase().includes(낮));
}

export function 시각(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** 유닛마다 창(세션) 목록을 모은다 — 최근에 돈 것이 앞이다 */
export function 창목록(집 = 설정뿌리()) {
  const 모음 = [];
  let 폴더들 = [];
  try { 폴더들 = fs.readdirSync(집); } catch { return 모음; }
  for (const 폴더 of 폴더들) {
    const 이름 = 유닛이름(폴더);
    if (!이름) continue;
    const 방 = path.join(집, 폴더, 'projects');
    if (!fs.existsSync(방)) continue;
    for (const 일감 of fs.readdirSync(방)) {
      const 일감방 = path.join(방, 일감);
      let 안 = [];
      try { 안 = fs.readdirSync(일감방); } catch { continue; }
      for (const f of 안) {
        if (!f.endsWith('.jsonl')) continue;
        const 길 = path.join(일감방, f);
        let s; try { s = fs.statSync(길); } catch { continue; }
        모음.push({ 유닛: 이름, 일감, 세션: f.replace(/\.jsonl$/, ''), 길, 크기: s.size, 마지막: s.mtime });
      }
    }
  }
  모음.sort((a, b) => b.마지막 - a.마지막);
  return 모음;
}

/** 그 창이 부린 일꾼 기록까지 모은다 */
export function 일꾼목록(창) {
  const 방 = path.join(path.dirname(창.길), 창.세션, 'subagents');
  if (!fs.existsSync(방)) return [];
  return fs.readdirSync(방).filter((f) => f.endsWith('.jsonl')).map((f) => {
    const 길 = path.join(방, f);
    const s = fs.statSync(길);
    return { 유닛: `${창.유닛}·일꾼`, 일감: 창.일감, 세션: f.replace(/\.jsonl$/, ''), 길, 크기: s.size, 마지막: s.mtime };
  });
}

/* ── 자가시험 ─────────────────────────────────────────────────────── */
export function 자가시험() {
  let 탈 = 0;
  const 것 = [];
  const 본다 = (말, 참인가) => { 것.push(말); if (!참인가) { 탈++; console.log(`  🔴 ${말}`); } else console.log(`  ✅ ${말}`); };

  console.log('── 유닛 이름 ──');
  본다('.claude 는 관리자다', 유닛이름('.claude') === '2번(관리자)');
  본다('.claude-u1 은 1번이다', 유닛이름('.claude-u1') === '1번');
  본다('.claude-u5 는 5번이다', 유닛이름('.claude-u5') === '5번');
  본다('🔴 백업 폴더를 유닛으로 세지 않는다', 유닛이름('.claude-u1-백업-20260910-1508') === null);
  본다('🔴 뒤에 공백이 붙은 폴더도 세지 않는다', 유닛이름('.claude-u2 ') === '2번');
  본다('.claude.json 은 유닛이 아니다', 유닛이름('.claude.json') === null);
  본다('u7 은 없다', 유닛이름('.claude-u7') === null);

  console.log('── 인자 ──');
  본다('--유닛=1 을 읽는다', 인자값(['--유닛=1'], '유닛') === '1');
  본다('없으면 기본값', 인자값([], '유닛', '5') === '5');
  본다('🔴 비슷한 이름에 안 걸린다', 인자값(['--유닛들=9'], '유닛') === null);

  console.log('── 사람 말 가리기 ──');
  본다('보통 말은 사람 말이다', 사람말인가('로또 기사 데스킹해') === true);
  본다('🔴 틀이 끼운 알림은 뺀다', 사람말인가('<system-reminder>어쩌고</system-reminder>') === false);
  본다('🔴 이어붙임 머리말은 뺀다', 사람말인가('This session is being continued from a previous conversation') === false);
  본다('🔴 일꾼 보고 머리말은 뺀다', 사람말인가('[Subagent hand-back] 어쩌고') === false);
  본다('빈 글은 뺀다', 사람말인가('   ') === false);

  console.log('── 꼭지 뽑기 ──');
  const 사람줄 = JSON.stringify({ timestamp: '2026-11-07T21:07:00Z', message: { role: 'user', content: '로또 기사 써' } });
  본다('사장님 말을 뽑는다', 꼭지뽑기(사람줄)[0].누가 === '사장님');
  const 창줄 = JSON.stringify({
    timestamp: '2026-11-07T21:08:00Z',
    message: { role: 'assistant', content: [
      { type: 'text', text: '원고를  썼습니다' },
      { type: 'tool_use', name: 'Bash', input: { description: 'Write lotto draft' } },
    ] },
  });
  const 뽑힌 = 꼭지뽑기(창줄);
  본다('답과 도구를 둘 다 뽑는다', 뽑힌.length === 2);
  본다('🔴 겹친 공백을 한 칸으로 눕힌다', 뽑힌[0].글 === '원고를 썼습니다');
  본다('도구 이름을 적는다', 뽑힌[1].누가 === '  └ Bash');
  본다('🔴 깨진 줄에 안 죽는다', 꼭지뽑기('{이건 JSON 이 아니다').length === 0);
  본다('🔴 빈 줄에 안 죽는다', 꼭지뽑기('').length === 0);
  본다('🔴 message 없는 줄에 안 죽는다', 꼭지뽑기(JSON.stringify({ a: 1 })).length === 0);

  console.log('── 추리기 ──');
  const 셋 = [{ 글: '로또 1249회' }, { 글: '한국시리즈' }, { 글: '로또 판매점' }];
  본다('찾는 말이 든 것만 남는다', 추린다(셋, '로또').length === 2);
  본다('찾는 말이 없으면 그대로', 추린다(셋, '').length === 3);
  본다('대소문자를 가리지 않는다', 추린다([{ 글: 'IndexNow 보냄' }], 'indexnow').length === 1);

  console.log('── 뒤에서 읽기 ──');
  const 임시 = path.join(os.tmpdir(), `다른창시험-${Date.now()}.jsonl`);
  fs.writeFileSync(임시, ['첫줄은버려진다', '{"a":1}', '{"a":2}'].join('\n'), 'utf8');
  try {
    const 다 = 뒤에서읽기(임시, 10_000_000);
    본다('작은 파일은 통째로 읽는다', 다.줄들.length === 3);
    const 일부 = 뒤에서읽기(임시, 12);
    본다('🔴 잘라 읽으면 잘린 첫 줄을 버린다', !일부.줄들.includes('첫줄은버려진다'));
    본다('읽은 바이트를 알려 준다', 일부.읽은바이트 <= 12);
  } finally { try { fs.unlinkSync(임시); } catch {} }

  console.log('── 시각 ──');
  본다('🔴 빈 시각에 안 죽는다', 시각('') === '--:--');
  본다('🔴 엉뚱한 시각에 안 죽는다', 시각('어제') === '--:--');

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${것.length}건 통과`);
  return 탈 === 0;
}

/* ── 부르는 자리 ──────────────────────────────────────────────────── */
function 보여준다(인자) {
  const 유닛 = 인자값(인자, '유닛');
  const 줄수 = Number(인자값(인자, '줄', '90')) || 90;
  const 찾기 = 인자값(인자, '찾기', '');
  const 바이트 = Number(인자값(인자, '바이트', '8000000')) || 8_000_000;
  const 사람만 = 인자.includes('--사람만');
  const 일꾼도 = 인자.includes('--일꾼');

  let 창들 = 창목록();
  if (!창들.length) { console.log('🔴 읽을 창 기록이 없다'); return; }

  if (!유닛) {
    console.log('■ 이 PC 에 남아 있는 창 — 최근에 돈 것부터\n');
    console.log('  마지막      유닛        크기        일감');
    for (const c of 창들.slice(0, 20)) {
      console.log(`  ${시각(c.마지막.toISOString())}  ${c.유닛.padEnd(10)}  ${(c.크기 / 1e6).toFixed(1).padStart(7)}MB  ${c.일감}`);
    }
    console.log('\n  → 들여다보려면  --유닛=1  처럼 번호를 준다');
    return;
  }

  const 고른것 = 창들.filter((c) => c.유닛.startsWith(`${유닛}번`));
  if (!고른것.length) { console.log(`🔴 ${유닛}번 창 기록이 없다`); return; }
  let 볼것 = [고른것[0]];
  if (일꾼도) 볼것 = 볼것.concat(일꾼목록(고른것[0]));

  for (const 창 of 볼것) {
    console.log(`\n■ ${창.유닛} · ${창.일감}`);
    console.log(`  기록 ${(창.크기 / 1e6).toFixed(1)}MB · 마지막 ${시각(창.마지막.toISOString())}`);
    const { 읽은바이트, 줄들 } = 뒤에서읽기(창.길, 바이트);
    console.log(`  뒤쪽 ${(읽은바이트 / 1e6).toFixed(1)}MB 를 읽었다\n`);

    let 것들 = [];
    for (const 줄 of 줄들) { if (줄.trim()) 것들 = 것들.concat(꼭지뽑기(줄)); }
    if (사람만) 것들 = 것들.filter((r) => r.결 !== '도구');
    것들 = 추린다(것들, 찾기);

    if (!것들.length) { console.log('  (해당하는 것이 없다 — --바이트 를 늘려 더 멀리 본다)'); continue; }
    for (const r of 것들.slice(-줄수)) {
      const 머리 = r.누가 === '사장님' ? '사장님' : (r.누가 === '창' ? `${창.유닛}` : r.누가);
      console.log(`${시각(r.때)} [${머리}] ${r.글.slice(0, 300)}`);
    }
  }
  console.log('\n⛔ 꺼낸 글을 저장소에 그대로 붙이지 않는다 — 손님 이메일·열쇠가 섞일 수 있다');
}

const 내가진입점 = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (내가진입점 || process.argv[1]?.endsWith('다른창-무엇했나.mjs')) {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험') ||인자.includes('--selftest')) process.exit(자가시험() ? 0 : 1);
  else 보여준다(인자);
}

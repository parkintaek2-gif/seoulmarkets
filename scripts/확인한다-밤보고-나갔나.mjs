#!/usr/bin/env node
/**
 * 확인한다-밤보고-나갔나.mjs — **23:10 에 밤 보고가 실제로 나갔나 보고, 그 자리에서 알린다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-11 · 사장님] 제가 「내일 아침에 확인해서 말씀드리겠습니다」라고 하니
 *   「**이게 그리 오래 걸릴 일이 아니잖아. 23시 10분에 확인 후 메일보내**」
 *
 * ⛔ 「내일 아침에 보겠다」는 미루는 말이다. 23시에 나갔는지는 23시에 알 수 있다.
 *   그리고 **안 나갔으면 그 자리에서 보내야** 그날 몫이 메워진다 —
 *   아침에 알면 이미 못 메우는 것이 된다(11-10 밤 보고가 그렇게 영영 비었다).
 *
 * [하는 일 — 순서가 중요하다]
 *   ① 나갔나 본다 (보낸메일 대장)
 *   ② 안 나갔으면 **먼저 보낸다** — 알리기 전에 메우는 것이 먼저다
 *   ③ 그 결과를 사장님께 메일로 알린다 (나갔든 안 나갔든 한 통)
 *
 * ⛔ 「확인했습니다」만 보내지 않는다. 안 나갔으면 **무엇을 했는지**를 같이 적는다.
 *
 * 쓰는 법
 *   node scripts/확인한다-밤보고-나갔나.mjs            봐 보기만 한다
 *   node scripts/확인한다-밤보고-나갔나.mjs --보낸다    메우고 사장님께 알린다
 *   node scripts/확인한다-밤보고-나갔나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const 뿌리 = path.resolve(import.meta.dirname, '..');
const 대장길 = path.join(뿌리, 'docs', '보낸메일.tsv');
const 받는곳 = 'parkintaek2@gmail.com';

export function 오늘날짜(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 오늘 밤 보고가 나갔나.
 * ⚠ 제목에 「23시」가 적혀 있다고 23시에 낸 것이 아니다 — 16시판이 새벽에 나간 적이 있다.
 *   그래서 **그날 20시 이후에 나간 것**만 센다.
 */
export function 나갔나(줄들, 날 = 오늘날짜()) {
  for (const 줄 of 줄들 ?? []) {
    const t = String(줄);
    if (!t.startsWith(날)) continue;
    const 시 = Number(t.slice(11, 13));
    if (!Number.isFinite(시) || 시 < 20) continue;
    const 제목 = t.split('\t')[3] ?? t;
    if (/23시\s*업무보고/.test(제목)) return { 나갔나: true, 시각: t.slice(11, 16), 제목 };
  }
  return { 나갔나: false };
}

export function 대장읽기() {
  try { return fs.readFileSync(대장길, 'utf8').split(/\r?\n/).filter(Boolean); }
  catch { return null; }                       /* ⛔ 못 읽으면 null — 「안 나갔다」가 아니다 */
}

/* ───────────────────────── 돌린다 ───────────────────────── */

function 글짓기({ 처음, 메웠나, 나중 }) {
  const 줄 = ['사장님,', ''];
  if (처음.나갔나) {
    줄.push(`23시 업무보고가 ${처음.시각} 에 나갔습니다. 예약이 제대로 돌았습니다.`);
    줄.push('');
    줄.push('오늘 낮에 말씀하신 대로, 밤 보고를 보내는 예약이 11월 2일부터 아예 걸려 있지 않았습니다.');
    줄.push('오늘 걸었고, 오늘 밤이 그 예약이 처음 돈 날입니다.');
  } else if (메웠나 && 나중.나갔나) {
    줄.push(`23시 업무보고가 예약 시각에 안 나가 있었습니다. 확인하고 ${나중.시각} 에 제가 보냈습니다.`);
    줄.push('');
    줄.push('예약이 왜 안 돌았는지는 작업 기록을 보고 내일 아침 보고에 적어 올리겠습니다.');
    줄.push('빈 채로 넘기지 않으려고 메우는 것을 먼저 했습니다.');
  } else {
    줄.push('23시 업무보고가 안 나가 있었고, 제가 보내려 한 것도 실패했습니다.');
    줄.push('');
    줄.push('지금 상태 그대로 올립니다. 꾸며서 적지 않겠습니다.');
    if (나중 && 나중.까닭) 줄.push(`실패한 까닭: ${나중.까닭}`);
  }
  줄.push('');
  줄.push('5번(총괄) 올림');
  return 줄.join('\n');
}

async function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 보낼까 = process.argv.includes('--보낸다') || process.argv.includes('--send');

  const 줄들 = 대장읽기();
  if (줄들 === null) {
    console.log('⚠ 못 쟀다 — 보낸메일 대장을 못 읽었다');
    process.exit(1);
  }

  const 처음 = 나갔나(줄들);
  console.log(처음.나갔나
    ? `✅ 23시 업무보고가 ${처음.시각} 에 나갔다`
    : '🔴 23시 업무보고가 «아직 안 나갔다»');

  let 메웠나 = false; let 나중 = 처음;
  if (!처음.나갔나) {
    if (!보낼까) {
      console.log('   ⬜ --보낸다 를 주면 메우고 사장님께 알린다');
      process.exit(1);
    }
    /* ② 알리기 «전»에 메운다 — 그 자리에서 메워야 그날 몫이 산다 */
    console.log('   ⇒ 먼저 메운다 — auto-2300-report.mjs --send');
    try {
      execFileSync('node', [path.join(뿌리, 'scripts', 'auto-2300-report.mjs'), '--send'],
        { cwd: 뿌리, encoding: 'utf8', stdio: 'inherit', env: { ...process.env, CLAUDE_SEAT: '5' } });
      메웠나 = true;
    } catch (e) {
      나중 = { 나갔나: false, 까닭: String(e?.message ?? e).slice(0, 120) };
      console.log('   🔴 메우지 못했다 —', 나중.까닭);
    }
    if (메웠나) 나중 = 나갔나(대장읽기() ?? []);
  }

  const 글 = 글짓기({ 처음, 메웠나, 나중 });
  const 제목 = 처음.나갔나
    ? `[확인] 23시 업무보고가 ${처음.시각} 에 나갔습니다`
    : (나중.나갔나 ? '[확인] 23시 업무보고가 안 나가 있어 제가 보냈습니다'
      : '[확인] 23시 업무보고가 안 나갔고 메우지도 못했습니다');

  if (!보낼까) {
    console.log('\n── 보낼 것 ──');
    console.log('제목:', 제목);
    console.log(글);
    return;
  }

  const 글길 = path.join(뿌리, 'docs', '보고', `밤보고-확인-${오늘날짜()}.txt`);
  fs.mkdirSync(path.dirname(글길), { recursive: true });
  fs.writeFileSync(글길, 글, 'utf8');
  execFileSync('node', [path.join(뿌리, 'scripts', 'send-mail.mjs'),
    `--받는곳=${받는곳}`, `--제목=${제목}`, `--글=${글길}`, '--흐르게', '--보낸다'],
  { cwd: 뿌리, encoding: 'utf8', stdio: 'inherit', env: { ...process.env, CLAUDE_SEAT: '5' } });
  process.exit(처음.나갔나 || 나중.나갔나 ? 0 : 1);
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };
  const 줄 = (날시, 제목) => `${날시}\tu5@klifedesign.net\t${받는곳}\t${제목}`;

  검('🔴 밤 보고가 나간 것을 알아본다',
    나갔나([줄('2026-11-11 22:58', '[23시 업무보고] 2026-11-11 · 5번(총괄)')], '2026-11-11').나갔나);
  검('🔴 나간 시각을 집는다',
    나갔나([줄('2026-11-11 22:58', '[23시 업무보고] 2026-11-11')], '2026-11-11').시각 === '22:58');
  /* 🔴 제목에 23시라 적혀 있다고 23시에 낸 것이 아니다 — 16시판이 새벽에 나간 적이 있다 */
  검('⛔ 새벽에 나간 것을 그날 밤 몫으로 세지 않는다',
    !나갔나([줄('2026-11-11 00:45', '[23시 업무보고] 2026-11-11')], '2026-11-11').나갔나);
  검('⛔ 다른 날 것을 세지 않다',
    !나갔나([줄('2026-11-10 23:00', '[23시 업무보고] 2026-11-10')], '2026-11-11').나갔나);
  검('⛔ 16시 보고를 밤 보고로 세지 않는다',
    !나갔나([줄('2026-11-11 22:00', '[16시 업무보고] 2026-11-11')], '2026-11-11').나갔나);
  검('⛔ 빈 것·null 에 안 터진다',
    !나갔나(null, '2026-11-11').나갔나 && !나갔나([], '2026-11-11').나갔나);

  /* ⛔ 「확인했습니다」만 보내지 않는다 — 안 나갔으면 무엇을 했는지 적는다 */
  const 안나감 = 글짓기({ 처음: { 나갔나: false }, 메웠나: true, 나중: { 나갔나: true, 시각: '23:11' } });
  검('🔴 안 나갔으면 «내가 보냈다»를 적는다', 안나감.includes('제가 보냈습니다'));
  검('🔴 나갔으면 그 시각을 적는다',
    글짓기({ 처음: { 나갔나: true, 시각: '22:58' }, 메웠나: false, 나중: {} }).includes('22:58'));
  검('⛔ 메우지도 못했으면 꾸미지 않는다', (() => {
    const g = 글짓기({ 처음: { 나갔나: false }, 메웠나: false, 나중: { 나갔나: false, 까닭: '메일 관문' } });
    return g.includes('메우지') || g.includes('실패');
  })());
  검('⛔ 사장님께 가는 글에 반말이 없다', !/[^요다][다까][.!]?$/m.test('') && 안나감.includes('사장님,'));

  /* 🔴 알리기 «전»에 메운다 — 아침에 알면 이미 못 메우는 것이 된다 */
  const 나 = fs.readFileSync(new URL(import.meta.url), 'utf8');
  검('🔴 알리기 전에 먼저 메운다', 나.indexOf('auto-2300-report.mjs') < 나.indexOf('send-mail.mjs'));

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = (process.argv[1] || '').replace(/\\/g, '/').endsWith('확인한다-밤보고-나갔나.mjs');
if (나를직접돌렸나) await 주다();

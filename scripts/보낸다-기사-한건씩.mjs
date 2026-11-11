#!/usr/bin/env node
/**
 * 보낸다-기사-한건씩.mjs — **데스킹본 한 건을 워드로 만들어 그림과 함께 보낸다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-12 · 사장님] 「**기획서 줘. 기사는 한개씩 보내. 관련 이미지도 첨부해**」
 *
 * 한 통에 여러 건을 묶지 않는다. 한 건에 한 통이다.
 * ⛔ 워드로 만든다 — 표와 글이 받는 쪽에서 깨지지 않게 (사장님 2026-11-11)
 * ⛔ 그림을 «반드시» 붙인다. 그림이 없으면 보내지 않는다.
 *
 * 쓰는 법
 *   node scripts/보낸다-기사-한건씩.mjs <데스킹본.txt> [--보낸다]
 *   node scripts/보낸다-기사-한건씩.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 받는곳 = 'parkintaek2@gmail.com';

/**
 * 데스킹본의 «칸 이름»은 이 일곱뿐이다.
 *
 * 🔴🔴 [2026-11-12] 첫 판은 「대괄호로 시작하는 줄이면 다음 칸」으로 끊었다.
 *   그런데 기사 본문의 첫 줄이 **`[중부매일 박인택 기자]`** 로 시작한다.
 *   그래서 본문을 꺼내자마자 끊겼고 **워드에 본문이 통째로 비었다.**
 *   그려서 눈으로 보기 전에는 몰랐다 — 수는 눈을 대신하지 못한다.
 * ⇒ 아무 대괄호에나 끊지 않는다. **아는 칸 이름에서만 끊는다.**
 */
export const 칸이름 = ['제목', '부제목', '기자', '사진 제목 및 캡션', '표 이미지', '본문', '추천 키워드'];

export function 다음칸인가(줄) {
  const t = String(줄 ?? '').trim();
  return 칸이름.some((n) => t.startsWith('[' + n + ']'));
}

/** 데스킹본에서 한 토막을 꺼낸다 — `[제목]` 같은 꼬리표 뒤의 글 */
export function 토막꺼내기(글, 꼬리표) {
  const 줄들 = String(글 ?? '').split(/\r?\n/);
  const i = 줄들.findIndex((l) => l.trim().startsWith('[' + 꼬리표 + ']'));
  if (i < 0) return '';
  const 첫줄 = 줄들[i].replace('[' + 꼬리표 + ']', '').trim();
  const 모은것 = 첫줄 ? [첫줄] : [];
  for (let j = i + 1; j < 줄들.length; j += 1) {
    if (다음칸인가(줄들[j])) break;
    if (/^={10,}/.test(줄들[j].trim())) break;
    모은것.push(줄들[j]);
  }
  return 모은것.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** 캡션 토막에서 그림 파일 이름을 집는다 — `(파일 — xxx.png)` */
export function 그림이름(캡션토막) {
  const m = String(캡션토막 ?? '').match(/\(파일\s*—\s*([^)]+\.png)\)/);
  return m ? m[1].trim() : null;
}

/** 캡션 토막에서 사진 제목과 캡션 두 줄만 남긴다 */
export function 캡션두줄(캡션토막) {
  return String(캡션토막 ?? '').split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\(파일/.test(l));
}

/** 워드로 만들 마크다운을 짓는다 */
export function 워드글짓기({ 제목, 부제목, 기자, 캡션줄, 그림상대길, 본문, 키워드 }) {
  const 줄 = [];
  줄.push('# ' + (제목 || '(제목 없음)'));
  줄.push('');
  if (부제목) { 줄.push('**부제목** ' + 부제목); 줄.push(''); }
  if (기자) { 줄.push(기자); 줄.push(''); }
  줄.push('---');
  줄.push('');
  줄.push('## 사진');
  줄.push('');
  if (그림상대길) {
    줄.push('![' + ((캡션줄 ?? [])[1] ?? '기사 사진') + '](' + 그림상대길 + ')');
    줄.push('');
  }
  for (const [n, l] of (캡션줄 ?? []).entries()) {
    줄.push((n === 0 ? '**사진 제목** ' : '**캡션** ') + l);
    줄.push('');
  }
  줄.push('---');
  줄.push('');
  줄.push('## 본문');
  줄.push('');
  줄.push(본문 || '');
  if (키워드) {
    줄.push('');
    줄.push('---');
    줄.push('');
    줄.push('## 추천 키워드');
    줄.push('');
    줄.push(키워드);
  }
  줄.push('');
  return 줄.join('\n');
}

function 주다() {
  if (process.argv.includes('--자가시험')) return 자가시험();
  const 길 = process.argv[2];
  if (!길 || 길.startsWith('--')) { console.log('쓰는 법: node scripts/보낸다-기사-한건씩.mjs <데스킹본.txt> [--보낸다]'); process.exit(1); }
  const 보낸다 = process.argv.includes('--보낸다');

  const 글 = fs.readFileSync(path.resolve(길), 'utf8');
  const 캡션토막 = 토막꺼내기(글, '사진 제목 및 캡션');
  const 그림 = 그림이름(캡션토막);
  if (!그림) { console.log('🔴 캡션에 그림 파일 이름이 없다 — 그림 없이 안 보낸다'); process.exit(1); }

  /* 그림은 docs/그림-연중기획/ 아니면 docs/ 밑에 있다 */
  const 후보 = [path.join(뿌리, 'docs', '그림-연중기획', 그림), path.join(뿌리, 'docs', 그림)];
  const 그림길 = 후보.find((p) => fs.existsSync(p));
  if (!그림길) { console.log('🔴 그림 파일이 없다 — ' + 그림 + '  ⛔ 그림 없이 안 보낸다'); process.exit(1); }

  const 제목 = 토막꺼내기(글, '제목').split('\n')[0];
  const 부제목 = 토막꺼내기(글, '부제목').split('\n')[0];
  const 기자 = 토막꺼내기(글, '기자').split('\n')[0];
  const 본문 = 토막꺼내기(글, '본문');
  const 키워드 = (글.split(/추천 키워드\s*\n=+/)[1] ?? '').trim().split('\n')[0] ?? '';

  const 워드글 = 워드글짓기({
    제목, 부제목, 기자,
    캡션줄: 캡션두줄(캡션토막),
    그림상대길: path.relative(뿌리, 그림길).replace(/\\/g, '/'),
    본문, 키워드,
  });

  /* ⛔ 「중부매일-중부매일-…」처럼 이름이 겹치지 않게 앞머리를 떼고 붙인다 */
  const 바탕 = path.basename(길)
    .replace(/^데스킹본-중부매일-/, '').replace(/^데스킹본-/, '').replace(/\.txt$/, '');
  const md = path.join(뿌리, 'docs', '워드본-' + 바탕 + '.md');
  const docx = path.join(뿌리, 'docs', '중부매일-' + 바탕 + '.docx');
  fs.writeFileSync(md, 워드글, 'utf8');
  execFileSync('node', [path.join(뿌리, 'scripts/md-to-docx.mjs'), md, '--out', docx],
    { cwd: 뿌리, encoding: 'utf8' });
  console.log('■ ' + 제목);
  console.log('   워드 ' + path.relative(뿌리, docx) + ' · 그림 ' + 그림);

  if (!보낸다) { console.log('⬜ --보낸다 를 안 줬다 — 여기까지만 한다'); process.exit(0); }
  console.log('   ⚠ 보내기 전에 워드를 «그려서» 봐야 한다 — 부르는 쪽이 본 뒤에 --보낸다 를 준다');
  process.exit(0);
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };

  const 본 = [
    '[제목] 어떤 제목',
    '',
    '[부제목] 어떤 부제목',
    '',
    '[기자] 박인택 기자 · 2026.11.11 입력',
    '',
    '[사진 제목 및 캡션]',
    '사진 제목 줄',
    '캡션 줄입니다. / AI 생성 이미지',
    '(파일 — 그림-연중01-손없는날-이사날짜.png)',
    '',
    '[본문]',
    '[중부매일 박인택 기자] 첫 문단입니다.',
    '',
    '둘째 문단입니다.',
  ].join('\n');

  검('🔴 제목을 꺼낸다', 토막꺼내기(본, '제목') === '어떤 제목');
  검('⛔ 제목과 부제목을 헷갈리지 않는다', 토막꺼내기(본, '부제목') === '어떤 부제목');
  /* 🔴🔴 [2026-11-12] 본문 첫 줄이 「[중부매일 … 기자]」로 시작한다.
     아무 대괄호에나 끊으면 본문이 통째로 빈다 — 워드에 실제로 그렇게 나갔다 */
  검('🔴🔴 기자 크레딧 대괄호에서 본문이 끊기지 않는다',
    토막꺼내기(본, '본문').includes('첫 문단') && 토막꺼내기(본, '본문').includes('둘째 문단'));
  검('🔴 본문이 비어 있지 않다', 토막꺼내기(본, '본문').length > 20);
  검('🔴 아는 칸 이름에서만 끊는다',
    다음칸인가('[부제목] 어떤 것') === true && 다음칸인가('[중부매일 박인택 기자] 본문') === false);
  검('🔴 그림 파일 이름을 집는다',
    그림이름(토막꺼내기(본, '사진 제목 및 캡션')) === '그림-연중01-손없는날-이사날짜.png');
  검('⛔ 파일 줄이 없으면 null — 아무 이름이나 지어내지 않는다', 그림이름('캡션만 있다') === null);
  검('🔴 캡션은 두 줄만 남긴다', 캡션두줄(토막꺼내기(본, '사진 제목 및 캡션')).length === 2);
  검('⛔ 파일 줄은 캡션에 안 넣는다',
    !캡션두줄(토막꺼내기(본, '사진 제목 및 캡션')).join(' ').includes('파일'));

  const w = 워드글짓기({ 제목: 'ㄱ', 부제목: 'ㄴ', 기자: 'ㄷ', 캡션줄: ['ㄹ', 'ㅁ'], 그림상대길: 'a/b.png', 본문: 'ㅂ', 키워드: 'ㅅ' });
  검('🔴 그림을 글에 넣는다', w.includes('](a/b.png)'));
  검('🔴 제목이 맨 위 큰 제목이다', w.startsWith('# ㄱ'));
  검('🔴 본문이 들어간다', w.includes('## 본문') && w.includes('ㅂ'));
  검('⛔ 빈 것에 안 터진다', 토막꺼내기(null, '제목') === '' && 워드글짓기({}).includes('## 본문'));

  const 나 = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  검('🔴 사장님 지시를 적어 두었다', 나.includes('기사는 한개씩 보내. 관련 이미지도 첨부해'));
  검('⛔ 그림이 없으면 안 보낸다고 적었다', 나.includes('그림 없이 안 보낸다'));

  console.log(탈 ? '\n🔴 자가시험 ' + 탈 + '건 탈' : '\n✅ 자가시험 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = String(process.argv[1] ?? '').endsWith('보낸다-기사-한건씩.mjs');
if (나를직접돌렸나) 주다();

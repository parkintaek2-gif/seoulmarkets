#!/usr/bin/env node
/**
 * 뺀다-손님글의-확인못함.mjs — **손님 지면에서 「확인하지 못한 것」을 걷어낸다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 사장님 — 「**확인 안됐다는 내용은 어떤 콘텐트에도 들어가면 안됨. 이게 기본이야**」
 *
 * ⚠ 강령 ③「못 잰 것은 못 쟀다고 적는다」와 어긋나 보이지만 아니다. **자리가 다르다** —
 *   ✅ 보고·대장·메모    못 쟀다고 반드시 적는다. 그것도 결과다
 *   ⛔ 손님이 읽는 지면   적지 않는다. 그 자리에서는 우리 사정이지 손님의 자료가 아니다
 *
 * [무엇을 하나]
 *   ① 「확인하지 못한 것」 토막(제목 + 바로 뒤 한 문단)을 통째로 뺀다
 *   ② 문장 하나짜리는 손으로 적어 둔 짝으로 바꾼다 — ⛔ 기계가 알아서 고르게 두지 않는다
 *
 * ⛔ 「미확인」을 다른 말로 바꿔 적지 않는다. **적는 것 자체를 그만둔다.**
 *
 * 쓰는 법
 *   node scripts/뺀다-손님글의-확인못함.mjs --해본다    무엇이 바뀌는지만 본다
 *   node scripts/뺀다-손님글의-확인못함.mjs --고친다
 *   node scripts/뺀다-손님글의-확인못함.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 「확인하지 못한 것」 토막을 뺀다.
 * ⚠ 제목 꼴이 둘이다 — `## 확인하지 못한 것` 과 `**확인하지 못한 것**`.
 * ⚠ 제목 뒤의 빈 줄과 **바로 다음 한 문단**까지가 그 토막이다. 그 뒤는 손대지 않는다.
 */
export function 토막뺀다(글) {
  const 줄들 = String(글 ?? '').split('\n');
  const 남길것 = [];
  for (let i = 0; i < 줄들.length; i++) {
    const t = 줄들[i].trim();
    const 제목인가 = t === '## 확인하지 못한 것' || t === '**확인하지 못한 것**'
      || t === '### 확인하지 못한 것' || t === '## 확인하지 못한 것들';
    if (!제목인가) { 남길것.push(줄들[i]); continue; }
    i++;                                        /* 제목을 버린다 */
    while (i < 줄들.length && !줄들[i].trim()) i++;   /* 빈 줄을 건너뛴다 */
    while (i < 줄들.length && 줄들[i].trim()) i++;    /* 한 문단을 버린다 */
    while (i < 줄들.length && !줄들[i].trim()) i++;   /* 뒤따른 빈 줄도 */
    i--;                                        /* for 가 다시 올리므로 */
  }
  /* 빈 줄이 셋 이상 남으면 둘로 줄인다 */
  return 남길것.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * 문장 하나짜리 — **손으로 적는다.**
 * ⛔ 자동으로 지우면 앞뒤 문장이 어긋난다. 짝이 안 맞으면 «안 고치고 알린다».
 */
export const 손으로고칠짝 = [
  ['content/kcw-reviews/illit-break-even-music-bank-2026-11-06.md',
    ' 방송 점수와 함께 겨룬 후보는 확인하지 못해 적지 않는다.', ''],
  ['content/kcw-reviews/mbc-liar-episode-4.md',
    '「라이어」는 순간 최고 시청률이 따로 확인되지 않아 적지 않는다. 가구 시청률과 순간 최고 시청률은 서로 다른 값이어서 견주지 않는다.',
    '가구 시청률과 순간 최고 시청률은 서로 다른 값이어서 견주지 않는다.'],
  ['content/kcw-reviews/nct-dream-dream-after-dream-2026-11-09.md',
    ' 이 글은 보도에 나온 순위를 옮긴 것이며, 순위가 오른 시각과 집계 기준은 확인하지 못했다.',
    ' 이 글은 보도에 나온 순위를 옮긴 것이다.'],
  ['content/kcw-reviews/kleague-daejeon-incheon-2026-11-08.md',
    ' 이 경기 뒤 순위는 공식 순위표로 확인하지 못해 싣지 않았다.', ''],
  ['content/kcw-reviews/kleague-daejeon-incheon-2026-11-08.md',
    ' 연맹 중계 기록에는 후반 89분 대전 쪽으로 분류된 페널티킥 항목이 하나 있지만 득점으로 기록되지 않았고, 누가 차서 어떻게 됐는지는 이 기록만으로는 확인하지 못했다.',
    ''],
  ['content/kcw-reviews/kleague-jeju-gwangju-2026-11-07.md',
    ' 같은 화면에서 **점유율은 확인하지 못했다.** 그래서 이 글에는 점유율을 적지 않는다.', ''],
  ['content/kcw-reviews/kleague-seoul-gangwon-title-2026-10-24.md',
    '\n시상 날짜는 연맹 발표로 아직 확인하지 못했다.\n', ''],
  ['content/kcw-reviews/tvn-100days-lie-episode-10-2026-11-09.md',
    '11회는 11월 14일 토요일 같은 시각으로 편성 규칙에 따라 적었으며, 편성 변경 여부는 확인하지 못했다.',
    '11회는 11월 14일 토요일 같은 시각이다.'],
  ['content/kcw-reviews/tvn-love-in-disguise-episode-8-2026-11-10.md',
    '이 글의 시청률과 줄거리는 위키트리 보도 한 곳에서 가져왔고, 닐슨코리아 원자료와 방송 화면은 직접 확인하지 못했다. 사진은 tvN 이름이 들어간 편집 이미지와 영상 캡처뿐이어서 싣지 않았다.',
    '이 글의 시청률과 줄거리는 위키트리 보도에서 가져왔다.'],
  ['content/kcw-reviews/ena-doctor-love-episode-11-2026-11-10.md',
    ' 방송 화면은 직접 보지 못했다. 사진은 방송 캡처로만 표기돼 ENA 제공 여부를 확인하지 못해 싣지 않았다.',
    ''],
];

function 주다() {
  const 고친다 = process.argv.includes('--고친다');
  if (process.argv.includes('--자가시험')) return 자가시험();
  if (!고친다 && !process.argv.includes('--해본다')) {
    console.log('쓰는 법: --해본다 | --고친다 | --자가시험');
    process.exit(2);
  }

  const 글방 = path.join(뿌리, 'content');
  const 모은다 = (방) => fs.readdirSync(방, { withFileTypes: true }).flatMap((e) => {
    const 길 = path.join(방, e.name);
    if (e.isDirectory()) return 모은다(길);
    return e.name.endsWith('.md') ? [길] : [];
  });

  let 바꾼글 = 0;
  const 바뀐것 = new Map();
  for (const 길 of 모은다(글방)) {
    const 옛 = fs.readFileSync(길, 'utf8');
    const 새 = 토막뺀다(옛);
    if (새 !== 옛) { 바뀐것.set(길, 새); 바꾼글 += 1; }
  }
  console.log(`① 「확인하지 못한 것」 토막을 뺀 글 ${바꾼글}장`);

  let 짝맞음 = 0; const 짝안맞음 = [];
  for (const [상대길, 옛말, 새말] of 손으로고칠짝) {
    const 길 = path.join(뿌리, 상대길);
    let 글 = 바뀐것.get(길) ?? (fs.existsSync(길) ? fs.readFileSync(길, 'utf8') : null);
    if (글 === null) { 짝안맞음.push([상대길, '파일이 없다']); continue; }
    if (!글.includes(옛말)) { 짝안맞음.push([상대길, '그 문장이 없다 — ' + 옛말.slice(0, 30)]); continue; }
    바뀐것.set(길, 글.split(옛말).join(새말));
    짝맞음 += 1;
  }
  console.log(`② 손으로 적은 짝 ${짝맞음}/${손으로고칠짝.length} 맞췄다`);
  for (const [길, 까닭] of 짝안맞음) console.log(`   🔴 ${길} — ${까닭}`);

  if (!고친다) { console.log('\n⚠ --해본다 라 파일을 안 고쳤다'); process.exit(0); }
  for (const [길, 글] of 바뀐것) fs.writeFileSync(길, 글, 'utf8');
  console.log(`\n✅ ${바뀐것.size}장을 고쳤다`);
  process.exit(짝안맞음.length ? 1 : 0);
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };

  const 글 = ['## 앞', '', '앞 문단이다.', '', '## 확인하지 못한 것', '',
    '이것은 못 봤다.', '', '## 뒤', '', '뒤 문단이다.'].join('\n');
  const 뒤 = 토막뺀다(글);
  검('🔴 제목과 그 뒤 한 문단을 뺀다', !뒤.includes('확인하지 못한 것') && !뒤.includes('이것은 못 봤다'));
  검('⛔ 뒤에 오는 토막은 그대로 둔다', 뒤.includes('## 뒤') && 뒤.includes('뒤 문단이다.'));
  검('⛔ 앞에 오는 토막도 그대로 둔다', 뒤.includes('## 앞') && 뒤.includes('앞 문단이다.'));
  검('🔴 굵은 글씨 제목 꼴도 뺀다',
    !토막뺀다('본문\n\n**확인하지 못한 것**\n\n못 봤다.\n').includes('못 봤다'));
  검('⛔ 토막이 없으면 글이 그대로다',
    토막뺀다('본문만 있다.\n') === '본문만 있다.\n');
  검('⛔ 빈 것에 안 터진다', 토막뺀다(null) === '' && 토막뺀다('') === '');
  검('🔴 손으로 고칠 짝이 저장소 길로 적혀 있다',
    손으로고칠짝.every(([길]) => 길.startsWith('content/')));
  검('⛔ 짝의 새 말에 「확인하지 못」이 남아 있지 않다',
    손으로고칠짝.every(([, , 새]) => !/확인하지 못|확인되지 않|미확인/.test(새)));

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = (process.argv[1] || '').replace(/\\/g, '/').endsWith('뺀다-손님글의-확인못함.mjs');
if (나를직접돌렸나) 주다();

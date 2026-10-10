/**
 * japan-exec-title.mjs — **일본 유가증권보고서 표지의 「代表者の役職氏名」을 가른다.**
 *
 * ── 🔴 왜 (2026-10-10 23:4x · 5번) ──────────────────────────────────
 * EDINET 표지에는 직위와 이름이 **한 줄에 붙어** 있다 —
 * ```
 * 代表取締役社長　　大久保　昇
 * 代表取締役社長　社長役員   古川　幸二      ← 직위가 «둘»이다
 * 取締役兼代表執行役社長    川邊  史          ← 代表 가 앞에 없다
 * 代表取締役社長ＣＥＯ　　岡島　正恒          ← 전각 ＣＥＯ
 * ```
 * ⛔ **첫 공백으로 가르면 틀린다.** 위 둘째 줄이 「社長役員 古川 幸二」를 이름으로 만든다.
 * ⛔ **마지막 공백으로도 틀린다.** 이름이 「姓 名」으로 갈라져 있다.
 * ✅ 한국 `exec-title-en.mjs` 와 같은 길 — **아는 조각을 앞에서 떼고, 남은 것이 이름**이다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────
 * ⛔ **이름을 로마자로 옮기지 않는다.** 한자의 읽기는 규칙으로 정해지지 않는다 —
 *   「昇」이 Noboru 인지 Shō 인지는 그 사람만 안다. 지어내면 사람 이름을 틀리게 박는다.
 *   영문 지면이지만 **못 읽는 것을 못 읽는다고 적는 쪽**이 우리 강령이다.
 * ⛔ **모르는 직위는 null 이다.** 짐작해서 옮기지 않는다(`exec-title-en.mjs` 와 같다).
 * ⚠ 전각과 반각이 섞여 있다 — ＣＥＯ·Ｃ·０ 따위. **재기 전에 반각으로 모은다.**
 *   이 한 줄이 없으면 전각 쓰는 회사에서만 조용히 틀린다.
 *
 * ⭐ 이 지면이 노리는 질의가 **「who is the ceo of …」** 다. 일본 직위는 「社長」이라
 *   그대로 옮기면 CEO 가 안 나온다 — 한국과 같이 **(CEO) 를 함께** 적는다.
 *
 * 쓰는 법
 *   import { 대표자가르기, 일본직위영문 } from '../lib/japan-exec-title.mjs';
 *   대표자가르기('代表取締役社長　　大久保　昇')
 *     → { 직위: '代表取締役社長', 이름: '大久保 昇', 직위영문: 'Representative Director and President (CEO)' }
 *   node src/lib/japan-exec-title.mjs --자가시험
 */

/**
 * 직위 조각 — **긴 것부터** 적는다. 앞에서 떼어 내므로 차례가 뜻을 가른다.
 * ⚠ 단독 「長」을 넣지 않는다 — 「長谷川」 같은 성의 첫 글자를 떼어 간다.
 */
export const 조각 = [
  ['代表執行役社長', 'Representative Executive Officer and President (CEO)'],
  ['代表執行役', 'Representative Executive Officer (CEO)'],
  ['代表取締役社長', 'Representative Director and President (CEO)'],
  ['代表取締役会長', 'Representative Director and Chairman (CEO)'],
  ['代表取締役', 'Representative Director (CEO)'],
  ['取締役会長', 'Chairman of the Board'],
  ['取締役社長', 'President and Director'],
  ['取締役', 'Director'],
  ['社長執行役員', 'President and Executive Officer'],
  ['社長役員', 'President and Executive Officer'],
  ['執行役員', 'Executive Officer'],
  ['執行役', 'Executive Officer'],
  ['グループCEO', 'Group CEO'],
  ['副社長', 'Executive Vice President'],
  ['副会長', 'Vice Chairman'],
  ['会長', 'Chairman'],
  ['社長', 'President'],
  ['専務', 'Senior Managing Director'],
  ['常務', 'Managing Director'],
  ['理事長', 'Chairman'],
  ['頭取', 'President (Bank)'],
  ['CEO', 'CEO'],
  ['COO', 'COO'],
  ['CFO', 'CFO'],
  /* 잇는 말 — 영문에서는 and 로 묶이므로 따로 낼 말이 없다 */
  ['兼', null],
  ['・', null],
  ['，', null],
  [',', null],
];

/**
 * 전각을 반각으로, 전각 공백을 보통 공백으로.
 * ⚠ 이 한 줄이 없으면 「ＣＥＯ」 쓰는 회사에서만 조용히 틀린다 — 겉으로 똑같아 보인다.
 */
export function 반각으로(글) {
  return String(글 ?? '')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ');
}

/**
 * 표지 한 줄을 직위와 이름으로.
 * @returns {{직위:string|null, 이름:string|null, 직위영문:string|null, 원문:string}}
 *   ⛔ 못 가르면 직위·이름을 **지어내지 않고** null 로 둔다. 원문은 언제나 돌려준다.
 */
export function 대표자가르기(원문) {
  const 민 = 반각으로(원문).replace(/\s+/g, ' ').trim();
  if (!민) return { 직위: null, 이름: null, 직위영문: null, 원문: String(원문 ?? '') };

  /* 조각을 떼는 동안에는 공백을 무시한다 — 「代表取締役社長 社長役員」처럼 사이에 끼어 있다 */
  let 남은 = 민.replace(/ /g, '');
  const 직위조각 = [];
  const 영문조각 = [];
  let 돌이 = 0;
  while (남은 && 돌이++ < 20) {
    const 맞는것 = 조각.find(([ko]) => 남은.startsWith(ko));
    if (!맞는것) break;                      /* 모르는 글자가 나오면 거기서부터 이름이다 */
    직위조각.push(맞는것[0]);
    if (맞는것[1] && !영문조각.includes(맞는것[1])) 영문조각.push(맞는것[1]);
    남은 = 남은.slice(맞는것[0].length);
  }
  /* ⛔ 한 조각도 못 뗐으면 직위를 모르는 것이다 — 통째로 이름이라고 하지 않는다 */
  if (!직위조각.length) return { 직위: null, 이름: null, 직위영문: null, 원문: String(원문 ?? '') };
  /* ⛔ 뗀 뒤 남은 것이 없으면 이름이 없는 것이다 — 직위를 이름으로 쓰지 않는다 */
  if (!남은) return { 직위: 직위조각.join(''), 이름: null, 직위영문: 영문조각.join(', ') || null, 원문: String(원문 ?? '') };

  /* 이름은 **원문 쪽에서** 떠 온다 — 성과 이름 사이 공백을 살리려고.
     뗀 글자 수만큼 원문(공백 민 것)에서 건너뛴 자리부터가 이름이다 */
  const 뗀수 = 직위조각.join('').length;
  let 본수 = 0;
  let 자리 = 0;
  for (; 자리 < 민.length && 본수 < 뗀수; 자리 += 1) if (민[자리] !== ' ') 본수 += 1;
  const 이름 = 민.slice(자리).trim().replace(/\s+/g, ' ');

  return {
    직위: 직위조각.join(''),
    이름: 이름 || null,
    직위영문: 영문조각.join(', ') || null,
    원문: String(원문 ?? ''),
  };
}

/** 직위만 영문으로 — 못 옮기면 null */
export function 일본직위영문(직위) {
  const r = 대표자가르기(`${String(직위 ?? '')} 　`);
  return r.직위영문;
}

/* ── 자가시험 ─────────────────────────────────────────────────── */
async function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참, 덧 = '') => {
    if (참) { 통 += 1; console.log('✅', 이름, 덧); } else { 탈 += 1; console.log('🔴', 이름, 덧); }
  };

  /* 🔴 감은 **실측한 130건에서 떠 왔다.** 지어낸 꼴로 시험하지 않는다 */
  const a = 대표자가르기('代表取締役社長　　大久保　昇');
  검('🔴 가장 흔한 꼴(96/130) — 직위와 이름이 갈린다',
    a.직위 === '代表取締役社長' && a.이름 === '大久保 昇');
  검('🔴 직위에 CEO 가 들어간다 — 이 지면이 노리는 질의가 「who is the ceo of」다',
    a.직위영문 === 'Representative Director and President (CEO)');

  const b = 대표자가르기('代表取締役社長　社長役員   古川　幸二');
  검('🔴🔴 직위가 «둘»인 꼴 — 첫 공백으로 갈랐으면 「社長役員 古川 幸二」가 이름이 됐다',
    b.직위 === '代表取締役社長社長役員' && b.이름 === '古川 幸二', `— 이름 ${JSON.stringify(b.이름)}`);

  const c = 대표자가르기('取締役兼代表執行役社長    川邊  史');
  검('🔴 代表 가 앞에 없는 꼴(지명위원회등설치회사)',
    c.이름 === '川邊 史', `— 이름 ${JSON.stringify(c.이름)}`);

  const d = 대표자가르기('代表取締役社長ＣＥＯ　　岡島　正恒');
  검('🔴🔴 전각 ＣＥＯ — 반각으로 모으지 않으면 이 회사에서만 조용히 틀린다',
    d.이름 === '岡島 正恒' && /CEO/.test(d.직위영문 ?? ''), `— 이름 ${JSON.stringify(d.이름)}`);

  검('반각 공백만 쓰는 꼴(2/130)', 대표자가르기('代表取締役社長 山田 太郎').이름 === '山田 太郎');
  검('会長兼社長', 대표자가르기('代表取締役会長兼社長　鈴木　一郎').이름 === '鈴木 一郎');
  검('代表取締役만 (11/130)', 대표자가르기('代表取締役　佐藤　花子').이름 === '佐藤 花子');

  /* ⛔ 지어내지 않는 자리 */
  검('⛔ 아는 조각이 하나도 없으면 직위·이름 둘 다 null — 통째로 이름이라 하지 않는다',
    대표자가르기('よくわからない肩書').직위 === null);

  /* 🔴 [2026-10-11 02:0x] 전수 3,710건 가운데 **딱 하나** 못 가른 것이 이 꼴이다 —
     `管財人　石田　雅文管財人　粟田口　太郎`. 「管財人」은 **파산관재인**이고 대표이사가 아니다.
     ⭐ **일부러 안 가른다.** 조각에 넣어 「Trustee in bankruptcy」로 내면 그 사람들이
       「Who runs it」 칸에 회사를 이끄는 사람으로 적힌다 — 사실이 아니다.
     ⇒ 지면은 이 회사에서 그 칸을 «그리지 않는다». 그것이 맞는 답이다.
     ⚠ 다음 사람이 「빠뜨렸다」고 읽지 않게 여기 박아 둔다. */
  검('🔴 파산관재인(管財人)은 «일부러» 안 가른다 — 대표이사가 아니다',
    대표자가르기('管財人　石田　雅文管財人　粟田口　太郎').이름 === null);
  검('⛔ 빈 것은 null', 대표자가르기('').직위 === null && 대표자가르기(null).이름 === null);
  검('⛔ 원문은 언제나 돌려준다 — 버리지 않는다',
    대표자가르기('よくわからない肩書').원문 === 'よくわからない肩書');
  검('⛔ 직위만 있고 이름이 없으면 직위를 이름으로 쓰지 않는다',
    대표자가르기('代表取締役社長').이름 === null);

  /* 🔴 「長谷川」 — 단독 「長」을 조각에 넣었으면 성의 첫 글자를 떼어 갔다 */
  검('🔴 長 으로 시작하는 성(長谷川)을 직위로 먹지 않는다',
    대표자가르기('代表取締役社長　長谷川　茂').이름 === '長谷川 茂',
    `— 이름 ${JSON.stringify(대표자가르기('代表取締役社長　長谷川　茂').이름)}`);

  /* 🔴 진짜 자료로 — 지어낸 감으로만 시험하지 않는다 */
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
    const 곳간 = path.join(뿌리, 'archive', 'raw', 'japan-edinet-financials');
    const 값 = [];
    for (const 날 of fs.readdirSync(곳간)) {
      const p = path.join(곳간, 날);
      if (!fs.statSync(p).isDirectory()) continue;
      for (const f of fs.readdirSync(p)) {
        if (!f.endsWith('.json')) continue;
        try {
          const j = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8'));
          if (j.representative_raw) 값.push(j.representative_raw);
        } catch { /* 한 건 못 읽는다고 멈추지 않는다 */ }
      }
    }
    if (값.length) {
      let 됨 = 0; const 못한것 = new Map();
      for (const v of 값) {
        const r = 대표자가르기(v);
        if (r.직위 && r.이름 && r.직위영문) 됨 += 1;
        else 못한것.set(v, (못한것.get(v) ?? 0) + 1);
      }
      const 비 = 됨 / 값.length;
      검(`🔴 진짜 자료 ${값.length}건 가운데 9할 넘게 가른다`, 비 > 0.9, `— ${(비 * 100).toFixed(1)}%`);
      const 많은것 = [...못한것].sort((a2, b2) => b2[1] - a2[1]).slice(0, 6);
      if (많은것.length) {
        console.log('   ⬜ 못 가른 꼴(많은 차례):');
        for (const [k, n] of 많은것) console.log(`      ${String(n).padStart(3)}  ${JSON.stringify(k)}`);
      }
    } else {
      console.log('   ⬜ 되받은 자료가 아직 없다 — 진짜 자료로는 못 쟀다. 「됐다」가 아니다.');
    }
  } catch (e) {
    console.log('   ⬜ 진짜 자료를 못 읽었다 —', String(e.message).slice(0, 60));
  }

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  process.exit(탈 ? 1 : 0);
}

if (process.argv[1] && process.argv.includes('--자가시험')) 자가시험();

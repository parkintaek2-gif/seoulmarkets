#!/usr/bin/env node
/**
 * check-orphan-comment-close.mjs — **주석이 «일찍 닫혀» 내부 메모가 손님 글자로 나가는 것을 잡는다.**
 * ────────────────────────────────────────────────────────────────────────────
 * 🔴🔴 [2026-09-02] 같은 결함을 고치다가 «같은 결함을 다시» 만들었다.
 *
 *   사장님이 궁합 감정서 아래에 우리 내부 대화가 찍힌 것을 잡아 주셨다(「삭제해」).
 *   나는 그 `${…}` 꼴을 HTML 주석으로 바꿨다. 그런데 그 주석 «안»에
 *   **「주석은 이렇게 (닫는 표) 로 쓴다」는 설명을 보기로 적었다.**
 *   HTML 파서는 그 보기를 진짜 닫는 표로 읽는다 —
 *   ⇒ 주석이 거기서 끝나고, **아랫줄 여섯 줄(사장님 말씀 원문 포함)이 다시 노출됐다.**
 *   라이브에서 실제로 그렇게 나가 있었다.
 *
 *   ⛔ `check-template-leak.mjs` 는 이것을 «잡지 못했다». 그 자는 `${` 만 찾는데,
 *      이번에 새어 나간 글에는 `${` 가 없었기 때문이다.
 *   ⭐ 그래서 다른 «흔적»을 본다 — 원문을 한 번 훑어 주석의 짝을 맞춰 보고,
 *      **짝 없는 닫는 표**가 남으면 그것은 주석이 일찍 끝났다는 뜻이다.
 *
 * [무엇을 잡나 — 두 가지]
 *   ① 고립 닫는 표   주석 밖에 닫는 표만 남아 있다  → 주석이 일찍 닫혔다
 *   ② 안 닫힌 주석   여는 표 뒤에 닫는 표가 없다     → 그 아래 지면이 통째로 사라진다
 *
 * [쓰는 법]
 *   node scripts/check-orphan-comment-close.mjs             저장소를 훑는다
 *   node scripts/check-orphan-comment-close.mjs --라이브      라이브를 받아 훑는다
 *   node scripts/check-orphan-comment-close.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ⚠ 낱말을 쪼개서 만든다 — 이 자 소스에 그 넉 자가 «붙어» 나타나면
   사람이 이 파일을 읽을 때 눈으로 헷갈린다. 값은 똑같다. */
export const 여는표 = '<' + '!--';
export const 닫는표 = '--' + '>';

/**
 * 흠난 자리를 찾는다.
 *
 * ⭐ 원문을 «한 번» 훑는다. 앞 판은 주석을 걷어 낸 글에서 자리를 찾고 원문 자리를
 *    되짚었는데, 주석 한 덩이가 빈칸 하나로 줄어 **자리가 밀려 줄 번호를 못 냈다**
 *    (자가시험이 그것을 잡았다). 한 번 훑으면 찾은 자리가 곧 원문 자리다.
 *
 * @returns {{갈래:'고립닫는표'|'안닫힌주석', 줄:number, 조각:string}[]}
 */
export function 흠난곳(html) {
  const 글 = String(html ?? '');
  const 작은 = 글.toLowerCase();
  const 나온다 = [];
  const 줄센다 = (i) => 글.slice(0, i).split('\n').length;
  const 조각뜨기 = (i) => 글.slice(Math.max(0, i - 70), i + 10).replace(/\s+/g, ' ').trim();

  let i = 0;
  while (i < 글.length) {
    /* `<script>`·`<style>` 속은 통째로 건너뛴다 — 그 안의 닫는 표는 그냥 글자다 */
    let 건너뜀 = false;
    for (const 태그 of ['script', 'style']) {
      if (!작은.startsWith(`<${태그}`, i)) continue;
      const 끝 = 작은.indexOf(`</${태그}`, i);
      i = 끝 < 0 ? 글.length : 끝 + 태그.length + 2;
      건너뜀 = true;
      break;
    }
    if (건너뜀) continue;

    if (글.startsWith(여는표, i)) {
      const b = 글.indexOf(닫는표, i + 여는표.length);
      if (b < 0) {
        나온다.push({
          갈래: '안닫힌주석',
          줄: 줄센다(i),
          조각: 글.slice(i, i + 80).replace(/\s+/g, ' ').trim(),
        });
        break;
      }
      i = b + 닫는표.length;
      continue;
    }

    if (글.startsWith(닫는표, i)) {
      나온다.push({ 갈래: '고립닫는표', 줄: 줄센다(i), 조각: 조각뜨기(i) });
      i += 닫는표.length;
      continue;
    }

    i += 1;
  }
  return 나온다;
}

/* ⚠ .astro 는 «빌드되기 전» 소스다 — 빌드 결과(dist)만 본다.
   ⛔ 소스를 보고 울면 사람이 검사를 끈다. 그것이 제일 나쁘다. */
const 볼곳 = [
  { 이름: 'klifemap 지면', 방: 'C:/Users/User/Documents/GitHub/klifemap/public', 꼴: /\.html$/i },
  { 이름: 'dataeconomics 빌드', 방: 'C:/Users/User/Documents/GitHub/dataeconomics/dist', 꼴: /\.html$/i, 깊게: true },
];

function 파일모으기(방, 꼴, 깊게, 담을것 = []) {
  let 것들;
  try { 것들 = fs.readdirSync(방, { withFileTypes: true }); } catch { return 담을것; }
  for (const it of 것들) {
    const 길 = path.join(방, it.name);
    if (it.isDirectory()) { if (깊게) 파일모으기(길, 꼴, 깊게, 담을것); continue; }
    if (꼴.test(it.name)) 담을것.push(길);
  }
  return 담을것;
}

export function 자가시험() {
  let 흠 = 0;
  let 잰수 = 0;
  const 본다 = (이름, 참) => {
    잰수 += 1;
    if (참) console.log(`  ✅ ${이름}`);
    else { console.log(`  🔴 ${이름}`); 흠 += 1; }
  };

  /* ⭐ 라이브에서 실제로 새어 나갔던 그 꼴을 그대로 시험으로 굳힌다 */
  const 실제로샌것 = [
    '<div>본문</div>',
    `${여는표} 설명: 주석은 이렇게 \`${여는표} ${닫는표}\` 로 쓴다.`,
    `     사장님 말씀 원문이 여기 있었다 ${닫는표}`,
    '<p>다음</p>',
  ].join('\n');
  본다('🔴 실제로 샌 그 꼴을 잡는다',
    흠난곳(실제로샌것).some((x) => x.갈래 === '고립닫는표'));

  본다('깨끗한 주석은 안 잡는다', 흠난곳(`${여는표} 그냥 메모 ${닫는표}<p>가</p>`).length === 0);
  본다('주석이 여러 개여도 안 잡는다',
    흠난곳(`${여는표} 가 ${닫는표}<p>나</p>${여는표} 다 ${닫는표}`).length === 0);
  본다('주석이 아예 없으면 0 이다', 흠난곳('<p>깨끗</p>').length === 0);

  본다('안 닫힌 주석을 잡는다',
    흠난곳(`<p>가</p>${여는표} 닫는 것을 잊었다`).some((x) => x.갈래 === '안닫힌주석'));

  /* ⛔ 스크립트·스타일 안의 닫는 표는 그냥 글자다. 울면 안 된다 */
  본다('스크립트 안의 닫는 표는 안 잡는다', 흠난곳(`<script>const a = "${닫는표}";</script>`).length === 0);
  본다('스타일 안의 닫는 표는 안 잡는다', 흠난곳(`<style>a{content:"${닫는표}"}</style>`).length === 0);
  본다('스크립트를 지나친 뒤의 고립는 잡는다',
    흠난곳(`<script>const a="x";</script><p>${닫는표}</p>`).length === 1);

  본다('고립가 둘이면 둘로 센다',
    흠난곳(`<p>가 ${닫는표}</p><p>나 ${닫는표}</p>`).filter((x) => x.갈래 === '고립닫는표').length === 2);

  /* ⚠ 줄 번호는 «원문» 기준이다 — 걷어 낸 글의 줄 번호는 사람에게 쓸모없다 */
  본다('줄 번호를 원문 기준으로 준다', 흠난곳(`가\n나\n<p>${닫는표}</p>`)[0].줄 === 3);
  본다('주석 뒤에 오는 고립도 원문 줄로 준다',
    흠난곳(`${여는표}\n여러\n줄\n주석\n${닫는표}\n<p>${닫는표}</p>`)[0].줄 === 6);

  console.log(흠 ? `\n🔴 자가시험 ${흠}개 흠` : `\n✅ 자가시험 ${잰수}가지 다 지났다`);
  return 흠;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 1 : 0);

  let 흠 = 0;
  let 본것 = 0;
  const 알린다 = (이름, 것들) => {
    if (!것들.length) return;
    흠 += 것들.length;
    console.log(`  🔴 ${이름} — ${것들.length}곳`);
    for (const x of 것들.slice(0, 3)) console.log(`       ${x.줄}줄 [${x.갈래}] ${x.조각}`);
  };

  if (process.argv.includes('--라이브')) {
    const 집들 = ['https://klifemap.ai', 'https://www.kculturewire.com',
      'https://seoulmarkets.com', 'https://100yearmap.com'];
    for (const u of 집들) {
      let 길들 = [];
      try {
        const t = await (await fetch(`${u}/sitemap.xml`, { signal: AbortSignal.timeout(25000) })).text();
        길들 = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((x) => !x.endsWith('.xml'));
      } catch { console.log(`  ⬜ ${u} — 사이트맵을 못 받았다. **못 쟀다**`); continue; }
      console.log(`\n── ${u} — 지면 ${길들.length}장`);
      for (const p of 길들) {
        let h = '';
        try { h = await (await fetch(p, { signal: AbortSignal.timeout(15000) })).text(); }
        catch { console.log(`  ⬜ ${p} — 못 받았다`); continue; }
        본것 += 1;
        알린다(p, 흠난곳(h));
      }
    }
  } else {
    for (const 곳 of 볼곳) {
      const 파일들 = 파일모으기(곳.방, 곳.꼴, 곳.깊게);
      if (!파일들.length) { console.log(`  ⬜ ${곳.이름} — 볼 파일이 없다(빌드 전일 수 있다). **못 쟀다**`); continue; }
      console.log(`\n── ${곳.이름} — ${파일들.length}장`);
      for (const f of 파일들) { 본것 += 1; 알린다(path.basename(f), 흠난곳(fs.readFileSync(f, 'utf8'))); }
    }
  }

  console.log(`\n훑은 지면 ${본것}장 · 흠난 곳 ${흠}곳`);
  if (흠) {
    console.error('\n⛔ 주석이 짝을 잃었습니다 — 내부 메모가 손님 글자로 나갑니다.');
    console.error('   주석 «안»에 닫는 표를 «보기»로 적지 마십시오. 그것이 주석을 끝냅니다.');
    process.exit(1);
  }
  console.log('✅ 짝을 잃은 주석이 없다.');
}

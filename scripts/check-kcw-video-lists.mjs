#!/usr/bin/env node
/**
 * check-kcw-video-lists.mjs — **영상 목록이 «셋»인데 서로 갈라진다.**
 *
 * ── 결함에 이름을 붙인다 ──────────────────────────────────────
 * **갈라진 영상 목록** — 한 편의 영상이 세 곳에 이름을 올려야 다 굴러간다.
 * ```
 *   ① 파일        public/wikitip/video/<set>.mp4      — 실제로 있는 것
 *   ② 갤러리 목록  src/data/wikitip-video-index.json   — 지면에 <KcwShorts> 로 «박혀» 있는 것
 *   ③ 내보낼 목록  sitemap.xml.ts 의 videoSets         — 영상 사이트맵 + 올릴 문안
 * ```
 * 셋을 따로 손질하니 반드시 갈라진다. 그리고 **갈라져도 아무 데도 빨강이 안 뜬다.**
 *
 * 🔴 [2026-08-29] 실제로 이랬다.
 * ```
 *   파일 25편 · 갤러리 24편 · 내보낼 목록 21편
 *   어제·오늘 만든 넷(tworulers·onecountry·school-one-name·spike-hearts2hearts)이
 *   ③ 에 없었다 → 영상 사이트맵에도 안 들어가고 올릴 문안도 안 만들어졌다.
 *   spike-hearts2hearts 는 ② 에도 없었다 → **어느 지면에도 안 실려 있었다.**
 * ```
 * ⚠ 「만들었다」와 「보인다」는 다른 말이다. 이 자는 그 사이의 틈을 잰다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────
 * ⛔ 「없다」와 「못 쟀다」를 가른다. 목록 파일을 못 읽으면 
 * ⛔ 이 자는 «고치지» 않는다. 어디가 빠졌는지만 낸다.
 *
 * 쓰는 법
 *   node scripts/check-kcw-video-lists.mjs --자가시험
 *   node scripts/check-kcw-video-lists.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 영상방 = path.join(뿌리, 'public/wikitip/video');
const 갤러리길 = path.join(뿌리, 'src/data/wikitip-video-index.json');
const 사이트맵길 = path.join(뿌리, 'src/pages/wikitip/sitemap.xml.ts');

/** 파일 이름에서 set 이름. ⛔ .mp4 가 아닌 것은 안 센다 */
export function 파일의set(이름) {
  const s = String(이름 ?? '');
  return s.endsWith('.mp4') ? s.slice(0, -4) : null;
}

/** sitemap.xml.ts 글에서 videoSets 의 set 이름들을 뽑는다 */
export function 내보낼목록(글) {
  const s = String(글 ?? '');
  const i = s.indexOf('const videoSets = [');
  if (i < 0) return null;                      /* ⛔ 못 쟀다 — 빈 배열이 아니다 */
  const 끝 = s.indexOf('\n];', i);
  const 몸 = 끝 < 0 ? s.slice(i) : s.slice(i, 끝);
  return [...몸.matchAll(/set:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

/** 갤러리 목록에서 set 이름들 */
export function 갤러리목록(자료) {
  const a = Array.isArray(자료) ? 자료
    : (자료?.videos ?? Object.values(자료 ?? {}).find(Array.isArray));
  if (!Array.isArray(a)) return null;           /* ⛔ 못 쟀다 */
  return a.map((x) => x?.set).filter(Boolean);
}

/**
 * 세 목록을 견준다.
 * ⛔ 어느 하나라도 «못 쟀으면» 그 견줌은 내지 않는다 — 못 잰 것을 「없다」로 내면 거짓 빨강이 된다.
 */
export function 어긋난것(파일, 갤러리, 내보낼) {
  const 셈 = (a) => (Array.isArray(a) ? new Set(a) : null);
  const F = 셈(파일); const G = 셈(갤러리); const S = 셈(내보낼);
  /**
   * 🔴 [2026-09-03] **소리판이 있는 무음 원본은 «일부러» 어느 목록에도 안 싣는다.**
   *
   * 사장님 지시가 둘이고 둘 다 지켜야 한다 —
   *   「무성 콘텐트 다신 만들지 말 것」        → 무음판을 손님에게 내밀지 않는다
   *   「삭제하지 말고 소리만 입혀서 추가로 배포해」 → 파일은 지우지 않는다
   * ⇒ 그래서 «파일은 남고 목록에는 없는» 상태가 **맞는 상태**다.
   *
   * ⛔ 그런데 이 자가 그것을 「만든 값만 치르고 아무도 못 본다」로 여섯 편 울렸다.
   *   맞는 상태를 흠으로 부르면 사람이 검사를 끈다. 그것이 검사가 죽는 길이다.
   * ⇒ `<이름>-voiced` 가 파일에 있으면 `<이름>` 은 이 견줌에서 뺀다.
   * ⚠ 아직 소리판이 «없는» 무음판은 그대로 울린다 — 그건 정말 고쳐야 하는 것이다.
   */
  const 소리판있음 = F ? new Set([...F].filter((x) => x.endsWith('-voiced')).map((x) => x.replace(/-voiced$/, ''))) : null;
  const 일부러안실은것 = (x) => !!소리판있음 && 소리판있음.has(x);
  const 빼기 = (a, b) => (a && b
    ? [...a].filter((x) => !b.has(x) && !일부러안실은것(x)).sort()
    : null);
  return {
    파일수: F ? F.size : null,
    갤러리수: G ? G.size : null,
    내보낼수: S ? S.size : null,
    /* 파일은 있는데 어느 지면에도 안 실렸다 — 만든 값만 치르고 아무도 못 본다 */
    지면에없다: 빼기(F, G),
    /* 파일은 있는데 사이트맵·올릴 문안에 없다 — 구글 영상 검색에도 안 뜨고 못 올린다 */
    내보낼목록에없다: 빼기(F, S),
    /* 목록에는 있는데 파일이 없다 — 손님에게 404 가 간다 */
    파일이없다: [...(빼기(G, F) ?? []), ...(빼기(S, F) ?? [])]
      .filter((x, i, a2) => a2.indexOf(x) === i).sort(),
  };
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  검('mp4 만 센다', 파일의set('a.mp4') === 'a' && 파일의set('a.jpg') === null);
  검('⛔ 빈 것도 안 터진다', 파일의set(undefined) === null);

  검('videoSets 에서 이름을 뽑는다',
    JSON.stringify(내보낼목록("const videoSets = [\n{ set: 'a', page: '/x' },\n{ set: 'b-c' },\n];\n"))
      === JSON.stringify(['a', 'b-c']));
  검('⛔ videoSets 가 아예 없으면 null — 빈 배열이 아니다',
    내보낼목록('const x = 1;') === null);
  검('videoSets 뒤의 다른 set 은 안 센다',
    JSON.stringify(내보낼목록("const videoSets = [\n{ set: 'a' },\n];\nconst other = [{ set: 'zz' }];"))
      === JSON.stringify(['a']));

  검('갤러리에서 이름을 뽑는다',
    JSON.stringify(갤러리목록([{ set: 'a' }, { set: 'b' }])) === JSON.stringify(['a', 'b']));
  검('감싼 꼴도 읽는다',
    JSON.stringify(갤러리목록({ videos: [{ set: 'a' }] })) === JSON.stringify(['a']));
  검('⛔ 못 읽으면 null', 갤러리목록(null) === null);

  const r = 어긋난것(['a', 'b', 'c'], ['a', 'b'], ['a']);
  검('셋 다 센다', r.파일수 === 3 && r.갤러리수 === 2 && r.내보낼수 === 1);
  검('지면에 안 실린 것을 찾는다', JSON.stringify(r.지면에없다) === JSON.stringify(['c']));
  검('내보낼 목록에 없는 것을 찾는다', JSON.stringify(r.내보낼목록에없다) === JSON.stringify(['b', 'c']));
  검('파일 없는 것은 없다', r.파일이없다.length === 0);

  const r2 = 어긋난것(['a'], ['a', 'ghost'], ['a']);
  검('목록에만 있고 파일이 없는 것을 찾는다', JSON.stringify(r2.파일이없다) === JSON.stringify(['ghost']));

  const r3 = 어긋난것(['a'], null, ['a']);
  검('⛔ 못 잰 목록이 있으면 그 견줌은 null — 「없다」로 안 낸다',
    r3.지면에없다 === null && r3.갤러리수 === null && r3.내보낼목록에없다.length === 0);

  검('⛔ 빈 것도 안 터진다', 어긋난것(undefined, undefined, undefined).파일수 === null);

  if (실패.length) {
    console.error(`❌ 자가시험 실패 ${실패.length}\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ check-kcw-video-lists 자가시험 통과 (15)');
  process.exit(0);
}

/* ── 실제로 잰다 ── */
const 파일 = (() => {
  try { return fs.readdirSync(영상방).map(파일의set).filter(Boolean); } catch { return null; }
})();
const 갤러리 = (() => {
  try { return 갤러리목록(JSON.parse(fs.readFileSync(갤러리길, 'utf8'))); } catch { return null; }
})();
const 내보낼 = (() => {
  try { return 내보낼목록(fs.readFileSync(사이트맵길, 'utf8')); } catch { return null; }
})();

const r = 어긋난것(파일, 갤러리, 내보낼);

console.log('■ 영상 목록 셋이 서로 맞나\n');
const 수말 = (n) => (n == null ? '⬜ 못 쟀다' : `${n}편`);
console.log(`   파일        ${수말(r.파일수)}   public/wikitip/video/*.mp4`);
console.log(`   갤러리 목록  ${수말(r.갤러리수)}   지면에 <KcwShorts> 로 실린 것`);
console.log(`   내보낼 목록  ${수말(r.내보낼수)}   영상 사이트맵 + 올릴 문안`);

let 빨강 = 0;
const 낸다 = (제목, 목록, 뜻) => {
  if (목록 == null) { console.log(`\n   ⬜ ${제목} — 못 쟀다(목록 하나를 못 읽었다)`); return; }
  if (!목록.length) { console.log(`\n   ✅ ${제목} 0편`); return; }
  빨강 += 목록.length;
  console.log(`\n   🔴 ${제목} ${목록.length}편 — ${뜻}`);
  for (const x of 목록) console.log(`      · ${x}`);
};

낸다('어느 지면에도 안 실렸다', r.지면에없다,
  '만드는 값은 다 치렀는데 손님이 볼 자리가 없다');
낸다('영상 사이트맵·올릴 문안에 없다', r.내보낼목록에없다,
  '구글 영상 검색에 안 뜨고, 채널에 올릴 문안도 안 만들어진다');
낸다('목록에는 있는데 파일이 없다', r.파일이없다,
  '손님에게 404 가 간다');

console.log(`\n${빨강 ? `⛔ 어긋난 것 ${빨강}편.` : '✅ 셋이 다 맞는다.'}`);
console.log('⚠ 이 자는 고치지 않는다. 새 영상을 만들면 «세 곳 다» 이름을 올려야 한다 —');
console.log('   ① 지면에 <KcwShorts set="…"> ② sitemap.xml.ts 의 videoSets ③ 파일 자리');
process.exit(빨강 ? 1 : 0);

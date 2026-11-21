#!/usr/bin/env node
/**
 * check-못잰것을-0으로-채우나.mjs — **「못 받았다」가 「없다」로 저장되는 자리를 잡는다.**
 *
 * ── 🔴🔴 왜 만들었나 (2026-10-04 · 5번) ─────────────────────────────────
 * 하루에 **같은 결함을 두 번** 만났다.
 *
 *   아침  find-todays-spike.mjs 가 429 를 「자료 없음」으로 읽어 **영어판을 통째로
 *         가리고** 있었다. 고치니 후보가 1개에서 4개로 늘었다.
 *   오후  collect-uae-adx-people.mjs 가 429 를 `catch {}` 로 삼켜 94종목이 전부
 *         「대주주 0건」으로 저장돼 있었다. 고치니 **있음 4 · 없음 27 · 못 쟀다 63**.
 *
 * 둘 다 수가 이상해서 «자를 의심»해 잡았다. 눈으로 안 봤으면 그대로 나갔다.
 *
 * ⭐ 우리 강령 — 「**못 잰 것은 못 쟀다고 적는다. **」
 *   말로 둔 규칙은 잊힌다. 검사로 둔다.
 *
 * 무엇을 잡나 — 받아 오는 자(`collect-*` · `find-*` · `measure-*`)에서
 *   ① 통째로 삼키는 `catch {}` / `catch (e) {}` 가 **받아 오는 호출을 감쌌나**
 *   ② 삼킨 뒤 그 값이 `|| []` · `?? []` · `?? 0` 으로 **빈 것이 되나**
 *   ③ 429 를 다룬 흔적이 있나 (참고로만 — 없다고 빨간불을 켜지는 않는다)
 *
 * ⛔ 이 자는 «단정하지 않는다». 의심스러운 줄을 사람에게 보여 줄 뿐이다 —
 *   받아 오는 호출이 아닌 catch 도 있고(JSON 파싱 뒤 곧바로 throw 하는 자리 등),
 *   그것까지 빨갛게 칠하면 고칠 수 없는 빨강이 되어 진짜를 묻는다.
 *
 * 쓰는 법
 *   node scripts/check-못잰것을-0으로-채우나.mjs
 *   node scripts/check-못잰것을-0으로-채우나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));

/** 받아 오는 자인가. ⛔ 이름으로 가른다 — 모든 파일을 훑으면 잡음이 너무 많다 */
export function 받아오는자인가(이름) {
  return /^(collect|find|measure|fetch)-/.test(String(이름 ?? ''));
}

/** 바깥에서 받아 오는 호출인가 */
export function 받아오는호출인가(줄) {
  return /\bfetch\s*\(|\bcurl|execFileSync\s*\(\s*['"]curl|axios|https?\.get/.test(String(줄 ?? ''));
}

/** 통째로 삼키는 catch 인가. ⛔ 안에 글이 있으면 삼키는 것이 아니다 */
export function 삼키는catch인가(줄) {
  return /catch\s*(\([^)]*\))?\s*\{\s*\}/.test(String(줄 ?? ''));
}

/** 못 받은 것을 빈 것으로 바꾸나 */
export function 빈것으로바꾸나(줄) {
  return /(\?\?|\|\|)\s*(\[\s*\]|0\b|\{\s*\})/.test(String(줄 ?? ''));
}

/**
 * 파일 한 개에서 의심스러운 자리를 집는다.
 * ⭐ 삼키는 catch 가 **같은 줄이나 앞 세 줄 안에** 받아 오는 호출을 끼고 있을 때만 센다 —
 *   그래야 「JSON 파싱 실패를 삼키고 곧바로 throw」 같은 멀쩡한 자리를 안 건드린다.
 */
export function 의심줄찾기(글, 둘레 = 3) {
  const 줄 = String(글 ?? '').split(/\r?\n/);
  const 것 = [];
  for (let i = 0; i < 줄.length; i += 1) {
    if (!삼키는catch인가(줄[i])) continue;
    let 받아옴 = false;
    for (let j = Math.max(0, i - 둘레); j <= i; j += 1) if (받아오는호출인가(줄[j])) 받아옴 = true;
    if (받아옴) 것.push({ 번호: i + 1, 글: 줄[i].trim(), 까닭: '받아 오는 호출을 삼키는 catch 가 감쌌다' });
  }
  for (let i = 0; i < 줄.length; i += 1) {
    if (받아오는호출인가(줄[i]) && 빈것으로바꾸나(줄[i])) {
      것.push({ 번호: i + 1, 글: 줄[i].trim(), 까닭: '받아 온 값이 곧바로 빈 것으로 바뀐다' });
    }
  }
  return 것;
}

/** 429 를 다룬 흔적이 있나 — 참고로만 본다 */
export function 사백이십구를다루나(글) {
  return /429|Retry-After|retry-after|참는횟수/.test(String(글 ?? ''));
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 참) => 결과.push({ 이름, 참: !!참 });

  본다('받아 오는 자를 가린다', 받아오는자인가('collect-uae-adx-people.mjs'));
  본다('find 도 받아 오는 자다', 받아오는자인가('find-todays-spike.mjs'));
  본다('⛔ 검사 자는 아니다', !받아오는자인가('check-2h.mjs'));
  본다('⛔ null 에도 안 터진다', !받아오는자인가(null));

  본다('fetch 를 집는다', 받아오는호출인가('const r = await fetch(url);'));
  본다('curl 도 집는다', 받아오는호출인가("execFileSync('curl', ['-sS', url])"));
  본다('⛔ 그냥 글은 아니다', !받아오는호출인가('const x = 1;'));

  본다('빈 catch 를 집는다', 삼키는catch인가('} catch {}'));
  본다('인자 있는 빈 catch 도 집는다', 삼키는catch인가('} catch (e) {}'));
  본다('⛔ 안에 글이 있으면 삼키는 것이 아니다', !삼키는catch인가('} catch { throw e; }'));

  본다('빈 배열로 바꾸는 것을 집는다', 빈것으로바꾸나('const r = (await fetch(u)) ?? [];'));
  본다('0 으로 바꾸는 것도 집는다', 빈것으로바꾸나('x = fetch(u) || 0;'));
  본다('⛔ 빈 문자열은 안 센다 — 0 과 다르다', !빈것으로바꾸나("x = f() ?? '';"));

  {
    const 나쁜 = ['let a = null;', 'try { a = await fetch(u); } catch {}', 'use(a ?? []);'].join('\n');
    const 것 = 의심줄찾기(나쁜);
    본다('🔴 받아 오는 호출을 삼키는 catch 를 잡는다', 것.length >= 1);
  }
  {
    /* 멀쩡한 자리 — 파싱 실패를 삼키고 곧바로 던진다 */
    const 괜찮은 = ['let msg = buf.toString();', 'try { msg = JSON.parse(msg).status; } catch {}', 'throw new Error(msg);'].join('\n');
    본다('⛔ 받아 오는 호출이 없으면 안 센다 — 고칠 수 없는 빨강을 만들지 않는다',
      의심줄찾기(괜찮은).length === 0);
  }
  본다('⛔ 빈 글에도 안 터진다', 의심줄찾기('').length === 0 && 의심줄찾기(null).length === 0);

  본다('429 를 다룬 흔적을 본다', 사백이십구를다루나('if (r.status === 429) ...'));
  본다('참는횟수도 흔적이다', 사백이십구를다루나('export const 참는횟수 = 3;'));

  const 빨강 = 결과.filter((r) => !r.참).length;
  console.log('■ 못 잰 것을 0 으로 채우나 — 자가시험');
  for (const r of 결과) console.log(`  ${r.참 ? '✅' : '🔴'} ${r.이름}`);
  console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
  return 빨강 === 0;
}

/* ── 혼자 돌 때 ───────────────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }
  const 파일들 = fs.readdirSync(여기).filter((f) => f.endsWith('.mjs') && 받아오는자인가(f));
  let 의심 = 0;
  const 사백없음 = [];
  console.log(`■ 받아 오는 자 ${파일들.length}개를 본다`);
  for (const f of 파일들) {
    const 글 = fs.readFileSync(path.join(여기, f), 'utf8');
    const 것 = 의심줄찾기(글);
    if (!사백이십구를다루나(글)) 사백없음.push(f);
    if (!것.length) continue;
    의심 += 것.length;
    console.log(`\n  ⚠ ${f}`);
    for (const x of 것) console.log(`     ${x.번호}줄  ${x.까닭}\n        ${x.글.slice(0, 90)}`);
  }
  console.log(`\n■ 의심 줄 ${의심}개`);
  if (의심) {
    console.log('   ⛔ 이 자는 단정하지 않는다 — 열어 보고 사람이 정한다.');
    console.log('   ⭐ 보는 법 — 그 호출이 실패했을 때 저장되는 값이 «빈 것»인가,');
    console.log('      아니면 «못 쟀다(null)»인가. 빈 것이면 거짓 사실이 쌓인다.');
  } else {
    console.log('   ✅ 받아 오는 호출을 통째로 삼키는 자리가 없다');
  }
  if (사백없음.length) {
    console.log(`\n⬜ 429(너무 자주 물었다)를 다룬 흔적이 없는 자 ${사백없음.length}개 — 빨간불이 아니다`);
    console.log('   ' + 사백없음.slice(0, 12).join(' · '));
    console.log('   ⚠ 그 자가 부르는 곳이 한도를 걸지 않을 수도 있다. 수가 이상할 때 여기부터 본다.');
  }
}

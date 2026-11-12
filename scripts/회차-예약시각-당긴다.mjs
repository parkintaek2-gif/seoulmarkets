#!/usr/bin/env node
/**
 * 🔴🔴🔴 **「9시 예약이면 9시에 기사를 줘」 — 예약을 당긴다.**
 *
 * 사장님 (2026-10-06): 「스포츠예약 기사가 잘 작동이 안되는 것 같음. 체크해봐.
 *                      **9시 예약이면 9시에 기사를 줘**」
 *
 * 재 보니 예약 «시각»은 맞는데 기사가 늦게 나간다. 사이에 둘이 끼어 있다 —
 *
 *   09:00  예약에 적힌 시각
 *   09:08  플랫폼이 실제로 띄운다            ← 8~9분. 우리가 못 줄인다(실측)
 *   +16~30분  회차가 글을 쓴다               ← 11시 16분 · 14시 30분(실측)
 *   09:25~09:40  그제야 나간다
 *
 * ⇒ **예약 자체를 당기면 정시에 드린다.** 35분 당긴다.
 *   08:25 에 뜨면 → 08:33 시작 → 08:49~09:03 완성 → 09시 거두기가 바로 집는다.
 *
 * ⚠ 「마감 시간 9·10·11·14·15·16시」는 **받으시는 시각**이지 쓰기 시작하는 시각이 아니다.
 *   사장님 지시(2026-09-28)의 여섯 회차는 그대로다. 안 늘리고 안 줄인다.
 * ⛔ 더 많이 당기지 않는다 — 14시 회차는 해외스포츠라 너무 당기면 밤 경기가 덜 끝난다.
 * ⚠ 이것은 하루치 실측으로 정한 35분이다. 며칠 재서 다시 맞춘다 —
 *   node scripts/잰다-기사가-제때-나갔나.mjs
 *
 * 쓰기 —
 *   node scripts/회차-예약시각-당긴다.mjs            무엇이 바뀌는지만 본다
 *   node scripts/회차-예약시각-당긴다.mjs --적는다   실제로 바꾼다
 *   node scripts/회차-예약시각-당긴다.mjs --자가시험
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 몇 분 당기나 */
export const 당길분 = 35;

/** 회차와 예약 아이디. ⛔ 회차를 늘리거나 줄이지 않는다 — 사장님이 여섯으로 정하셨다 */
export const 회차 = [
  ['09', 'trig_01GeyrdjqmGjtu3cCt6ynZHm'],
  ['10', 'trig_01QLALBiamUfmxWngeTULv12'],
  ['11', 'trig_01UW2RtJac77hBVz1tkgCQxN'],
  ['14', 'trig_01RgAwm6L1q4nBhanUgz3s8N'],
  ['15', 'trig_01EwjhZx3AKXuEyHK82N9DEn'],
  ['16', 'trig_01ErSZQm2VhuNYMRBi3MCufF'],
];

/**
 * cron 글에서 분·시를 당긴다.
 * ⛔ 요일·날짜 칸은 건드리지 않는다 — 평일만 도는 회차가 있다.
 * ⛔ **시간대 머리(CRON_TZ=…)가 없으면 붙인다.** 10시 회차가 `0 1 * * 1-5` 였다 —
 *   UTC 로 읽혀 우연히 맞았을 뿐이고, 서머타임이나 서버 설정이 바뀌면 조용히 어긋난다.
 * ⛔ 못 읽으면 null — 「안 바꿔도 된다」가 아니라 「손대면 안 된다」다.
 */
export function 당기기(cron글, 분 = 당길분) {
  const s = String(cron글 ?? '').trim();
  if (!s) return null;
  const 머리 = /^CRON_TZ=([^\s]+)\s+/.exec(s);
  const 몸 = 머리 ? s.slice(머리[0].length) : s;
  const 칸 = 몸.split(/\s+/);
  if (칸.length !== 5) return null;
  const 분칸 = Number(칸[0]); const 시칸 = Number(칸[1]);
  if (!Number.isInteger(분칸) || !Number.isInteger(시칸)) return null;   /* `*` 나 목록은 손대지 않는다 */
  if (분칸 < 0 || 분칸 > 59 || 시칸 < 0 || 시칸 > 23) return null;

  /* 시간대가 없으면 UTC 로 읽힌 것이다 — KST 로 바로 세운다 */
  const 시간대 = 머리 ? 머리[1] : 'Asia/Seoul';
  const 바탕시 = 머리 ? 시칸 : (시칸 + 9) % 24;      /* UTC → KST */

  let 총 = 바탕시 * 60 + 분칸 - 분;
  총 = ((총 % 1440) + 1440) % 1440;
  const 새시 = Math.floor(총 / 60); const 새분 = 총 % 60;
  return {
    cron: `CRON_TZ=${시간대} ${새분} ${새시} ${칸[2]} ${칸[3]} ${칸[4]}`,
    전: { 시: 바탕시, 분: 분칸, 시간대있었나: Boolean(머리) },
    후: { 시: 새시, 분: 새분 },
  };
}

/* ── 자가시험 ───────────────────────────────────────────── */
function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 본다 = (말, 참) => { if (참) { 통 += 1; console.log('✅ ' + 말); } else { 탈 += 1; console.log('🔴 ' + 말); } };

  const a = 당기기('CRON_TZ=Asia/Seoul 0 9 * * *');
  본다('09:00 을 35분 당기면 08:25', a.cron === 'CRON_TZ=Asia/Seoul 25 8 * * *');
  본다('요일 칸을 안 건드린다', 당기기('CRON_TZ=Asia/Seoul 0 11 * * 1-5').cron.endsWith('* * 1-5'));

  const b = 당기기('0 1 * * 1-5');
  본다('🔴 시간대가 없으면 UTC 로 읽고 KST 로 바로 세운다 — 10시 회차가 이랬다',
    b.cron === 'CRON_TZ=Asia/Seoul 25 9 * * 1-5');
  본다('그 사실을 돌려준다', b.전.시간대있었나 === false && b.전.시 === 10);

  본다('⭐ 시를 넘어가도 센다', 당기기('CRON_TZ=Asia/Seoul 10 14 * * *').cron.includes('35 13'));
  본다('⭐ 자정을 넘어가도 안 터진다', 당기기('CRON_TZ=Asia/Seoul 0 0 * * *').cron.includes('25 23'));

  본다('⛔ 별표 시각은 손대지 않는다 — null', 당기기('0 * * * *') === null);
  본다('⛔ 목록 시각도 손대지 않는다', 당기기('0 9,10 * * *') === null);
  본다('⛔ 칸 수가 다르면 null', 당기기('0 9 * *') === null && 당기기('0 9 * * * *') === null);
  본다('⛔ 빈 것도 null — 「안 바꿔도 된다」가 아니라 「손대면 안 된다」다',
    당기기(null) === null && 당기기('') === null);
  본다('⛔ 말도 안 되는 수는 null', 당기기('CRON_TZ=Asia/Seoul 99 9 * * *') === null);

  본다('회차가 여섯이다 — 사장님이 정하신 수', 회차.length === 6);
  본다('예약 아이디 꼴이 맞다', 회차.every(([, t]) => /^trig_[A-Za-z0-9]+$/.test(t)));

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통} 통과`);
  return 탈 ? 1 : 0;
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다 && process.argv.includes('--자가시험')) process.exit(자가시험());

export default { 당기기, 회차, 당길분 };

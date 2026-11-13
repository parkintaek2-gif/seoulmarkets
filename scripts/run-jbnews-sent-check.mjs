#!/usr/bin/env node
/**
 * run-jbnews-sent-check.mjs - ASCII-named launcher for check-jbnews-sent-today.mjs
 *
 * 🔴 [2026-11-14 · 5번] run-기사다갔나.cmd 도 같은 병이었다 —
 *   UTF-8 로 저장된 .cmd 안의 `--알린다` 가 `--�˸���` 로 깨져 전달돼,
 *   스크립트는 「알리지 않는 모드」로 돌다 끝났다. 예약작업은 날마다 결과 1 이었다.
 *   ⇒ 중부매일 기사가 안 나가도 울리지 않았다. 2026-11-13 에 기사가 빈 날과 이어진다.
 *
 * ⛔ .cmd 에는 ASCII 만 적는다.
 */
if (!process.argv.includes('--알린다')) process.argv.push('--알린다');
await import('./check-jbnews-sent-today.mjs');

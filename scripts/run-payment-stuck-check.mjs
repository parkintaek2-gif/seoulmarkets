#!/usr/bin/env node
/**
 * run-payment-stuck-check.mjs - ASCII-named launcher for check-결제막힘-오래됐나.mjs
 *
 * 🔴 [2026-11-14 · 5번] 왜 이 파일이 생겼나
 *   예약작업 `SeoulMarkets-결제막힘-오래됐나` 가 날마다 «결과 1» 로 끝나고 있었다.
 *   까닭은 고장이 아니라 **글자 인코딩**이었다 — run-결제막힘확인.cmd 를 UTF-8 로
 *   저장해 두었는데 cmd.exe 는 .cmd 를 CP949 로 읽는다. 그래서 명령줄이
 *     node "scripts\check-��������-�����Ƴ�.mjs" --�˸���
 *   로 깨져 **있지도 않은 파일**을 불렀다. 손으로 돌리면 0 으로 멀쩡히 끝난다.
 *   ⇒ 결제가 두 시간 넘게 막혀도 **아무도 안 울리는 상태**였다. 자물쇠에 뚫린 구멍이다.
 *
 * ⛔ .cmd 안에 한글(파일명·인자)을 쓰지 않는다. .mjs 는 UTF-8 로 읽히니 여기서 넘긴다.
 *   (같은 교훈이 auto-1600-report.cmd 주석에 «ASCII ONLY» 로 이미 적혀 있었다)
 */
if (!process.argv.includes('--알린다')) process.argv.push('--알린다');
await import('./check-결제막힘-오래됐나.mjs');

@echo off
chcp 65001 >nul
rem ── 해외 자료 셋을 날마다 거둔다 (일본 EDINET · UAE ADX · 인도 NSE) ──────────
rem
rem  🔴🔴 왜 이 파일이 있나 (2026-11-05 · 5번)
rem    사장님 — 「에마켓츠는 방치중인가?」
rem    재 보니 이 셋은 **예약 작업이 아예 없었다.** 누가 생각날 때만 손으로 돌렸고,
rem    그래서 일본은 14일, 인도는 4일 비었고 UAE 는 한 줄도 없었다.
rem    ⛔ 「손으로 돌린다」는 안 돌린다는 뜻이다. 기억에 맡긴 일은 반드시 빈다.
rem
rem  ⛔ 셋을 한 파일에 둔다. 앞의 것이 막혀도 뒤의 것은 돈다 (&& 로 묶지 않는다).
rem  ⛔ 로그를 남긴다 — 「돌았다」와 「거뒀다」는 다른 일이다. 막히면 로그에 남아야 안다.
rem  ⚠ 인도 NSE 는 그쪽이 자동 접속을 막는다. 막히면 막혔다고 로그에 적고 넘어간다.
rem    0 으로 채우지 않는다.
rem
rem  손으로 한 번
rem    scripts\run-해외자료-거두기.cmd
rem ──────────────────────────────────────────────────────────────────────────
cd /d "C:\Users\User\Documents\GitHub\dataeconomics"

echo. >> "docs\고정업무-마커\해외자료-거둠.log"
echo ===== %DATE% %TIME% 시작 ===== >> "docs\고정업무-마커\해외자료-거둠.log"

echo --- 일본 EDINET --- >> "docs\고정업무-마커\해외자료-거둠.log"
node scripts\collect-japan-edinet-financials.mjs >> "docs\고정업무-마커\해외자료-거둠.log" 2>&1
node scripts\collect-japan-edinet-breaking.mjs >> "docs\고정업무-마커\해외자료-거둠.log" 2>&1

echo --- UAE ADX --- >> "docs\고정업무-마커\해외자료-거둠.log"
node scripts\collect-uae-adx-financials.mjs >> "docs\고정업무-마커\해외자료-거둠.log" 2>&1

echo --- 인도 NSE --- >> "docs\고정업무-마커\해외자료-거둠.log"
node scripts\collect-india-nse-credit-rating.mjs >> "docs\고정업무-마커\해외자료-거둠.log" 2>&1

echo ===== %DATE% %TIME% 끝 ===== >> "docs\고정업무-마커\해외자료-거둠.log"

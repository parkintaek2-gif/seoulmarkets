@echo off
chcp 65001 >nul
rem  🔴🔴 [2026-11-11 · 5번] CLAUDE_SEAT 이 없으면 send-mail 이 cs@klifedesign.net 으로
rem    떨어지고 «위임 토큰을 못 받았다»로 끝난다. 거둠 로그에 그 줄이 520번 쌓여 있었고
rem    평일 닷새에 기사 스무 편이 그래서 안 나갔다. ⛔ 이 줄을 지우지 않는다.
set "CLAUDE_SEAT=5"
REM 일요일(2026-10-25) 저녁, 야구 PO 1차전 기사가 실제로 나갔는지 보고 안 갔으면 외친다.
REM 「열어 뒀다」를 「나갔다」로 읽지 않는다.
cd /d C:\Users\User\Documents\GitHub\dataeconomics
echo ===== %DATE% %TIME% ===== >> "docs\고정업무-마커\야구PO-나갔나.log"
node scripts\야구PO-나갔나.mjs >> "docs\고정업무-마커\야구PO-나갔나.log" 2>&1

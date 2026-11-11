@echo off
REM 🔴 cmd 는 기본 코드페이지(CP949)로 줄을 읽는다. 이 파일은 UTF-8 이라
REM   한글 경로(docs\고정업무-마커\…)를 못 찾고 로그가 한 줄도 안 남는다.
chcp 65001 >nul
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
REM 일요일(2026-10-25) 기사 셋이 끝나면 회차를 원래대로 돌린다.
REM 회차 지시문은 영구적이다 — 두면 월요일에도 롤드컵·KBL 을 쓴다.
REM 사람 기억에 맡기지 않는다. 기억에 맡긴 것은 잊힌다.
cd /d C:\Users\User\Documents\GitHub\dataeconomics
echo ===== %DATE% %TIME% ===== >> "docs\고정업무-마커\일요일지시-되돌리기.log"
node scripts\set-롤드컵-지시문.mjs --되돌린다 >> "docs\고정업무-마커\일요일지시-되돌리기.log" 2>&1
node scripts\set-롤드컵-주말회차.mjs --되돌린다 >> "docs\고정업무-마커\일요일지시-되돌리기.log" 2>&1
REM 야구 PO 1차전을 받으려고 「스포츠 15시」를 빌려 18시로 옮겨 놨다.
REM 안 되돌리면 그 회차가 평일 14:25 에 영영 안 뜬다.
node scripts\set-야구PO-회차시각.mjs --되돌린다 >> "docs\고정업무-마커\일요일지시-되돌리기.log" 2>&1
echo ----- 되돌린 뒤 다시 읽는다 ----- >> "docs\고정업무-마커\일요일지시-되돌리기.log"
node scripts\잰다-회차목록.mjs >> "docs\고정업무-마커\일요일지시-되돌리기.log" 2>&1

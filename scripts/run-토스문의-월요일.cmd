@echo off
chcp 65001 > nul
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
rem 토스에 물어볼 것이 주말이라 못 들어갔다 — 월요일 영업 시작에 다시 올린다.
rem   토스 1:1 채팅은 「상담원과 연결해야 입력할 수 있어요」라 평일 08:00~19:00 에만 글을 쓸 수 있다.
rem   ⛔ 기억에 맡기지 않는다. 2026-10-24 19:05 에 못 쓰고 돌아섰다.
cd /d C:\Users\User\Documents\GitHub\dataeconomics
node scripts\토스문의-올린다.mjs >> docs\고정업무-마커\토스문의.log 2>&1

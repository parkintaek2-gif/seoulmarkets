@echo off
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\check-��������-�����Ƴ�.mjs" --�˸��� >> "C:\Users\User\Documents\GitHub\dataeconomics\archive\��������.log" 2>&1

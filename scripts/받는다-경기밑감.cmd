@echo off
chcp 65001 >nul
set "CLAUDE_SEAT=5"
cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\본다-농구배구-오늘결과.mjs" >> "%TEMP%\경기밑감.log" 2>&1

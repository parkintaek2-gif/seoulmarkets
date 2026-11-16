@echo off
REM run-yesterday-games.cmd
REM   Collects yesterday's KBL / KOVO women's league results into docs\.
REM   Created 2026-11-16 by seat 5 after the 09:00 sports routine stalled on
REM   a session made on 2026-11-11 and no game articles went out for two days.
REM
REM   ASCII only on purpose: cmd.exe reads .cmd as CP949, so Korean file names
REM   and arguments break silently.
setlocal
set CLAUDE_SEAT=5
cd /d C:\Users\User\Documents\GitHub\dataeconomics
node scripts\yesterday-games.mjs >> docs\logs\yesterday-games.log 2>&1
endlocal

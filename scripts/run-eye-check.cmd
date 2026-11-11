@echo off
rem Eye check - login and payment screens, every 2 hours - boss directive 2026-11-08
rem ------------------------------------------------------------------
rem KEEP THIS FILE ASCII-ONLY AND CRLF.
rem  * A Korean filename here breaks the task silently: result=1, empty log.
rem  * LF-only line endings push the first real line out of reach and the
rem    task dies without a word. Six jobs died that way once.
rem  * Entry point is eye-check.mjs, which forwards to the Korean-named one.
rem ------------------------------------------------------------------
chcp 65001 >nul
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
set PYTHONIOENCODING=utf-8
cd /d C:\Users\User\Documents\GitHub\dataeconomics
if errorlevel 1 exit /b 9
if not exist logs md logs
node scripts\eye-check.mjs >> logs\eye-check.log 2>&1
exit /b %ERRORLEVEL%

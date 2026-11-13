@echo off
REM  ASCII ONLY -- see scripts/run-jbnews-sent-check.mjs for why.
REM  2026-11-14: the Korean alert flag was mangled to garbage, so this ran in
REM  "do not alert" mode and exited 1 every day. Missing articles went unreported.
set "CLAUDE_SEAT=5"
cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\run-jbnews-sent-check.mjs" >> "C:\Users\User\Documents\GitHub\dataeconomics\archive\jbnews-sent.log" 2>&1
exit /b %ERRORLEVEL%

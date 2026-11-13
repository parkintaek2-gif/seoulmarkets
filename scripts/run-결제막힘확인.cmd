@echo off
REM  ASCII ONLY -- cmd.exe reads a .cmd file as CP949, so Korean filenames and
REM  Korean arguments get mangled and node is handed a path that does not exist.
REM  2026-11-14: this task returned 1 every single day for that reason, so a
REM  payment outage lasting over two hours would NEVER have alerted anyone.
REM  The Korean names now live inside scripts/run-payment-stuck-check.mjs (UTF-8).
set "CLAUDE_SEAT=5"
cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\run-payment-stuck-check.mjs" >> "C:\Users\User\Documents\GitHub\dataeconomics\archive\payment-stuck.log" 2>&1
exit /b %ERRORLEVEL%

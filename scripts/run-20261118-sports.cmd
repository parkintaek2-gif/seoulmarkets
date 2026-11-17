@echo off
REM  run-20261118-sports.cmd
REM
REM  Boss 2026-11-17: no weather article on the morning of Nov 18.
REM  Instead: basketball (KBL men), volleyball (V-League women),
REM  and the Korea vs Qatar friendly. Write, desk, and mail them all
REM  once the Jungbu Maeil weekly quota resets at 05:00 on Nov 18.
REM
REM  ASCII only, on purpose. A .cmd saved as UTF-8 is read by cmd.exe as
REM  CP949, which mangles Korean paths and arguments. That is why the
REM  runner is named in plain letters and takes no arguments - the slot
REM  number and the prompt path live inside the .mjs file.
REM
REM  Seat number must be set or send-mail falls back to cs@ and nothing ships.
set "CLAUDE_SEAT=5"
cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
"C:\Program Files\nodejs\node.exe" scripts\sports-20261118.mjs >> ".job-20261118-sports.log" 2>&1
exit /b %ERRORLEVEL%

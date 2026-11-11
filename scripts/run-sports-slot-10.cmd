@echo off
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
REM Run the 10:00 sports slot by hand, then collect and mail it.
REM
REM WHY (2026-09-26): the 10:00 scheduled task only fires on weekdays.
REM The owner asked for an esports piece on Sat 9/26 and Sun 9/27, so those two
REM days need a manual trigger. Monday 9/28 the normal weekday schedule resumes.
REM
REM ASCII ONLY. A .cmd with Korean arguments gets mangled to CP949 and the
REM script then exits 0 having done nothing. Use the English alias --slot.
REM
REM Remove this task when the two days are over:
REM   schtasks /delete /tn "SeoulMarkets-Sports10-Sunday" /f

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\run-jbnews-sports-slot.mjs" --slot=10 --wait=14
set RC=%ERRORLEVEL%

REM Delete our own one-shot task now that it has run.
REM A task that says "one-time" does not remove itself -- that is exactly how a
REM 2026-08-01 reminder kept popping up on the owner's laptop for two months.
REM Whoever creates a task also builds the way out of it.
schtasks /delete /tn "SeoulMarkets-Sports10-Sunday" /f >nul 2>&1

exit /b %RC%

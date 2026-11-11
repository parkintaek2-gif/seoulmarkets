@echo off
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
REM Safety net for the 09:00 Asian Games wrap-up on Sun 2026-09-27.
REM
REM WHY: on Sat 9/26 the 10:00 scheduled task only fired on weekdays, so the
REM prompt was updated but no article ever ran and the owner got no mail.
REM The 09:00 task does say it fires today, but "the task is armed" is not the
REM same as "the article went out". This checks the result and only acts if
REM nothing was sent.
REM
REM It is a no-op when the article already went out -- the sent-marker decides.
REM
REM ASCII ONLY. A .cmd with Korean arguments gets mangled to CP949 and the
REM script then exits 0 having done nothing.
REM
REM Remove this task by hand if it is no longer wanted:
REM   schtasks /delete /tn "SeoulMarkets-Sports09-Sunday" /f

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\ensure-sports-slot-09.mjs"
set RC=%ERRORLEVEL%

REM Delete our own one-shot task now that it has run.
REM A task that says "one-time" does not remove itself -- that is exactly how a
REM 2026-08-01 reminder kept popping up on the owner's laptop for two months.
REM Whoever creates a task also builds the way out of it.
schtasks /delete /tn "SeoulMarkets-Sports09-Sunday" /f >nul 2>&1

exit /b %RC%

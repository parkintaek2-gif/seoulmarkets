@echo off
chcp 65001 >nul
REM Check at 23:10 whether the 23:00 report actually went out, fill the gap if it
REM did not, and mail the owner the result either way.
REM
REM WHY (2026-11-11, owner): I said I would check in the morning. The owner said
REM "that is not something that takes that long -- check at 23:10 and send mail".
REM Checking in the morning is too late to fill the gap: the 2026-11-10 night
REM report is permanently missing because nobody noticed until the next day.
REM
REM chcp 65001 is REQUIRED: this file is UTF-8 and the paths below contain Korean.
REM Without it cmd reads them as CP949, cannot find the file, SKIPS the line and
REM still returns 0.
REM
REM CLAUDE_SEAT must be set -- send-mail.mjs otherwise falls back to a sender that
REM is not a real Workspace user and Google rejects the message while exiting 0.
REM
REM Remove this task with:
REM   schtasks /delete /tn "밤보고-확인-2310" /f

set "CLAUDE_SEAT=5"

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\확인한다-밤보고-나갔나.mjs" --보낸다 >> ".밤보고확인.log" 2>&1
exit /b %ERRORLEVEL%

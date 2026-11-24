@echo off
rem  Owner instruction 2026-11-24: mail the jbnews reporter production figures every
rem  day, so the Naver affiliation benchmark work has the jbnews side ready before
rem  the comparison value is settled.
rem
rem  It re-collects THIS month and LAST month from the CMS (two queries), keeps the
rem  earlier months from disk, and mails the table. Two queries a day: fetching fast
rem  and often is what got our address blocked with 403 on 2026-11-24.
rem
rem  ASCII ONLY, CRLF -- cmd mangles Korean to CP949 and a LF-only .cmd dies silently.
rem  Remove with:  schtasks /delete /tn "KLifeDesign-JbnewsDailyStat" /f

rem  2026-11-11: send-mail falls back to cs@ without a seat number and cannot send
set "CLAUDE_SEAT=5"

rem  The script prints Korean. Without this the log file is unreadable mojibake.
chcp 65001 > nul

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"

echo.
echo ===== jbnews reporter stats %DATE% %TIME% =====
node "scripts\jbnews-daily-stat.mjs" --send

exit /b 0

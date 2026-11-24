@echo off
rem  Owner instruction 2026-11-24: do NOT mail this daily; mail last month's figures
rem  on the 1st of each month, as an Excel file with two sheets.
rem
rem  WHY
rem    Naver's affiliation review zeroed item E (articles per reporter). The benchmark
rem    is not disclosed, so we compute it ourselves -- and the jbnews side has to be in
rem    hand before the benchmark lands, so it can be dropped straight in.
rem
rem  Step 1 re-collects this month and last month from the CMS (two queries, no mail).
rem  Step 2 builds the workbook plus CSV fallbacks and mails them.
rem  Two CMS queries a month: fetching fast and often is what got us 403 on 2026-11-24.
rem
rem  ASCII ONLY, CRLF -- cmd mangles Korean to CP949 and a LF-only .cmd dies silently.
rem  Remove with:  schtasks /delete /tn "KLifeDesign-JbnewsMonthlyStat" /f

rem  2026-11-11: send-mail falls back to cs@ without a seat number and cannot send
set "CLAUDE_SEAT=5"

rem  The scripts print Korean. Without this the log file is unreadable mojibake.
chcp 65001 > nul

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"

echo.
echo ===== jbnews monthly stats %DATE% %TIME% =====
echo --- step 1: collect from CMS ---
node "scripts\jbnews-daily-stat.mjs"
echo --- step 2: build workbook and mail ---
node "scripts\jbnews-stat-xlsx.mjs" --mun=50 --send

exit /b 0

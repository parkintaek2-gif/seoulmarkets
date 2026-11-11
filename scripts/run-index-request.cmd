@echo off
rem Set UTF-8 first -- this file is saved as UTF-8 and the log path below contains
rem Korean. Without this, cmd reads the path as CP949, cannot find the folder, and
rem SKIPS the whole line while still returning exit code 0. Index requests silently
rem stopped for 9 days this way (2026-10-23 .. 2026-11-01). The same fix went into
rem run-jbnews-sports-collect.cmd on 2026-10-15 and never reached this file.
chcp 65001 >nul
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
REM Daily "ask Google to come back" run -- owner's instruction 2026-10-17:
REM   "are you spending 2/3 of your work on what I told you to? do it" (visitor growth)
REM
REM Measured that day: 15,903 pages in our sitemaps, 2,074 ever shown by Google in 28 days (13%).
REM Of a 30-page sample, 16 had "never been crawled". The bottleneck is discovery, not volume.
REM A closed hub locks everything under it -- /school alone has 2,525 school pages below it.
REM
REM Two steps, in this order:
REM   1. demand-pages.mjs  -- which company pages already get impressions but are not indexed.
REM                           It checks every URL is really 200 before writing them down.
REM   2. auto-index-request.mjs -- asks Google which hubs are closed, then requests indexing:
REM                           hubs first (one hub unlocks thousands), demand pages after,
REM                           biggest-first, until the daily quota runs out.
REM
REM Runs at 11:10, after the morning article work. The quota is small so this takes many days.
REM It needs the shared Chrome on port 9222 (Search Console has no API for requesting indexing).
REM It never closes the browser -- it disconnects.
REM
REM ASCII ONLY -- Korean arguments get mangled to CP949.
REM Remove with:  schtasks /delete /tn "SeoulMarkets-IndexRequest" /f

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\demand-pages.mjs" >> "docs\고정업무-마커\색인요청.log" 2>&1
node "scripts\auto-index-request.mjs" >> "docs\고정업무-마커\색인요청.log" 2>&1
exit /b %ERRORLEVEL%

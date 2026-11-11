@echo off
rem Set UTF-8 first -- this file is saved as UTF-8 and the log path below contains
rem Korean. Without this, cmd reads the path as CP949, cannot find the folder, and
rem SKIPS the whole line while still returning exit code 0. Index requests silently
rem stopped for 9 days this way (2026-10-23 .. 2026-11-01). The same fix went into
rem run-jbnews-sports-collect.cmd on 2026-10-15 and never reached this file.
chcp 65001 >nul
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
REM Daily weather article for Jungbu Maeil -- owner's instruction 2026-10-17:
REM   "write a weather article, [tomorrow's weather] at the front of the headline,
REM    keywords must include Daejeon weather and Cheongju weather,
REM    schedule it so I get the article every day at 10"
REM
REM Runs at 09:20 so the desk pass finishes before 10:00.
REM It does NOT send -- a human looks at it first (owner's standing rule).
REM
REM ASCII ONLY -- Korean arguments get mangled to CP949.
REM Remove with:  schtasks /delete /tn "SeoulMarkets-WeatherArticle" /f

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\auto-weather-article.mjs" >> "docs\고정업무-마커\날씨기사.log" 2>&1
exit /b %ERRORLEVEL%

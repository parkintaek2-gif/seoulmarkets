@echo off
rem Daily index(Google+Naver) / SEO / GEO  -  boss directive 2026-11-07
rem ------------------------------------------------------------------
rem KEEP THIS FILE ASCII-ONLY AND CRLF.
rem  * A Korean filename here breaks the task silently: result=1, empty log.
rem    That happened on 2026-11-07 16:46.
rem  * LF-only line endings push the first real line out of reach and the
rem    task dies without a word. Six jobs died that way once.
rem  * Entry point is daily-seo.mjs, which forwards to the Korean-named one.
rem ------------------------------------------------------------------
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d C:\Users\User\Documents\GitHub\dataeconomics
if errorlevel 1 exit /b 9
if not exist logs md logs
node scripts\daily-seo.mjs >> logs\daily-seo.log 2>&1
exit /b %ERRORLEVEL%

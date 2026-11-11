@echo off
rem UTF-8 first -- this file is UTF-8 and the paths below contain Korean.
rem Without chcp 65001 cmd reads them as CP949, skips the line, and still
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
rem returns exit code 0. That is how index requests died quietly for 9 days.
chcp 65001 >nul
REM Bridge: send the three sites visitor counts to the KLifeMap admin screen.
REM Owner 2026-11-02: "show the three sites stats on the KLifeMap admin page".
REM
REM The three sites run on the SeoulMarkets server; KLifeMap is a different server.
REM Server-to-server push is already coded in server.mjs but needs KLM_ADMIN_KEY in
REM the deployment env. That secret write is not allowed from here yet, and the
REM seoulmarkets repo is PUBLIC so no key-derived value may be committed there.
REM Until the owner allows it, this PC is the bridge -- both keys live here.
REM
REM Every 5 minutes. Reads the day file from the archive store, posts to KLifeMap.
REM ASCII ONLY in task arguments -- Korean gets mangled to CP949.
REM Remove with:  schtasks /delete /tn "SeoulMarkets-VisitorsBridge" /f

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\보낸다-세사이트집계를-케이라이프맵에.mjs" >> "docs\고정업무-마커\세사이트집계-다리.log" 2>&1

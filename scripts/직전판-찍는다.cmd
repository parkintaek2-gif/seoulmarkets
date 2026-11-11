@echo off
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
REM 직전판-찍는다.cmd — 10 minutes apart, snapshot both repositories.
REM
REM WHY (2026-11-11, owner): "always be able to roll back to the version just
REM before the edit". Git only holds what was committed; an edit made and then
REM overwritten before a commit exists nowhere. That gap is how an old version
REM got re-deployed -- the state was reconstructed from memory.
REM
REM This takes a git commit object only (git stash create). It never touches the
REM working tree, so a session that is mid-edit is not disturbed.
REM
REM Remove this task with:
REM   schtasks /delete /tn "직전판-10분마다" /f

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"
node "scripts\직전판.mjs" --찍는다 --조용히 >> ".직전판.log" 2>&1

cd /d "C:\Users\User\Documents\GitHub\klifemap"
node "scripts\직전판.mjs" --찍는다 --조용히 >> ".직전판.log" 2>&1

exit /b 0

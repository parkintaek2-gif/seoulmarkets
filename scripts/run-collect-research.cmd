@echo off
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
rem SeoulMarkets - keep the brokerage-research archive current (target prices are the product).
rem
rem WHY a Windows task and not a session cron:
rem   This collector had NO scheduled task at all (checked 2026-09-26). It likely ran off a
rem   session cron that no longer exists. Session crons vanish with the session - this
rem   collector sat frozen at 2026-08-03 for about 8 weeks and nobody noticed, because
rem   the old source (finance.naver.com) 302-redirected to a new site and the scraper
rem   returned "0 found" with no error. See scripts/collect-research.mjs header for the
rem   2026-09-26 migration note (new source: stock.naver.com/api/stockSecurity/researches/v2/company).
rem
rem KEEP THIS FILE ASCII ONLY - comments AND arguments (see run-ai-learning.cmd for why).

setlocal
cd /d "%~dp0.."
if not exist logs mkdir logs
set LOG=logs\collect-research.log

echo ---------- %DATE% %TIME% ---------->> "%LOG%"

node scripts\collect-research.mjs --pages=20 >> "%LOG%" 2>&1

rem 2026-10-15 (unit 2): collect-research.mjs only refills archive/raw/research/{date}/.
rem The paid API reads archive/index/research.ndjson instead - a separate file this
rem collector never rebuilt. Nothing in this schedule rebuilt it either, so it sat
rem frozen at Sep 26 while collection kept running clean: customers got 73-day-old
rem data with every request returning 200. Found by the index-staleness checker
rem under scripts/ (Korean filename, run it directly to see which product is
rem stale); fixed once by hand - wiring the rebuild into this same schedule so
rem it can't go stale silently again. See
rem scripts/build-research-index.mjs header for why NDJSON and why R2 (the API
rem reads the index from R2, not from this machine).
node scripts\build-research-index.mjs --upload >> "%LOG%" 2>&1

rem Self-check: confirm what customers actually receive is fresh, not just that the
rem build step exited 0. This is the same tool that caught the 73-day staleness -
rem running it every day here means the next silent break shows up in this log
rem instead of surviving for weeks unnoticed. Calls the ASCII wrapper, not the
rem Korean-named checker directly - see check-sold-data-freshness.mjs header.
node scripts\check-sold-data-freshness.mjs >> "%LOG%" 2>&1

rem Get-Content without -Encoding guessed the wrong codepage here and mangled the
rem Korean log lines (2026-09-26, first real run - checked with `file`, bytes were
rem valid UTF-8 but content was garbled, meaning the read step mis-decoded it).
rem Force UTF8 on both the read and the write.
powershell -NoProfile -Command "$p='logs\collect-research.log'; if (Test-Path $p) { $l=Get-Content $p -Tail 2000 -Encoding UTF8; Set-Content $p $l -Encoding UTF8 }"

endlocal

@echo off
rem  🔴 [2026-11-11] 자리 번호가 없으면 send-mail 이 cs@ 로 떨어져 못 보낸다
set "CLAUDE_SEAT=5"
REM Write down, every day, how full each day's visitor count has become. -- 5번 2026-10-17
REM
REM WHY
REM   On 2026-10-16 the GA4 Data API reported 11 users for that day against a run of
REM   ~110. It printed "falling, -16%". The realtime endpoint showed live users and all
REM   five tags firing -- the number was not low, it was NOT YET COUNTED.
REM   I nearly reported a visitor collapse to the owner.
REM
REM   Then it happened again: on 10-17 the day 10-16 still stood at 19 across four sites.
REM   Is that a real drop, or is Google still catching up? I CANNOT TELL from one reading.
REM   A single measurement cannot separate "fewer came" from "fewer counted yet".
REM   Only the same day, read again tomorrow, can.
REM
REM   So this writes a dated line every day. After a few days the log answers it by itself:
REM   if 10-16 reads 19 today and 118 in two days, that was lag. If it stays 19, it was real.
REM   ⛔ Do not delete the old lines. The whole value is in comparing a day against itself.
REM
REM Runs at 11:05, before the index-request job at 11:10.
REM ASCII ONLY -- cmd mangles Korean arguments to CP949.
REM Remove with:  schtasks /delete /tn "KLifeDesign-GA4DailyLog" /f

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"

echo.
echo ===== read on %DATE% %TIME% =====
node "scripts\ga4-daily.mjs"
echo ----- realtime (is the tag alive at all) -----
node "scripts\ga4-realtime.mjs"

REM ----- Naver login review: tell the owner the day the verdict lands. 5번 2026-10-26 -----
REM   Submitted 2026-10-26 00:05. Naver said 3-4 business days, and the verdict arrives by
REM   mail to the owner's Naver address -- an address he does NOT read day to day.
REM   Leaving it there means he finds out and tells us. That is backwards.
REM   The tool mails him ONLY on the day the status changes; a quiet day sends nothing.
REM   ASCII wrapper because cmd mangles the Korean filename to CP949.
echo ----- naver login review -----
node "scripts\check-naver-review.mjs"

exit /b 0

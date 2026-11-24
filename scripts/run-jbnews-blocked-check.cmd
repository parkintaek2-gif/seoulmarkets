@echo off
rem  Owner instruction 2026-11-24: mail him when jbnews blocks our address, so the
rem  vendor can be asked to lift the IP block.
rem
rem  WHY
rem    On 2026-11-24 jbnews returned 403 Forbidden for both the paper and the CMS
rem    after we fetched article lists too fast. New article registration was blocked
rem    and nobody noticed until the owner was told. The owner can have the block
rem    lifted by the vendor -- but only if he knows it happened.
rem
rem  It mails ONLY when the state CHANGES (open -> blocked, blocked -> open).
rem  A blocked day that is still blocked sends nothing: a daily repeat of the same
rem  warning kills the real one.
rem
rem  Two requests per run, once an hour. Hammering lengthens the block.
rem
rem  ASCII ONLY -- cmd mangles Korean text to CP949, so this calls the ASCII relay
rem  with the ASCII flag --notify. Do not put Korean in this file.
rem  Remove with:  schtasks /delete /tn "KLifeDesign-JbnewsBlockedCheck" /f

rem  2026-11-11: send-mail falls back to cs@ without a seat number and cannot send
set "CLAUDE_SEAT=5"

rem  The script prints Korean. Without this the log file is unreadable mojibake.
chcp 65001 > nul

cd /d "C:\Users\User\Documents\GitHub\dataeconomics"

echo.
echo ===== jbnews reachability %DATE% %TIME% =====
node "scripts\check-jbnews-blocked.mjs" --notify

exit /b 0

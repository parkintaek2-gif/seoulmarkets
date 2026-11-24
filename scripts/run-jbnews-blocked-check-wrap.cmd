@echo off
rem  Wrapper: schtasks cannot take a '>>' redirection in /tr, so the redirection
rem  lives here. ASCII ONLY, CRLF line endings -- a LF-only .cmd pushes the first
rem  line out of place and the task dies silently (2026-11-19).
rem  Log path has no Korean in it on purpose: cmd mangles Korean paths to CP949.
call "C:\Users\User\Documents\GitHub\dataeconomics\scripts\run-jbnews-blocked-check.cmd" >> "C:\Users\User\Documents\GitHub\dataeconomics\docs\jbnews-blocked-check.log" 2>&1
exit /b 0

@echo off
rem  Wrapper: schtasks cannot take a '>>' redirection in /tr, so it lives here.
rem  ASCII ONLY, CRLF. Log path has no Korean in it on purpose.
call "C:\Users\User\Documents\GitHub\dataeconomics\scripts\run-jbnews-daily-stat.cmd" >> "C:\Users\User\Documents\GitHub\dataeconomics\docs\jbnews-daily-stat.log" 2>&1
exit /b 0

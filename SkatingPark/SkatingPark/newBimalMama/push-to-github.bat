@echo off
setlocal enabledelayedexpansion




















































exit /b 0endlocalpause
necho Push succeeded.)  exit /b 1  pause  echo Push failed. Please check remote, authentication, and network.if errorlevel 1 (git push origin "%BRANCH%"
necho Pushing to origin %BRANCH%...for /f "usebackq delims=" %%b in (`git rev-parse --abbrev-ref HEAD`) do set "BRANCH=%%b"
:: get current branch name)  exit /b 1  pause  echo Commit failed or nothing to commit.if errorlevel 1 (git commit -m "%MSG%"
necho Committing with message: "%MSG%"git add .
necho Adding changes...)  set "MSG=%*"  REM preserve all args as message) else (  set "MSG=Auto commit from push-to-github.bat %DATE% %TIME%"
:: Commit message from first argument(s) or default message with timestamp
if "%~1"=="" (del "%TEMP%\gitstatus.tmp" >nul 2>&1)  exit /b 0  pause  del "%TEMP%\gitstatus.tmp" >nul 2>&1  echo No changes to commit.if not defined HAS_CHANGES (:HAS_CHANGES_FOUND)  goto :HAS_CHANGES_FOUND  set "HAS_CHANGES=1"for /f "usebackq delims=" %%i in ("%TEMP%\gitstatus.tmp") do (set "HAS_CHANGES="
:: Check for changes to commit
ngit status --porcelain > "%TEMP%\gitstatus.tmp")  exit /b 1  pause  echo Git is not installed or not in PATH.if errorlevel 1 (git --version >nul 2>&1
:: Ensure git is availablecd /d "%~dp0":: Move to script directory (repo root)
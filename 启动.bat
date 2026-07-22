@echo off
chcp 65001 >nul
setlocal
set "GUI=%~dp0gui\gui.py"
where python >nul 2>nul
if not errorlevel 1 set "PY=python"
where py >nul 2>nul
if not errorlevel 1 set "PY=py"
if not defined PY goto NOPY
start "" "%PY%" "%GUI%"
goto END
:NOPY
echo 未检测到 Python，请先安装 Python 3 并勾选 Add to PATH
pause
:END
endlocal

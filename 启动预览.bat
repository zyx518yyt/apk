@echo off
chcp 65001 >nul
title 粉粉提醒 - 本地预览服务器
echo.
echo  🍑 粉粉提醒 - 启动本地预览
echo  ================================
echo.
echo  正在启动服务器...
echo.
echo  预览地址: http://localhost:8080
echo  手机预览: http://你的电脑IP:8080
echo.
echo  按 Ctrl+C 停止服务器
echo  ================================
echo.
cd /d "%~dp0"
python -m http.server 8080
pause

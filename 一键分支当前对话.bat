@echo off
chcp 65001 >nul
title Antigravity 对话分支工具

echo ========================================================
echo         🌿 Antigravity 对话分支创建工具
echo ========================================================
echo.
set /p BRANCH_NAME=请输入新分支名称 (直接回车默认自动命名为 原标题 (分支)): 

echo.
echo 正在安全克隆上下文并创建分支...
python "%~dp0scripts\branch_conversation.py" "" "%BRANCH_NAME%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo ✅ 分支创建成功！新对话已自动置顶到左侧侧边栏列表中。
    echo 👉 请在 Antigravity 左侧侧边栏点击即可直接进入新分支！
    echo ========================================================
) else (
    echo.
    echo ❌ 创建分支失败，请检查 Antigravity 是否正常开启。
)

echo.
pause

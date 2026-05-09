@echo off
chcp 65001 > nul
echo ========================================
echo  Upload todo-list to GitHub
echo  Repository: WangCai-1227/tido-list-Custom-Edition
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] Initializing git repository...
git init
if errorlevel 1 (
    echo ERROR: git init failed. Is Git installed?
    pause
    exit /b 1
)

echo.
echo [2/6] Adding remote origin...
git remote remove origin 2> nul
git remote add origin https://github.com/WangCai-1227/tido-list-Custom-Edition.git

echo.
echo [3/6] Pulling existing files from GitHub (merge README)...
git pull origin main --allow-unrelated-histories --no-edit 2> nul

echo.
echo [4/6] Adding all files...
git add .

echo.
echo [5/6] Committing...
git commit -m "feat: 上传 todo-list Custom Edition 完整项目代码"

echo.
echo [6/6] Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
if errorlevel 1 (
    echo.
    echo ERROR: Push failed. You may need to authenticate.
    echo Try: git push -u origin main
    echo Or setup credential helper first.
) else (
    echo SUCCESS! Check your repo at:
    echo https://github.com/WangCai-1227/tido-list-Custom-Edition
)

echo.
pause

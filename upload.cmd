@echo off
chcp 65001 > nul
cd /d "%~dp0"
git init
git remote remove origin 2> nul
git remote add origin https://github.com/WangCai-1227/tido-list-Custom-Edition.git
git pull origin main --allow-unrelated-histories --no-edit 2> nul
git add .
git commit -m "feat: 上传 todo-list Custom Edition 完整项目代码"
git branch -M main
git push -u origin main
pause

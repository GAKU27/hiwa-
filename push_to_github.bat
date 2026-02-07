@echo off
echo Pushing to GitHub...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Update to v12.1"
"C:\Program Files\Git\cmd\git.exe" push -u origin main
echo.
echo Process finished.
pause

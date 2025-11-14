@echo off
echo ========================================
echo BantuBuzz API Quick Test
echo ========================================
echo.

echo [Test 1] Health Check...
curl http://localhost:5000/api/health
echo.
echo.

echo [Test 2] Get Creators...
curl http://localhost:5000/api/creators
echo.
echo.

echo [Test 3] Get Packages...
curl http://localhost:5000/api/packages
echo.
echo.

echo ========================================
echo Tests Complete!
echo ========================================
echo.
echo If you see "Connection refused" or "Cannot GET":
echo   - Make sure backend is running: python backend\run.py
echo.
pause

@echo off
setlocal

echo ========================================
echo  1. Building Spring Boot Executable JAR
echo ========================================
call gradlew.bat bootJar
if %ERRORLEVEL% neq 0 (
    echo Gradle build failed. Exiting.
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo  2. Building Docker Image
echo ========================================
docker build -t local-vault-app .
if %ERRORLEVEL% neq 0 (
    echo Docker build failed. Exiting.
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo  3. Launching Vault Container
echo ========================================
REM Using %USERPROFILE% to map to the Windows user directory (C:\Users\YourName)
docker run -it --rm ^
    -e JAVA_TOOL_OPTIONS="-Dspring.profiles.active=default" ^
    -v "D:\\Secret_Files":/var/local/vault ^
    local-vault-app Ravi_Vault.json

endlocal
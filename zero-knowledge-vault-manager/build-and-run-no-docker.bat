@echo off
setlocal

echo ========================================
echo  1. Building Spring Boot Vault
echo ========================================
call gradlew.bat bootJar
if %ERRORLEVEL% neq 0 (
    echo Gradle build failed. Exiting.
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo  2. Launching Local Vault
echo ========================================
REM Run the executable fat JAR directly
java -jar build\libs\password-manager-1.0.0.jar Ravi_Vault.json

endlocal
#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================"
echo " 1. Building Spring Boot Vault"
echo "========================================"
./gradlew bootJar

echo -e "\n========================================"
echo " 2. Launching Local Vault"
echo "========================================"
# Run the executable fat JAR directly
java -jar build/libs/password-manager-1.0.0.jar Ravi_Vault.json
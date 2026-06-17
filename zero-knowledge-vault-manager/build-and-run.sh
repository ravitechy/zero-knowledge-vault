#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================"
echo " 1. Building Spring Boot Executable JAR"
echo "========================================"
./gradlew bootJar

echo -e "\n========================================"
echo " 2. Building Docker Image"
echo "========================================"
docker build -t local-vault-app .

echo -e "\n========================================"
echo " 3. Launching Vault Container"
echo "========================================"
# Using ~/ to map to the host user's home directory
docker run -it --rm -v "D:\\Secret_Files":/var/local/vault local-vault-app Ravi_Vault.json
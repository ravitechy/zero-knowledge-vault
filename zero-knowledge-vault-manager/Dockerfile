# Use the lightweight Java 24 JRE Alpine base image
FROM eclipse-temurin:24-jre-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the compiled JAR file from your host to the container
COPY build/libs/*.jar vault.jar

# Define the entry point to run the application
ENTRYPOINT ["java", "-jar", "vault.jar"]
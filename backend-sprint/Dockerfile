# Usamos Eclipse Temurin en lugar de openjdk oficial
FROM eclipse-temurin:17-jdk-focal

WORKDIR /app

# Copiamos el código
COPY . .

# Damos permisos al ejecutable de maven
RUN chmod +x mvnw

EXPOSE 8080
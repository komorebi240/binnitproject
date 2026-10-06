# Build: docker build -t orbit-backend backend/
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q -DskipTests package \
    && cp target/project-*.jar app.jar

FROM eclipse-temurin:17-jre
# Run as an unprivileged user; uploads live on a mounted volume owned by it.
RUN useradd --system --create-home --uid 10001 orbit && mkdir -p /data/uploads && chown -R orbit /data
USER orbit
WORKDIR /app
COPY --from=build /app/app.jar app.jar
ENV SPRING_PROFILES_ACTIVE=prod \
    AVATAR_UPLOAD_DIR=/data/uploads/avatars \
    CHAT_UPLOAD_DIR=/data/uploads/chat \
    TASK_UPLOAD_DIR=/data/uploads/tasks
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "/app/app.jar"]

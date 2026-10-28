# syntax=docker/dockerfile:1

# ---------- build ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Cache dependencies separately from sources. The BuildKit cache mount keeps the
# Maven repository between builds without baking it into the final image.
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -B -DskipTests dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -B -DskipTests package

# ---------- runtime ----------
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S schoolms && adduser -S schoolms -G schoolms \
    && mkdir -p /data/uploads /app \
    && chown -R schoolms:schoolms /data /app

WORKDIR /app
COPY --from=build /build/target/schoolms-*.jar app.jar

ENV APP_UPLOAD_DIR=/data/uploads \
    SERVER_PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseContainerSupport"

USER schoolms
EXPOSE 8080

HEALTHCHECK --interval=20s --timeout=5s --start-period=45s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${SERVER_PORT}/api/health" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

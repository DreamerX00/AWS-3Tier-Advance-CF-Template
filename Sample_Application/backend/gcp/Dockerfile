# syntax=docker/dockerfile:1.7

# ---- Stage 1: Build ----
FROM gradle:9.3.1-jdk21 AS build
WORKDIR /app

# Cache Gradle wrapper + dependencies separately
COPY settings.gradle.kts build.gradle.kts ./
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle dependencies --no-daemon || true

# Copy source and build
COPY src/ src/
RUN --mount=type=cache,target=/home/gradle/.gradle \
    sh -c 'for attempt in 1 2 3; do \
      gradle bootJar -x test --no-daemon && exit 0; \
      echo "Gradle build failed on attempt ${attempt}; retrying after transient dependency/network error..."; \
      sleep 5; \
    done; \
    exit 1'

# ---- Stage 2: Runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

# Upload directory
RUN mkdir -p /tmp/gcp-practice-uploads && chown appuser:appgroup /tmp/gcp-practice-uploads

COPY --from=build /app/build/libs/*.jar app.jar

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

# syntax=docker/dockerfile:1.7

FROM gradle:9.3.1-jdk21 AS build
WORKDIR /app

# Copy source and build
COPY settings.gradle.kts build.gradle.kts ./
COPY src/ src/
RUN --mount=type=cache,target=/home/gradle/.gradle \
    sh -c 'for attempt in 1 2 3; do \
      gradle bootJar -x test --no-daemon && exit 0; \
      echo "Gradle build failed on attempt ${attempt}; retrying after transient dependency/network error..."; \
      sleep 5; \
    done; \
    exit 1'

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

# Upload directory
RUN mkdir -p /tmp/gcp-practice-uploads && chown appuser:appgroup /tmp/gcp-practice-uploads

COPY --from=build /app/build/libs/*.jar app.jar

USER appuser

ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

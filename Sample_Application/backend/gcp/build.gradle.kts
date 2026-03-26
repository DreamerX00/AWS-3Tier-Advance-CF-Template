plugins {
	java
	id("org.springframework.boot") version "4.0.3"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.backend"
version = "0.0.1-SNAPSHOT"
description = "GCP Practice Backend"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
	maven { url = uri("https://build.shibboleth.net/maven/releases") }
}

dependencies {
	// Core starters
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-actuator") // Cloud Monitoring metrics

	// Google Cloud Storage SDK
	implementation(platform("com.google.cloud:libraries-bom:26.34.0"))
	implementation("com.google.cloud:google-cloud-storage")

	// Lombok
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	// Dev tools
	developmentOnly("org.springframework.boot:spring-boot-devtools")

	// Database drivers
	runtimeOnly("org.postgresql:postgresql")
	runtimeOnly("com.h2database:h2") // fallback for local dev without Postgres

	// Testing
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

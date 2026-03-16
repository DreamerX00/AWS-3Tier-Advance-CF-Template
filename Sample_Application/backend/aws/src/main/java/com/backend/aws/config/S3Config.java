package com.backend.aws.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${aws.access.key.id:}")
    private String accessKey;

    @Value("${aws.secret.access.key:}")
    private String secretKey;

    @Value("${aws.region:us-east-1}")
    private String region;

    @Value("${s3.endpoint:}")
    private String s3Endpoint;

    @Value("${s3.path-style:false}")
    private boolean pathStyleEnabled;

    @Bean
    public S3Client s3Client() {
        var builder = S3Client.builder()
                .region(Region.of(region));

        if (s3Endpoint != null && !s3Endpoint.isBlank()) {
            builder.credentialsProvider(
                    StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey))
            );
            builder.endpointOverride(URI.create(s3Endpoint));
            builder.serviceConfiguration(
                    S3Configuration.builder().pathStyleAccessEnabled(pathStyleEnabled).build()
            );
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
            builder.serviceConfiguration(
                    S3Configuration.builder().pathStyleAccessEnabled(false).build()
            );
        }

        return builder.build();
    }
}

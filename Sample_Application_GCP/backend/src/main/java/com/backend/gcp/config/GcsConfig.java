package com.backend.gcp.config;

import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import com.google.cloud.NoCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GcsConfig {

    @Value("${gcs.project-id:gcp-practice}")
    private String projectId;

    @Value("${gcs.endpoint:}")
    private String gcsEndpoint;

    @Bean
    public Storage storage() {
        StorageOptions.Builder builder = StorageOptions.newBuilder()
                .setProjectId(projectId);

        // When using fake-gcs-server or a custom emulator endpoint
        if (gcsEndpoint != null && !gcsEndpoint.isBlank()) {
            builder.setHost(gcsEndpoint);
            builder.setCredentials(NoCredentials.getInstance());
        }

        return builder.build().getService();
    }
}

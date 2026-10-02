package com.company.project.config;

import com.company.project.common.storage.AttachmentStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** One validated on-disk store per feature, so chat and task files never share a directory. */
@Configuration
public class StorageConfig {

    @Bean("chatAttachmentStorage")
    public AttachmentStorage chatAttachmentStorage(@Value("${app.uploads.chat-dir}") String directory) {
        return new AttachmentStorage(directory);
    }

    @Bean("taskAttachmentStorage")
    public AttachmentStorage taskAttachmentStorage(@Value("${app.uploads.task-dir}") String directory) {
        return new AttachmentStorage(directory);
    }
}

package com.company.project.config;

import com.company.project.common.storage.AttachmentStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** One validated on-disk store per feature, so chat and task files never share a directory. */
@Configuration
public class StorageConfig {

    /** Chat also takes videos, up to app.uploads.chat-max-video-mb; tasks do not. */
    @Bean("chatAttachmentStorage")
    public AttachmentStorage chatAttachmentStorage(
            @Value("${app.uploads.chat-dir}") String directory, @Value("${app.uploads.chat-max-video-mb}") long maxVideoMb) {
        return new AttachmentStorage(directory, maxVideoMb * 1024 * 1024);
    }

    @Bean("taskAttachmentStorage")
    public AttachmentStorage taskAttachmentStorage(@Value("${app.uploads.task-dir}") String directory) {
        return new AttachmentStorage(directory);
    }
}

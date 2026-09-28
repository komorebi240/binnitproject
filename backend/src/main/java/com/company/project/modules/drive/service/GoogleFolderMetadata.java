package com.company.project.modules.drive.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleFolderMetadata(String id, String name) {
}

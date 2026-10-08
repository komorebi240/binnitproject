package com.company.project.modules.crm;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(CrmProperties.class)
public class CrmConfig {
}

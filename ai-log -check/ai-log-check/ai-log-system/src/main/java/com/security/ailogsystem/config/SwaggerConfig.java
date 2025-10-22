package com.security.ailogsystem.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AI日志异常检测与预警系统API")
                        .description("基于AI的日志异常检测与预警系统后端API文档")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Security Team")
                                .email("security@example.com")
                                .url("https://www.example.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("http://www.apache.org/licenses/LICENSE-2.0.html")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    @Bean
    public GroupedOpenApi logsApi() {
        return GroupedOpenApi.builder()
                .group("日志管理")
                .pathsToMatch("/api/logs/**")
                .build();
    }

    @Bean
    public GroupedOpenApi alertsApi() {
        return GroupedOpenApi.builder()
                .group("告警管理")
                .pathsToMatch("/api/alerts/**")
                .build();
    }

    @Bean
    public GroupedOpenApi modelsApi() {
        return GroupedOpenApi.builder()
                .group("AI模型管理")
                .pathsToMatch("/api/models/**")
                .build();
    }
} 
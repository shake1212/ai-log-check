package com.security.ailogsystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling

public class AiLogSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiLogSystemApplication.class, args);
    }
} 
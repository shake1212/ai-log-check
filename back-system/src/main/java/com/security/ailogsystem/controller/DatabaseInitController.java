package com.security.ailogsystem.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.Statement;

/**
 * 数据库初始化控制器
 * 用于初始化数据库表结构
 */
@Slf4j
@RestController
@RequestMapping("/database/init")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DatabaseInitController {

    private final DataSource dataSource;

    /**
     * 初始化安全事件表
     */
    @PostMapping("/security-events")
    public ResponseEntity<String> initSecurityEventsTable() {
        log.info("Initializing security events table");
        
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            
            // 读取SQL脚本
            InputStream inputStream = getClass().getClassLoader()
                    .getResourceAsStream("sql/security_events_table.sql");
            
            if (inputStream == null) {
                log.error("SQL script file not found");
                return ResponseEntity.status(500).body("SQL script file not found");
            }
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
            StringBuilder sqlScript = new StringBuilder();
            String line;
            
            while ((line = reader.readLine()) != null) {
                sqlScript.append(line).append("\n");
            }
            
            // 执行SQL脚本
            String[] sqlStatements = sqlScript.toString().split(";");
            int executedStatements = 0;
            
            for (String sql : sqlStatements) {
                sql = sql.trim();
                if (!sql.isEmpty() && !sql.startsWith("--")) {
                    try {
                        statement.execute(sql);
                        executedStatements++;
                        log.debug("Executed SQL: {}", sql.substring(0, Math.min(sql.length(), 100)));
                    } catch (Exception e) {
                        log.warn("Failed to execute SQL: {} - Error: {}", sql.substring(0, Math.min(sql.length(), 100)), e.getMessage());
                    }
                }
            }
            
            log.info("Successfully executed {} SQL statements", executedStatements);
            return ResponseEntity.ok("Security events table initialized successfully. Executed " + executedStatements + " statements.");
            
        } catch (Exception e) {
            log.error("Error initializing security events table", e);
            return ResponseEntity.status(500).body("Error initializing table: " + e.getMessage());
        }
    }

    /**
     * 检查安全事件表是否存在
     */
    @GetMapping("/security-events/check")
    public ResponseEntity<String> checkSecurityEventsTable() {
        log.debug("Checking if security events table exists");
        
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            
            // 检查表是否存在
            var resultSet = statement.executeQuery(
                "SELECT COUNT(*) as table_count FROM information_schema.tables " +
                "WHERE table_schema = 'ai_log_system' AND table_name = 'security_events'"
            );
            
            resultSet.next();
            int tableCount = resultSet.getInt("table_count");
            
            if (tableCount > 0) {
                // 检查表中的记录数
                var countResult = statement.executeQuery("SELECT COUNT(*) as record_count FROM security_events");
                countResult.next();
                int recordCount = countResult.getInt("record_count");
                
                log.info("Security events table exists with {} records", recordCount);
                return ResponseEntity.ok("Security events table exists with " + recordCount + " records");
            } else {
                log.info("Security events table does not exist");
                return ResponseEntity.ok("Security events table does not exist");
            }
            
        } catch (Exception e) {
            log.error("Error checking security events table", e);
            return ResponseEntity.status(500).body("Error checking table: " + e.getMessage());
        }
    }
}

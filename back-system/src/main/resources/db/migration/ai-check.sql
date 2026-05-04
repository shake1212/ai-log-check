-- MySQL dump 10.13  Distrib 8.0.12, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: ai_log_system
-- ------------------------------------------------------
-- Server version	8.0.12

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
 SET NAMES utf8 ;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `alerts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `confidence` decimal(5,4) DEFAULT NULL,
  `alert_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alert_level` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alert_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignee` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_time` datetime(6) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `handled` bit(1) NOT NULL,
  `resolution` text COLLATE utf8mb4_unicode_ci,
  `source` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','PROCESSING','RESOLVED','FALSE_POSITIVE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  `updated_time` datetime(6) DEFAULT NULL,
  `log_entry_id` bigint(20) DEFAULT NULL,
  `unified_event_id` bigint(20) DEFAULT NULL,
  `metric_value` double DEFAULT NULL,
  `threshold` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_ekubdnwjqyg382s2eofapodwh` (`alert_id`),
  KEY `FKr8wfmo1h4eqgcml5cl8cyv2dx` (`log_entry_id`),
  KEY `fk_alerts_unified_event` (`unified_event_id`),
  KEY `idx_alert_level` (`alert_level`),
  KEY `idx_alert_status` (`status`),
  KEY `idx_alert_handled` (`handled`),
  KEY `idx_alert_created_time` (`created_time`),
  KEY `idx_alert_type` (`alert_type`),
  KEY `idx_alerts_handled_created` (`handled`,`created_time` DESC),
  KEY `idx_alerts_created_time` (`created_time` DESC),
  KEY `idx_alerts_handled_time` (`handled`,`created_time` DESC),
  CONSTRAINT `FKr8wfmo1h4eqgcml5cl8cyv2dx` FOREIGN KEY (`log_entry_id`) REFERENCES `log_entries` (`id`),
  CONSTRAINT `fk_alerts_unified_event` FOREIGN KEY (`unified_event_id`) REFERENCES `unified_security_events` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=35947 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `analysis_results`
--

DROP TABLE IF EXISTS `analysis_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `analysis_results` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `analysis_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `confidence_score` int(11) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `result_data` json NOT NULL,
  `risk_level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `risk_score` int(11) DEFAULT NULL,
  `started_at` datetime(6) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `task_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKltomlyt75hoa4noxf1hqvnrwd` (`task_id`),
  CONSTRAINT `FKltomlyt75hoa4noxf1hqvnrwd` FOREIGN KEY (`task_id`) REFERENCES `security_analysis_tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attack_tactics`
--

DROP TABLE IF EXISTS `attack_tactics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `attack_tactics` (
  `tactic_id` varchar(20) NOT NULL COMMENT '战术ID (TA0001)',
  `name` varchar(200) NOT NULL COMMENT '战术名称',
  `description` text COMMENT '战术描述',
  `display_order` int(11) DEFAULT NULL COMMENT '显示顺序',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`tactic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='MITRE ATT&CK战术表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attack_techniques`
--

DROP TABLE IF EXISTS `attack_techniques`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `attack_techniques` (
  `technique_id` varchar(20) NOT NULL COMMENT '技术ID (T1190)',
  `name` varchar(200) NOT NULL COMMENT '技术名称',
  `description` text COMMENT '技术描述',
  `tactic_id` varchar(20) DEFAULT NULL COMMENT '关联战术ID',
  `detection_methods` text COMMENT '检测方法',
  `mitigation` text COMMENT '缓解措施',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`technique_id`),
  KEY `idx_tactic` (`tactic_id`),
  CONSTRAINT `attack_techniques_ibfk_1` FOREIGN KEY (`tactic_id`) REFERENCES `attack_tactics` (`tactic_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='MITRE ATT&CK技术表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log_collector_configs`
--

DROP TABLE IF EXISTS `log_collector_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `log_collector_configs` (
  `id` varchar(50) NOT NULL COMMENT '配置ID',
  `name` varchar(100) NOT NULL COMMENT '配置名称',
  `enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `interval` int(11) NOT NULL DEFAULT '300' COMMENT '采集间隔（秒）',
  `data_sources` json NOT NULL COMMENT '数据源列表',
  `cpu_threshold` int(11) NOT NULL DEFAULT '80' COMMENT 'CPU告警阈值（%）',
  `memory_threshold` int(11) NOT NULL DEFAULT '90' COMMENT '内存告警阈值（%）',
  `disk_threshold` int(11) NOT NULL DEFAULT '85' COMMENT '磁盘告警阈值（%）',
  `error_rate_threshold` int(11) NOT NULL DEFAULT '5' COMMENT '错误率告警阈值（%）',
  `retention_days` int(11) NOT NULL DEFAULT '7' COMMENT '数据保留天数',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `enable_rule_engine` bit(1) NOT NULL,
  `rule_engine_timeout` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='日志采集器配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log_entries`
--

DROP TABLE IF EXISTS `log_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `log_entries` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anomaly_reason` text COLLATE utf8mb4_unicode_ci,
  `anomaly_score` double DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `ip_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_anomaly` bit(1) NOT NULL,
  `level` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `raw_data` text COLLATE utf8mb4_unicode_ci,
  `source` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_log_entries_timestamp` (`timestamp` DESC),
  KEY `idx_log_entries_created_at` (`created_at` DESC),
  KEY `idx_log_entries_is_anomaly` (`is_anomaly`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log_entry_features`
--

DROP TABLE IF EXISTS `log_entry_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `log_entry_features` (
  `log_entry_id` bigint(20) NOT NULL,
  `feature_value` double DEFAULT NULL,
  `feature_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`log_entry_id`,`feature_name`),
  CONSTRAINT `FKnmf6lhiwgxjfu84rh0437hve0` FOREIGN KEY (`log_entry_id`) REFERENCES `log_entries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rule_attack_mapping`
--

DROP TABLE IF EXISTS `rule_attack_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `rule_attack_mapping` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `rule_id` bigint(20) NOT NULL COMMENT '规则ID',
  `tactic_id` varchar(20) DEFAULT NULL COMMENT '战术ID',
  `technique_id` varchar(20) DEFAULT NULL COMMENT '技术ID',
  `sub_technique_id` varchar(20) DEFAULT NULL COMMENT '子技术ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_rule_id` (`rule_id`),
  KEY `idx_tactic` (`tactic_id`),
  KEY `idx_technique` (`technique_id`),
  CONSTRAINT `rule_attack_mapping_ibfk_1` FOREIGN KEY (`tactic_id`) REFERENCES `attack_tactics` (`tactic_id`) ON DELETE CASCADE,
  CONSTRAINT `rule_attack_mapping_ibfk_2` FOREIGN KEY (`technique_id`) REFERENCES `attack_techniques` (`technique_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='规则与ATT&CK框架映射表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_alerts`
--

DROP TABLE IF EXISTS `security_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `security_alerts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '告警ID',
  `alert_level` enum('LOW','MEDIUM','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '告警级别',
  `alert_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '告警类型',
  `created_time` datetime(6) DEFAULT NULL COMMENT '告警创建时间',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '告警描述',
  `event_data` json DEFAULT NULL COMMENT '事件数据(JSON)',
  `handled` bit(1) DEFAULT NULL COMMENT '是否已处理',
  `log_id` bigint(20) DEFAULT NULL COMMENT '关联日志ID',
  `metric_value` double DEFAULT NULL,
  `threshold` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKjpu31exy50g7vl1gu0frh1bq6` (`log_id`),
  KEY `idx_sec_alerts_handled_time` (`handled`,`created_time` DESC),
  CONSTRAINT `FKjpu31exy50g7vl1gu0frh1bq6` FOREIGN KEY (`log_id`) REFERENCES `windows_security_logs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=67550 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安全告警记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_analysis_tasks`
--

DROP TABLE IF EXISTS `security_analysis_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `security_analysis_tasks` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `findings` json DEFAULT NULL,
  `last_run` datetime(6) DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `next_run` datetime(6) DEFAULT NULL,
  `recommendations` json DEFAULT NULL,
  `risk_score` int(11) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `security_events`
--

DROP TABLE IF EXISTS `security_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `security_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '事件ID',
  `anomaly_reason` text COLLATE utf8mb4_unicode_ci COMMENT '异常原因',
  `anomaly_score` double DEFAULT NULL COMMENT '异常评分',
  `assigned_to` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分配给',
  `category` enum('AUTHENTICATION','AUTHORIZATION','SYSTEM','NETWORK','APPLICATION','SECURITY','COMPLIANCE','MONITORING','INCIDENT','OTHER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL COMMENT '创建时间',
  `event_id` int(11) DEFAULT NULL COMMENT 'Windows事件ID',
  `event_type` enum('LOGIN_SUCCESS','LOGIN_FAILURE','LOGOUT','PERMISSION_DENIED','FILE_ACCESS','NETWORK_CONNECTION','SYSTEM_STARTUP','SYSTEM_SHUTDOWN','PROCESS_CREATION','PROCESS_TERMINATION','SERVICE_START','SERVICE_STOP','CONFIGURATION_CHANGE','SECURITY_POLICY_CHANGE','MALWARE_DETECTED','SUSPICIOUS_ACTIVITY','DATA_ACCESS','PRIVILEGE_ESCALATION','BRUTE_FORCE_ATTACK','UNKNOWN') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `host_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主机IP',
  `host_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主机名',
  `is_anomaly` tinyint(1) NOT NULL COMMENT '是否异常',
  `level` enum('DEBUG','INFO','WARNING','ERROR','CRITICAL','AUDIT_SUCCESS','AUDIT_FAILURE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件消息',
  `process_id` int(11) DEFAULT NULL COMMENT '进程ID',
  `raw_data` json DEFAULT NULL COMMENT '原始数据(JSON)',
  `resolution_notes` text COLLATE utf8mb4_unicode_ci COMMENT '处理备注',
  `resolved_at` datetime(6) DEFAULT NULL COMMENT '解决时间',
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '会话ID',
  `source` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件来源',
  `status` enum('NEW','IN_PROGRESS','RESOLVED','FALSE_POSITIVE','ESCALATED','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `thread_id` int(11) DEFAULT NULL COMMENT '线程ID',
  `threat_level` enum('LOW','MEDIUM','HIGH','CRITICAL','UNKNOWN') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` datetime(6) NOT NULL COMMENT '事件时间',
  `updated_at` datetime(6) NOT NULL COMMENT '更新时间',
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户ID',
  PRIMARY KEY (`id`),
  KEY `idx_security_event_timestamp` (`timestamp`),
  KEY `idx_security_event_level` (`level`),
  KEY `idx_security_event_source` (`source`),
  KEY `idx_security_event_host` (`host_ip`),
  KEY `idx_security_event_user` (`user_id`),
  KEY `idx_security_event_anomaly` (`is_anomaly`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安全事件分析表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `simple_wmi_data`
--

DROP TABLE IF EXISTS `simple_wmi_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `simple_wmi_data` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `collect_time` datetime(6) DEFAULT NULL COMMENT '采集时间',
  `data_type` enum('CPU_USAGE','MEMORY_USAGE','DISK_USAGE','NETWORK_TRAFFIC','PROCESS_COUNT','SERVICE_STATUS','SYSTEM_INFO','SYSTEM_PERFORMANCE','CPU_INFO','SYSTEM_BASIC','MEMORY_INFO','DISK_INFO','PROCESS_INFO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_value` text COLLATE utf8mb4_unicode_ci COMMENT '采集数据值(JSON)',
  `hostname` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '主机名',
  `ip_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IP地址',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `status` enum('SUCCESS','FAILED','PENDING') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '采集状态',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4696 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WMI系统监控数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_behavior_baselines`
--

DROP TABLE IF EXISTS `system_behavior_baselines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `system_behavior_baselines` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `system_name` varchar(100) NOT NULL COMMENT '系统名称',
  `avg_cpu_usage` double DEFAULT NULL COMMENT '平均CPU使用率',
  `std_cpu_usage` double DEFAULT NULL COMMENT 'CPU使用率标准差',
  `avg_memory_usage` double DEFAULT NULL COMMENT '平均内存使用率',
  `std_memory_usage` double DEFAULT NULL COMMENT '内存使用率标准差',
  `avg_network_traffic` double DEFAULT NULL COMMENT '平均网络流量(MB/s)',
  `std_network_traffic` double DEFAULT NULL COMMENT '网络流量标准差',
  `baseline_start` timestamp NULL DEFAULT NULL COMMENT '基线开始时间',
  `baseline_end` timestamp NULL DEFAULT NULL COMMENT '基线结束时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_name` (`system_name`),
  KEY `idx_system_name` (`system_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统行为基线表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_configs`
--

DROP TABLE IF EXISTS `system_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `system_configs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` text COLLATE utf8mb4_unicode_ci COMMENT '配置值',
  `config_group` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置组',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置描述',
  `config_type` enum('STRING','INTEGER','BOOLEAN','ENUM') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置类型',
  `default_value` text COLLATE utf8mb4_unicode_ci COMMENT '默认值',
  `is_editable` tinyint(1) DEFAULT '1' COMMENT '是否可编辑',
  `requires_restart` tinyint(1) DEFAULT '0' COMMENT '是否需要重启生效',
  `validation_rule` text COLLATE utf8mb4_unicode_ci COMMENT '验证规则',
  `config_options` text COLLATE utf8mb4_unicode_ci COMMENT '配置选项',
  `sort_order` int(11) DEFAULT '0' COMMENT '排序序号',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者',
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新者',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key_group` (`config_key`,`config_group`),
  UNIQUE KEY `UKi7df408gtsfb1tpemt19a8k02` (`config_key`,`config_group`),
  KEY `idx_config_group` (`config_group`),
  KEY `idx_config_type` (`config_type`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置参数表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_metrics`
--

DROP TABLE IF EXISTS `system_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `system_metrics` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `cpu_cores` int(11) DEFAULT NULL,
  `cpu_frequency` double DEFAULT NULL,
  `cpu_usage` double DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `disk_total` bigint(20) DEFAULT NULL,
  `disk_usage` double DEFAULT NULL,
  `disk_used` bigint(20) DEFAULT NULL,
  `hostname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `memory_available` bigint(20) DEFAULT NULL,
  `memory_total` bigint(20) DEFAULT NULL,
  `memory_usage` double DEFAULT NULL,
  `memory_used` bigint(20) DEFAULT NULL,
  `network_received` bigint(20) DEFAULT NULL,
  `network_received_rate` double DEFAULT NULL,
  `network_sent` bigint(20) DEFAULT NULL,
  `network_sent_rate` double DEFAULT NULL,
  `raw_data` json DEFAULT NULL,
  `running_processes` int(11) DEFAULT NULL,
  `system_load` double DEFAULT NULL,
  `timestamp` datetime(6) NOT NULL,
  `total_processes` int(11) DEFAULT NULL,
  `uptime` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_hostname` (`hostname`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4376 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `threat_indicators`
--

DROP TABLE IF EXISTS `threat_indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `threat_indicators` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `confidence` int(11) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `first_seen` datetime(6) DEFAULT NULL,
  `indicator_context` text COLLATE utf8mb4_unicode_ci,
  `indicator_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `indicator_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_seen` datetime(6) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `threat_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK5r4epirrkgllhw53tfuypdmur` (`threat_id`),
  CONSTRAINT `FK5r4epirrkgllhw53tfuypdmur` FOREIGN KEY (`threat_id`) REFERENCES `threat_intelligence` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `threat_intelligence`
--

DROP TABLE IF EXISTS `threat_intelligence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `threat_intelligence` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '情报ID',
  `affected_systems` json DEFAULT NULL COMMENT '受影响系统(JSON)',
  `confidence` int(11) DEFAULT NULL COMMENT '可信度(0-100)',
  `created_at` datetime(6) DEFAULT NULL COMMENT '创建时间',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '情报描述',
  `detection_date` datetime(6) NOT NULL COMMENT '检测日期',
  `ioc_count` int(11) DEFAULT NULL COMMENT 'IOC指标数量',
  `mitigation_actions` json DEFAULT NULL COMMENT '缓解措施(JSON)',
  `related_threats` json DEFAULT NULL COMMENT '关联威胁(JSON)',
  `severity` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '严重程度',
  `source` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '情报来源',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状态',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '情报类型',
  `updated_at` datetime(6) DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='威胁情报表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `threat_patterns`
--

DROP TABLE IF EXISTS `threat_patterns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `threat_patterns` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(200) NOT NULL COMMENT '特征名称',
  `category` varchar(100) DEFAULT NULL COMMENT '特征分类',
  `pattern` text NOT NULL COMMENT '匹配模式',
  `pattern_type` varchar(20) NOT NULL COMMENT '模式类型: REGEX/KEYWORD',
  `description` text COMMENT '详细描述',
  `example` text COMMENT '示例',
  `severity` int(11) DEFAULT '5' COMMENT '严重程度(1-10)',
  `enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_enabled` (`enabled`),
  KEY `idx_severity` (`severity`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='威胁特征模式表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `threat_signatures`
--

DROP TABLE IF EXISTS `threat_signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `threat_signatures` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '规则ID',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规则分类',
  `created_at` datetime(6) NOT NULL COMMENT '创建时间',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '规则描述',
  `enabled` bit(1) NOT NULL COMMENT '是否启用',
  `hit_count` bigint(20) DEFAULT NULL COMMENT '命中次数',
  `last_hit_time` datetime(6) DEFAULT NULL COMMENT '最后命中时间',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规则名称',
  `pattern` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '匹配模式',
  `pattern_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模式类型(REGEX/KEYWORD/CONDITION)',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `score` double DEFAULT NULL COMMENT '威胁评分',
  `severity` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '严重程度(LOW/MEDIUM/HIGH/CRITICAL)',
  `threat_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '威胁类型',
  `updated_at` datetime(6) NOT NULL COMMENT '更新时间',
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新人',
  `version` int(11) DEFAULT NULL COMMENT '版本号',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_enabled` (`enabled`),
  KEY `idx_threat_type` (`threat_type`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='威胁检测规则库';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `unified_security_events`
--

DROP TABLE IF EXISTS `unified_security_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `unified_security_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '事件ID',
  `anomaly_reason` text COLLATE utf8mb4_unicode_ci COMMENT '异常原因',
  `anomaly_score` double DEFAULT NULL COMMENT '异常评分',
  `assigned_to` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分配给',
  `category` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件分类',
  `created_at` datetime(6) DEFAULT NULL COMMENT '记录创建时间',
  `destination_ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标IP地址',
  `destination_port` int(11) DEFAULT NULL COMMENT '目标端口',
  `detection_algorithm` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '检测算法',
  `event_code` int(11) DEFAULT NULL COMMENT '事件代码(Windows事件ID)',
  `event_data_json` text COLLATE utf8mb4_unicode_ci COMMENT '事件详细数据(JSON)',
  `event_sub_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '事件子类型',
  `event_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件类型',
  `features_json` text COLLATE utf8mb4_unicode_ci COMMENT '特征数据(JSON)',
  `host_ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主机IP',
  `host_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主机名',
  `is_anomaly` bit(1) DEFAULT NULL COMMENT '是否异常',
  `level` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日志级别',
  `normalized_message` text COLLATE utf8mb4_unicode_ci COMMENT '标准化消息',
  `process_id` int(11) DEFAULT NULL COMMENT '进程ID',
  `process_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '进程名称',
  `protocol` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '网络协议',
  `raw_data` text COLLATE utf8mb4_unicode_ci COMMENT '原始数据(JSON)',
  `raw_message` text COLLATE utf8mb4_unicode_ci COMMENT '原始日志消息',
  `resolution_notes` text COLLATE utf8mb4_unicode_ci COMMENT '处理备注',
  `resolved_at` datetime(6) DEFAULT NULL COMMENT '解决时间',
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '会话ID',
  `severity` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '严重程度',
  `source_ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '源IP地址',
  `source_port` int(11) DEFAULT NULL COMMENT '源端口',
  `source_system` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '来源系统',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '处理状态',
  `thread_id` int(11) DEFAULT NULL COMMENT '线程ID',
  `threat_level` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '威胁等级',
  `timestamp` datetime(6) NOT NULL COMMENT '事件发生时间',
  `updated_at` datetime(6) DEFAULT NULL COMMENT '记录更新时间',
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户ID',
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名',
  `ai_anomaly_score` double DEFAULT NULL,
  `ai_is_anomaly` bit(1) DEFAULT NULL,
  `combined_score` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_use_timestamp` (`timestamp`),
  KEY `idx_use_severity` (`severity`),
  KEY `idx_use_category` (`category`),
  KEY `idx_use_source_system` (`source_system`),
  KEY `idx_use_event_type` (`event_type`),
  KEY `idx_use_is_anomaly` (`is_anomaly`),
  KEY `idx_use_threat_level` (`threat_level`),
  KEY `idx_use_source_ip` (`source_ip`),
  KEY `idx_events_timestamp` (`timestamp` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=14196 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='统一安全事件表(核心数据)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_behavior_baselines`
--

DROP TABLE IF EXISTS `user_behavior_baselines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `user_behavior_baselines` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_account` varchar(100) NOT NULL COMMENT '用户账号',
  `normal_login_hours` json DEFAULT NULL COMMENT '正常登录时间段',
  `normal_locations` json DEFAULT NULL COMMENT '正常登录地点',
  `normal_devices` json DEFAULT NULL COMMENT '正常设备',
  `avg_login_frequency` double DEFAULT NULL COMMENT '平均登录频率',
  `avg_session_duration` double DEFAULT NULL COMMENT '平均会话时长(分钟)',
  `baseline_start` timestamp NULL DEFAULT NULL COMMENT '基线开始时间',
  `baseline_end` timestamp NULL DEFAULT NULL COMMENT '基线结束时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_account` (`user_account`),
  KEY `idx_user_account` (`user_account`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户行为基线表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱地址',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码哈希(旧字段)',
  `role` enum('ADMIN','USER','OPERATOR','VIEWER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER' COMMENT '用户角色',
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '账户状态',
  `last_login` datetime DEFAULT NULL COMMENT '最后登录时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '真实姓名',
  `is_active` bit(1) DEFAULT NULL COMMENT '是否激活(1=激活)',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码(BCrypt加密)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_user_last_login` AFTER UPDATE ON `users` FOR EACH ROW BEGIN
    IF NEW.last_login IS NOT NULL AND OLD.last_login IS NULL THEN
        INSERT INTO `log_entries` (`timestamp`, `source`, `level`, `message`, `user_id`)
        VALUES (NOW(), 'auth', 'INFO', CONCAT('User ', NEW.username, ' logged in'), NEW.username);
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `windows_security_logs`
--

DROP TABLE IF EXISTS `windows_security_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `windows_security_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `computer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_time` datetime(6) DEFAULT NULL,
  `event_id` int(11) NOT NULL,
  `event_time` datetime(6) NOT NULL,
  `ip_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logon_type` int(11) DEFAULT NULL,
  `raw_message` text COLLATE utf8mb4_unicode_ci,
  `result_code` int(11) DEFAULT NULL,
  `source` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `threat_level` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_sid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_threat_level` (`threat_level`),
  KEY `idx_event_time` (`event_time`),
  KEY `idx_threat_level_event_time` (`threat_level`,`event_time`)
) ENGINE=InnoDB AUTO_INCREMENT=3277132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-04 14:53:09

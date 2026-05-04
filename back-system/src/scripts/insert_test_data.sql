-- 攻击测试数据插入脚本
-- 直接向数据库写入测试事件和告警，绕过规则引擎
-- 执行方式: mysql -u root -p123456 ai_log_system < insert_test_data.sql

SET @now = NOW();
SET @attacker = '192.168.100.200';
SET @victim = '192.168.1.50';

-- ============================================================
-- 1. 暴力破解攻击场景 (30次登录失败 + 1次成功)
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, user_name, event_code, is_anomaly, anomaly_score,
   threat_level, status, created_at, updated_at)
SELECT
  DATE_SUB(@now, INTERVAL (31 - n) * 10 SECOND),
  'ATTACK_SIMULATOR', 'LOGIN_FAILURE', 'AUTHENTICATION', 'MEDIUM',
  CONCAT('An account failed to log on. Account: administrator, Source IP: ', @attacker),
  CONCAT('登录失败: 用户 administrator 来自 ', @attacker, '，密码错误 (第', n, '次)'),
  'WORKSTATION-TEST01', @victim, @attacker, 'administrator', 4625,
  IF(n > 5, 1, 0), LEAST(0.3 + n * 0.02, 0.95),
  IF(n > 10, 'HIGH', 'MEDIUM'), 'NEW', @now, @now
FROM (
  SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
  UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
  UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25
  UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
) nums;

-- 暴力破解成功登录
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, user_name, event_code, is_anomaly, anomaly_score,
   threat_level, status, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 1 SECOND),
  'ATTACK_SIMULATOR', 'LOGIN_SUCCESS', 'AUTHENTICATION', 'HIGH',
  CONCAT('An account was successfully logged on. Account: administrator, Source IP: ', @attacker),
  CONCAT('登录成功: 用户 administrator 来自 ', @attacker, '（暴力破解后成功）'),
  'WORKSTATION-TEST01', @victim, @attacker, 'administrator', 4624,
  1, 0.95, 'CRITICAL', 'NEW', @now, @now
);

-- 暴力破解告警
INSERT INTO alerts
  (alert_id, timestamp, source, alert_type, alert_level, description, status, handled,
   ai_confidence, created_time, updated_time)
VALUES (
  CONCAT('TEST_BRUTE_FORCE_', UNIX_TIMESTAMP()),
  @now, 'ATTACK_SIMULATOR', 'BRUTE_FORCE_ATTACK', 'CRITICAL',
  CONCAT('检测到暴力破解攻击: 来自 ', @attacker, ' 对用户 administrator 发起 30 次登录失败，最终成功登录'),
  'PENDING', 0, 0.97, @now, @now
);

-- ============================================================
-- 2. 权限提升场景
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, user_name, process_name, event_code, is_anomaly, anomaly_score,
   threat_level, status, event_sub_type, created_at, updated_at)
VALUES
(DATE_SUB(@now, INTERVAL 90 SECOND), 'ATTACK_SIMULATOR', 'LOGIN_SUCCESS', 'AUTHENTICATION', 'LOW',
 'User test_victim_user logged on', '普通用户登录: test_victim_user',
 'WORKSTATION-TEST01', @victim, '10.0.0.15', 'test_victim_user', NULL, 4624,
 0, 0.1, 'LOW', 'NEW', NULL, @now, @now),

(DATE_SUB(@now, INTERVAL 60 SECOND), 'ATTACK_SIMULATOR', 'PERMISSION_DENIED', 'ACCESS_CONTROL', 'MEDIUM',
 'Access denied: test_victim_user attempted to access C:\\Windows\\System32\\config\\SAM',
 '权限拒绝: test_victim_user 尝试访问 SAM 数据库',
 'WORKSTATION-TEST01', @victim, '10.0.0.15', 'test_victim_user', NULL, 4656,
 1, 0.70, 'HIGH', 'NEW', NULL, @now, @now),

(DATE_SUB(@now, INTERVAL 30 SECOND), 'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'PROCESS', 'CRITICAL',
 'Process created: svchost.exe spawned by test_victim_user, CommandLine: sekurlsa::logonpasswords',
 '可疑进程: 检测到凭据转储工具特征，用户: test_victim_user',
 'WORKSTATION-TEST01', @victim, NULL, 'test_victim_user', 'svchost.exe', 4688,
 1, 0.98, 'CRITICAL', 'NEW', 'CREDENTIAL_DUMP', @now, @now),

(DATE_SUB(@now, INTERVAL 10 SECOND), 'ATTACK_SIMULATOR', 'PRIVILEGE_ESCALATION', 'ACCESS_CONTROL', 'CRITICAL',
 'Special privileges assigned to new logon. Account: test_victim_user, Privileges: SeDebugPrivilege',
 '权限提升成功: test_victim_user 获得 SeDebugPrivilege 调试权限',
 'WORKSTATION-TEST01', @victim, NULL, 'test_victim_user', NULL, 4672,
 1, 0.99, 'CRITICAL', 'NEW', NULL, @now, @now);

-- 权限提升告警
INSERT INTO alerts
  (alert_id, timestamp, source, alert_type, alert_level, description, status, handled,
   ai_confidence, created_time, updated_time)
VALUES (
  CONCAT('TEST_PRIVESC_', UNIX_TIMESTAMP()),
  @now, 'ATTACK_SIMULATOR', 'PRIVILEGE_ESCALATION', 'CRITICAL',
  '检测到权限提升攻击: 用户 test_victim_user 通过凭据转储获取 SeDebugPrivilege 权限',
  'PENDING', 0, 0.99, @now, @now
);

-- ============================================================
-- 3. 网络扫描场景
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol,
   is_anomaly, anomaly_score, threat_level, status, created_at, updated_at)
SELECT
  DATE_SUB(@now, INTERVAL (18 - n) * 2 SECOND),
  'ATTACK_SIMULATOR', 'NETWORK_CONNECTION', 'NETWORK', 'MEDIUM',
  CONCAT('Port scan detected: ', @attacker, ' -> ', @victim, ':', port, ' (SYN scan)'),
  CONCAT('端口扫描: ', @attacker, ' 扫描 ', @victim, ':', port),
  'WORKSTATION-TEST01', @victim, @attacker, @victim, port, 'TCP',
  1, 0.75, 'HIGH', 'NEW', @now, @now
FROM (
  SELECT 1 n, 21 port UNION SELECT 2, 22 UNION SELECT 3, 23 UNION SELECT 4, 25
  UNION SELECT 5, 53 UNION SELECT 6, 80 UNION SELECT 7, 110 UNION SELECT 8, 135
  UNION SELECT 9, 139 UNION SELECT 10, 143 UNION SELECT 11, 443 UNION SELECT 12, 445
  UNION SELECT 13, 3306 UNION SELECT 14, 3389 UNION SELECT 15, 5432
  UNION SELECT 16, 6379 UNION SELECT 17, 8080 UNION SELECT 18, 8443
) ports;

-- 网络扫描告警
INSERT INTO alerts
  (alert_id, timestamp, source, alert_type, alert_level, description, status, handled,
   ai_confidence, created_time, updated_time)
VALUES (
  CONCAT('TEST_NETSCAN_', UNIX_TIMESTAMP()),
  @now, 'ATTACK_SIMULATOR', 'NETWORK_SCAN', 'HIGH',
  CONCAT('检测到端口扫描: 来自 ', @attacker, ' 对 ', @victim, ' 扫描 18 个端口'),
  'PENDING', 0, 0.85, @now, @now
);

-- ============================================================
-- 4. 数据渗出场景
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, user_name, event_code, is_anomaly, anomaly_score,
   threat_level, status, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 90 SECOND),
  'ATTACK_SIMULATOR', 'FILE_ACCESS', 'DATA_ACCESS', 'HIGH',
  'Mass file access: test_victim_user accessed 500 files in C:\\Users\\sensitive_data\\ within 60 seconds',
  '异常文件访问: test_victim_user 在60秒内访问了500个文件',
  'WORKSTATION-TEST01', @victim, 'test_victim_user', 4663,
  1, 0.85, 'HIGH', 'NEW', @now, @now
);

INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol,
   is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 10 SECOND),
  'ATTACK_SIMULATOR', 'NETWORK_CONNECTION', 'NETWORK', 'CRITICAL',
  CONCAT('Large outbound transfer: ', @victim, ' -> 203.0.113.100:443, bytes_sent=52428800 (50MB)'),
  '数据渗出: 向外部 203.0.113.100 传输 50MB 数据',
  'WORKSTATION-TEST01', @victim, @victim, '203.0.113.100', 443, 'HTTPS',
  1, 0.97, 'CRITICAL', 'NEW', 'DATA_EXFILTRATION', @now, @now
);

-- 数据渗出告警
INSERT INTO alerts
  (alert_id, timestamp, source, alert_type, alert_level, description, status, handled,
   ai_confidence, created_time, updated_time)
VALUES (
  CONCAT('TEST_EXFIL_', UNIX_TIMESTAMP()),
  @now, 'ATTACK_SIMULATOR', 'DATA_EXFILTRATION', 'CRITICAL',
  '检测到数据渗出: 用户 test_victim_user 访问500个文件后向外部 203.0.113.100 传输 50MB 数据',
  'PENDING', 0, 0.97, @now, @now
);

-- ============================================================
-- 5. 恶意软件场景
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, process_name, event_code, is_anomaly, anomaly_score,
   threat_level, status, event_sub_type, created_at, updated_at)
VALUES
(DATE_SUB(@now, INTERVAL 30 SECOND), 'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'MALWARE', 'CRITICAL',
 'Suspicious process: xmrig.exe started by explorer.exe, CPU=95%, connecting to pool.minexmr.com:4444',
 '检测到挖矿程序: xmrig.exe CPU占用95%，连接到矿池',
 'WORKSTATION-TEST01', @victim, 'xmrig.exe', 4688,
 1, 0.99, 'CRITICAL', 'NEW', 'CRYPTOMINER', @now, @now),

(DATE_SUB(@now, INTERVAL 20 SECOND), 'ATTACK_SIMULATOR', 'CONFIGURATION_CHANGE', 'SYSTEM', 'HIGH',
 'Registry modification: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svchost32 = C:\\Users\\Public\\svchost32.exe',
 '注册表持久化: 恶意程序写入自启动项',
 'WORKSTATION-TEST01', @victim, 'svchost32.exe', 4657,
 1, 0.92, 'HIGH', 'NEW', NULL, @now, @now);

INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol, process_name,
   is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 10 SECOND),
  'ATTACK_SIMULATOR', 'NETWORK_CONNECTION', 'NETWORK', 'CRITICAL',
  'C2 communication: svchost32.exe -> 198.51.100.50:4444 (known C2 port)',
  'C2 通信: 恶意进程连接到 198.51.100.50:4444',
  'WORKSTATION-TEST01', @victim, @victim, '198.51.100.50', 4444, 'TCP', 'svchost32.exe',
  1, 0.98, 'CRITICAL', 'NEW', 'C2_COMMUNICATION', @now, @now
);

-- 恶意软件告警
INSERT INTO alerts
  (alert_id, timestamp, source, alert_type, alert_level, description, status, handled,
   ai_confidence, created_time, updated_time)
VALUES (
  CONCAT('TEST_MALWARE_', UNIX_TIMESTAMP()),
  @now, 'ATTACK_SIMULATOR', 'MALWARE_DETECTED', 'CRITICAL',
  '检测到恶意软件: xmrig.exe 挖矿程序运行，并建立 C2 通信到 198.51.100.50:4444，同时写入注册表持久化',
  'PENDING', 0, 0.99, @now, @now
);

-- ============================================================
-- 6. 横向移动场景
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol,
   is_anomaly, anomaly_score, threat_level, status, created_at, updated_at)
SELECT
  DATE_SUB(@now, INTERVAL (5 - n) * 5 SECOND),
  'ATTACK_SIMULATOR', 'NETWORK_CONNECTION', 'NETWORK', 'HIGH',
  CONCAT('Outbound connection from ', @victim, ' to 10.0.0.', 19 + n, ':445 (SMB)'),
  CONCAT('SMB 扫描: ', @victim, ' → 10.0.0.', 19 + n, ':445'),
  'WORKSTATION-TEST01', @victim, @victim, CONCAT('10.0.0.', 19 + n), 445, 'TCP',
  1, 0.80, 'HIGH', 'NEW', @now, @now
FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) t;

INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol,
   is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 2 SECOND),
  'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'NETWORK', 'CRITICAL',
  CONCAT('Remote command execution via SMB: ', @victim, ' -> 10.0.0.21, Command: net user /domain'),
  '横向移动: 通过 SMB 在 10.0.0.21 执行远程命令',
  'WORKSTATION-TEST01', @victim, @victim, '10.0.0.21', 445, 'TCP',
  1, 0.95, 'CRITICAL', 'NEW', 'REMOTE_EXECUTION', @now, @now
);

-- 横向移动告警
INSERT INTO alerts
  (alert_id, timestamp, source, alert_type, alert_level, description, status, handled,
   ai_confidence, created_time, updated_time)
VALUES (
  CONCAT('TEST_LATERAL_', UNIX_TIMESTAMP()),
  @now, 'ATTACK_SIMULATOR', 'LATERAL_MOVEMENT', 'CRITICAL',
  CONCAT('检测到横向移动: 来自 ', @victim, ' 扫描内网 5 台主机的 SMB 端口，并在 10.0.0.21 执行远程命令'),
  'PENDING', 0, 0.95, @now, @now
);

-- ============================================================
-- 验证插入结果
-- ============================================================
SELECT '=== 插入完成 ===' AS result;
SELECT COUNT(*) AS total_test_events FROM unified_security_events WHERE source_system = 'ATTACK_SIMULATOR';
SELECT COUNT(*) AS total_test_alerts FROM alerts WHERE source = 'ATTACK_SIMULATOR';
SELECT alert_type, alert_level, LEFT(description, 60) AS desc_preview FROM alerts WHERE source = 'ATTACK_SIMULATOR' ORDER BY created_time DESC;

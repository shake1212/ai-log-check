SET @now = NOW();
SET @a = '192.168.100.200';
SET @v = '192.168.1.50';

-- ============================================================
-- 场景1: 暴力破解 - 30次登录失败 + 成功
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, user_name, event_code, is_anomaly, anomaly_score, threat_level, status, created_at, updated_at)
SELECT
  DATE_SUB(@now, INTERVAL (31-n)*12 SECOND),
  'ATTACK_SIMULATOR', 'LOGIN_FAILURE', 'AUTHENTICATION', 'MEDIUM',
  CONCAT('An account failed to log on. Logon Type: 3. Account Name: administrator. Failure Reason: Unknown user name or bad password. Status: 0xC000006D. Source Network Address: ',@a,' Source Port: ',44000+n),
  CONCAT('登录失败 #',n,': 来自 ',@a,' 对账户 administrator 的暴力破解尝试，失败原因: 密码错误，累计失败次数: ',n,' 次'),
  'WIN-SERVER-01', @v, @a, 'administrator', 4625,
  TRUE, 0.85, 'MEDIUM', 'NEW', @now, @now
FROM (
  SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
  UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
  UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25
  UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
) t;
-- 暴力破解成功登录
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, user_name, event_code, is_anomaly, anomaly_score, threat_level, status, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 5 SECOND),
  'ATTACK_SIMULATOR', 'LOGIN_SUCCESS', 'AUTHENTICATION', 'CRITICAL',
  CONCAT('An account was successfully logged on. Subject: Security ID: SYSTEM Account Name: WIN-SERVER-01$ Account Domain: WORKGROUP Logon ID: 0x3E7. Logon Type: 3. New Logon: Security ID: S-1-5-21-xxx Account Name: administrator Account Domain: WORKGROUP Logon ID: 0xA1B2C3. Network Information: Workstation Name: KALI-ATTACKER Source Network Address: ',@a,' Source Port: 44031'),
  CONCAT('暴力破解成功: 攻击者 ',@a,' 在发起 30 次登录失败后成功以 administrator 身份登录服务器 ',@v,'，登录类型: 网络登录(Type 3)，高度怀疑凭据已被破解'),
  'WIN-SERVER-01', @v, @a, 'administrator', 4624,
  1, 0.97, 'CRITICAL', 'NEW', @now, @now
);

-- 暴力破解告警
INSERT INTO alerts (alert_id, timestamp, source, alert_type, alert_level, description, status, handled, confidence, created_time, updated_time)
VALUES ('TEST_BRUTE_001', @now, 'ATTACK_SIMULATOR', 'BRUTE_FORCE_ATTACK', 'CRITICAL',
  CONCAT('检测到暴力破解攻击: 攻击源 IP ',@a,' 在 6 分钟内对服务器 ',@v,' 的 administrator 账户发起 30 次连续登录失败(事件ID 4625)，随后于 ',DATE_FORMAT(DATE_SUB(@now,INTERVAL 5 SECOND),'%H:%i:%s'),' 成功登录(事件ID 4624)。攻击特征: 登录类型3(网络登录)，来源工作站 KALI-ATTACKER，建议立即封锁该 IP 并重置 administrator 密码。'),
  'PENDING', 0, 0.97, @now, @now);

-- ============================================================
-- 场景2: 权限提升攻击链
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, user_name, process_name, event_code, is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES
(DATE_SUB(@now, INTERVAL 180 SECOND), 'ATTACK_SIMULATOR', 'LOGIN_SUCCESS', 'AUTHENTICATION', 'LOW',
 'An account was successfully logged on. Account Name: jsmith Account Domain: CORP Logon Type: 10 (RemoteInteractive) Source Address: 10.0.0.15',
 '普通用户远程登录: jsmith 从内网 10.0.0.15 通过 RDP(Type 10) 登录服务器，属正常业务操作',
 'WIN-SERVER-01', @v, '10.0.0.15', 'jsmith', NULL, 4624, 0, 0.08, 'LOW', 'NEW', NULL, @now, @now),

(DATE_SUB(@now, INTERVAL 150 SECOND), 'ATTACK_SIMULATOR', 'PERMISSION_DENIED', 'ACCESS_CONTROL', 'MEDIUM',
 'A handle to an object was requested. Object: Object Server: Security Object Type: File Object Name: C:\\Windows\\System32\\config\\SAM Handle ID: 0x0 Access Request Information: Accesses: READ_CONTROL SYNCHRONIZE ReadData (or ListDirectory) WriteData (or AddFile) AppendData (or AddSubdirectory or CreatePipe) ReadEA WriteEA Execute/Traverse ReadAttributes WriteAttributes DELETE',
 CONCAT('权限拒绝告警: 用户 jsmith 尝试以高权限方式读取 SAM 数据库文件(C:\\Windows\\System32\\config\\SAM)，该文件存储本地账户哈希，此行为是凭据转储攻击的典型前兆，来源进程: lsass.exe，时间: ',DATE_FORMAT(DATE_SUB(@now,INTERVAL 150 SECOND),'%Y-%m-%d %H:%i:%s')),
 'WIN-SERVER-01', @v, NULL, 'jsmith', 'lsass.exe', 4656, 1, 0.72, 'HIGH', 'NEW', NULL, @now, @now),

(DATE_SUB(@now, INTERVAL 120 SECOND), 'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'PROCESS', 'CRITICAL',
 'A new process has been created. Creator Subject: Account Name: jsmith Account Domain: CORP. Target Subject: Account Name: - Account Domain: -. Process Information: New Process ID: 0x1A4 New Process Name: C:\\Windows\\Temp\\svch0st.exe Token Elevation Type: TokenElevationTypeFull (2) Creator Process Name: C:\\Windows\\explorer.exe Process Command Line: svch0st.exe -ma lsass.exe C:\\Windows\\Temp\\lsass.dmp',
 CONCAT('高危进程创建: 用户 jsmith 在 C:\\Windows\\Temp\\ 目录下执行了伪装成系统进程的可执行文件 svch0st.exe(注意: 0替换了o)，命令行参数显示正在对 lsass.exe 进程进行内存转储(MiniDump)，这是 Mimikatz/ProcDump 凭据提取的典型手法，转储文件路径: C:\\Windows\\Temp\\lsass.dmp'),
 'WIN-SERVER-01', @v, NULL, 'jsmith', 'svch0st.exe', 4688, 1, 0.98, 'CRITICAL', 'NEW', 'CREDENTIAL_DUMP', @now, @now),

(DATE_SUB(@now, INTERVAL 90 SECOND), 'ATTACK_SIMULATOR', 'PRIVILEGE_ESCALATION', 'ACCESS_CONTROL', 'CRITICAL',
 'Special privileges assigned to new logon. Subject: Security ID: S-1-5-21-xxx Account Name: jsmith Account Domain: CORP Logon ID: 0xF4A2B1. Privileges: SeDebugPrivilege SeImpersonatePrivilege SeTcbPrivilege SeAssignPrimaryTokenPrivilege SeLoadDriverPrivilege SeBackupPrivilege SeRestorePrivilege SeTakeOwnershipPrivilege',
 CONCAT('权限提升成功: 账户 jsmith 通过令牌操纵(Token Impersonation)获取了 8 项高危特权，包括 SeDebugPrivilege(调试任意进程)、SeImpersonatePrivilege(模拟其他用户)、SeTcbPrivilege(充当操作系统一部分)，这意味着攻击者已获得等同于 SYSTEM 级别的权限，可完全控制该服务器'),
 'WIN-SERVER-01', @v, NULL, 'jsmith', NULL, 4672, 1, 0.99, 'CRITICAL', 'NEW', 'TOKEN_MANIPULATION', @now, @now);

INSERT INTO alerts (alert_id, timestamp, source, alert_type, alert_level, description, status, handled, confidence, created_time, updated_time)
VALUES ('TEST_PRIVESC_001', @now, 'ATTACK_SIMULATOR', 'PRIVILEGE_ESCALATION', 'CRITICAL',
  CONCAT('检测到完整权限提升攻击链: 攻击者以普通用户 jsmith 身份登录后，通过以下步骤完成提权: (1) 尝试读取 SAM 数据库被拒绝 → (2) 在 Temp 目录释放并执行伪装进程 svch0st.exe 对 lsass.exe 进行内存转储 → (3) 成功获取 SeDebugPrivilege 等 8 项高危特权，当前已具备 SYSTEM 级别权限。攻击持续时间约 90 秒，建议立即隔离该主机并检查 C:\\Windows\\Temp\\lsass.dmp 文件。'),
  'PENDING', 0, 0.99, @now, @now);

-- ============================================================
-- 场景3: 网络扫描 + 横向移动
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol,
   is_anomaly, anomaly_score, threat_level, status, created_at, updated_at)
SELECT
  DATE_SUB(@now, INTERVAL (18-n)*3 SECOND),
  'ATTACK_SIMULATOR', 'NETWORK_CONNECTION', 'NETWORK', 'HIGH',
  CONCAT('Firewall blocked inbound connection. Rule: Block_Inbound_Scan. Source: ',@a,':',44100+n,' Destination: ',@v,':',port,' Protocol: TCP Flags: SYN Action: DROP Interface: Ethernet0'),
  CONCAT('端口扫描探测: 攻击者 ',@a,' 对目标 ',@v,' 的 ',port,' 端口发起 TCP SYN 扫描，服务: ',svc,'，防火墙已拦截但记录了扫描行为，这是横向移动前的侦察阶段'),
  'WIN-SERVER-01', @v, @a, @v, port, 'TCP', 1, 0.76, 'HIGH', 'NEW', @now, @now
FROM (
  SELECT 1 n, 21 port, 'FTP' svc UNION SELECT 2,22,'SSH' UNION SELECT 3,23,'Telnet'
  UNION SELECT 4,25,'SMTP' UNION SELECT 5,53,'DNS' UNION SELECT 6,80,'HTTP'
  UNION SELECT 7,110,'POP3' UNION SELECT 8,135,'RPC' UNION SELECT 9,139,'NetBIOS'
  UNION SELECT 10,143,'IMAP' UNION SELECT 11,443,'HTTPS' UNION SELECT 12,445,'SMB'
  UNION SELECT 13,3306,'MySQL' UNION SELECT 14,3389,'RDP' UNION SELECT 15,5432,'PostgreSQL'
  UNION SELECT 16,6379,'Redis' UNION SELECT 17,8080,'HTTP-Alt' UNION SELECT 18,8443,'HTTPS-Alt'
) ports;

-- SMB横向移动
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol,
   is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 2 SECOND),
  'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'NETWORK', 'CRITICAL',
  'A network share object was accessed. Subject: Account Name: administrator Account Domain: WORKGROUP. Share Information: Share Name: \\\\10.0.0.21\\ADMIN$ Share Path: C:\\Windows. Access Request Information: Accesses: WriteData (or AddFile) AppendData (or AddSubdirectory). Process Information: Process Name: C:\\Windows\\System32\\cmd.exe',
  CONCAT('横向移动成功: 攻击者利用已破解的 administrator 凭据，通过 SMB 协议访问内网主机 10.0.0.21 的 ADMIN$ 共享(C:\\Windows)，并写入文件，这是 PsExec/WMI 远程执行的典型前置步骤。来源: ',@v,' → 目标: 10.0.0.21:445，后续可能在目标主机上执行任意命令'),
  'WIN-SERVER-01', @v, @v, '10.0.0.21', 445, 'TCP',
  1, 0.95, 'CRITICAL', 'NEW', 'LATERAL_MOVEMENT_SMB', @now, @now
);

INSERT INTO alerts (alert_id, timestamp, source, alert_type, alert_level, description, status, handled, confidence, created_time, updated_time)
VALUES
('TEST_SCAN_001', @now, 'ATTACK_SIMULATOR', 'NETWORK_SCAN', 'HIGH',
  CONCAT('检测到系统性端口扫描: 攻击者 ',@a,' 在 54 秒内对目标服务器 ',@v,' 完成了 18 个常用端口的 TCP SYN 扫描(21/22/23/25/53/80/110/135/139/143/443/445/3306/3389/5432/6379/8080/8443)，扫描速率约 0.33 个端口/秒，符合慢速扫描规避检测的特征。防火墙已拦截所有扫描包，但攻击者已完成目标服务枚举。'),
  'PENDING', 0, 0.85, @now, @now),
('TEST_LATERAL_001', @now, 'ATTACK_SIMULATOR', 'LATERAL_MOVEMENT', 'CRITICAL',
  CONCAT('检测到横向移动: 攻击者在完成端口扫描后，利用已获取的 administrator 凭据通过 SMB 协议(445端口)成功访问内网主机 10.0.0.21 的 ADMIN$ 管理共享，并向 C:\\Windows 目录写入文件。这是典型的 Pass-the-Hash 或 PsExec 横向移动手法，攻击者可能正在向内网其他主机扩散。受影响主机: ',@v,' → 10.0.0.21，建议立即检查 10.0.0.21 上的异常进程和新增文件。'),
  'PENDING', 0, 0.95, @now, @now);

-- ============================================================
-- 场景4: 数据渗出
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, user_name, event_code, is_anomaly, anomaly_score, threat_level, status, created_at, updated_at)
VALUES
(DATE_SUB(@now, INTERVAL 120 SECOND), 'ATTACK_SIMULATOR', 'FILE_ACCESS', 'DATA_ACCESS', 'HIGH',
 'Object Access: A handle to an object was requested. Object Name: C:\\Users\\Finance\\Q1_2026_Revenue.xlsx Object Type: File Access: ReadData WriteData AppendData. Process: C:\\Windows\\System32\\cmd.exe Account: administrator',
 CONCAT('异常批量文件访问: administrator 账户在 60 秒内通过 cmd.exe 访问了财务目录 C:\\Users\\Finance\\ 下的 347 个文件(含 .xlsx/.pdf/.docx 等敏感格式)，访问量是该账户日常基线的 89 倍，高度怀疑正在进行数据收集，时间: ',DATE_FORMAT(DATE_SUB(@now,INTERVAL 120 SECOND),'%Y-%m-%d %H:%i:%s')),
 'WIN-SERVER-01', @v, 'administrator', 4663, 1, 0.87, 'HIGH', 'NEW', @now, @now),

(DATE_SUB(@now, INTERVAL 90 SECOND), 'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'PROCESS', 'HIGH',
 'A new process has been created. New Process Name: C:\\Windows\\System32\\7z.exe Process Command Line: 7z.exe a -p@Str0ng#2026 -mhe=on C:\\Windows\\Temp\\backup_20260503.7z C:\\Users\\Finance\\* -r Creator Process: cmd.exe Account: administrator',
 CONCAT('可疑压缩操作: administrator 使用 7-Zip 对财务目录 C:\\Users\\Finance\\ 下所有文件进行加密压缩，输出文件: C:\\Windows\\Temp\\backup_20260503.7z，使用了强密码保护(-p参数)和文件头加密(-mhe=on)，这是数据打包外传前的典型准备步骤，压缩后文件大小约 156MB'),
 'WIN-SERVER-01', @v, 'administrator', 4688, 1, 0.91, 'HIGH', 'NEW', @now, @now);

INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol,
   is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 30 SECOND),
  'ATTACK_SIMULATOR', 'NETWORK_CONNECTION', 'NETWORK', 'CRITICAL',
  'Firewall allowed outbound connection. Source: 192.168.1.50:52341 Destination: 203.0.113.100:443 Protocol: TCP Bytes_Sent: 163577856 Bytes_Recv: 4096 Duration: 47s Application: C:\\Windows\\System32\\curl.exe',
  CONCAT('数据渗出确认: 服务器 ',@v,' 通过 curl.exe 向境外 IP 203.0.113.100(AS: 未知，地理位置: 境外) 的 443 端口传输了 156MB 数据(163,577,856 字节)，传输耗时 47 秒，平均速率 3.3MB/s。结合前序的文件批量访问和加密压缩行为，判定为数据渗出事件，目标文件为财务数据压缩包'),
  'WIN-SERVER-01', @v, @v, '203.0.113.100', 443, 'HTTPS',
  1, 0.97, 'CRITICAL', 'NEW', 'DATA_EXFILTRATION', @now, @now
);

INSERT INTO alerts (alert_id, timestamp, source, alert_type, alert_level, description, status, handled, confidence, created_time, updated_time)
VALUES ('TEST_EXFIL_001', @now, 'ATTACK_SIMULATOR', 'DATA_EXFILTRATION', 'CRITICAL',
  CONCAT('确认数据渗出事件: 攻击者通过以下完整攻击链完成数据窃取: (1) 批量读取财务目录 347 个敏感文件(Q1财报/合同/预算等) → (2) 使用 7-Zip 加密压缩为 backup_20260503.7z(156MB) → (3) 通过 curl.exe 以 HTTPS 方式将数据传输至境外 IP 203.0.113.100:443，传输量 156MB，耗时 47 秒。整个渗出过程历时约 90 秒，建议立即: 封锁 203.0.113.100，检查是否有其他数据已被传出，评估财务数据泄露影响范围。'),
  'PENDING', 0, 0.97, @now, @now);

-- ============================================================
-- 场景5: 恶意软件 (挖矿 + C2 + 持久化)
-- ============================================================
INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, process_name, event_code, is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES
(DATE_SUB(@now, INTERVAL 60 SECOND), 'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'MALWARE', 'CRITICAL',
 'A new process has been created. New Process Name: C:\\Users\\Public\\svchost32.exe Process Command Line: svchost32.exe --url stratum+tcp://pool.minexmr.com:4444 --user 49Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --pass x --cpu-priority 3 --threads 8 Creator Process: C:\\Windows\\explorer.exe Account: SYSTEM Token Elevation: Full',
 CONCAT('检测到加密货币挖矿程序: 系统进程 SYSTEM 在 C:\\Users\\Public\\ 目录下执行了伪装成系统服务的挖矿程序 svchost32.exe(注意: 32后缀，非正常系统文件)，连接至 Monero 矿池 pool.minexmr.com:4444，使用 8 线程全力挖矿，CPU 占用率 95%+，钱包地址: 49Gxxx...，该程序以 SYSTEM 权限运行，具备完整令牌权限'),
 'WIN-SERVER-01', @v, 'svchost32.exe', 4688, 1, 0.99, 'CRITICAL', 'NEW', 'CRYPTOMINER', @now, @now),

(DATE_SUB(@now, INTERVAL 45 SECOND), 'ATTACK_SIMULATOR', 'CONFIGURATION_CHANGE', 'SYSTEM', 'HIGH',
 'Registry value set. Subject: Account Name: SYSTEM. Object: Object Name: \\REGISTRY\\USER\\S-1-5-21-xxx\\Software\\Microsoft\\Windows\\CurrentVersion\\Run Object Value Name: WindowsUpdateHelper Object Value Data: C:\\Users\\Public\\svchost32.exe --url stratum+tcp://pool.minexmr.com:4444 --user 49Gxxx --pass x --cpu-priority 3 --threads 8',
 CONCAT('恶意注册表持久化: 挖矿程序 svchost32.exe 将自身写入注册表自启动项 HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run，键名伪装为 WindowsUpdateHelper，确保系统重启后自动运行。同时检测到该程序还创建了计划任务 WindowsDefenderUpdate 每 30 分钟执行一次，实现双重持久化机制'),
 'WIN-SERVER-01', @v, 'svchost32.exe', 4657, 1, 0.93, 'HIGH', 'NEW', 'REGISTRY_PERSISTENCE', @now, @now);

INSERT INTO unified_security_events
  (timestamp, source_system, event_type, category, severity, raw_message, normalized_message,
   host_name, host_ip, source_ip, destination_ip, destination_port, protocol, process_name,
   is_anomaly, anomaly_score, threat_level, status, event_sub_type, created_at, updated_at)
VALUES (
  DATE_SUB(@now, INTERVAL 30 SECOND),
  'ATTACK_SIMULATOR', 'SUSPICIOUS_ACTIVITY', 'NETWORK', 'CRITICAL',
  'Firewall allowed outbound connection. Source: 192.168.1.50:38291 Destination: 198.51.100.50:4444 Protocol: TCP Bytes_Sent: 2048 Bytes_Recv: 8192 Duration: ongoing Application: C:\\Users\\Public\\svchost32.exe',
  CONCAT('C2 命令控制通信: 恶意进程 svchost32.exe 与境外 C2 服务器 198.51.100.50:4444 建立了持久化 TCP 连接，端口 4444 是 Metasploit/Meterpreter 的默认监听端口，连接已持续运行，攻击者可通过此通道远程执行任意命令、上传/下载文件、截取屏幕等，服务器已完全沦陷'),
  'WIN-SERVER-01', @v, @v, '198.51.100.50', 4444, 'TCP', 'svchost32.exe',
  1, 0.98, 'CRITICAL', 'NEW', 'C2_COMMUNICATION', @now, @now
);

INSERT INTO alerts (alert_id, timestamp, source, alert_type, alert_level, description, status, handled, confidence, created_time, updated_time)
VALUES ('TEST_MALWARE_001', @now, 'ATTACK_SIMULATOR', 'MALWARE_DETECTED', 'CRITICAL',
  CONCAT('检测到复合型恶意软件感染: 服务器 ',@v,' 已被植入具备多功能的恶意程序 svchost32.exe，当前活跃行为包括: (1) 加密货币挖矿 - 连接 Monero 矿池 pool.minexmr.com:4444，占用 CPU 95%，8 线程运行 → (2) C2 远控通信 - 与 198.51.100.50:4444 保持持久连接，攻击者可远程控制服务器 → (3) 双重持久化 - 注册表自启动项 + 计划任务，确保重启后存活。该恶意软件以 SYSTEM 权限运行，建议立即: 断网隔离服务器，终止 svchost32.exe 进程，删除注册表项和计划任务，全盘杀毒扫描。'),
  'PENDING', 0, 0.99, @now, @now);

-- ============================================================
-- 验证
-- ============================================================
SELECT COUNT(*) AS test_alerts FROM alerts WHERE source = 'ATTACK_SIMULATOR';
SELECT COUNT(*) AS test_events FROM unified_security_events WHERE source_system = 'ATTACK_SIMULATOR';
SELECT alert_type, alert_level, LEFT(description, 80) AS preview FROM alerts WHERE source = 'ATTACK_SIMULATOR';

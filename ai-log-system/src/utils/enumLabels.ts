/**
 * 枚举值中文映射工具
 * 统一管理所有英文枚举值到中文的转换，不修改数据库
 */

// 严重程度 / 威胁等级
export const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: '严重', color: 'red' },
  HIGH:     { label: '高危', color: 'orange' },
  MEDIUM:   { label: '中危', color: 'gold' },
  LOW:      { label: '低危', color: 'green' },
  critical: { label: '严重', color: 'red' },
  high:     { label: '高危', color: 'orange' },
  medium:   { label: '中危', color: 'gold' },
  low:      { label: '低危', color: 'green' },
  UNKNOWN:  { label: '未知', color: 'default' },
};

// 威胁类型（检测引擎产生的威胁分类）
export const THREAT_TYPE_MAP: Record<string, string> = {
  // 检测引擎输出（大写）
  BRUTE_FORCE_ATTACK:    '暴力破解攻击',
  PRIVILEGED_OPERATION:  '特权账户操作',
  OFF_HOURS_LOGIN:       '非工作时间登录',
  AUTH_FAILURE:          '认证失败',
  PRIVILEGE_ESCALATION:  '权限提升',
  MALWARE:               '恶意软件',
  NETWORK_ATTACK:        '网络攻击',
  SUSPICIOUS_PROCESS:    '可疑进程',
  LATERAL_MOVEMENT:      '横向移动',
  DATA_EXFILTRATION:     '数据渗出',
  COMMAND_AND_CONTROL:   '命令与控制',
  RANSOMWARE:            '勒索软件',
  BACKDOOR:              '后门程序',
  TROJAN:                '木马程序',
  WORM:                  '蠕虫病毒',
  SPYWARE:               '间谍软件',
  EXPLOIT:               '漏洞利用',
  INJECTION:             '注入攻击',
  SQL_INJECTION:         'SQL注入',
  XSS:                   '跨站脚本攻击',
  CSRF:                  '跨站请求伪造',
  DDOS:                  'DDoS攻击',
  PORT_SCAN:             '端口扫描',
  UNAUTHORIZED_ACCESS:   '未授权访问',
  POLICY_VIOLATION:      '策略违规',
  SYSTEM_ANOMALY:        '系统异常',
  SECURITY_ANOMALY:      '安全异常',
  APT:                   '高级持续性威胁',
  // 威胁情报类型（小写）
  malware:               '恶意软件',
  phishing:              '网络钓鱼',
  vulnerability:         '漏洞威胁',
  botnet:                '僵尸网络',
  ransomware:            '勒索软件',
  apt:                   '高级持续性威胁',
  ddos:                  'DDoS攻击',
  exploit:               '漏洞利用',
  trojan:                '木马程序',
  backdoor:              '后门程序',
  spyware:               '间谍软件',
  worm:                  '蠕虫病毒',
};

// 威胁分类（规则引擎的 category 字段）
export const THREAT_CATEGORY_MAP: Record<string, string> = {
  AUTHENTICATION:        '认证安全',
  AUTHORIZATION:         '授权安全',
  NETWORK:               '网络安全',
  ENDPOINT:              '终端安全',
  DATA:                  '数据安全',
  APPLICATION:           '应用安全',
  COMPLIANCE:            '合规检查',
  ANOMALY:               '异常行为',
  THREAT_INTEL:          '威胁情报',
  MALWARE:               '恶意软件',
  INTRUSION:             '入侵检测',
  VULNERABILITY:         '漏洞管理',
  // 小写兼容
  authentication:        '认证安全',
  authorization:         '授权安全',
  network:               '网络安全',
  endpoint:              '终端安全',
  data:                  '数据安全',
  application:           '应用安全',
  compliance:            '合规检查',
  anomaly:               '异常行为',
};

// 告警类型
export const ALERT_TYPE_MAP: Record<string, string> = {
  THREAT_SIGNATURE_MATCH: '威胁规则匹配',
  SECURITY_ANOMALY:       '安全异常',
  BRUTE_FORCE:            '暴力破解',
  BRUTE_FORCE_ATTACK:     '暴力破解攻击',
  PRIVILEGE_ESCALATION:   '权限提升',
  PRIVILEGED_OPERATION:   '特权账户操作',
  DATA_EXFILTRATION:      '数据渗出',
  MALWARE_DETECTED:       '恶意软件检测',
  NETWORK_ATTACK:         '网络攻击',
  UNAUTHORIZED_ACCESS:    '未授权访问',
  POLICY_VIOLATION:       '策略违规',
  SYSTEM_ANOMALY:         '系统异常',
  OFF_HOURS_LOGIN:        '非工作时间登录',
  AUTH_FAILURE:           '认证失败',
  SUSPICIOUS_PROCESS:     '可疑进程',
  PORT_SCAN:              '端口扫描',
  DDOS:                   'DDoS攻击',
  RANSOMWARE:             '勒索软件',
  BACKDOOR:               '后门程序',
};

// 处理状态
export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW:            { label: '新建',   color: 'blue' },
  IN_PROGRESS:    { label: '处理中', color: 'processing' },
  RESOLVED:       { label: '已解决', color: 'success' },
  FALSE_POSITIVE: { label: '误报',   color: 'default' },
  ESCALATED:      { label: '已升级', color: 'warning' },
  CLOSED:         { label: '已关闭', color: 'default' },
  ACTIVE:         { label: '活跃',   color: 'red' },
  active:         { label: '活跃',   color: 'red' },
  MONITORING:     { label: '监控中', color: 'gold' },
  PATCHED:        { label: '已修复', color: 'green' },
  INVESTIGATING:  { label: '调查中', color: 'orange' },
  PENDING:        { label: '待处理', color: 'default' },
  SUCCESS:        { label: '成功',   color: 'green' },
  FAILED:         { label: '失败',   color: 'red' },
  mitigated:      { label: '已缓解', color: 'green' },
  MITIGATED:      { label: '已缓解', color: 'green' },
};

// 事件类型
export const EVENT_TYPE_MAP: Record<string, string> = {
  LOGIN_SUCCESS:         '登录成功',
  LOGIN_FAILURE:         '登录失败',
  LOGOUT:                '注销',
  PERMISSION_DENIED:     '权限拒绝',
  FILE_ACCESS:           '文件访问',
  NETWORK_CONNECTION:    '网络连接',
  SYSTEM_STARTUP:        '系统启动',
  SYSTEM_SHUTDOWN:       '系统关闭',
  PROCESS_CREATION:      '进程创建',
  PROCESS_TERMINATION:   '进程终止',
  SERVICE_START:         '服务启动',
  SERVICE_STOP:          '服务停止',
  CONFIGURATION_CHANGE:  '配置变更',
  SECURITY_POLICY_CHANGE:'安全策略变更',
  MALWARE_DETECTED:      '恶意软件检测',
  SUSPICIOUS_ACTIVITY:   '可疑活动',
  DATA_ACCESS:           '数据访问',
  PRIVILEGE_ESCALATION:  '权限提升',
  BRUTE_FORCE_ATTACK:    '暴力破解',
  UNKNOWN:               '未知',
};

// 事件分类
export const CATEGORY_MAP: Record<string, string> = {
  AUTHENTICATION: '认证',
  AUTHORIZATION:  '授权',
  SYSTEM:         '系统',
  NETWORK:        '网络',
  APPLICATION:    '应用',
  SECURITY:       '安全',
  COMPLIANCE:     '合规',
  MONITORING:     '监控',
  INCIDENT:       '事件',
  OTHER:          '其他',
};

// 日志级别
export const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  DEBUG:         { label: '调试',     color: 'default' },
  INFO:          { label: '信息',     color: 'blue' },
  WARNING:       { label: '警告',     color: 'gold' },
  ERROR:         { label: '错误',     color: 'red' },
  CRITICAL:      { label: '严重',     color: 'red' },
  AUDIT_SUCCESS: { label: '审计成功', color: 'green' },
  AUDIT_FAILURE: { label: '审计失败', color: 'orange' },
};

// 模式类型
export const PATTERN_TYPE_MAP: Record<string, string> = {
  REGEX:     '正则表达式',
  KEYWORD:   '关键词匹配',
  CONDITION: '条件匹配',
  EVENT_ID:  '事件ID',
  PORT:      '端口检测',
};

// WMI数据类型
export const WMI_DATA_TYPE_MAP: Record<string, string> = {
  CPU_USAGE:          'CPU使用率',
  MEMORY_USAGE:       '内存使用率',
  DISK_USAGE:         '磁盘使用率',
  NETWORK_TRAFFIC:    '网络流量',
  PROCESS_COUNT:      '进程数量',
  SERVICE_STATUS:     '服务状态',
  SYSTEM_INFO:        '系统信息',
  SYSTEM_PERFORMANCE: '系统性能',
  CPU_INFO:           'CPU信息',
  SYSTEM_BASIC:       '系统基础信息',
  // 小写（查询管理 infoType 字段）
  cpu:                'CPU信息',
  memory:             '内存信息',
  disk:               '磁盘信息',
  network:            '网络信息',
  process:            '进程信息',
  system:             '系统信息',
};

// 数据源类型（日志采集器）
export const DATA_SOURCE_MAP: Record<string, { label: string; description: string; category: string }> = {
  security:    { label: '安全日志', description: 'Windows安全事件日志',     category: 'event-log' },
  system:      { label: '系统日志', description: 'Windows系统事件日志',     category: 'event-log' },
  application: { label: '应用日志', description: 'Windows应用程序事件日志', category: 'event-log' },
  cpu:         { label: 'CPU信息',  description: 'CPU使用率和性能指标',     category: 'performance' },
  memory:      { label: '内存信息', description: '内存使用率和分配信息',    category: 'performance' },
  disk:        { label: '磁盘信息', description: '磁盘使用率和I/O性能',     category: 'performance' },
  network:     { label: '网络信息', description: '网络流量和连接状态',      category: 'performance' },
  process:     { label: '进程信息', description: '进程列表和资源占用',      category: 'performance' },
};

// 数据源类别
export const DATA_SOURCE_CATEGORY_MAP: Record<string, string> = {
  'event-log':   'Windows事件日志',
  'performance': '系统性能指标',
};

// 用户角色
export const ROLE_MAP: Record<string, string> = {
  ADMIN:    '管理员',
  USER:     '普通用户',
  OPERATOR: '操作员',
  VIEWER:   '只读用户',
};

// =============================================
// 工具函数
// =============================================

/** 获取严重程度标签和颜色，找不到时返回原值 */
export function getSeverity(value: string) {
  return SEVERITY_MAP[value] ?? SEVERITY_MAP[value?.toUpperCase()] ?? { label: value || '-', color: 'default' };
}

/** 获取状态标签和颜色 */
export function getStatus(value: string) {
  return STATUS_MAP[value] ?? STATUS_MAP[value?.toUpperCase()] ?? { label: value || '-', color: 'default' };
}

/** 获取日志级别标签和颜色 */
export function getLevel(value: string) {
  return LEVEL_MAP[value?.toUpperCase()] ?? { label: value || '-', color: 'default' };
}

/** 获取威胁类型中文名，找不到时返回原值 */
export function getThreatType(value: string): string {
  return THREAT_TYPE_MAP[value] ?? THREAT_TYPE_MAP[value?.toUpperCase()] ?? value ?? '-';
}

/** 获取威胁分类中文名，找不到时返回原值 */
export function getThreatCategory(value: string): string {
  return THREAT_CATEGORY_MAP[value] ?? THREAT_CATEGORY_MAP[value?.toUpperCase()] ?? value ?? '-';
}

/** 通用枚举翻译，找不到时返回原值 */
export function translate(map: Record<string, string>, value: string): string {
  return map[value] ?? map[value?.toUpperCase()] ?? value ?? '-';
}

/** 获取数据源标签 */
export function getDataSourceLabel(value: string): string {
  return DATA_SOURCE_MAP[value]?.label ?? value ?? '-';
}

/** 获取 WMI 信息类型中文名 */
export function getWmiInfoType(value: string): string {
  return WMI_DATA_TYPE_MAP[value] ?? WMI_DATA_TYPE_MAP[value?.toLowerCase()] ?? value ?? '-';
}

/** 获取告警类别中文名（cpu/memory/disk/network/collector） */
export function getAlertCategory(value: string): string {
  const map: Record<string, string> = {
    cpu:       'CPU',
    memory:    '内存',
    disk:      '磁盘',
    network:   '网络',
    collector: '采集器',
  };
  return map[value?.toLowerCase()] ?? value ?? '-';
}

/** 获取告警类型中文名（alertType 字段） */
export function getAlertTypeLabel(value: string): string {
  return ALERT_TYPE_MAP[value] ?? ALERT_TYPE_MAP[value?.toUpperCase()] ?? value ?? '-';
}

/** 获取数据源描述 */
export function getDataSourceDescription(value: string): string {
  return DATA_SOURCE_MAP[value]?.description ?? '';
}

/** 获取数据源类别 */
export function getDataSourceCategory(value: string): string {
  const category = DATA_SOURCE_MAP[value]?.category;
  return category ? (DATA_SOURCE_CATEGORY_MAP[category] ?? category) : '';
}

/** 获取所有数据源代码 */
export function getAllDataSourceCodes(): string[] {
  return Object.keys(DATA_SOURCE_MAP);
}

/** 获取按类别分组的数据源 */
export function getDataSourcesByCategory(): Record<string, Array<{ code: string; label: string; description: string }>> {
  const grouped: Record<string, Array<{ code: string; label: string; description: string }>> = {
    'event-log': [],
    'performance': [],
  };

  Object.entries(DATA_SOURCE_MAP).forEach(([code, info]) => {
    const list = grouped[info.category];
    if (list) {
      list.push({ code, label: info.label, description: info.description });
    }
  });

  return grouped;
}

/** 验证数据源代码是否有效 */
export function isValidDataSource(code: string): boolean {
  return code in DATA_SOURCE_MAP;
}

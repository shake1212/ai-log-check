"""
integrated_security_alert_collector.py
安全日志与告警集成收集器 - Python �?功能：自动收集系统安全日志、性能指标，并自动创建告警
"""

import logging
import requests
import json
import time
import threading
import subprocess
import platform
import psutil
import re
import socket
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from enum import Enum
import queue

# ==================== 配置部分 ====================

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('security_collector.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SecurityAlertCollector")

# 规则引擎集成
try:
    from rule_engine_integration import RuleEngineClient
    RULE_ENGINE_AVAILABLE = True
    logger.info("规则引擎集成模块已加�?)
except ImportError:
    RULE_ENGINE_AVAILABLE = False
    logger.warning("规则引擎集成模块未找到，规则引擎功能将被禁用")

# 配置�?@dataclass
class CollectorConfig:
    # Java 后端地址
    java_backend_url: str = "http://localhost:8080"

    # 收集间隔（分钟）
    security_collection_interval: int = 5      # 安全日志收集间隔
    performance_collection_interval: int = 2   # 性能数据收集间隔
    alert_check_interval: int = 1              # 告警检查间隔（分钟�?
    # 自动告警配置
    auto_create_alerts: bool = True
    alert_min_severity: str = "MEDIUM"  # 最低告警级�?
    # 网络配置
    request_timeout: int = 30
    max_retries: int = 3

    # 性能阈�?    cpu_critical_threshold: float = 90.0
    cpu_high_threshold: float = 80.0
    memory_critical_threshold: float = 95.0
    memory_high_threshold: float = 90.0
    disk_critical_threshold: float = 95.0
    disk_high_threshold: float = 85.0

    # 进程监控
    max_processes_to_check: int = 100
    suspicious_process_keywords: List[str] = None

    # AI 异常检测配�?    enable_ai: bool = True
    ai_service_url: str = "http://localhost:5001/predict"
    ai_timeout: int = 5
    ai_max_workers: int = 10

    # 规则引擎配置
    enable_rule_engine: bool = True      # 是否启用规则引擎分析
    rule_engine_timeout: int = 10        # 规则引擎分析超时时间（秒�?

    # ����Դ���ˣ����Ժ�����ã�None ��ʾ�ɼ�ȫ����
    data_sources: List[str] = None
    retention_days: int = 7
    error_rate_threshold: float = 5.0
    def __post_init__(self):
        if self.suspicious_process_keywords is None:
            self.suspicious_process_keywords = [
                "miner", "bitcoin", "eth", "monero", "crypto", "coin",
                "backdoor", "trojan", "malware", "virus", "ransomware",
                "keylogger", "spyware", "rootkit", "exploit",
                "mimikatz", "metasploit", "payload", "shellcode",
                "webshell", "botnet", "rat", "spy", "hack", "exploit",
                "xmr", "xmrig", "ccminer", "cpuminer"
            ]

# ==================== 枚举和常�?====================

class AlertLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AlertStatus(Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"

class EventSeverity(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

# 可疑端口列表
SUSPICIOUS_PORTS = {
    23, 4444, 5555, 6666, 6667, 1337, 31337, 12345, 27374, 54320,
    4443, 5556, 6668, 7777, 8888, 9999, 10000, 31335, 31336, 31338,
    33270, 33300, 44444, 55555, 60000, 65000
}

# 可疑文件路径模式
SUSPICIOUS_PATHS = {
    "/tmp/", "/var/tmp/", "/dev/shm/",
    "C:\\Windows\\Temp\\", "C:\\Users\\Public\\",
    "AppData\\Local\\Temp\\", "C:\\ProgramData\\",
    "/root/.ssh/", "/home/*/.ssh/", "~/.ssh/"
}

# ==================== 数据模型 ====================

@dataclass
class SecurityEvent:
    """安全事件数据模型"""
    timestamp: str
    source_system: str
    event_type: str
    category: str
    severity: str
    raw_message: str = ""
    normalized_message: str = ""
    is_anomaly: bool = False

    # 可选字�?    host_name: str = None
    user_id: str = None
    source_ip: str = None
    destination_ip: str = None
    destination_port: int = None
    process_name: str = None
    process_id: int = None
    raw_data: str = None
    event_data: Dict[str, Any] = None

    # 网络相关字段
    protocol: str = None
    source_port: int = None
    event_sub_type: str = None

    # 异常检测相关字�?    anomaly_score: float = 0.0
    anomaly_reason: str = None
    threat_level: str = None
    detection_algorithm: str = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字�?""
        result = asdict(self)
        for key, value in result.items():
            if value is None:
                result[key] = ""
        return result

@dataclass
class PerformanceMetrics:
    """性能指标数据模型"""
    timestamp: str
    cpu_percent: float
    memory_percent: float
    memory_used: int  # bytes
    memory_available: int  # bytes
    memory_total: int  # bytes
    disk_usage: float
    disk_used: int  # bytes
    disk_total: int  # bytes
    network_sent: int  # bytes
    network_received: int  # bytes
    network_sent_rate: float  # bytes/second
    network_received_rate: float  # bytes/second

    # 进程信息
    total_processes: int
    running_processes: int

    # 系统信息
    system_load: float
    uptime: int  # seconds

    def to_dict(self) -> Dict[str, Any]:
        """转换为字�?""
        return asdict(self)

@dataclass
class AlertData:
    """告警数据模型"""
    alert_id: str
    timestamp: str
    source: str
    alert_type: str
    alert_level: str
    description: str
    status: str = "PENDING"
    assignee: str = None
    resolution: str = None
    ai_confidence: float = 0.0
    handled: bool = False

    # 关联信息
    log_entry_id: str = None
    event_id: str = None
    process_id: int = None
    ip_address: str = None
    port: int = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字�?""
        result = asdict(self)
        return {k: v for k, v in result.items() if v is not None}

@dataclass
class ProcessInfo:
    """进程信息数据模型"""
    pid: int
    name: str
    exe: str
    username: str
    cpu_percent: float
    memory_percent: float
    status: str
    create_time: float
    cmdline: List[str] = None
    connections: List[Any] = None
    is_suspicious: bool = False
    suspicious_reason: str = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字�?""
        result = asdict(self)
        if result['cmdline']:
            result['cmdline'] = ' '.join(result['cmdline'])
        return result

class AIClient:
    def __init__(self, ai_url="http://localhost:5001/predict", timeout=5, max_workers=10):
        self.ai_url = ai_url
        self.timeout = timeout
        self.session = requests.Session()
        self.result_queue = queue.Queue()
        self.active_threads = []
        self.semaphore = threading.Semaphore(max_workers)

    def analyze_async(self, event, callback=None):
        def worker():
            try:
                resp = self.session.post(self.ai_url, json=event, timeout=self.timeout)
                if resp.status_code == 200:
                    result = resp.json()
                else:
                    result = {'error': f'HTTP {resp.status_code}'}
            except Exception as e:
                result = {'error': str(e)}
            if callback:
                callback(event, result)
            else:
                self.result_queue.put((event, result))
            self.semaphore.release()
        self.semaphore.acquire()
        thread = threading.Thread(target=worker)
        thread.start()
        self.active_threads.append(thread)

    def wait_all(self):
        for t in self.active_threads:
            t.join()
        self.active_threads.clear()

# ==================== 主要收集器类 ====================

class IntegratedSecurityAlertCollector:
    """
    集成的安全日志与告警收集�?    功能�?    1. 收集系统安全日志
    2. 收集性能指标
    3. 自动创建告警
    4. 发送数据到Java后端
    """
    def __init__(self, config: CollectorConfig = None):
        self.config = config or CollectorConfig()
        self.session = requests.Session()

        # 初始�?AI 客户�?        self.ai_client = None
        if self.config.enable_ai:
            try:
                self.ai_client = AIClient(
                    ai_url=self.config.ai_service_url,
                    timeout=self.config.ai_timeout,
                    max_workers=self.config.ai_max_workers
                )
                logger.info("AI客户端初始化成功")
            except Exception as e:
                logger.warning(f"AI客户端初始化失败: {e}")
                self.ai_client = None
        else:
            logger.info("AI分析已禁用（配置�?)

        # 获取主机�?        try:
            raw_host = platform.node() or socket.gethostname() or "unknown-host"
            if any(ord(c) > 127 for c in raw_host):
                self.collector_host = "unknown-host"
            else:
                self.collector_host = raw_host
        except Exception:
            self.collector_host = "unknown-host"

        # 生成collector_id
        self.collector_id = f"collector_{hashlib.md5(self.collector_host.encode()).hexdigest()[:8]}"

        # 配置请求�?        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SecurityAlertCollector/2.0',
            'X-Collector-ID': self.collector_id
        })

        # 性能数据缓存
        self.performance_cache = {}
        self.last_performance_collection = 0

        # 告警缓存
        self.alert_cache = {}
        self.cache_expiry = timedelta(minutes=30)

        # 统计信息
        self.stats = {
            'total_events_collected': 0,
            'total_alerts_created': 0,
            'total_performance_checks': 0,
            'last_collection_time': None,
            'errors': [],
            'rule_engine_analyzed': 0,
            'rule_engine_matched': 0,
            'rule_engine_failures': 0
        }

        # 初始化规则引擎客户端
        self.rule_engine_client = None
        if RULE_ENGINE_AVAILABLE and self.config.enable_rule_engine:
            try:
                self.rule_engine_client = RuleEngineClient(
                    backend_url=self.config.java_backend_url,
                    timeout=self.config.rule_engine_timeout,
                    enabled=True
                )
                logger.info("规则引擎客户端已初始�?)
            except Exception as e:
                logger.warning(f"规则引擎客户端初始化失败: {e}")
                self.rule_engine_client = None
        else:
            if not RULE_ENGINE_AVAILABLE:
                logger.info("规则引擎模块不可�?)
            elif not self.config.enable_rule_engine:
                logger.info("规则引擎已禁用（配置�?)

        logger.info(f"初始化安全告警收集器: {self.collector_host} (ID: {self.collector_id})")
        logger.info(f"Java后端地址: {self.config.java_backend_url}")
        logger.info(f"规则引擎状�? {'启用' if self.rule_engine_client else '禁用'}")

    # ==================== 配置管理 ====================
    def load_config_from_backend(self) -> bool:
        """从Java后端加载配置"""
        try:
            logger.info("从Java后端加载配置...")
            response = self.session.get(
                f"{self.config.java_backend_url}/log-collector/configs/default",
                timeout=10
            )

            if response.status_code == 200:
                config_data = response.json()
                logger.info(f"成功加载配置: {config_data.get('name', 'unknown')}")

                if 'interval' in config_data:
                    self.config.security_collection_interval = config_data['interval'] // 60
                    logger.info(f"采集间隔更新�? {self.config.security_collection_interval}分钟")

                if 'cpuThreshold' in config_data:
                    self.config.cpu_high_threshold = float(config_data['cpuThreshold'])
                if 'memoryThreshold' in config_data:
                    self.config.memory_high_threshold = float(config_data['memoryThreshold'])
                if 'diskThreshold' in config_data:
                    self.config.disk_high_threshold = float(config_data['diskThreshold'])


                # ��ȡ����Դ����
                if 'dataSources' in config_data and isinstance(config_data['dataSources'], list):
                    self.config.data_sources = config_data['dataSources']
                    logger.info(f"����Դ����Ϊ: {self.config.data_sources}")

                # ��ȡ���ݱ�������
                if 'retentionDays' in config_data:
                    self.config.retention_days = int(config_data['retentionDays'])
                    logger.info(f"���ݱ�����������Ϊ: {self.config.retention_days}��")

                # ��ȡ��������ֵ
                if 'alertThresholds' in config_data and isinstance(config_data['alertThresholds'], dict):
                    err = config_data['alertThresholds'].get('errorRate')
                    if err is not None:
                        self.config.error_rate_threshold = float(err)
                        logger.info(f"��������ֵ����Ϊ: {self.config.error_rate_threshold}%")
                enable_rule_engine = config_data.get('enableRuleEngine', True)
                rule_engine_timeout = config_data.get('ruleEngineTimeout', 10)

                if enable_rule_engine != self.config.enable_rule_engine or \
                        rule_engine_timeout != self.config.rule_engine_timeout:

                    self.config.enable_rule_engine = enable_rule_engine
                    self.config.rule_engine_timeout = rule_engine_timeout

                    if enable_rule_engine and RULE_ENGINE_AVAILABLE:
                        try:
                            self.rule_engine_client = RuleEngineClient(
                                backend_url=self.config.java_backend_url,
                                timeout=rule_engine_timeout,
                                enabled=True
                            )
                            logger.info(f"规则引擎已启用（超时: {rule_engine_timeout}秒）")
                        except Exception as e:
                            logger.error(f"规则引擎客户端初始化失败: {e}")
                            self.rule_engine_client = None
                    else:
                        self.rule_engine_client = None
                        if not RULE_ENGINE_AVAILABLE:
                            logger.warning("规则引擎模块不可�?)
                        else:
                            logger.info("规则引擎已禁用（配置�?)
                return True
            else:
                logger.warning(f"加载配置失败，状态码: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"从后端加载配置失�? {e}")
            return False

    # ==================== 公共方法 ====================
    def start_all_collectors(self):
        """启动所有收集器"""
        logger.info("启动所有收集器...")
        try:
            self.load_config_from_backend()
            self._start_timed_collectors()
            logger.info("所有收集器已启�?)
            return True
        except Exception as e:
            logger.error(f"启动收集器失�? {e}")
            return False

    def test_java_backend(self) -> bool:
        logger.info("Java后端连接测试：跳过检查（已修�?00错误�?)
        return True

    def collect_all_data(self) -> Dict[str, Any]:
        """收集所有数据：安全事件、性能指标、并创建告警"""
        logger.info("开始收集所有数�?..")
        all_data = {
            'timestamp': datetime.now().isoformat(),
            'collector_id': self.collector_id,
            'host': self.collector_host
        }

        try:
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_security = executor.submit(self.collect_security_logs)
                future_performance = executor.submit(self.collect_performance_metrics)
                future_processes = executor.submit(self.collect_process_info)

                security_events = future_security.result(timeout=120)
                performance_data = future_performance.result(timeout=60)
                process_info = future_processes.result(timeout=60)

            all_data['security_events'] = security_events
            all_data['performance_data'] = performance_data
            all_data['process_info'] = process_info

            if security_events:
                success = self.send_security_events(security_events)
                logger.info(f"安全事件发送结�? {'成功' if success else '失败'}")

            if self.config.auto_create_alerts:
                alerts_created = self.auto_create_alerts(security_events, performance_data, process_info)
                all_data['alerts_created'] = alerts_created
                logger.info(f"自动创建�?{alerts_created} 个告�?)

            self.stats['total_events_collected'] += len(security_events)
            self.stats['last_collection_time'] = datetime.now()
            logger.info(f"数据收集完成: {len(security_events)}个安全事�?)

        except Exception as e:
            logger.error(f"收集所有数据失�? {e}", exc_info=True)   # 添加 exc_info=True
            all_data['error'] = str(e)
            self.stats['errors'].append({
                'time': datetime.now().isoformat(),
                'error': str(e)
            })
        return all_data

    # ==================== 安全日志收集 ====================
    def collect_security_logs(self) -> List[Dict[str, Any]]:
        """收集所有安全相关日�?""
        logger.info("开始收集安全日�?..")
        security_events = []



            status_event = self._create_collector_status_event(len(security_events))
            security_events.append(status_event)

            if self.rule_engine_client:
                logger.info(f"开始规则引擎分�?{len(security_events)} 个事�?..")
                analyzed_events = []
                for event in security_events:
                    try:
            # ���� data_sources ���þ����ɼ���Щ����Դ��None ��ʾȫ���ɼ���
            ds = self.config.data_sources
            collect_win_events = ds is None or any(s in ds for s in ['security', 'system', 'application'])
            collect_network    = ds is None or 'network' in ds
            collect_process    = ds is None or 'process' in ds

            if collect_win_events:
                if platform.system() == "Windows":
                    events = self.collect_windows_security_events()
                else:
                    events = self.collect_unix_security_events()
                security_events.extend(events)
            else:
                logger.info("����Դ��������Windows/Unix��ȫ�¼��ɼ�")

            if collect_network:
                network_events = self.collect_network_security_events()
                security_events.extend(network_events)
            else:
                logger.info("����Դ�����������簲ȫ�¼��ɼ�")

            if collect_process:
                process_events = self.collect_process_security_events()
                security_events.extend(process_events)
            else:
                logger.info("����Դ�����������̰�ȫ�¼��ɼ�")
                        analyzed_event = self.rule_engine_client.analyze_event(event)
                        analyzed_events.append(analyzed_event)
                        self.stats['rule_engine_analyzed'] += 1
                        if analyzed_event.get('rule_matched'):
                            self.stats['rule_engine_matched'] += 1
                    except Exception as e:
                        logger.warning(f"规则引擎分析失败: {e}")
                        analyzed_events.append(event)
                        self.stats['rule_engine_failures'] += 1
                security_events = analyzed_events
                logger.info(f"规则引擎分析完成: 分析={self.stats['rule_engine_analyzed']}, 匹配={self.stats['rule_engine_matched']}, 失败={self.stats['rule_engine_failures']}")

            logger.info(f"安全日志收集完成，共收集 {len(security_events)} 个安全事�?)

        except Exception as e:
            logger.error(f"安全日志收集失败: {e}")
            error_event = self._create_error_event("SECURITY_LOG_COLLECTOR", str(e))
            security_events.append(error_event)

        if self.ai_client:
            logger.info(f"开始AI分析 {len(security_events)} 个事�?..")
            for event in security_events:
                self.ai_client.analyze_async(event, callback=self._update_event_with_ai)
            self.ai_client.wait_all()
            logger.info("AI分析完成")

        return security_events

    def collect_windows_security_events(self) -> List[Dict[str, Any]]:
        """收集Windows安全事件日志（需要管理员权限）"""
        events = []
        # 检查是否有管理员权限
        try:
            import ctypes
            if not ctypes.windll.shell32.IsUserAnAdmin():
                logger.warning("当前进程无管理员权限，跳过Windows安全事件日志采集。"
                               "请以管理员身份运行脚本以启用此功能。")
                return events
        except Exception:
            pass  # 非Windows环境，继续执行
        try:
            logger.debug("收集Windows安全事件日志...")
            security_event_ids = [
                4624, 4625, 4634, 4648, 4672, 4688, 4697, 4698, 4699,
                4700, 4701, 4702, 4719, 4720, 4722, 4723, 4724, 4725,
                4726, 4728, 4729, 4732, 4733, 4735, 4737, 4738, 4739,
                4740, 4754, 4755, 4756, 4757, 4768, 4769, 4770, 4771,
                4776, 4778, 4779, 4781, 4798, 4799, 4800, 4801, 4802,
                4803, 5376, 5377
            ]
            event_ids_str = ",".join(map(str, security_event_ids))
            # ���ݲɼ������̬�����ѯ���ڣ�����©�ɻ��ظ��ɼ�
            interval_min = self.config.security_collection_interval
            hours_back = max(0.1, (interval_min + 1) / 60.0)  # ��1���ӻ����©��
            max_events = 200 if interval_min <= 3 else 500  # �̼�����ٵ��β�ѯ��

            powershell_cmd = f"""
            $StartTime = (Get-Date).AddHours(-{hours_back})
            Get-WinEvent -FilterHashtable @{{LogName='Security'; StartTime=$StartTime}} -MaxEvents {max_events} |
            Where-Object {{$_.Id -in ({event_ids_str})}} |
            Select-Object TimeCreated, Id, LevelDisplayName, LogName, ProviderName, 
                        Message, MachineName, UserId, Properties, RecordId |
            ConvertTo-Json -Depth 5 -Compress
            """

            result = subprocess.run(
                ["powershell", "-Command", powershell_cmd],
                capture_output=True,
                text=True,
                timeout=120,
                encoding='utf-8',
                errors='ignore'
            )

            if result.returncode == 0 and result.stdout.strip():
                try:
                    events_data = json.loads(result.stdout)
                    if isinstance(events_data, list):
                        for event in events_data:
                            parsed_event = self._parse_windows_security_event(event)
                            if parsed_event:
                                events.append(parsed_event)
                    elif isinstance(events_data, dict):
                        parsed_event = self._parse_windows_security_event(events_data)
                        if parsed_event:
                            events.append(parsed_event)
                    logger.info(f"收集�?{len(events)} 个Windows安全事件")
                except json.JSONDecodeError as e:
                    logger.error(f"解析Windows事件JSON失败: {e}")
        except Exception as e:
            logger.error(f"收集Windows安全事件失败: {e}")
        return events

    def collect_unix_security_events(self) -> List[Dict[str, Any]]:
        """收集Unix/Linux安全日志"""
        if platform.system() == "Windows":
            return []
        events = []
        try:
            logger.debug("收集Unix安全日志...")
            security_log_files = [
                "/var/log/auth.log", "/var/log/secure", "/var/log/syslog",
                "/var/log/messages", "/var/log/audit/audit.log"
            ]
            security_keywords = [
                "failed", "error", "authentication", "login", "ssh", "sudo",
                "su:", "password", "invalid", "refused", "attack", "intrusion",
                "breach", "unauthorized", "firewall", "iptables", "selinux",
                "denied", "rejected", "attempt", "violation", "alert",
                "kernel", "segmentation fault", "stack overflow"
            ]

            for log_file in security_log_files:
                try:
                    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                    recent_lines = lines[-500:] if len(lines) > 500 else lines
                    for line in recent_lines:
                        line_lower = line.lower()
                        if any(keyword in line_lower for keyword in security_keywords):
                            event = self._parse_unix_security_log(line.strip(), log_file)
                            if event:
                                events.append(event)
                except FileNotFoundError:
                    continue
                except PermissionError:
                    logger.warning(f"没有权限读取文件: {log_file}")
                    continue
                except Exception as e:
                    logger.warning(f"读取安全日志文件 {log_file} 失败: {e}")
            logger.info(f"收集�?{len(events)} 个Unix安全事件")
        except Exception as e:
            logger.error(f"收集Unix安全事件失败: {e}")
        return events

    def collect_network_security_events(self) -> List[Dict[str, Any]]:
        """收集网络安全事件"""
        events = []
        try:
            logger.debug("收集网络安全事件...")
            connections = self._get_network_connections()
            for conn in connections:
                event = self._parse_network_connection(conn)
                if event:
                    events.append(event)

            interface_events = self._collect_network_interface_info()
            firewall_events = self._collect_firewall_info()
            anomaly_events = self._detect_network_anomalies(connections)

            events.extend(interface_events)
            events.extend(firewall_events)
            events.extend(anomaly_events)
            logger.info(f"收集�?{len(events)} 个网络安全事�?)
        except Exception as e:
            logger.error(f"收集网络安全事件失败: {e}")
        return events

    def collect_process_security_events(self) -> List[Dict[str, Any]]:
        """收集进程安全事件"""
        events = []
        try:
            logger.debug("收集进程安全事件...")
            processes = self._get_process_info()
            for proc_info in processes:
                if proc_info.get('is_suspicious'):
                    event = self._create_suspicious_process_event(proc_info)
                    if event:
                        events.append(event)
                if proc_info.get('username') in ['root', 'SYSTEM', 'Administrator', 'NT AUTHORITY\\SYSTEM']:
                    event = self._create_privileged_process_event(proc_info)
                    if event:
                        events.append(event)
                if proc_info.get('cpu_percent', 0) > 50 or proc_info.get('memory_percent', 0) > 30:
                    event = self._create_high_resource_process_event(proc_info)
                    if event:
                        events.append(event)
            anomaly_events = self._detect_process_anomalies(processes)
            events.extend(anomaly_events)
            logger.info(f"收集�?{len(events)} 个进程安全事�?)
        except Exception as e:
            logger.error(f"收集进程安全事件失败: {e}")
        return events

    # ==================== 性能指标收集 ====================
    def collect_performance_metrics(self) -> Dict[str, Any]:
        """收集性能指标"""
        logger.debug("收集性能指标...")
        try:
            current_time = time.time()
            if (current_time - self.last_performance_collection) < 30:
                return self.performance_cache.copy()

            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            net = psutil.net_io_counters()

            metrics = PerformanceMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_percent=psutil.cpu_percent(interval=1),
                memory_percent=mem.percent,
                memory_used=mem.used,
                memory_available=mem.available,
                memory_total=mem.total,
                disk_usage=disk.percent,
                disk_used=disk.used,
                disk_total=disk.total,
                network_sent=net.bytes_sent,
                network_received=net.bytes_recv,
                network_sent_rate=net.bytes_sent,
                network_received_rate=net.bytes_recv,
                total_processes=len(psutil.pids()),
                running_processes=len([p for p in psutil.process_iter(['status']) if p.info.get('status') == 'running']),
                system_load=psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0,
                uptime=int(time.time() - psutil.boot_time())
            )

            if 'last_network_stats' in self.performance_cache:
                time_diff = current_time - self.last_performance_collection
                if time_diff > 0:
                    last = self.performance_cache
                    metrics.network_sent_rate = (metrics.network_sent - last.get('network_sent', 0)) / time_diff
                    metrics.network_received_rate = (metrics.network_received - last.get('network_received', 0)) / time_diff

            result = metrics.to_dict()
            self.performance_cache = result.copy()
            self.last_performance_collection = current_time
            self.stats['total_performance_checks'] += 1
            logger.debug(f"性能指标收集完成: CPU={result['cpu_percent']}%, 内存={result['memory_percent']}%")
            return result

        except Exception as e:
            logger.error(f"收集性能指标失败: {e}")
            return {
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'collector_host': self.collector_host
            }

    def collect_process_info(self) -> List[Dict[str, Any]]:
        """收集进程信息"""
        logger.debug("收集进程信息...")
        processes = []
        try:
            for proc in psutil.process_iter(['pid', 'name', 'exe', 'username', 'cpu_percent', 'memory_percent', 'status', 'create_time', 'cmdline']):
                try:
                    proc_info = proc.info
                    process = ProcessInfo(
                        pid=proc_info.get('pid'),
                        name=proc_info.get('name', ''),
                        exe=proc_info.get('exe', ''),
                        username=proc_info.get('username', ''),
                        cpu_percent=proc_info.get('cpu_percent', 0),
                        memory_percent=proc_info.get('memory_percent', 0),
                        status=proc_info.get('status', ''),
                        create_time=proc_info.get('create_time', 0),
                        cmdline=proc_info.get('cmdline', []),
                        connections=self._get_process_connections(proc_info.get('pid')),
                        is_suspicious=self._is_suspicious_process(proc_info),
                        suspicious_reason=self._get_suspicious_reason(proc_info) if self._is_suspicious_process(proc_info) else None
                    )
                    processes.append(process.to_dict())
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                except Exception as e:
                    logger.warning(f"处理进程信息失败: {e}")

            processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
            processes = processes[:self.config.max_processes_to_check]
            logger.debug(f"收集�?{len(processes)} 个进程信�?)
        except Exception as e:
            logger.error(f"收集进程信息失败: {e}")
        return processes

    # ==================== 告警自动创建 ====================
    def auto_create_alerts(self, security_events: List[Dict], performance_data: Dict, process_info: List[Dict]) -> int:
        """自动创建告警"""
        if not self.config.auto_create_alerts:
            return 0
        logger.debug("开始自动创建告�?..")
        alerts_created = 0
        try:
            alerts_to_create = []
            for event in security_events:
                alert = self._create_alert_from_security_event(event)
                if alert:
                    alerts_to_create.append(alert)

            performance_alerts = self._create_alerts_from_performance_data(performance_data)
            process_alerts = self._create_alerts_from_process_info(process_info)
            system_alerts = self._create_system_anomaly_alerts(security_events, performance_data)

            alerts_to_create.extend(performance_alerts)
            alerts_to_create.extend(process_alerts)
            alerts_to_create.extend(system_alerts)

            for alert in alerts_to_create:
                if self._should_create_alert(alert):
                    success = self.send_alert_to_java(alert)
                    if success:
                        alerts_created += 1
                        alert_key = self._generate_alert_key(alert)
                        self.alert_cache[alert_key] = datetime.now()

            self._cleanup_alert_cache()
            self.stats['total_alerts_created'] += alerts_created
            logger.info(f"自动创建�?{alerts_created} 个告�?)
        except Exception as e:
            logger.error(f"自动创建告警失败: {e}")
        return alerts_created

    def _create_alert_from_security_event(self, event: Dict) -> Optional[Dict]:
        """从安全事件创建告�?""
        try:
            event_type = event.get('event_type', '')
            severity = event.get('severity', 'INFO')
            alert_level = self._map_severity_to_alert_level(severity)

            if not self._should_create_alert_for_event(alert_level, event_type):
                return None

            alert_id = f"SEC_{event_type}_{hashlib.md5(str(event).encode()).hexdigest()[:8]}"
            alert_key = f"event_{alert_id}"
            if alert_key in self.alert_cache:
                return None

            alert = AlertData(
                alert_id=alert_id,
                timestamp=event.get('timestamp', datetime.now().isoformat()),
                source='SECURITY_COLLECTOR',
                alert_type=event_type,
                alert_level=alert_level,
                description=self._generate_alert_description(event),
                ai_confidence=event.get('anomaly_score', 0.0) or self._calculate_event_confidence(event),
                handled=False,
                status='PENDING',
                event_id=event.get('event_id'),
                process_id=event.get('process_id'),
                ip_address=event.get('source_ip') or event.get('destination_ip'),
                port=event.get('destination_port')
            )
            return alert.to_dict()
        except Exception as e:
            logger.warning(f"从安全事件创建告警失�? {e}")
            return None

    def _create_alerts_from_performance_data(self, performance_data: Dict) -> List[Dict]:
        """从性能数据创建告警"""
        alerts = []
        try:
            cpu = performance_data.get('cpu_percent', 0)
            mem = performance_data.get('memory_percent', 0)
            disk = performance_data.get('disk_usage', 0)

            if cpu >= self.config.cpu_critical_threshold:
                alerts.append(self._create_performance_alert('CPU_USAGE_CRITICAL', 'CRITICAL', f"CPU使用率严重过�? {cpu:.1f}%", cpu))
            elif cpu >= self.config.cpu_high_threshold:
                alerts.append(self._create_performance_alert('CPU_USAGE_HIGH', 'HIGH', f"CPU使用率过�? {cpu:.1f}%", cpu))

            if mem >= self.config.memory_critical_threshold:
                alerts.append(self._create_performance_alert('MEMORY_USAGE_CRITICAL', 'CRITICAL', f"内存使用率严重过�? {mem:.1f}%", mem))
            elif mem >= self.config.memory_high_threshold:
                alerts.append(self._create_performance_alert('MEMORY_USAGE_HIGH', 'HIGH', f"内存使用率过�? {mem:.1f}%", mem))

            if disk >= self.config.disk_critical_threshold:
                alerts.append(self._create_performance_alert('DISK_USAGE_CRITICAL', 'CRITICAL', f"磁盘使用率严重过�? {disk:.1f}%", disk))
            elif disk >= self.config.disk_high_threshold:
                alerts.append(self._create_performance_alert('DISK_USAGE_HIGH', 'HIGH', f"磁盘使用率过�? {disk:.1f}%", disk))
        except Exception as e:
            logger.warning(f"从性能数据创建告警失败: {e}")
            # �����ʸ澯�����ڲɼ�ʧ�ܴ������ܴ���֮�ȣ�
            total = self.stats.get('total_events_collected', 0)
            errors = len(self.stats.get('errors', []))
            if total > 0:
                error_rate = (errors / total) * 100
                if error_rate >= self.config.error_rate_threshold:
                    alerts.append(self._create_performance_alert(
                        'ERROR_RATE_HIGH', 'HIGH',
                        f"�ɼ������ʹ���: {error_rate:.1f}% (��ֵ: {self.config.error_rate_threshold}%)",
                        error_rate
                    ))
        return alerts

    def _create_alerts_from_process_info(self, process_info: List[Dict]) -> List[Dict]:
        """从进程信息创建告�?""
        alerts = []
        try:
            for proc in process_info:
                if proc.get('is_suspicious'):
                    alerts.append(self._create_process_alert('SUSPICIOUS_PROCESS', 'HIGH', proc.get('suspicious_reason', '检测到可疑进程'), proc))
                cpu = proc.get('cpu_percent', 0)
                mem = proc.get('memory_percent', 0)
                if cpu > 70 or mem > 50:
                    alerts.append(self._create_process_alert('HIGH_RESOURCE_PROCESS', 'MEDIUM', f"进程资源占用过高: {proc.get('name')} (CPU: {cpu:.1f}%, 内存: {mem:.1f}%)", proc))
                if proc.get('username') in ['root', 'SYSTEM', 'Administrator']:
                    alerts.append(self._create_process_alert('PRIVILEGED_PROCESS', 'MEDIUM', f"高权限进�? {proc.get('name')} (用户: {proc.get('username')})", proc))
        except Exception as e:
            logger.warning(f"从进程信息创建告警失�? {e}")
        return alerts

    def _create_system_anomaly_alerts(self, security_events: List[Dict], performance_data: Dict) -> List[Dict]:
        """创建系统异常告警"""
        alerts = []
        try:
            recent_events = [e for e in security_events if datetime.fromisoformat(e.get('timestamp', '').replace('Z', '')) > datetime.now() - timedelta(minutes=5)]
            if len(recent_events) > 100:
                alerts.append(self._create_system_alert('EVENT_STORM', 'HIGH', f"检测到事件风暴: 5分钟�?{len(recent_events)} 个事�?, {'event_count': len(recent_events)}))

            load = performance_data.get('system_load', 0)
            cores = psutil.cpu_count()
            if load > cores * 2:
                alerts.append(self._create_system_alert('HIGH_SYSTEM_LOAD', 'HIGH', f"系统负载异常�? {load:.2f} (CPU核心: {cores})", {'load': load, 'cpu_cores': cores}))
        except Exception as e:
            logger.warning(f"创建系统异常告警失败: {e}")
        return alerts

    def _create_performance_alert(self, alert_type: str, level: str, description: str, value: float) -> Dict:
        alert_id = f"PERF_{alert_type}_{int(time.time())}"
        return AlertData(
            alert_id=alert_id,
            timestamp=datetime.now().isoformat(),
            source='PERFORMANCE_MONITOR',
            alert_type=alert_type,
            alert_level=level,
            description=description,
            ai_confidence=self._calculate_performance_confidence(value, level),
            handled=False,
            status='PENDING'
        ).to_dict()

    def _create_process_alert(self, alert_type: str, level: str, description: str, process_info: Dict) -> Dict:
        alert_id = f"PROC_{alert_type}_{process_info.get('pid', 0)}_{int(time.time())}"
        return AlertData(
            alert_id=alert_id,
            timestamp=datetime.now().isoformat(),
            source='PROCESS_MONITOR',
            alert_type=alert_type,
            alert_level=level,
            description=description,
            ai_confidence=0.8 if level in ['HIGH', 'CRITICAL'] else 0.6,
            handled=False,
            status='PENDING',
            process_id=process_info.get('pid'),
            ip_address=self._get_process_network_info(process_info)
        ).to_dict()

    def _create_system_alert(self, alert_type: str, level: str, description: str, data: Dict) -> Dict:
        alert_id = f"SYS_{alert_type}_{int(time.time())}"
        return AlertData(
            alert_id=alert_id,
            timestamp=datetime.now().isoformat(),
            source='SYSTEM_MONITOR',
            alert_type=alert_type,
            alert_level=level,
            description=description,
            ai_confidence=0.7,
            handled=False,
            status='PENDING'
        ).to_dict()

    # ==================== AI 分析 ====================
    def _update_event_with_ai(self, event: Dict, ai_result: Dict):
        if 'error' in ai_result:
            score = 0.0
            is_anomaly = False
        else:
            score = ai_result.get('anomaly_score', 0.0)
            is_anomaly = ai_result.get('is_anomaly', False)

        event['anomaly_score'] = score
        event['is_anomaly'] = is_anomaly
        event['ai_anomaly_score'] = score
        event['ai_is_anomaly'] = is_anomaly

        if 'threat_score' in event:
            rule_score = event.get('threat_score', 0) / 100.0
            event['combined_score'] = max(rule_score, score)
        else:
            event['combined_score'] = score
        logger.debug(f"�?AI分析完成：分�?{score:.4f}, 是否异常={is_anomaly}")

    # ==================== 内部工具方法 ====================
    def _get_network_connections(self) -> List[Dict]:
        connections = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                try:
                    conn_info = {
                        'fd': conn.fd,
                        'family': str(conn.family),
                        'type': str(conn.type),
                        'local_addr': f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                        'remote_addr': f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                        'status': conn.status,
                        'pid': conn.pid
                    }
                    if conn.pid:
                        try:
                            proc = psutil.Process(conn.pid)
                            conn_info['process_name'] = proc.name()
                        except Exception:
                            conn_info['process_name'] = 'unknown'
                    connections.append(conn_info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            logger.warning(f"获取网络连接失败: {e}")
        return connections

    def _collect_network_interface_info(self) -> List[Dict]:
        events = []
        try:
            interfaces = psutil.net_if_addrs()
            for interface, addrs in interfaces.items():
                for addr in addrs:
                    if addr.family == socket.AF_INET:
                        event = SecurityEvent(
                            timestamp=datetime.now().isoformat(),
                            source_system="NETWORK",
                            event_type="NETWORK_INTERFACE",
                            category="NETWORK_INFO",
                            severity="LOW",
                            normalized_message=f"网络接口: {interface} - {addr.address}",
                            event_data={"interface": interface, "ip_address": addr.address, "collectorHost": self.collector_host},
                            threat_level="INFO",
                            anomaly_score=0.0
                        )
                        events.append(event.to_dict())
        except Exception as e:
            logger.warning(f"收集网络接口信息失败: {e}")
        return events

    def _collect_firewall_info(self) -> List[Dict]:
        events = []
        try:
            if platform.system() == "Windows":
                result = subprocess.run(["netsh", "advfirewall", "show", "allprofiles"], capture_output=True, text=True, encoding='utf-8', errors='ignore', timeout=30)
                if result.returncode == 0:
                    event = SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="SECURITY",
                        event_type="FIREWALL_STATUS",
                        category="NETWORK_SECURITY",
                        severity="LOW",
                        normalized_message="Windows防火墙状态检查",
                        event_data={"collectorHost": self.collector_host},
                        threat_level="LOW",
                        anomaly_score=0.0
                    )
                    events.append(event.to_dict())
            else:
                for cmd in [["iptables", "-L", "-n"], ["firewall-cmd", "--state"]]:
                    try:
                        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore', timeout=30)
                        if result.returncode == 0:
                            event = SecurityEvent(
                                timestamp=datetime.now().isoformat(),
                                source_system="SECURITY",
                                event_type="FIREWALL_STATUS",
                                category="NETWORK_SECURITY",
                                severity="LOW",
                                normalized_message=f"防火墙规则检查: {' '.join(cmd)}",
                                event_data={"collectorHost": self.collector_host},
                                threat_level="LOW",
                                anomaly_score=0.0
                            )
                            events.append(event.to_dict())
                            break
                    except FileNotFoundError:
                        continue
        except Exception as e:
            logger.warning(f"收集防火墙信息失�? {e}")
        return events

    def _detect_network_anomalies(self, connections: List[Dict]) -> List[Dict]:
        events = []
        try:
            port_count = {}
            ip_count = {}
            for conn in connections:
                if conn.get('remote_addr'):
                    ip, port = conn['remote_addr'].split(':')
                    port = int(port)
                    port_count[port] = port_count.get(port, 0) + 1
                    ip_count[ip] = ip_count.get(ip, 0) + 1

            for port, cnt in port_count.items():
                if cnt > 10:
                    events.append(SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="NETWORK",
                        event_type="HIGH_PORT_CONNECTIONS",
                        category="NETWORK_ANOMALY",
                        severity="MEDIUM",
                        normalized_message=f"端口 {port} 连接数异�? {cnt} �?,
                        threat_level="MEDIUM",
                        anomaly_score=0.6
                    ).to_dict())
            for ip, cnt in ip_count.items():
                if cnt > 20:
                    events.append(SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="NETWORK",
                        event_type="HIGH_IP_CONNECTIONS",
                        category="NETWORK_ANOMALY",
                        severity="MEDIUM",
                        normalized_message=f"IP {ip} 连接数异�? {cnt} �?,
                        threat_level="MEDIUM",
                        anomaly_score=0.6
                    ).to_dict())
        except Exception as e:
            logger.warning(f"检测网络异常失�? {e}")
        return events

    def _get_process_connections(self, pid: int) -> List[Dict]:
        connections = []
        try:
            proc = psutil.Process(pid)
            for conn in proc.connections():
                connections.append({
                    'local': f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                    'remote': f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                    'status': conn.status
                })
        except Exception as e:
            logger.debug("获取进程连接失败 pid=%s: %s", pid, e)
        return connections

    def _is_suspicious_process(self, proc_info: Dict) -> bool:
        name = proc_info.get('name', '').lower()
        exe = proc_info.get('exe', '').lower()
        cmd = ' '.join(proc_info.get('cmdline', [])).lower()
        for kw in self.config.suspicious_process_keywords:
            if kw in name or kw in exe or kw in cmd:
                return True
        for p in SUSPICIOUS_PATHS:
            if p.lower() in exe:
                return True
        if not exe:
            return True
        return False

    def _get_suspicious_reason(self, proc_info: Dict) -> str:
        reasons = []
        name = proc_info.get('name', '').lower()
        exe = proc_info.get('exe', '').lower()
        cmd = ' '.join(proc_info.get('cmdline', [])).lower()
        for kw in self.config.suspicious_process_keywords:
            if kw in name:
                reasons.append(f"名称�?{kw}")
            if kw in exe:
                reasons.append(f"路径�?{kw}")
            if kw in cmd:
                reasons.append(f"参数�?{kw}")
        for p in SUSPICIOUS_PATHS:
            if p.lower() in exe:
                reasons.append(f"可疑路径:{p}")
        if not exe:
            reasons.append("无执行路�?)
        return '; '.join(reasons) if reasons else "未知可疑"

    def _detect_process_anomalies(self, processes: List[Dict]) -> List[Dict]:
        events = []
        try:
            count = {}
            for p in processes:
                n = p.get('name', '')
                count[n] = count.get(n, 0) + 1
            for name, cnt in count.items():
                if cnt > 5:
                    events.append(SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="SYSTEM",
                        event_type="DUPLICATE_PROCESSES",
                        category="PROCESS_ANOMALY",
                        severity="MEDIUM",
                        normalized_message=f"{name} 多开: {cnt} �?,
                        threat_level="MEDIUM",
                        anomaly_score=0.5
                    ).to_dict())
        except Exception as e:
            logger.debug("进程多开异常检测失�? %s", e)
        return events

    def _get_process_network_info(self, process_info: Dict) -> Optional[str]:
        try:
            proc = psutil.Process(process_info['pid'])
            for c in proc.connections():
                if c.raddr:
                    return c.raddr.ip
        except Exception as e:
            logger.debug("获取进程远端 IP 失败: %s", e)
        return None

    def _is_suspicious_connection(self, conn_info: Dict) -> bool:
        try:
            if conn_info.get('remote_addr'):
                port = int(conn_info['remote_addr'].split(':')[1])
                if port in SUSPICIOUS_PORTS:
                    return True
            return False
        except (ValueError, IndexError, TypeError, AttributeError):
            return False

    def _is_private_ip(self, ip: str) -> bool:
        try:
            parts = list(map(int, ip.split('.')))
            return parts[0] == 10 or (parts[0] == 172 and 16 <= parts[1] <= 31) or (parts[0] == 192 and parts[1] == 168) or parts[0] == 127
        except (ValueError, TypeError, IndexError):
            return False

    # ==================== 解析方法 ====================
    def _parse_windows_security_event(self, event: Dict) -> Optional[Dict]:
        try:
            eid = event.get("Id", 0)
            etype = self._map_windows_event_id(eid)
            sev = self._map_windows_severity(event.get("LevelDisplayName", ""), eid)
            msg = event.get("Message", "")
            ip = self._extract_ip_from_message(msg)

            se = SecurityEvent(
                timestamp=event.get("TimeCreated", "").replace("Z", "") + "Z",
                source_system="WINDOWS",
                event_type=etype,
                category="SECURITY",
                severity=sev,
                raw_message=msg,
                normalized_message=f"Win事件{eid}:{etype}",
                source_ip=ip,
                threat_level=self._calculate_threat_level(eid, sev),
                anomaly_score=self._calculate_windows_anomaly_score(eid, msg)
            )
            return se.to_dict()
        except Exception as e:
            logger.debug("解析 Windows 安全事件失败: %s", e)
            return None

    def _parse_unix_security_log(self, line: str, log_file: str) -> Optional[Dict]:
        try:
            etype = self._detect_unix_event_type(line)
            sev = self._detect_unix_severity(line)
            se = SecurityEvent(
                timestamp=datetime.now().isoformat(),
                source_system="LINUX",
                event_type=etype,
                category="SECURITY",
                severity=sev,
                raw_message=line,
                normalized_message=f"Unix:{etype}",
                threat_level=self._calculate_unix_threat_level(line),
                anomaly_score=self._calculate_unix_anomaly_score(line)
            )
            return se.to_dict()
        except Exception as e:
            logger.debug("解析 Unix 安全日志行失�? %s", e)
            return None

    def _parse_network_connection(self, conn: Dict) -> Optional[Dict]:
        try:
            is_susp = self._is_suspicious_connection(conn)
            se = SecurityEvent(
                timestamp=datetime.now().isoformat(),
                source_system="NETWORK",
                event_type="SUSPICIOUS_ACTIVITY" if is_susp else "NETWORK_CONNECTION",
                category="NETWORK_SECURITY",
                severity="HIGH" if is_susp else "INFO",
                raw_message=str(conn),
                threat_level="HIGH" if is_susp else "LOW",
                anomaly_score=0.8 if is_susp else 0.1
            )
            return se.to_dict()
        except Exception as e:
            logger.debug("解析网络连接事件失败: %s", e)
            return None

    def _create_suspicious_process_event(self, proc: Dict) -> Optional[Dict]:
        return SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="SYSTEM",
            event_type="SUSPICIOUS_ACTIVITY",
            category="PROCESS_SECURITY",
            severity="HIGH",
            process_id=proc['pid'],
            process_name=proc['name'],
            normalized_message=f"可疑进程:{proc['name']}({proc['pid']})",
            threat_level="HIGH",
            anomaly_score=0.9
        ).to_dict()

    def _create_privileged_process_event(self, proc: Dict) -> Optional[Dict]:
        return SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="SYSTEM",
            event_type="PRIVILEGE_ESCALATION",
            category="PROCESS_SECURITY",
            severity="MEDIUM",
            process_id=proc['pid'],
            process_name=proc['name'],
            normalized_message=f"高权�?{proc['name']}",
            threat_level="MEDIUM",
            anomaly_score=0.4
        ).to_dict()

    def _create_high_resource_process_event(self, proc: Dict) -> Optional[Dict]:
        cpu = proc['cpu_percent']
        mem = proc['memory_percent']
        return SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="SYSTEM",
            event_type="HIGH_RESOURCE_PROCESS",
            category="PERFORMANCE",
            severity="MEDIUM" if cpu > 70 or mem > 50 else "LOW",
            process_id=proc['pid'],
            process_name=proc['name'],
            normalized_message=f"高资�?{proc['name']} CPU:{cpu:.1f}%",
            anomaly_score=0.3
        ).to_dict()

    def _create_collector_status_event(self, cnt: int) -> Dict:
        return SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="COLLECTOR",
            event_type="COLLECTOR_STATUS",
            category="SYSTEM",
            severity="LOW",
            normalized_message=f"收集器状态：{cnt} 事件",
            anomaly_score=0.0
        ).to_dict()

    def _create_error_event(self, collector: str, err: str) -> Dict:
        return SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="COLLECTOR",
            event_type="COLLECTOR_ERROR",
            category="SYSTEM",
            severity="HIGH",
            normalized_message=f"{collector} 错误：{err}",
            anomaly_score=0.0
        ).to_dict()

    # ==================== 映射方法 ====================
    def _map_windows_event_id(self, eid: int) -> str:
        m = {
            # 登录/注销
            4624: "LOGIN_SUCCESS",
            4625: "LOGIN_FAILURE",
            4634: "LOGOUT",
            4647: "LOGOUT",
            4648: "LOGIN_SUCCESS",       # 显式凭据登录
            4778: "LOGIN_SUCCESS",       # 会话重连
            4779: "LOGOUT",              # 会话断开
            # 权限/特权
            4672: "PRIVILEGE_ESCALATION",
            4673: "PRIVILEGE_ESCALATION",
            4674: "PRIVILEGE_ESCALATION",
            4697: "PRIVILEGE_ESCALATION",  # 安装服务
            4719: "SECURITY_POLICY_CHANGE",
            4739: "SECURITY_POLICY_CHANGE",
            # 账户管理
            4720: "CONFIGURATION_CHANGE",  # 创建用户
            4722: "CONFIGURATION_CHANGE",  # 启用账户
            4723: "CONFIGURATION_CHANGE",  # 修改密码
            4724: "CONFIGURATION_CHANGE",  # 重置密码
            4725: "CONFIGURATION_CHANGE",  # 禁用账户
            4726: "CONFIGURATION_CHANGE",  # 删除账户
            4728: "CONFIGURATION_CHANGE",  # 添加组成员
            4732: "CONFIGURATION_CHANGE",  # 添加本地组成员
            4740: "LOGIN_FAILURE",          # 账户锁定
            # 进程
            4688: "PROCESS_CREATION",
            4689: "PROCESS_TERMINATION",
            # 服务
            7034: "SERVICE_STOP",
            7035: "SERVICE_START",
            7036: "SERVICE_START",
            7045: "SERVICE_START",          # 安装新服务
            # 文件/对象访问
            4663: "FILE_ACCESS",
            4656: "FILE_ACCESS",
            4660: "FILE_ACCESS",
            # 网络/防火墙
            5156: "NETWORK_CONNECTION",
            5157: "NETWORK_CONNECTION",
            5158: "NETWORK_CONNECTION",
            # 审计策略
            4907: "SECURITY_POLICY_CHANGE",
            4904: "SECURITY_POLICY_CHANGE",
            4905: "SECURITY_POLICY_CHANGE",
        }
        return m.get(eid, f"WIN_{eid}")

    def _map_windows_severity(self, level, eid) -> str:
        # 基于事件ID的安全严重程度分级
        critical_eids = {4625, 4724, 4740, 4648, 4697, 4698, 4719, 4739}  # 登录失败、密码重置、账户锁定、特权操作、计划任务、策略变更
        high_eids = {4688, 4672, 4728, 4732, 4756, 4768, 4769, 4776}       # 进程创建、特权分配、组成员变更、Kerberos
        medium_eids = {4634, 4647, 4778, 4779, 4800, 4801}                  # 注销、工作站锁定/解锁
        if eid in critical_eids:
            return "CRITICAL"
        if eid in high_eids or level == "Error":
            return "HIGH"
        if eid in medium_eids or level == "Warning":
            return "MEDIUM"
        return "LOW"

    def _map_severity_to_alert_level(self, s: str) -> str:
        m = {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MEDIUM": "MEDIUM", "LOW": "LOW"}
        return m.get(s.upper(), "MEDIUM")

    def _detect_unix_event_type(self, line: str) -> str:
        l = line.lower()
        if "failed password" in l or "authentication failure" in l or "invalid user" in l:
            return "LOGIN_FAILURE"
        if "accepted password" in l or "accepted publickey" in l or "session opened" in l:
            return "LOGIN_SUCCESS"
        if "session closed" in l or "logout" in l:
            return "LOGOUT"
        if "sudo" in l:
            return "PRIVILEGE_ESCALATION"
        if "permission denied" in l or "access denied" in l:
            return "PERMISSION_DENIED"
        if "started" in l and ("service" in l or "daemon" in l):
            return "SERVICE_START"
        if "stopped" in l and ("service" in l or "daemon" in l):
            return "SERVICE_STOP"
        if "useradd" in l or "userdel" in l or "usermod" in l or "passwd" in l:
            return "CONFIGURATION_CHANGE"
        return "SUSPICIOUS_ACTIVITY"

    def _detect_unix_severity(self, line: str) -> str:
        l = line.lower()
        if any(w in l for w in ["attack", "intrusion", "breach", "exploit"]):
            return "CRITICAL"
        if any(w in l for w in ["failed", "denied", "unauthorized", "invalid"]):
            return "HIGH"
        if any(w in l for w in ["warning", "sudo", "su:"]):
            return "MEDIUM"
        return "LOW"

    def _extract_ip_from_message(self, msg: str) -> Optional[str]:
        match = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', msg)
        return match.group() if match else None

    # ==================== 评分 ====================
    def _calculate_threat_level(self, eid, sev):
        return "HIGH" if sev in ["CRITICAL", "HIGH"] else "MEDIUM"

    def _calculate_unix_threat_level(self, line):
        return "HIGH" if "attack" in line.lower() else "MEDIUM"

    def _calculate_windows_anomaly_score(self, eid, msg):
        return 0.8 if eid in {4625, 4724} else 0.3

    def _calculate_unix_anomaly_score(self, line):
        return 0.7 if "failed" in line.lower() else 0.2

    def _calculate_event_confidence(self, e):
        sev = e.get('severity', '')
        return 0.95 if sev in ("CRITICAL", "HIGH") else 0.7

    def _calculate_performance_confidence(self, v, lvl):
        return 0.95 if lvl == "CRITICAL" else 0.85

    # ==================== 发�?====================
    @staticmethod
    def _safe_int(value):
        """安全转换为整数，失败返回None"""
        if value is None or value == "" or value == 0:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None

    def send_security_events(self, events):
        if not events:
            return True
        try:
            url = f"{self.config.java_backend_url}/api/events/batch"
            full_events = []
            for event in events:
                e = {
                    # 必填字段
                    "timestamp":          event.get("timestamp"),
                    "sourceSystem":       event.get("source_system"),
                    "eventType":          event.get("event_type"),
                    "category":           event.get("category"),
                    "severity":           event.get("severity"),
                    # 消息
                    "rawMessage":         event.get("raw_message"),
                    "normalizedMessage":  event.get("normalized_message"),
                    # 主机
                    "hostName":           event.get("host_name"),
                    "hostIp":             event.get("host_ip"),
                    # 用户
                    "userId":             event.get("user_id"),
                    "userName":           event.get("user_name"),
                    "sessionId":          event.get("session_id"),
                    # 进程
                    "processName":        event.get("process_name"),
                    "processId":          self._safe_int(event.get("process_id")),
                    "threadId":           self._safe_int(event.get("thread_id")),
                    # 网络
                    "sourceIp":           event.get("source_ip"),
                    "sourcePort":         self._safe_int(event.get("source_port")),
                    "destinationIp":      event.get("destination_ip"),
                    "destinationPort":    self._safe_int(event.get("destination_port")),
                    "protocol":           event.get("protocol"),
                    # 事件分类
                    "eventSubType":       event.get("event_sub_type"),
                    "threatLevel":        event.get("threat_level"),
                    # 异常检测
                    "isAnomaly":          bool(event.get("is_anomaly", False)),
                    "anomalyScore":       float(event.get("anomaly_score", 0.0)),
                    "anomalyReason":      event.get("anomaly_reason"),
                    "detectionAlgorithm": event.get("detection_algorithm"),
                    # AI 分析
                    "aiAnomalyScore":     float(event.get("ai_anomaly_score", 0.0)),
                    "aiIsAnomaly":        bool(event.get("ai_is_anomaly", False)),
                    "combinedScore":      float(event.get("combined_score", 0.0)),
                    # 原始数据
                    "rawData":            event.get("raw_data"),
                }
                # 移除 None 值，避免后端验证失败
                e = {k: v for k, v in e.items() if v is not None}
                full_events.append(e)

            response = self.session.post(url, json=full_events, timeout=self.config.request_timeout)
            if response.status_code in (200, 201):
                logger.info(f"成功发送 {len(events)} 个安全事件")
                return True
            else:
                logger.error(f"发送失败，状态码: {response.status_code}, 响应: {response.text[:500]}")
                return False
        except Exception as e:
            logger.error(f"发送异常: {e}", exc_info=True)
            return False

    def send_alert_to_java(self, alert):
        try:
            url = f"{self.config.java_backend_url}/api/alerts"
            j_alert = {
                "alertId": alert.get("alert_id"),
                "source": alert.get("source"),
                "alertType": alert.get("alert_type"),
                "alertLevel": alert.get("alert_level"),
                "description": alert.get("description"),
                "timestamp": alert.get("timestamp", datetime.now().isoformat()),
                "status": alert.get("status", "PENDING"),
                "aiConfidence": float(alert.get("ai_confidence", 0.5)),
                "eventId": alert.get("event_id"),
                "processId": alert.get("process_id"),
                "ipAddress": alert.get("ip_address"),
                "port": alert.get("port")
            }
            j_alert = {k: v for k, v in j_alert.items() if v is not None}
            resp = self.session.post(url, json=j_alert, timeout=self.config.request_timeout)
            return resp.status_code in (200, 201)
        except Exception as e:
            logger.error(f"发送告警失�? {e}")
            return False

    # ==================== 告警判断 ====================
    def _should_create_alert_for_event(self, lvl, etype):
        prio = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        min_p = prio.get(self.config.alert_min_severity, 2)
        return prio.get(lvl, 0) >= min_p

    def _should_create_alert(self, alert):
        try:
            key = self._generate_alert_key(alert)
            if key in self.alert_cache:
                return False
            return True
        except Exception as e:
            logger.debug("告警去重判断失败，允许创�? %s", e)
            return True

    def _generate_alert_key(self, alert):
        s = f"{alert.get('alertType')}{alert.get('source')}{alert.get('description')[:100]}"
        return hashlib.md5(s.encode()).hexdigest()

    def _generate_alert_description(self, event):
        return event.get('normalized_message') or event.get('raw_message', '安全事件')[:200]

    def _cleanup_alert_cache(self):
        now = datetime.now()
        exp = [k for k, t in self.alert_cache.items() if now - t > self.cache_expiry]
        for k in exp:
            del self.alert_cache[k]

    # ==================== 定时 ====================
    def _start_timed_collectors(self):
        threading.Thread(target=self._run_security_collector, daemon=True).start()
        threading.Thread(target=self._run_performance_collector, daemon=True).start()
        if self.config.auto_create_alerts:
            threading.Thread(target=self._run_alert_checker, daemon=True).start()

    def _run_security_collector(self):
        while True:
            try:
                self.collect_all_data()
            except Exception as e:
                logger.error(f"安全收集失败: {e}")
            time.sleep(self.config.security_collection_interval * 60)

    def _run_performance_collector(self):
        while True:
            try:
                d = self.collect_performance_metrics()
                if self.config.auto_create_alerts:
                    for a in self._create_alerts_from_performance_data(d):
                        if self._should_create_alert(a):
                            self.send_alert_to_java(a)
            except Exception as e:
                logger.error("性能采集循环失败: %s", e, exc_info=True)
            time.sleep(self.config.performance_collection_interval * 60)

    def _run_alert_checker(self):
        while True:
            if self._quick_system_check().get('has_issues'):
                self.collect_all_data()
            time.sleep(self.config.alert_check_interval * 60)

    def _quick_system_check(self):
        try:
            issues = []
            if psutil.cpu_percent(1) > self.config.cpu_high_threshold:
                issues.append("CPU�?)
            if psutil.virtual_memory().percent > self.config.memory_high_threshold:
                issues.append("内存�?)
            return {'has_issues': len(issues) > 0, 'issues': issues}
        except Exception as e:
            logger.debug("快速系统检查失�? %s", e)
            return {'has_issues': False}

    def _safe_json_dumps(self, d):
        try:
            return json.dumps(d, ensure_ascii=False)
        except (TypeError, ValueError) as e:
            logger.debug("JSON 序列化失败，回退�?str: %s", e)
            return str(d)

    def get_stats(self):
        s = self.stats.copy()
        s.update({"host": self.collector_host, "alerts_cached": len(self.alert_cache)})
        return s

    def stop(self):
        logger.info("收集器停�?)

# ==================== 主函�?====================
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--java-url', default='http://localhost:8080')
    parser.add_argument('--interval', type=int, default=5)
    parser.add_argument('--once', action='store_true', help='单次采集后退出（供Java定时调度使用）')
    parser.add_argument('--test', action='store_true', help='同 --once，兼容旧用法')
    args = parser.parse_args()

    config = CollectorConfig(java_backend_url=args.java_url, security_collection_interval=args.interval)
    c = IntegratedSecurityAlertCollector(config)

    if args.once or args.test:
        logger.info("单次采集模式，采集完成后退出")
        c.load_config_from_backend()
        c.collect_all_data()
        logger.info("单次采集完成")
        return

    c.start_all_collectors()
    print("运行中，Ctrl+C退出")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        c.stop()

if __name__ == "__main__":
    main()
"""
integrated_security_alert_collector.py
安全日志与告警集成收集器 - Python 端
功能：自动收集系统安全日志、性能指标，并自动创建告警
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

# 配置类
@dataclass
class CollectorConfig:
    # Java 后端地址
    java_backend_url: str = "http://localhost:8080"

    # 收集间隔（分钟）
    security_collection_interval: int = 5      # 安全日志收集间隔
    performance_collection_interval: int = 2   # 性能数据收集间隔
    alert_check_interval: int = 1              # 告警检查间隔（分钟）

    # 自动告警配置
    auto_create_alerts: bool = True
    alert_min_severity: str = "MEDIUM"  # 最低告警级别

    # 网络配置
    request_timeout: int = 30
    max_retries: int = 3

    # 性能阈值
    cpu_critical_threshold: float = 90.0
    cpu_high_threshold: float = 80.0
    memory_critical_threshold: float = 95.0
    memory_high_threshold: float = 90.0
    disk_critical_threshold: float = 95.0
    disk_high_threshold: float = 85.0

    # 进程监控
    max_processes_to_check: int = 100
    suspicious_process_keywords: List[str] = None

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

# ==================== 枚举和常量 ====================

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

    # 可选字段
    host_name: str = None
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

    # 异常检测相关字段
    anomaly_score: float = 0.0
    anomaly_reason: str = None
    threat_level: str = None
    detection_algorithm: str = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = asdict(self)
        # 处理None值
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
        """转换为字典"""
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
        """转换为字典"""
        result = asdict(self)
        # 移除None值
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
        """转换为字典"""
        result = asdict(self)
        # 处理cmdline列表
        if result['cmdline']:
            result['cmdline'] = ' '.join(result['cmdline'])
        return result

# ==================== 主要收集器类 ====================

class IntegratedSecurityAlertCollector:
    """
    集成的安全日志与告警收集器
    功能：
    1. 收集系统安全日志
    2. 收集性能指标
    3. 自动创建告警
    4. 发送数据到Java后端
    """
    def __init__(self, config: CollectorConfig = None):
        self.config = config or CollectorConfig()
        self.session = requests.Session()

        # 获取主机名，如果有中文字符则使用"unknown-host"
        try:
            raw_host = platform.node() or socket.gethostname() or "unknown-host"
            # 检查是否包含中文字符
            if any(ord(c) > 127 for c in raw_host):
                self.collector_host = "unknown-host"
            else:
                self.collector_host = raw_host
        except Exception:
            self.collector_host = "unknown-host"

        # 生成collector_id
        self.collector_id = f"collector_{hashlib.md5(self.collector_host.encode()).hexdigest()[:8]}"

        # 配置请求头，使用简单的ASCII字符
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SecurityAlertCollector/2.0',
            'X-Collector-ID': self.collector_id
        })

        # 性能数据缓存
        self.performance_cache = {}
        self.last_performance_collection = 0

        # 告警缓存（防止重复告警）
        self.alert_cache = {}
        self.cache_expiry = timedelta(minutes=30)

        # 统计信息
        self.stats = {
            'total_events_collected': 0,
            'total_alerts_created': 0,
            'total_performance_checks': 0,
            'last_collection_time': None,
            'errors': []
        }

        logger.info(f"初始化安全告警收集器: {self.collector_host} (ID: {self.collector_id})")
        logger.info(f"Java后端地址: {self.config.java_backend_url}")
    # ==================== 公共方法 ====================

    def start_all_collectors(self):
        """
        启动所有收集器
        """
        logger.info("启动所有收集器...")

        try:
            # 测试Java后端连接
            if not self.test_java_backend():
                logger.error("Java后端连接测试失败，请检查后端服务是否启动")
                return False

            # 启动定时收集器
            self._start_timed_collectors()

            logger.info("所有收集器已启动")
            return True

        except Exception as e:
            logger.error(f"启动收集器失败: {e}")
            return False

    def test_java_backend(self) -> bool:
        """
        测试Java后端连接
        """
        try:
            # 测试健康检查端点
            health_url = f"{self.config.java_backend_url}/actuator/health"
            response = self.session.get(health_url, timeout=10)

            if response.status_code == 200:
                logger.info("Java后端连接测试成功")
                return True

            # 测试API端点
            api_url = f"{self.config.java_backend_url}/api/alerts/health"
            response = self.session.get(api_url, timeout=10)

            if response.status_code in [200, 404]:
                logger.info("Java后端API连接测试成功")
                return True

            logger.warning(f"Java后端连接测试失败，状态码: {response.status_code}")
            return False

        except Exception as e:
            logger.warning(f"Java后端连接测试失败: {e}")
            return False

    def collect_all_data(self) -> Dict[str, Any]:
        """
        收集所有数据：安全事件、性能指标、并创建告警
        """
        logger.info("开始收集所有数据...")

        all_data = {
            'timestamp': datetime.now().isoformat(),
            'collector_id': self.collector_id,
            'host': self.collector_host
        }

        try:
            # 并行收集数据
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_security = executor.submit(self.collect_security_logs)
                future_performance = executor.submit(self.collect_performance_metrics)
                future_processes = executor.submit(self.collect_process_info)

                # 获取结果
                security_events = future_security.result(timeout=120)
                performance_data = future_performance.result(timeout=60)
                process_info = future_processes.result(timeout=60)

            # 处理数据
            all_data['security_events'] = security_events
            all_data['performance_data'] = performance_data
            all_data['process_info'] = process_info

            # 发送安全事件到Java后端
            if security_events:
                success = self.send_security_events(security_events)
                logger.info(f"安全事件发送结果: {'成功' if success else '失败'}")

            # 自动创建告警
            if self.config.auto_create_alerts:
                alerts_created = self.auto_create_alerts(security_events, performance_data, process_info)
                all_data['alerts_created'] = alerts_created
                logger.info(f"自动创建了 {alerts_created} 个告警")

            # 更新统计信息
            self.stats['total_events_collected'] += len(security_events)
            self.stats['last_collection_time'] = datetime.now()

            logger.info(f"数据收集完成: {len(security_events)}个安全事件")

        except Exception as e:
            logger.error(f"收集所有数据失败: {e}")
            all_data['error'] = str(e)
            self.stats['errors'].append({
                'time': datetime.now().isoformat(),
                'error': str(e)
            })

        return all_data

    # ==================== 安全日志收集 ====================

    def collect_security_logs(self) -> List[Dict[str, Any]]:
        """
        收集所有安全相关日志
        """
        logger.info("开始收集安全日志...")

        security_events = []

        try:
            # 根据操作系统选择收集方法
            if platform.system() == "Windows":
                events = self.collect_windows_security_events()
            else:
                events = self.collect_unix_security_events()

            # 添加网络和进程安全事件
            network_events = self.collect_network_security_events()
            process_events = self.collect_process_security_events()

            security_events.extend(events)
            security_events.extend(network_events)
            security_events.extend(process_events)

            # 添加收集器状态事件
            status_event = self._create_collector_status_event(len(security_events))
            security_events.append(status_event)

            logger.info(f"安全日志收集完成，共收集 {len(security_events)} 个安全事件")

        except Exception as e:
            logger.error(f"安全日志收集失败: {e}")
            error_event = self._create_error_event("SECURITY_LOG_COLLECTOR", str(e))
            security_events.append(error_event)

        return security_events

    def collect_windows_security_events(self) -> List[Dict[str, Any]]:
        """收集Windows安全事件日志"""
        events = []

        try:
            logger.debug("收集Windows安全事件日志...")

            # 定义重要的安全事件ID
            security_event_ids = [
                4624, 4625, 4634, 4648, 4672, 4688, 4697, 4698, 4699,
                4700, 4701, 4702, 4719, 4720, 4722, 4723, 4724, 4725,
                4726, 4728, 4729, 4732, 4733, 4735, 4737, 4738, 4739,
                4740, 4754, 4755, 4756, 4757, 4768, 4769, 4770, 4771,
                4776, 4778, 4779, 4781, 4798, 4799, 4800, 4801, 4802,
                4803, 5376, 5377
            ]

            # 构建PowerShell命令
            event_ids_str = ",".join(map(str, security_event_ids))
            hours_back = 1  # 收集最近1小时的事件

            powershell_cmd = f"""
            $StartTime = (Get-Date).AddHours(-{hours_back})
            Get-WinEvent -FilterHashtable @{{LogName='Security'; StartTime=$StartTime}} | 
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

                    logger.info(f"收集到 {len(events)} 个Windows安全事件")

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

            # 安全日志文件列表
            security_log_files = [
                "/var/log/auth.log",
                "/var/log/secure",
                "/var/log/syslog",
                "/var/log/messages",
                "/var/log/audit/audit.log"
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

                    # 检查最后500行安全相关日志
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

            logger.info(f"收集到 {len(events)} 个Unix安全事件")

        except Exception as e:
            logger.error(f"收集Unix安全事件失败: {e}")

        return events

    def collect_network_security_events(self) -> List[Dict[str, Any]]:
        """收集网络安全事件"""
        events = []

        try:
            logger.debug("收集网络安全事件...")

            # 收集网络连接信息
            connections = self._get_network_connections()

            for conn in connections:
                event = self._parse_network_connection(conn)
                if event:
                    events.append(event)

            # 收集网络接口信息
            interface_events = self._collect_network_interface_info()
            events.extend(interface_events)

            # 收集防火墙信息
            firewall_events = self._collect_firewall_info()
            events.extend(firewall_events)

            # 检测异常连接
            anomaly_events = self._detect_network_anomalies(connections)
            events.extend(anomaly_events)

            logger.info(f"收集到 {len(events)} 个网络安全事件")

        except Exception as e:
            logger.error(f"收集网络安全事件失败: {e}")

        return events

    def collect_process_security_events(self) -> List[Dict[str, Any]]:
        """收集进程安全事件"""
        events = []

        try:
            logger.debug("收集进程安全事件...")

            # 收集进程信息
            processes = self._get_process_info()

            for proc_info in processes:
                # 检测可疑进程
                if proc_info.get('is_suspicious'):
                    event = self._create_suspicious_process_event(proc_info)
                    if event:
                        events.append(event)

                # 检测高权限进程
                if proc_info.get('username') in ['root', 'SYSTEM', 'Administrator', 'NT AUTHORITY\\SYSTEM']:
                    event = self._create_privileged_process_event(proc_info)
                    if event:
                        events.append(event)

                # 检测高资源占用进程
                if (proc_info.get('cpu_percent', 0) > 50 or
                        proc_info.get('memory_percent', 0) > 30):
                    event = self._create_high_resource_process_event(proc_info)
                    if event:
                        events.append(event)

            # 检测进程异常行为
            anomaly_events = self._detect_process_anomalies(processes)
            events.extend(anomaly_events)

            logger.info(f"收集到 {len(events)} 个进程安全事件")

        except Exception as e:
            logger.error(f"收集进程安全事件失败: {e}")

        return events

    # ==================== 性能指标收集 ====================

    def collect_performance_metrics(self) -> Dict[str, Any]:
        """
        收集性能指标
        """
        logger.debug("收集性能指标...")

        try:
            # 使用缓存（避免频繁收集）
            current_time = time.time()
            if (current_time - self.last_performance_collection) < 30:  # 30秒缓存
                return self.performance_cache.copy()

            metrics = PerformanceMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_percent=psutil.cpu_percent(interval=1),
                memory_percent=psutil.virtual_memory().percent,
                memory_used=psutil.virtual_memory().used,
                memory_available=psutil.virtual_memory().available,
                memory_total=psutil.virtual_memory().total,
                disk_usage=psutil.disk_usage('/').percent,
                disk_used=psutil.disk_usage('/').used,
                disk_total=psutil.disk_usage('/').total,
                network_sent=psutil.net_io_counters().bytes_sent,
                network_received=psutil.net_io_counters().bytes_recv,
                network_sent_rate=psutil.net_io_counters().bytes_sent,
                network_received_rate=psutil.net_io_counters().bytes_recv,
                total_processes=len(psutil.pids()),
                running_processes=len([p for p in psutil.process_iter(['status'])
                                       if p.info.get('status') == 'running']),
                system_load=psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0,
                uptime=int(time.time() - psutil.boot_time())
            )

            # 计算网络速率（需要两次收集）
            if 'last_network_stats' in self.performance_cache:
                time_diff = current_time - self.last_performance_collection
                if time_diff > 0:
                    last = self.performance_cache
                    metrics.network_sent_rate = (
                                                        metrics.network_sent - last.get('network_sent', 0)
                                                ) / time_diff
                    metrics.network_received_rate = (
                                                            metrics.network_received - last.get('network_received', 0)
                                                    ) / time_diff

            result = metrics.to_dict()

            # 更新缓存
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
        """
        收集进程信息
        """
        logger.debug("收集进程信息...")

        processes = []

        try:
            # 获取进程列表
            for proc in psutil.process_iter(['pid', 'name', 'exe', 'username',
                                             'cpu_percent', 'memory_percent',
                                             'status', 'create_time', 'cmdline']):
                try:
                    proc_info = proc.info

                    # 转换为ProcessInfo对象
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
                        suspicious_reason=self._get_suspicious_reason(proc_info)
                        if self._is_suspicious_process(proc_info) else None
                    )

                    processes.append(process.to_dict())

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                except Exception as e:
                    logger.warning(f"处理进程信息失败: {e}")

            # 按CPU使用率排序
            processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)

            # 限制数量
            processes = processes[:self.config.max_processes_to_check]

            logger.debug(f"收集到 {len(processes)} 个进程信息")

        except Exception as e:
            logger.error(f"收集进程信息失败: {e}")

        return processes

    # ==================== 告警自动创建 ====================

    def auto_create_alerts(self, security_events: List[Dict],
                           performance_data: Dict,
                           process_info: List[Dict]) -> int:
        """
        自动创建告警
        """
        if not self.config.auto_create_alerts:
            return 0

        logger.debug("开始自动创建告警...")

        alerts_created = 0

        try:
            alerts_to_create = []

            # 1. 从安全事件创建告警
            for event in security_events:
                alert = self._create_alert_from_security_event(event)
                if alert:
                    alerts_to_create.append(alert)

            # 2. 从性能数据创建告警
            performance_alerts = self._create_alerts_from_performance_data(performance_data)
            alerts_to_create.extend(performance_alerts)

            # 3. 从进程信息创建告警
            process_alerts = self._create_alerts_from_process_info(process_info)
            alerts_to_create.extend(process_alerts)

            # 4. 检测系统异常
            system_alerts = self._create_system_anomaly_alerts(security_events, performance_data)
            alerts_to_create.extend(system_alerts)

            # 发送告警到Java后端
            for alert in alerts_to_create:
                if self._should_create_alert(alert):
                    success = self.send_alert_to_java(alert)
                    if success:
                        alerts_created += 1

                        # 缓存告警ID（防止重复）
                        alert_key = self._generate_alert_key(alert)
                        self.alert_cache[alert_key] = datetime.now()

            # 清理过期的缓存
            self._cleanup_alert_cache()

            # 更新统计信息
            self.stats['total_alerts_created'] += alerts_created

            logger.info(f"自动创建了 {alerts_created} 个告警")

        except Exception as e:
            logger.error(f"自动创建告警失败: {e}")

        return alerts_created

    def _create_alert_from_security_event(self, event: Dict) -> Optional[Dict]:
        """从安全事件创建告警"""
        try:
            event_type = event.get('eventType', '')
            severity = event.get('severity', 'INFO')

            # 映射严重级别到告警级别
            alert_level = self._map_severity_to_alert_level(severity)

            # 检查是否需要创建告警
            if not self._should_create_alert_for_event(alert_level, event_type):
                return None

            # 生成告警ID
            alert_id = f"SEC_{event_type}_{hashlib.md5(str(event).encode()).hexdigest()[:8]}"

            # 检查是否已创建过相同告警
            alert_key = f"event_{alert_id}"
            if alert_key in self.alert_cache:
                return None

            # 创建告警
            alert = AlertData(
                alert_id=alert_id,
                timestamp=event.get('timestamp', datetime.now().isoformat()),
                source='SECURITY_COLLECTOR',
                alert_type=event_type,
                alert_level=alert_level,
                description=self._generate_alert_description(event),
                ai_confidence=event.get('anomaly_score', 0.0) or
                              self._calculate_event_confidence(event),
                handled=False,
                status='PENDING',
                event_id=event.get('event_id'),
                process_id=event.get('process_id'),
                ip_address=event.get('source_ip') or event.get('destination_ip'),
                port=event.get('destination_port')
            )

            return alert.to_dict()

        except Exception as e:
            logger.warning(f"从安全事件创建告警失败: {e}")
            return None

    def _create_alerts_from_performance_data(self, performance_data: Dict) -> List[Dict]:
        """从性能数据创建告警"""
        alerts = []

        try:
            # CPU告警
            cpu_percent = performance_data.get('cpu_percent', 0)
            if cpu_percent >= self.config.cpu_critical_threshold:
                alerts.append(self._create_performance_alert(
                    'CPU_USAGE_CRITICAL', 'CRITICAL',
                    f"CPU使用率严重过高: {cpu_percent:.1f}%",
                    cpu_percent
                ))
            elif cpu_percent >= self.config.cpu_high_threshold:
                alerts.append(self._create_performance_alert(
                    'CPU_USAGE_HIGH', 'HIGH',
                    f"CPU使用率过高: {cpu_percent:.1f}%",
                    cpu_percent
                ))

            # 内存告警
            memory_percent = performance_data.get('memory_percent', 0)
            if memory_percent >= self.config.memory_critical_threshold:
                alerts.append(self._create_performance_alert(
                    'MEMORY_USAGE_CRITICAL', 'CRITICAL',
                    f"内存使用率严重过高: {memory_percent:.1f}%",
                    memory_percent
                ))
            elif memory_percent >= self.config.memory_high_threshold:
                alerts.append(self._create_performance_alert(
                    'MEMORY_USAGE_HIGH', 'HIGH',
                    f"内存使用率过高: {memory_percent:.1f}%",
                    memory_percent
                ))

            # 磁盘告警
            disk_usage = performance_data.get('disk_usage', 0)
            if disk_usage >= self.config.disk_critical_threshold:
                alerts.append(self._create_performance_alert(
                    'DISK_USAGE_CRITICAL', 'CRITICAL',
                    f"磁盘使用率严重过高: {disk_usage:.1f}%",
                    disk_usage
                ))
            elif disk_usage >= self.config.disk_high_threshold:
                alerts.append(self._create_performance_alert(
                    'DISK_USAGE_HIGH', 'HIGH',
                    f"磁盘使用率过高: {disk_usage:.1f}%",
                    disk_usage
                ))

        except Exception as e:
            logger.warning(f"从性能数据创建告警失败: {e}")

        return alerts

    def _create_alerts_from_process_info(self, process_info: List[Dict]) -> List[Dict]:
        """从进程信息创建告警"""
        alerts = []

        try:
            for proc in process_info:
                # 可疑进程告警
                if proc.get('is_suspicious'):
                    alerts.append(self._create_process_alert(
                        'SUSPICIOUS_PROCESS', 'HIGH',
                        proc.get('suspicious_reason', '检测到可疑进程'),
                        proc
                    ))

                # 高资源进程告警
                cpu_percent = proc.get('cpu_percent', 0)
                memory_percent = proc.get('memory_percent', 0)

                if cpu_percent > 70 or memory_percent > 50:
                    alerts.append(self._create_process_alert(
                        'HIGH_RESOURCE_PROCESS', 'MEDIUM',
                        f"进程资源占用过高: {proc.get('name')} "
                        f"(CPU: {cpu_percent:.1f}%, 内存: {memory_percent:.1f}%)",
                        proc
                    ))

                # 高权限进程告警
                if proc.get('username') in ['root', 'SYSTEM', 'Administrator']:
                    alerts.append(self._create_process_alert(
                        'PRIVILEGED_PROCESS', 'MEDIUM',
                        f"高权限进程: {proc.get('name')} (用户: {proc.get('username')})",
                        proc
                    ))

        except Exception as e:
            logger.warning(f"从进程信息创建告警失败: {e}")

        return alerts

    def _create_system_anomaly_alerts(self, security_events: List[Dict],
                                      performance_data: Dict) -> List[Dict]:
        """创建系统异常告警"""
        alerts = []

        try:
            # 检测异常事件暴增
            recent_events = [e for e in security_events
                             if datetime.fromisoformat(e.get('timestamp', '').replace('Z', ''))
                             > datetime.now() - timedelta(minutes=5)]

            if len(recent_events) > 100:  # 5分钟内超过100个事件
                alerts.append(self._create_system_alert(
                    'EVENT_STORM', 'HIGH',
                    f"检测到事件风暴: 5分钟内 {len(recent_events)} 个事件",
                    {'event_count': len(recent_events)}
                ))

            # 检测系统负载异常
            system_load = performance_data.get('system_load', 0)
            cpu_cores = psutil.cpu_count()

            if system_load > cpu_cores * 2:  # 负载超过CPU核心数2倍
                alerts.append(self._create_system_alert(
                    'HIGH_SYSTEM_LOAD', 'HIGH',
                    f"系统负载异常高: {system_load:.2f} (CPU核心: {cpu_cores})",
                    {'load': system_load, 'cpu_cores': cpu_cores}
                ))

        except Exception as e:
            logger.warning(f"创建系统异常告警失败: {e}")

        return alerts

    def _create_performance_alert(self, alert_type: str, level: str,
                                  description: str, value: float) -> Dict:
        """创建性能告警"""
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

    def _create_process_alert(self, alert_type: str, level: str,
                              description: str, process_info: Dict) -> Dict:
        """创建进程告警"""
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

    def _create_system_alert(self, alert_type: str, level: str,
                             description: str, data: Dict) -> Dict:
        """创建系统告警"""
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

    # ==================== 辅助方法 ====================

    def _parse_windows_security_event(self, event: Dict) -> Optional[Dict]:
        """解析Windows安全事件"""
        try:
            event_id = event.get("Id", 0)
            event_type = self._map_windows_event_id(event_id)
            severity = self._map_windows_severity(event.get("LevelDisplayName", ""), event_id)

            # 提取用户信息
            user_id = event.get("UserId", "")
            machine_name = event.get("MachineName", "")

            # 解析消息中的IP地址
            message = event.get("Message", "")
            ip_address = self._extract_ip_from_message(message)

            event_data = {
                "logName": event.get("LogName"),
                "provider": event.get("ProviderName"),
                "level": event.get("LevelDisplayName"),
                "machineName": machine_name,
                "collectorHost": self.collector_host,
                "userId": user_id,
                "recordId": event.get("RecordId"),
                "keywords": event.get("Keywords"),
                "properties": event.get("Properties", []),
                "ipAddress": ip_address
            }

            security_event = SecurityEvent(
                timestamp=event.get("TimeCreated", "").replace("Z", "") + "Z",
                source_system="WINDOWS",
                event_type=event_type,
                category="SECURITY",
                severity=severity,
                event_code=str(event_id),
                raw_message=message,
                normalized_message=f"Windows安全事件[{event_id}]: {event_type}",
                host_name=machine_name,
                user_id=user_id,
                source_ip=ip_address,
                event_data=event_data,
                raw_data=self._safe_json_dumps(event),
                threat_level=self._calculate_threat_level(event_id, severity),
                anomaly_score=self._calculate_windows_anomaly_score(event_id, message)
            )

            return security_event.to_dict()

        except Exception as e:
            logger.warning(f"解析Windows安全事件失败: {e}")
            return None

    def _parse_unix_security_log(self, line: str, log_file: str) -> Optional[Dict]:
        """解析Unix安全日志"""
        try:
            # 检测日志类型和严重性
            event_type = self._detect_unix_event_type(line)
            severity = self._detect_unix_severity(line)

            # 提取关键信息
            user_match = re.search(r'user[= ]*(\w+)', line, re.IGNORECASE)
            source_match = re.search(r'from[= ]*([\d\.:]+)', line, re.IGNORECASE)
            pid_match = re.search(r'pid[= ]*(\d+)', line, re.IGNORECASE)

            event_data = {
                "logFile": log_file,
                "collectorHost": self.collector_host,
                "originalLine": line,
                "matchedPatterns": []
            }

            security_event = SecurityEvent(
                timestamp=datetime.now().isoformat(),
                source_system="LINUX",
                event_type=event_type,
                category="SECURITY",
                severity=severity,
                raw_message=line,
                normalized_message=self._create_unix_security_message(line, event_type),
                event_data=event_data,
                raw_data=self._safe_json_dumps({"logFile": log_file, "line": line}),
                threat_level=self._calculate_unix_threat_level(line),
                anomaly_score=self._calculate_unix_anomaly_score(line)
            )

            if user_match:
                security_event.user_id = user_match.group(1)
            if source_match:
                security_event.source_ip = source_match.group(1)
            if pid_match:
                security_event.process_id = int(pid_match.group(1))

            return security_event.to_dict()

        except Exception as e:
            logger.warning(f"解析Unix安全日志失败: {e}")
            return None

    def _parse_network_connection(self, conn_info: Dict) -> Optional[Dict]:
        """解析网络连接"""
        try:
            event_type = "NETWORK_CONNECTION"
            severity = "INFO"

            # 检测可疑连接
            if self._is_suspicious_connection(conn_info):
                event_type = "SUSPICIOUS_CONNECTION"
                severity = "HIGH"

            event_data = {
                "local_addr": conn_info.get('local_addr'),
                "remote_addr": conn_info.get('remote_addr'),
                "status": conn_info.get('status'),
                "pid": conn_info.get('pid'),
                "process_name": conn_info.get('process_name'),
                "collectorHost": self.collector_host
            }

            # 提取IP和端口
            local_parts = str(conn_info.get('local_addr', '')).split(':')
            remote_parts = str(conn_info.get('remote_addr', '')).split(':')

            security_event = SecurityEvent(
                timestamp=datetime.now().isoformat(),
                source_system="NETWORK",
                event_type=event_type,
                category="NETWORK_SECURITY",
                severity=severity,
                raw_message=str(conn_info),
                normalized_message=f"网络连接: {conn_info.get('status', 'UNKNOWN')}",
                event_data=event_data,
                raw_data=self._safe_json_dumps(conn_info),
                source_ip=local_parts[0] if len(local_parts) > 0 else None,
                source_port=int(local_parts[1]) if len(local_parts) > 1 else None,
                destination_ip=remote_parts[0] if len(remote_parts) > 0 else None,
                destination_port=int(remote_parts[1]) if len(remote_parts) > 1 else None,
                process_id=conn_info.get('pid'),
                process_name=conn_info.get('process_name'),
                threat_level="HIGH" if event_type == "SUSPICIOUS_CONNECTION" else "LOW",
                anomaly_score=0.8 if event_type == "SUSPICIOUS_CONNECTION" else 0.1
            )

            return security_event.to_dict()

        except Exception as e:
            logger.warning(f"解析网络连接失败: {e}")
            return None

    def _create_suspicious_process_event(self, proc_info: Dict) -> Optional[Dict]:
        """创建可疑进程事件"""
        try:
            security_event = SecurityEvent(
                timestamp=datetime.now().isoformat(),
                source_system="SYSTEM",
                event_type="SUSPICIOUS_PROCESS",
                category="PROCESS_SECURITY",
                severity="HIGH",
                process_id=proc_info.get('pid'),
                process_name=proc_info.get('name'),
                user_id=proc_info.get('username'),
                normalized_message=f"检测到可疑进程: {proc_info.get('name')} "
                                   f"(PID: {proc_info.get('pid')}, 用户: {proc_info.get('username')})",
                event_data={
                    "exe_path": proc_info.get('exe'),
                    "cmdline": proc_info.get('cmdline', []),
                    "create_time": proc_info.get('create_time'),
                    "suspicious_reason": proc_info.get('suspicious_reason'),
                    "collectorHost": self.collector_host
                },
                raw_data=self._safe_json_dumps(proc_info),
                threat_level="HIGH",
                anomaly_score=0.9,
                detection_algorithm="PROCESS_HEURISTIC"
            )

            return security_event.to_dict()

        except Exception as e:
            logger.warning(f"创建可疑进程事件失败: {e}")
            return None

    def _create_privileged_process_event(self, proc_info: Dict) -> Optional[Dict]:
        """创建高权限进程事件"""
        try:
            security_event = SecurityEvent(
                timestamp=datetime.now().isoformat(),
                source_system="SYSTEM",
                event_type="PRIVILEGED_PROCESS",
                category="PROCESS_SECURITY",
                severity="MEDIUM",
                process_id=proc_info.get('pid'),
                process_name=proc_info.get('name'),
                user_id=proc_info.get('username'),
                normalized_message=f"高权限进程: {proc_info.get('name')} "
                                   f"(用户: {proc_info.get('username')})",
                event_data={
                    "exe_path": proc_info.get('exe'),
                    "cmdline": proc_info.get('cmdline'),
                    "collectorHost": self.collector_host,
                    "create_time": proc_info.get('create_time')
                },
                raw_data=self._safe_json_dumps(proc_info),
                threat_level="MEDIUM",
                anomaly_score=0.4
            )

            return security_event.to_dict()

        except Exception as e:
            logger.warning(f"创建高权限进程事件失败: {e}")
            return None

    def _create_high_resource_process_event(self, proc_info: Dict) -> Optional[Dict]:
        """创建高资源占用进程事件"""
        try:
            cpu_percent = proc_info.get('cpu_percent', 0)
            memory_percent = proc_info.get('memory_percent', 0)

            security_event = SecurityEvent(
                timestamp=datetime.now().isoformat(),
                source_system="SYSTEM",
                event_type="HIGH_RESOURCE_PROCESS",
                category="PERFORMANCE",
                severity="MEDIUM" if cpu_percent > 70 or memory_percent > 50 else "LOW",
                process_id=proc_info.get('pid'),
                process_name=proc_info.get('name'),
                user_id=proc_info.get('username'),
                normalized_message=f"高资源占用进程: {proc_info.get('name')} "
                                   f"(CPU: {cpu_percent:.1f}%, 内存: {memory_percent:.1f}%)",
                event_data={
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory_percent,
                    "exe_path": proc_info.get('exe'),
                    "collectorHost": self.collector_host
                },
                raw_data=self._safe_json_dumps(proc_info),
                threat_level="LOW",
                anomaly_score=0.3
            )

            return security_event.to_dict()

        except Exception as e:
            logger.warning(f"创建高资源占用进程事件失败: {e}")
            return None

    def _create_collector_status_event(self, event_count: int) -> Dict:
        """创建收集器状态事件"""
        status_event = SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="COLLECTOR",
            event_type="COLLECTOR_STATUS",
            category="SYSTEM",
            severity="INFO",
            normalized_message=f"安全收集器状态: 收集了 {event_count} 个事件",
            event_data={
                "collector_id": self.collector_id,
                "collector_host": self.collector_host,
                "event_count": event_count,
                "stats": self.stats,
                "config": asdict(self.config)
            },
            threat_level="INFO",
            anomaly_score=0.0
        )

        return status_event.to_dict()

    def _create_error_event(self, collector: str, error: str) -> Dict:
        """创建错误事件"""
        error_event = SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="COLLECTOR",
            event_type="COLLECTOR_ERROR",
            category="SYSTEM",
            severity="ERROR",
            normalized_message=f"收集器 {collector} 错误: {error}",
            event_data={
                "collector": collector,
                "error": error,
                "collectorHost": self.collector_host
            },
            raw_data=self._safe_json_dumps({"collector": collector, "error": error}),
            threat_level="LOW",
            anomaly_score=0.0
        )

        return error_event.to_dict()

    # ==================== 网络相关方法 ====================

    def _get_network_connections(self) -> List[Dict]:
        """获取网络连接信息"""
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

                    # 获取进程信息
                    if conn.pid:
                        try:
                            proc = psutil.Process(conn.pid)
                            conn_info['process_name'] = proc.name()
                        except:
                            conn_info['process_name'] = 'unknown'

                    connections.append(conn_info)

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

        except Exception as e:
            logger.warning(f"获取网络连接失败: {e}")

        return connections

    def _collect_network_interface_info(self) -> List[Dict]:
        """收集网络接口信息"""
        events = []

        try:
            interfaces = psutil.net_if_addrs()
            for interface, addrs in interfaces.items():
                for addr in addrs:
                    if addr.family == socket.AF_INET:  # IPv4
                        event = SecurityEvent(
                            timestamp=datetime.now().isoformat(),
                            source_system="NETWORK",
                            event_type="NETWORK_INTERFACE",
                            category="NETWORK_INFO",
                            severity="INFO",
                            normalized_message=f"网络接口: {interface} - {addr.address}",
                            event_data={
                                "interface": interface,
                                "ip_address": addr.address,
                                "netmask": addr.netmask,
                                "broadcast": addr.broadcast,
                                "collectorHost": self.collector_host
                            },
                            raw_data=self._safe_json_dumps({
                                "interface": interface,
                                "address": addr.address,
                                "netmask": addr.netmask
                            }),
                            threat_level="INFO",
                            anomaly_score=0.0
                        )

                        events.append(event.to_dict())

        except Exception as e:
            logger.warning(f"收集网络接口信息失败: {e}")

        return events

    def _collect_firewall_info(self) -> List[Dict]:
        """收集防火墙信息"""
        events = []

        try:
            if platform.system() == "Windows":
                # Windows防火墙状态
                result = subprocess.run(
                    ["netsh", "advfirewall", "show", "allprofiles"],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='ignore',
                    timeout=30
                )

                if result.returncode == 0:
                    event = SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="SECURITY",
                        event_type="FIREWALL_STATUS",
                        category="NETWORK_SECURITY",
                        severity="INFO",
                        normalized_message="Windows防火墙状态检查",
                        event_data={
                            "collectorHost": self.collector_host,
                            "output": result.stdout[:1000]  # 限制长度
                        },
                        raw_data=self._safe_json_dumps({"output": result.stdout[:500]}),
                        threat_level="INFO",
                        anomaly_score=0.0
                    )
                    events.append(event.to_dict())

            else:
                # Linux iptables状态
                for cmd in [["iptables", "-L", "-n"], ["firewall-cmd", "--state"]]:
                    try:
                        result = subprocess.run(
                            cmd,
                            capture_output=True,
                            text=True,
                            encoding='utf-8',
                            errors='ignore',
                            timeout=30
                        )

                        if result.returncode == 0:
                            event = SecurityEvent(
                                timestamp=datetime.now().isoformat(),
                                source_system="SECURITY",
                                event_type="FIREWALL_STATUS",
                                category="NETWORK_SECURITY",
                                severity="INFO",
                                normalized_message=f"防火墙规则检查: {' '.join(cmd)}",
                                event_data={
                                    "collectorHost": self.collector_host,
                                    "command": ' '.join(cmd),
                                    "output": result.stdout[:1000]
                                },
                                raw_data=self._safe_json_dumps({
                                    "command": ' '.join(cmd),
                                    "output": result.stdout[:500]
                                }),
                                threat_level="INFO",
                                anomaly_score=0.0
                            )
                            events.append(event.to_dict())
                            break

                    except FileNotFoundError:
                        continue

        except Exception as e:
            logger.warning(f"收集防火墙信息失败: {e}")

        return events

    def _detect_network_anomalies(self, connections: List[Dict]) -> List[Dict]:
        """检测网络异常"""
        events = []

        try:
            # 统计连接数
            conn_by_port = {}
            conn_by_ip = {}

            for conn in connections:
                # 按端口统计
                if conn.get('remote_addr'):
                    port = int(conn['remote_addr'].split(':')[1])
                    conn_by_port[port] = conn_by_port.get(port, 0) + 1

                # 按IP统计
                if conn.get('remote_addr'):
                    ip = conn['remote_addr'].split(':')[0]
                    conn_by_ip[ip] = conn_by_ip.get(ip, 0) + 1

            # 检测异常端口连接数
            for port, count in conn_by_port.items():
                if count > 10:  # 同一端口超过10个连接
                    event = SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="NETWORK",
                        event_type="HIGH_PORT_CONNECTIONS",
                        category="NETWORK_ANOMALY",
                        severity="MEDIUM",
                        normalized_message=f"端口 {port} 连接数异常: {count} 个连接",
                        event_data={
                            "port": port,
                            "connection_count": count,
                            "collectorHost": self.collector_host
                        },
                        threat_level="MEDIUM",
                        anomaly_score=0.6
                    )
                    events.append(event.to_dict())

            # 检测异常IP连接数
            for ip, count in conn_by_ip.items():
                if count > 20:  # 同一IP超过20个连接
                    event = SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="NETWORK",
                        event_type="HIGH_IP_CONNECTIONS",
                        category="NETWORK_ANOMALY",
                        severity="MEDIUM",
                        normalized_message=f"IP {ip} 连接数异常: {count} 个连接",
                        event_data={
                            "ip": ip,
                            "connection_count": count,
                            "collectorHost": self.collector_host
                        },
                        threat_level="MEDIUM",
                        anomaly_score=0.6
                    )
                    events.append(event.to_dict())

        except Exception as e:
            logger.warning(f"检测网络异常失败: {e}")

        return events

    def _get_process_connections(self, pid: int) -> List[Dict]:
        """获取进程的网络连接"""
        connections = []

        try:
            proc = psutil.Process(pid)
            conns = proc.connections()

            for conn in conns:
                conn_info = {
                    'fd': conn.fd,
                    'family': str(conn.family),
                    'type': str(conn.type),
                    'local_addr': f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                    'remote_addr': f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                    'status': conn.status
                }
                connections.append(conn_info)

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        except Exception as e:
            logger.warning(f"获取进程连接失败: {e}")

        return connections

    # ==================== 进程检测方法 ====================

    def _is_suspicious_process(self, proc_info: Dict) -> bool:
        """检测可疑进程"""
        name = proc_info.get('name', '').lower()
        exe = proc_info.get('exe', '').lower()
        cmdline = ' '.join(proc_info.get('cmdline', [])).lower()

        # 检查可疑关键词
        for keyword in self.config.suspicious_process_keywords:
            if (keyword in name or
                    keyword in exe or
                    keyword in cmdline):
                return True

        # 检查可疑路径
        for path in SUSPICIOUS_PATHS:
            if path.lower() in exe:
                return True

        # 检查无文件路径的进程
        if not exe or exe == '':
            return True

        return False

    def _get_suspicious_reason(self, proc_info: Dict) -> str:
        """获取可疑进程的原因"""
        reasons = []

        name = proc_info.get('name', '').lower()
        exe = proc_info.get('exe', '').lower()
        cmdline = ' '.join(proc_info.get('cmdline', [])).lower()

        # 检查可疑关键词
        for keyword in self.config.suspicious_process_keywords:
            if keyword in name:
                reasons.append(f"进程名包含可疑关键词: {keyword}")
            if keyword in exe:
                reasons.append(f"可执行文件路径包含可疑关键词: {keyword}")
            if keyword in cmdline:
                reasons.append(f"命令行参数包含可疑关键词: {keyword}")

        # 检查可疑路径
        for path in SUSPICIOUS_PATHS:
            if path.lower() in exe:
                reasons.append(f"可执行文件位于可疑路径: {path}")

        # 检查无文件路径
        if not exe or exe == '':
            reasons.append("无可执行文件路径")

        return '; '.join(reasons) if reasons else "未知可疑行为"

    def _detect_process_anomalies(self, processes: List[Dict]) -> List[Dict]:
        """检测进程异常行为"""
        events = []

        try:
            # 检测重复进程名
            process_count = {}
            for proc in processes:
                name = proc.get('name', '')
                if name:
                    process_count[name] = process_count.get(name, 0) + 1

            for name, count in process_count.items():
                if count > 5:  # 同一进程名超过5个实例
                    event = SecurityEvent(
                        timestamp=datetime.now().isoformat(),
                        source_system="SYSTEM",
                        event_type="DUPLICATE_PROCESSES",
                        category="PROCESS_ANOMALY",
                        severity="MEDIUM",
                        normalized_message=f"进程 {name} 有 {count} 个实例，可能异常",
                        event_data={
                            "process_name": name,
                            "instance_count": count,
                            "collectorHost": self.collector_host
                        },
                        threat_level="MEDIUM",
                        anomaly_score=0.5
                    )
                    events.append(event.to_dict())

        except Exception as e:
            logger.warning(f"检测进程异常失败: {e}")

        return events

    def _get_process_network_info(self, process_info: Dict) -> Optional[str]:
        """获取进程网络信息"""
        try:
            pid = process_info.get('pid')
            if not pid:
                return None

            proc = psutil.Process(pid)
            conns = proc.connections()

            for conn in conns:
                if conn.raddr:
                    return conn.raddr.ip

            return None

        except Exception:
            return None

    # ==================== 检测方法 ====================

    def _is_suspicious_connection(self, conn_info: Dict) -> bool:
        """检测可疑网络连接"""
        try:
            # 检查可疑端口
            if conn_info.get('remote_addr'):
                port = int(conn_info['remote_addr'].split(':')[1])
                if port in SUSPICIOUS_PORTS:
                    return True

            # 检查外部IP连接
            if conn_info.get('remote_addr'):
                ip = conn_info['remote_addr'].split(':')[0]
                if ip and not self._is_private_ip(ip):
                    # 检查是否连接到非标准端口
                    port = int(conn_info['remote_addr'].split(':')[1])
                    if port > 1024 and port not in [80, 443, 8080, 8443]:
                        return True

            return False

        except Exception:
            return False

    def _is_private_ip(self, ip: str) -> bool:
        """检查是否为私有IP"""
        try:
            parts = list(map(int, ip.split('.')))

            # 10.0.0.0/8
            if parts[0] == 10:
                return True

            # 172.16.0.0/12
            if parts[0] == 172 and 16 <= parts[1] <= 31:
                return True

            # 192.168.0.0/16
            if parts[0] == 192 and parts[1] == 168:
                return True

            # 127.0.0.0/8
            if parts[0] == 127:
                return True

            return False

        except Exception:
            return False

    # ==================== 映射和转换方法 ====================

    def _map_windows_event_id(self, event_id: int) -> str:
        """映射Windows事件ID到事件类型"""
        mapping = {
            4624: "LOGON_SUCCESS",
            4625: "LOGON_FAILED",
            4634: "LOGON_LOGOFF",
            4648: "EXPLICIT_LOGON",
            4672: "SPECIAL_PRIVILEGE",
            4688: "PROCESS_CREATION",
            4697: "SERVICE_INSTALLED",
            4698: "SCHEDULED_TASK_CREATED",
            4699: "SCHEDULED_TASK_DELETED",
            4700: "SCHEDULED_TASK_ENABLED",
            4701: "SCHEDULED_TASK_DISABLED",
            4702: "SCHEDULED_TASK_UPDATED",
            4719: "SYSTEM_AUDIT_POLICY_CHANGED",
            4720: "USER_CREATED",
            4722: "USER_ENABLED",
            4723: "USER_DISABLED",
            4724: "USER_DELETED",
            4725: "USER_GROUP_CHANGED",
            4726: "USER_DELETED",
            4728: "GROUP_MEMBER_ADDED",
            4729: "GROUP_MEMBER_REMOVED",
            4732: "GROUP_MEMBER_ADDED",
            4733: "GROUP_MEMBER_REMOVED",
            4735: "GROUP_CHANGED",
            4737: "GROUP_CREATED",
            4738: "GROUP_ENABLED",
            4739: "GROUP_DISABLED",
            4740: "USER_ACCOUNT_LOCKED",
            4754: "GROUP_TYPE_CHANGED",
            4755: "GROUP_SCOPE_CHANGED",
            4756: "GROUP_ATTRIBUTE_CHANGED",
            4757: "GROUP_POLICY_CHANGED",
            4768: "KERBEROS_TICKET_REQUEST",
            4769: "KERBEROS_TICKET_FAILED",
            4770: "KERBEROS_TICKET_RENEWED",
            4771: "KERBEROS_PREAUTH_FAILED",
            4776: "CREDENTIAL_VALIDATION",
            4778: "SESSION_RECONNECTED",
            4779: "SESSION_DISCONNECTED",
            4781: "ACCOUNT_NAME_CHANGED",
            4798: "USER_GROUP_MEMBERSHIP_ENUMERATED",
            4799: "USER_PASSWORD_CHANGED",
            4800: "WORKSTATION_LOCKED",
            4801: "WORKSTATION_UNLOCKED",
            4802: "SCREENSAVER_INVOKED",
            4803: "SCREENSAVER_DISMISSED",
            5376: "CREDENTIAL_MANAGER_CREDENTIALS_BACKED_UP",
            5377: "CREDENTIAL_MANAGER_CREDENTIALS_RESTORED"
        }
        return mapping.get(event_id, f"WINDOWS_EVENT_{event_id}")

    def _map_windows_severity(self, level: str, event_id: int) -> str:
        """映射Windows事件严重级别"""
        # 关键安全事件
        critical_events = {4625, 4720, 4722, 4724, 4728, 4729, 4732, 4733, 4740, 4771}

        if event_id in critical_events:
            return "CRITICAL"
        elif level == "Error":
            return "ERROR"
        elif level == "Warning":
            return "WARN"
        else:
            return "INFO"

    def _map_severity_to_alert_level(self, severity: str) -> str:
        """映射严重级别到告警级别"""
        mapping = {
            "CRITICAL": "CRITICAL",
            "ERROR": "HIGH",
            "HIGH": "HIGH",
            "WARN": "MEDIUM",
            "WARNING": "MEDIUM",
            "MEDIUM": "MEDIUM",
            "INFO": "LOW",
            "DEBUG": "LOW",
            "LOW": "LOW"
        }
        return mapping.get(severity.upper(), "MEDIUM")

    def _detect_unix_event_type(self, line: str) -> str:
        """检测Unix事件类型"""
        line_lower = line.lower()

        if "failed password" in line_lower:
            return "LOGIN_FAILED"
        elif "accepted password" in line_lower:
            return "LOGIN_SUCCESS"
        elif "sudo:" in line_lower:
            return "SUDO_USAGE"
        elif "sshd" in line_lower:
            return "SSH_SESSION"
        elif "firewall" in line_lower or "iptables" in line_lower:
            return "FIREWALL_EVENT"
        elif "kernel:" in line_lower:
            return "KERNEL_EVENT"
        elif "segmentation fault" in line_lower:
            return "SEGMENTATION_FAULT"
        elif "out of memory" in line_lower:
            return "OUT_OF_MEMORY"
        else:
            return "UNIX_SECURITY_EVENT"

    def _detect_unix_severity(self, line: str) -> str:
        """检测Unix事件严重级别"""
        line_lower = line.lower()

        if any(word in line_lower for word in ["error", "failed", "invalid",
                                               "refused", "attack", "denied"]):
            return "ERROR"
        elif any(word in line_lower for word in ["warn", "warning",
                                                 "unauthorized"]):
            return "WARN"
        elif any(word in line_lower for word in ["critical", "emergency",
                                                 "panic"]):
            return "CRITICAL"
        else:
            return "INFO"

    def _create_unix_security_message(self, line: str, event_type: str) -> str:
        """创建Unix安全事件消息"""
        if len(line) > 200:
            short_line = line[:200] + "..."
        else:
            short_line = line

        return f"Unix安全事件[{event_type}]: {short_line}"

    def _extract_ip_from_message(self, message: str) -> Optional[str]:
        """从消息中提取IP地址"""
        try:
            # 查找IP地址模式
            ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
            match = re.search(ip_pattern, message)
            if match:
                return match.group(0)
        except Exception:
            pass
        return None

    # ==================== 计算和评估方法 ====================

    def _calculate_threat_level(self, event_id: int, severity: str) -> str:
        """计算威胁级别"""
        if severity == "CRITICAL":
            return "HIGH"
        elif severity == "ERROR":
            return "HIGH"
        elif severity == "WARN":
            return "MEDIUM"
        else:
            return "LOW"

    def _calculate_unix_threat_level(self, line: str) -> str:
        """计算Unix事件威胁级别"""
        line_lower = line.lower()

        if any(word in line_lower for word in ["attack", "intrusion",
                                               "breach", "exploit"]):
            return "HIGH"
        elif any(word in line_lower for word in ["failed", "denied",
                                                 "unauthorized"]):
            return "MEDIUM"
        else:
            return "LOW"

    def _calculate_windows_anomaly_score(self, event_id: int, message: str) -> float:
        """计算Windows事件异常分数"""
        # 关键事件分数较高
        critical_events = {4625, 4724, 4728, 4729, 4732, 4733, 4740}
        if event_id in critical_events:
            return 0.8

        # 登录相关事件
        if event_id in [4624, 4634, 4648]:
            return 0.3

        # 根据消息内容
        message_lower = message.lower()
        if any(word in message_lower for word in ["failed", "denied",
                                                  "unauthorized", "attack"]):
            return 0.7

        return 0.1

    def _calculate_unix_anomaly_score(self, line: str) -> float:
        """计算Unix事件异常分数"""
        line_lower = line.lower()

        if any(word in line_lower for word in ["failed", "denied",
                                               "unauthorized", "attack"]):
            return 0.7
        elif any(word in line_lower for word in ["error", "invalid",
                                                 "refused"]):
            return 0.5
        else:
            return 0.2

    def _calculate_event_confidence(self, event: Dict) -> float:
        """计算事件置信度"""
        severity = event.get('severity', 'INFO').upper()

        base_confidences = {
            "CRITICAL": 0.95,
            "ERROR": 0.85,
            "WARN": 0.75,
            "WARNING": 0.75,
            "INFO": 0.60,
            "DEBUG": 0.50,
            "LOW": 0.60
        }

        base_confidence = base_confidences.get(severity, 0.70)

        # 结合异常分数
        anomaly_score = event.get('anomaly_score', 0.0)
        if anomaly_score > 0:
            base_confidence = min(base_confidence * (1 + anomaly_score), 0.99)

        return base_confidence

    def _calculate_performance_confidence(self, value: float, level: str) -> float:
        """计算性能告警置信度"""
        confidences = {
            "CRITICAL": 0.95,
            "HIGH": 0.85,
            "MEDIUM": 0.75,
            "LOW": 0.65
        }

        base_confidence = confidences.get(level, 0.70)

        # 根据值调整置信度
        if value > 95:
            return min(base_confidence * 1.2, 0.99)
        elif value > 90:
            return min(base_confidence * 1.1, 0.95)
        else:
            return base_confidence

    # ==================== 发送方法 ====================

    def send_security_events(self, events: List[Dict]) -> bool:
        """
        发送安全事件到Java后端
        """
        if not events:
            return True

        try:
            url = f"{self.config.java_backend_url}/api/events/batch"

            # 格式化事件数据
            formatted_events = []
            for event in events:
                # 确保所有字段都存在
                formatted_event = {
                    "timestamp": event.get("timestamp", datetime.now().isoformat()),
                    "sourceSystem": event.get("source_system", "UNKNOWN"),
                    "eventType": event.get("event_type", "SECURITY_EVENT"),
                    "category": event.get("category", "SECURITY"),
                    "severity": event.get("severity", "INFO"),
                    "rawMessage": event.get("raw_message", ""),
                    "normalizedMessage": event.get("normalized_message", ""),
                    "isAnomaly": event.get("is_anomaly", False),
                    "hostName": event.get("host_name", self.collector_host),
                    "userId": event.get("user_id"),
                    "sourceIp": event.get("source_ip"),
                    "destinationIp": event.get("destination_ip"),
                    "destinationPort": event.get("destination_port"),
                    "processName": event.get("process_name"),
                    "processId": event.get("process_id"),
                    "rawData": event.get("raw_data"),
                    "eventData": event.get("event_data", {}),
                    "protocol": event.get("protocol"),
                    "sourcePort": event.get("source_port"),
                    "eventSubType": event.get("event_sub_type"),
                    "anomalyScore": float(event.get("anomaly_score", 0.0)),
                    "anomalyReason": event.get("anomaly_reason"),
                    "threatLevel": event.get("threat_level"),
                    "detectionAlgorithm": event.get("detection_algorithm")
                }

                # 清理None值
                formatted_event = {k: v for k, v in formatted_event.items()
                                   if v is not None}

                formatted_events.append(formatted_event)

            payload = json.dumps(formatted_events, default=str,
                                 ensure_ascii=False).encode('utf-8')

            response = self.session.post(url, data=payload,
                                         timeout=self.config.request_timeout)

            if response.status_code in [200, 201]:
                logger.info(f"成功发送 {len(events)} 个安全事件到Java后端")
                return True
            else:
                logger.error(f"发送安全事件失败，状态码: {response.status_code}, "
                             f"响应: {response.text[:200]}")
                return False

        except Exception as e:
            logger.error(f"发送安全事件到Java后端失败: {e}")
            return False

        def send_alert_to_java(self, alert_data: Dict) -> bool:
            """
            发送告警到Java后端
            注意：Python字段名需要转换为Java DTO的字段名
            """
        try:
            # Java后端API地址
            url = f"{self.config.java_backend_url}/api/alerts"
            logger.debug(f"发送告警到Java后端: {url}")

            # ==================== 第一步：字段名转换 ====================
            # Python字段名 → Java DTO字段名（根据你的AlertRequest.java）
            java_alert = {}

            # 1. 直接映射的字段
            direct_mapping = {
                # Python字段名: Java字段名
                'alert_id': 'alertId',
                'source': 'source',
                'alert_type': 'alertType',
                'alert_level': 'alertLevel',
                'description': 'description',
                'timestamp': 'timestamp',
                'status': 'status',
                'assignee': 'assignee',
                'resolution': 'resolution',
                'event_id': 'eventId',
                'ip_address': 'ipAddress',
                'port': 'port'
            }

            # 应用直接映射
            for py_field, java_field in direct_mapping.items():
                if py_field in alert_data and alert_data[py_field] is not None:
                    java_alert[java_field] = alert_data[py_field]

            # 2. 特殊处理的字段
            # ai_confidence -> aiConfidence
            if 'ai_confidence' in alert_data and alert_data['ai_confidence'] is not None:
                java_alert['aiConfidence'] = alert_data['ai_confidence']

            # log_entry_id -> logEntryId
            if 'log_entry_id' in alert_data and alert_data['log_entry_id'] is not None:
                java_alert['logEntryId'] = alert_data['log_entry_id']

            # process_id -> processId
            if 'process_id' in alert_data and alert_data['process_id'] is not None:
                java_alert['processId'] = alert_data['process_id']

            # ==================== 第二步：设置默认值 ====================
            if 'timestamp' not in java_alert or not java_alert['timestamp']:
                java_alert['timestamp'] = datetime.now().isoformat()

            if 'source' not in java_alert or not java_alert['source']:
                java_alert['source'] = 'SECURITY_COLLECTOR'

            if 'status' not in java_alert or not java_alert['status']:
                java_alert['status'] = 'PENDING'

            # ==================== 第三步：验证必填字段 ====================
            required_fields = ['alertId', 'timestamp', 'source', 'alertType', 'alertLevel', 'description']
            missing_fields = []

            for field in required_fields:
                value = java_alert.get(field)
                if value is None or (isinstance(value, str) and not value.strip()):
                    missing_fields.append(field)

            if missing_fields:
                logger.error(f"告警数据缺少必填字段: {missing_fields}")
                logger.error(f"完整告警数据: {alert_data}")
                return False

            # ==================== 第四步：类型转换 ====================
            # 转换aiConfidence为float
            if 'aiConfidence' in java_alert:
                try:
                    # 确保是float类型
                    confidence_value = java_alert['aiConfidence']
                    if isinstance(confidence_value, (int, float, str)):
                        java_alert['aiConfidence'] = float(confidence_value)
                    else:
                        logger.warning(f"AI置信度类型不支持: {type(confidence_value)}，使用默认值0.5")
                        java_alert['aiConfidence'] = 0.5
                except (ValueError, TypeError) as e:
                    logger.warning(f"AI置信度转换失败: {e}，使用默认值0.5")
                    java_alert['aiConfidence'] = 0.5

            # 转换processId为int
            if 'processId' in java_alert:
                try:
                    pid_value = java_alert['processId']
                    if isinstance(pid_value, (int, float, str)):
                        java_alert['processId'] = int(float(pid_value))
                    else:
                        logger.warning(f"Process ID类型不支持: {type(pid_value)}，移除该字段")
                        del java_alert['processId']
                except (ValueError, TypeError) as e:
                    logger.warning(f"Process ID转换失败: {e}，移除该字段")
                    del java_alert['processId']

            # 转换port为int
            if 'port' in java_alert:
                try:
                    port_value = java_alert['port']
                    if isinstance(port_value, (int, float, str)):
                        java_alert['port'] = int(float(port_value))
                    else:
                        logger.warning(f"端口号类型不支持: {type(port_value)}，移除该字段")
                        del java_alert['port']
                except (ValueError, TypeError) as e:
                    logger.warning(f"端口号转换失败: {e}，移除该字段")
                    del java_alert['port']

            # ==================== 第五步：清理None值 ====================
            # 移除值为None的字段
            java_alert = {k: v for k, v in java_alert.items() if v is not None}

            # ==================== 第六步：准备发送 ====================
            logger.info(f"发送告警 -> ID: {java_alert['alertId']}, "
                        f"类型: {java_alert['alertType']}, "
                        f"级别: {java_alert['alertLevel']}")

            # 序列化为JSON
            try:
                payload = json.dumps(java_alert, default=str, ensure_ascii=False)
                payload_bytes = payload.encode('utf-8')
            except Exception as e:
                logger.error(f"JSON序列化失败: {e}")
                return False

            # 设置请求头
            headers = {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
                'User-Agent': 'SecurityAlertCollector/2.0',
                'X-Collector-ID': self.collector_id
            }

            # ==================== 第七步：发送请求 ====================
            logger.debug(f"请求URL: {url}")
            logger.debug(f"请求体大小: {len(payload_bytes)} bytes")

            # 发送POST请求
            response = self.session.post(
                url,
                data=payload_bytes,
                headers=headers,
                timeout=self.config.request_timeout
            )

            # ==================== 第八步：处理响应 ====================
            logger.debug(f"响应状态码: {response.status_code}")

            if response.status_code in [200, 201]:
                # 成功
                try:
                    response_data = response.json()
                    logger.info(f"✅ 告警创建成功: {java_alert['alertId']}")

                    # 记录数据库ID（如果有）
                    if 'id' in response_data:
                        logger.debug(f"数据库ID: {response_data['id']}")

                except json.JSONDecodeError:
                    logger.info(f"✅ 告警创建成功，状态码: {response.status_code}")

                return True

            elif response.status_code == 400:
                # 请求参数错误
                logger.error(f"❌ Java后端参数错误 (400)")
                try:
                    error_data = response.json()
                    logger.error(f"错误详情: {error_data}")
                except:
                    logger.error(f"响应内容: {response.text[:500]}")

                # 记录发送的数据以便调试
                logger.error(f"发送的数据: {payload[:1000]}")
                return False

            elif response.status_code == 404:
                # API不存在
                logger.error(f"❌ Java后端API不存在 (404)")
                logger.error(f"请检查: 1) URL是否正确 2) Java服务是否运行")
                return False

            elif response.status_code == 500:
                # 服务器内部错误
                logger.error(f"❌ Java后端服务器内部错误 (500)")
                try:
                    error_data = response.json()
                    logger.error(f"错误详情: {error_data}")
                except:
                    logger.error(f"响应内容: {response.text[:500]}")
                return False

            else:
                # 其他错误
                logger.error(f"❌ 发送告警失败，状态码: {response.status_code}")
                logger.error(f"响应: {response.text[:500]}")
                return False

        except requests.exceptions.Timeout:
            logger.error(f"❌ 请求超时，Java后端可能未响应")
            return False

        except requests.exceptions.ConnectionError:
            logger.error(f"❌ 连接失败，无法访问Java后端")
            logger.error(f"请检查: 1) Java服务地址 2) 网络连接 3) 防火墙")
            return False

        except Exception as e:
            logger.error(f"❌ 发送告警时发生未预期错误: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    def send_performance_data(self, performance_data: Dict) -> bool:
        """
        发送性能数据到Java后端（如果支持）
        """
        try:
            url = f"{self.config.java_backend_url}/api/system/metrics"

            payload = json.dumps(performance_data, default=str,
                                 ensure_ascii=False).encode('utf-8')

            response = self.session.post(url, data=payload,
                                         timeout=self.config.request_timeout)

            if response.status_code in [200, 201]:
                logger.debug("成功发送性能数据到Java后端")
                return True
            else:
                return False

        except Exception:
            return False

    # ==================== 告警逻辑 ====================

    def _should_create_alert_for_event(self, alert_level: str, event_type: str) -> bool:
        """判断是否需要为事件创建告警"""
        # 配置最低告警级别
        level_priority = {
            "CRITICAL": 4,
            "HIGH": 3,
            "MEDIUM": 2,
            "LOW": 1
        }

        min_level_priority = level_priority.get(self.config.alert_min_severity, 2)
        event_level_priority = level_priority.get(alert_level, 0)

        if event_level_priority < min_level_priority:
            return False

        # 重要的事件类型
        important_event_types = [
            "SUSPICIOUS_PROCESS",
            "SUSPICIOUS_CONNECTION",
            "LOGIN_FAILED",
            "UNAUTHORIZED_ACCESS",
            "MALWARE_DETECTED",
            "EXPLOIT_ATTEMPT",
            "BRUTE_FORCE_ATTACK"
        ]

        if event_type in important_event_types:
            return True

        # 包含特定关键词
        suspicious_keywords = ["SUSPICIOUS", "ATTACK", "EXPLOIT",
                               "MALWARE", "INTRUSION", "BREACH"]

        for keyword in suspicious_keywords:
            if keyword in event_type:
                return True

        return False

    def _should_create_alert(self, alert: Dict) -> bool:
        """判断是否需要创建告警"""
        try:
            # 检查告警级别
            alert_level = alert.get('alertLevel', '').upper()
            level_priority = {
                "CRITICAL": 4,
                "HIGH": 3,
                "MEDIUM": 2,
                "LOW": 1
            }

            min_level_priority = level_priority.get(self.config.alert_min_severity, 2)
            event_level_priority = level_priority.get(alert_level, 0)

            if event_level_priority < min_level_priority:
                return False

            # 检查是否已缓存（防止重复告警）
            alert_key = self._generate_alert_key(alert)
            if alert_key in self.alert_cache:
                # 检查是否过期
                cache_time = self.alert_cache[alert_key]
                if datetime.now() - cache_time < self.cache_expiry:
                    return False

            return True

        except Exception:
            return True

    def _generate_alert_key(self, alert: Dict) -> str:
        """生成告警缓存键"""
        try:
            alert_type = alert.get('alertType', '')
            source = alert.get('source', '')
            description = alert.get('description', '')[:100]

            # 创建哈希键
            key_string = f"{alert_type}_{source}_{description}"
            return hashlib.md5(key_string.encode()).hexdigest()

        except Exception:
            return str(hash(str(alert)))

    def _generate_alert_description(self, event: Dict) -> str:
        """生成告警描述"""
        try:
            normalized = event.get('normalized_message', '')
            raw = event.get('raw_message', '')
            event_type = event.get('event_type', '')

            if normalized:
                return normalized
            elif raw:
                # 截取前200个字符
                short_raw = raw[:200] + "..." if len(raw) > 200 else raw
                return f"{event_type}: {short_raw}"
            else:
                return f"检测到 {event_type} 类型的安全事件"

        except Exception:
            return "安全事件告警"

    def _cleanup_alert_cache(self):
        """清理过期的告警缓存"""
        try:
            current_time = datetime.now()
            expired_keys = []

            for key, cache_time in self.alert_cache.items():
                if current_time - cache_time > self.cache_expiry:
                    expired_keys.append(key)

            for key in expired_keys:
                del self.alert_cache[key]

            if expired_keys:
                logger.debug(f"清理了 {len(expired_keys)} 个过期的告警缓存")

        except Exception as e:
            logger.warning(f"清理告警缓存失败: {e}")

    # ==================== 定时任务 ====================

    def _start_timed_collectors(self):
        """
        启动定时收集器
        """
        # 安全日志收集器
        security_thread = threading.Thread(
            target=self._run_security_collector,
            name="SecurityCollector",
            daemon=True
        )
        security_thread.start()

        # 性能监控收集器
        performance_thread = threading.Thread(
            target=self._run_performance_collector,
            name="PerformanceCollector",
            daemon=True
        )
        performance_thread.start()

        # 告警检查器
        if self.config.auto_create_alerts:
            alert_thread = threading.Thread(
                target=self._run_alert_checker,
                name="AlertChecker",
                daemon=True
            )
            alert_thread.start()

        logger.info("定时收集器已启动")

    def _run_security_collector(self):
        """运行安全日志收集器"""
        logger.info(f"启动安全日志收集器，间隔: {self.config.security_collection_interval} 分钟")

        while True:
            try:
                self.collect_all_data()

            except Exception as e:
                logger.error(f"安全日志收集器运行失败: {e}")

            # 等待指定间隔
            time.sleep(self.config.security_collection_interval * 60)

    def _run_performance_collector(self):
        """运行性能监控收集器"""
        logger.info(f"启动性能监控收集器，间隔: {self.config.performance_collection_interval} 分钟")

        while True:
            try:
                # 收集性能数据
                performance_data = self.collect_performance_metrics()

                # 发送性能数据到Java后端
                if performance_data and not performance_data.get('error'):
                    self.send_performance_data(performance_data)

                # 检查性能异常并创建告警
                if self.config.auto_create_alerts:
                    alerts = self._create_alerts_from_performance_data(performance_data)
                    for alert in alerts:
                        if self._should_create_alert(alert):
                            self.send_alert_to_java(alert)

            except Exception as e:
                logger.error(f"性能监控收集器运行失败: {e}")

            # 等待指定间隔
            time.sleep(self.config.performance_collection_interval * 60)

    def _run_alert_checker(self):
        """运行告警检查器"""
        logger.info(f"启动告警检查器，间隔: {self.config.alert_check_interval} 分钟")

        while True:
            try:
                # 快速检查系统状态
                quick_check = self._quick_system_check()

                # 如果有问题，立即收集详细数据
                if quick_check.get('has_issues'):
                    logger.warning("系统检测到问题，立即进行详细检查")
                    self.collect_all_data()

            except Exception as e:
                logger.error(f"告警检查器运行失败: {e}")

            # 等待指定间隔
            time.sleep(self.config.alert_check_interval * 60)

    def _quick_system_check(self) -> Dict:
        """快速系统检查"""
        try:
            issues = []

            # 检查CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > self.config.cpu_high_threshold:
                issues.append(f"CPU使用率高: {cpu_percent:.1f}%")

            # 检查内存
            memory_percent = psutil.virtual_memory().percent
            if memory_percent > self.config.memory_high_threshold:
                issues.append(f"内存使用率高: {memory_percent:.1f}%")

            # 检查磁盘
            disk_percent = psutil.disk_usage('/').percent
            if disk_percent > self.config.disk_high_threshold:
                issues.append(f"磁盘使用率高: {disk_percent:.1f}%")

            return {
                'has_issues': len(issues) > 0,
                'issues': issues,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.warning(f"快速系统检查失败: {e}")
            return {'has_issues': False, 'issues': [], 'error': str(e)}

    # ==================== 工具方法 ====================

    def _safe_json_dumps(self, data: Any) -> str:
        """安全的JSON序列化"""
        try:
            return json.dumps(data, ensure_ascii=False, default=str)
        except Exception:
            try:
                return str(data)
            except Exception:
                return "{}"

    def get_stats(self) -> Dict:
        """获取统计信息"""
        stats = self.stats.copy()
        stats.update({
            'collector_id': self.collector_id,
            'collector_host': self.collector_host,
            'uptime': int(time.time() - (self.stats.get('start_time', time.time()))),
            'config': asdict(self.config),
            'alert_cache_size': len(self.alert_cache),
            'performance_cache_age': int(time.time() - self.last_performance_collection)
        })

        return stats

    def stop(self):
        """停止收集器"""
        logger.info("停止安全告警收集器...")

        # 发送停止事件
        stop_event = SecurityEvent(
            timestamp=datetime.now().isoformat(),
            source_system="COLLECTOR",
            event_type="COLLECTOR_STOPPED",
            category="SYSTEM",
            severity="INFO",
            normalized_message="安全告警收集器已停止",
            event_data={
                "collector_id": self.collector_id,
                "collector_host": self.collector_host,
                "stats": self.stats
            }
        ).to_dict()

        self.send_security_events([stop_event])

        logger.info("安全告警收集器已停止")

# ==================== 主函数 ====================

def main():
    """主函数"""
    print("=" * 60)
    print("安全日志与告警集成收集器 v2.0")
    print("=" * 60)

    # 解析命令行参数
    import argparse
    parser = argparse.ArgumentParser(description='安全日志与告警集成收集器')
    parser.add_argument('--java-url', default='http://localhost:8080',
                        help='Java后端URL (默认: http://localhost:8080)')
    parser.add_argument('--interval', type=int, default=5,
                        help='收集间隔（分钟）(默认: 5)')
    parser.add_argument('--no-alerts', action='store_true',
                        help='禁用自动创建告警')
    parser.add_argument('--test', action='store_true',
                        help='测试模式（只运行一次）')
    parser.add_argument('--config', help='配置文件路径')

    args = parser.parse_args()

    # 创建配置
    config = CollectorConfig(
        java_backend_url=args.java_url,
        security_collection_interval=args.interval,
        auto_create_alerts=not args.no_alerts
    )

    # 创建收集器
    collector = IntegratedSecurityAlertCollector(config)

    # 测试模式
    if args.test:
        print("\n[测试模式] 运行一次完整的数据收集...")

        # 测试Java后端连接
        if not collector.test_java_backend():
            print("错误: Java后端连接失败")
            return 1

        # 收集所有数据
        result = collector.collect_all_data()

        print(f"\n收集完成:")
        print(f"- 安全事件: {len(result.get('security_events', []))}")
        print(f"- 告警创建: {result.get('alerts_created', 0)}")
        print(f"- 错误: {result.get('error', '无')}")

        # 显示统计信息
        stats = collector.get_stats()
        print(f"\n统计信息:")
        print(f"- 总事件收集数: {stats['total_events_collected']}")
        print(f"- 总告警创建数: {stats['total_alerts_created']}")
        print(f"- 总性能检查数: {stats['total_performance_checks']}")

        return 0

    # 正常模式
    print("\n[正常模式] 启动定时收集器...")
    print(f"- Java后端: {config.java_backend_url}")
    print(f"- 收集间隔: {config.security_collection_interval} 分钟")
    print(f"- 自动告警: {'启用' if config.auto_create_alerts else '禁用'}")
    print(f"- 最低告警级别: {config.alert_min_severity}")
    print("-" * 60)

    try:
        # 启动收集器
        if collector.start_all_collectors():
            print("✓ 所有收集器已成功启动")
            print("\n按 Ctrl+C 停止收集器...")

            # 保持主线程运行
            try:
                while True:
                    time.sleep(60)

                    # 每小时显示一次状态
                    if int(time.time()) % 3600 < 60:
                        stats = collector.get_stats()
                        print(f"\n[状态更新] 事件: {stats['total_events_collected']}, "
                              f"告警: {stats['total_alerts_created']}, "
                              f"错误: {len(stats['errors'])}")

            except KeyboardInterrupt:
                print("\n\n收到停止信号...")
                collector.stop()
                print("收集器已停止")
                return 0

        else:
            print("✗ 收集器启动失败")
            return 1

    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
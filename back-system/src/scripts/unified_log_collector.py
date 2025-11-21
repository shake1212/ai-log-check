import logging
import requests
import json
import time
import threading
import subprocess
import platform
import psutil
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SecurityLogCollector")

class SecurityLogCollector:
    def __init__(self, java_backend_url: str = "http://localhost:8080"):
        self.java_backend_url = java_backend_url
        self.session = requests.Session()
        self.collector_host = platform.node() or "unknown-host"

        # 配置请求头
        self.session.headers.update({
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'SecurityLogCollector/1.0'
        })

        # 安全相关配置
        self.SUSPICIOUS_PORTS = {23, 4444, 5555, 6666, 6667, 1337, 31337, 12345, 27374, 54320}

        # 扩展可疑进程关键词
        self.SUSPICIOUS_KEYWORDS = {
            "miner", "bitcoin", "eth", "monero", "crypto", "coin",
            "backdoor", "trojan", "malware", "virus", "ransomware",
            "keylogger", "spyware", "rootkit", "exploit",
            "mimikatz", "metasploit", "payload", "shellcode",
            "webshell", "botnet", "rat", "spy", "hack", "exploit"
        }

        # 可疑文件路径模式
        self.SUSPICIOUS_PATHS = {
            "/tmp/", "/var/tmp/", "/dev/shm/", "C:\\Windows\\Temp\\",
            "C:\\Users\\Public\\", "AppData\\Local\\Temp\\"
        }

    def send_to_java_backend(self, events: List[Dict]) -> bool:
        """发送安全事件到Java后端"""
        if not events:
            return True

        try:
            url = f"{self.java_backend_url}/api/events/batch"

            # 确保事件数据格式正确，符合Java端的DTO结构
            formatted_events = []
            for event in events:
                formatted_event = {
                    "timestamp": event.get("timestamp", datetime.now().isoformat()),
                    "sourceSystem": event.get("sourceSystem", "UNKNOWN"),
                    "eventType": event.get("eventType", "SECURITY_EVENT"),
                    "category": event.get("category", "SECURITY"),
                    "severity": event.get("severity", "INFO"),
                    "rawMessage": event.get("rawMessage", ""),
                    "normalizedMessage": event.get("normalizedMessage", ""),
                    "isAnomaly": event.get("isAnomaly", False),
                    # Java端实体类字段映射
                    "hostName": event.get("hostName"),
                    "userId": event.get("userId"),
                    "sourceIp": event.get("sourceIp"),
                    "destinationIp": event.get("destinationIp"),
                    "destinationPort": event.get("destinationPort"),
                    "processName": event.get("processName"),
                    "processId": event.get("processId"),
                    "rawData": event.get("rawData"),
                    "eventData": event.get("eventData", {}),
                    # 网络相关字段
                    "protocol": event.get("protocol"),
                    "sourcePort": event.get("sourcePort"),
                    "eventSubType": event.get("eventSubType"),
                    # 异常检测相关字段（Java端会覆盖这些）
                    "anomalyScore": event.get("anomalyScore", 0.0),
                    "anomalyReason": event.get("anomalyReason"),
                    "threatLevel": event.get("threatLevel"),
                    "detectionAlgorithm": event.get("detectionAlgorithm")
                }
                formatted_events.append(formatted_event)

            payload = json.dumps(formatted_events, default=str, ensure_ascii=False).encode('utf-8')

            response = self.session.post(url, data=payload, timeout=30)

            if response.status_code == 201:
                logger.info(f"成功发送 {len(events)} 个安全事件到Java后端")
                return True
            else:
                logger.error(f"发送安全事件失败，状态码: {response.status_code}, 响应: {response.text}")
                return False

        except requests.exceptions.RequestException as e:
            logger.error(f"发送安全事件到Java后端失败: {e}")
            return False
        except Exception as e:
            logger.error(f"发送安全事件时发生未知错误: {e}")
            return False

    def collect_security_logs(self) -> List[Dict]:
        """收集所有安全相关日志"""
        logger.info("开始收集安全日志...")

        security_events = []

        try:
            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = {
                    executor.submit(self.collect_windows_security_events): "windows_security",
                    executor.submit(self.collect_unix_security_events): "unix_security",
                    executor.submit(self.collect_network_security_events): "network_security",
                    executor.submit(self.collect_process_security_events): "process_security"
                }

                for future in futures:
                    try:
                        events = future.result(timeout=60)
                        if events:
                            security_events.extend(events)
                    except Exception as e:
                        logger.error(f"收集 {futures[future]} 失败: {e}")
                        security_events.append(self._create_error_event(futures[future].upper(), str(e)))

            logger.info(f"安全日志收集完成，共收集 {len(security_events)} 个安全事件")
            return security_events

        except Exception as e:
            logger.error(f"安全日志收集过程中发生错误: {e}")
            return [self._create_error_event("MAIN_COLLECTOR", str(e))]

    def collect_windows_security_events(self) -> List[Dict]:
        """收集Windows安全事件日志"""
        if platform.system() != "Windows":
            return []

        events = []
        try:
            logger.debug("收集Windows安全事件日志...")

            # 重点关注安全相关的事件ID
            security_event_ids = "4624,4625,4648,4672,4720,4732,4733,4740,4768,4776"

            powershell_cmd = f"""
            Get-WinEvent -FilterHashtable @{{LogName='Security'; StartTime=(Get-Date).AddHours(-1)}} | 
            Where-Object {{$_.Id -in ({security_event_ids})}} |
            Select-Object TimeCreated, Id, LevelDisplayName, LogName, ProviderName, Message, MachineName, UserId | 
            ConvertTo-Json -Depth 3
            """

            result = subprocess.run(
                ["powershell", "-Command", powershell_cmd],
                capture_output=True,
                text=True,
                timeout=60,
                encoding='utf-8',
                errors='ignore'
            )

            if result.returncode == 0 and result.stdout.strip():
                events_data = json.loads(result.stdout)

                if isinstance(events_data, list):
                    for event in events_data:
                        parsed_event = self._parse_windows_security_event(event)
                        if parsed_event:
                            events.append(parsed_event)
                elif isinstance(events_data, dict):
                    # 如果只有一个事件
                    parsed_event = self._parse_windows_security_event(events_data)
                    if parsed_event:
                        events.append(parsed_event)

            logger.info(f"收集到 {len(events)} 个Windows安全事件")

        except Exception as e:
            logger.error(f"收集Windows安全事件失败: {e}")

        return events

    def collect_unix_security_events(self) -> List[Dict]:
        """收集Unix/Linux安全日志"""
        if platform.system() == "Windows":
            return []

        events = []
        try:
            logger.debug("收集Unix安全日志...")

            # 重点关注的安全日志文件
            security_log_files = ["/var/log/auth.log", "/var/log/secure", "/var/log/syslog"]

            security_keywords = [
                "failed", "error", "authentication", "login", "ssh", "sudo",
                "su:", "password", "invalid", "refused", "attack", "intrusion",
                "breach", "unauthorized", "firewall", "iptables", "selinux"
            ]

            for log_file in security_log_files:
                try:
                    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()

                    # 检查最后200行安全相关日志
                    recent_lines = lines[-200:] if len(lines) > 200 else lines

                    for line in recent_lines:
                        line_lower = line.lower()
                        if any(keyword in line_lower for keyword in security_keywords):
                            event = self._parse_unix_security_log(line.strip(), log_file)
                            if event:
                                events.append(event)

                except FileNotFoundError:
                    continue
                except Exception as e:
                    logger.warning(f"读取安全日志文件 {log_file} 失败: {e}")

            logger.info(f"收集到 {len(events)} 个Unix安全事件")

        except Exception as e:
            logger.error(f"收集Unix安全事件失败: {e}")

        return events

    def collect_network_security_events(self) -> List[Dict]:
        """收集网络安全事件"""
        events = []
        try:
            logger.debug("收集网络安全事件...")

            is_windows = platform.system() == "Windows"
            cmd = ["netstat", "-an"] if is_windows else ["netstat", "-tuln"]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                encoding='utf-8',
                errors='ignore'
            )

            connections = []
            for line in result.stdout.split('\n'):
                if any(state in line for state in ["ESTABLISHED", "LISTEN", "LISTENING"]):
                    connections.append(line)

            # 分析连接，检测可疑模式
            for line in connections:
                event = self._parse_network_security_event(line)
                if event:
                    events.append(event)

            # 收集额外的网络信息
            events.extend(self._collect_network_interface_info())
            events.extend(self._collect_firewall_info())

            logger.info(f"收集到 {len(events)} 个网络安全事件")

        except Exception as e:
            logger.error(f"收集网络安全事件失败: {e}")

        return events

    def collect_process_security_events(self) -> List[Dict]:
        """收集进程安全事件"""
        events = []
        try:
            logger.debug("收集进程安全事件...")

            # 重点关注高权限和可疑进程
            suspicious_processes = []
            high_privilege_processes = []

            for proc in psutil.process_iter(['pid', 'name', 'username', 'exe', 'cmdline', 'create_time']):
                try:
                    proc_info = proc.info
                    process_name = proc_info.get('name', '')
                    username = proc_info.get('username', '')
                    exe_path = proc_info.get('exe', '')
                    cmdline = proc_info.get('cmdline', [])

                    # 检测可疑进程
                    if self._is_suspicious_process(process_name, exe_path, cmdline):
                        suspicious_processes.append(proc_info)

                    # 检测高权限进程
                    if username in ['root', 'SYSTEM', 'Administrator', 'NT AUTHORITY\\SYSTEM']:
                        high_privilege_processes.append(proc_info)

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            # 为可疑进程创建事件
            for proc_info in suspicious_processes:
                event = self._create_suspicious_process_event(proc_info)
                if event:
                    events.append(event)

            # 为高权限进程创建事件（只记录部分）
            for proc_info in high_privilege_processes[:10]:  # 限制数量
                event = self._create_privileged_process_event(proc_info)
                if event:
                    events.append(event)

            logger.info(f"收集到 {len(events)} 个进程安全事件")

        except Exception as e:
            logger.error(f"收集进程安全事件失败: {e}")

        return events

    def _parse_windows_security_event(self, event: Dict) -> Optional[Dict]:
        """解析Windows安全事件"""
        try:
            event_id = event.get("Id")
            event_type = self._map_windows_security_event_id(event_id)
            severity = self._map_windows_security_level(event_id, event.get("LevelDisplayName", ""))

            event_data = {
                "logName": event.get("LogName"),
                "provider": event.get("ProviderName"),
                "level": event.get("LevelDisplayName"),
                "machineName": event.get("MachineName"),
                "collectorHost": self.collector_host,
                "userId": event.get("UserId"),
                "recordId": event.get("RecordId"),
                "keywords": event.get("Keywords")
            }

            if event.get("ReplacementStrings"):
                event_data["replacementStrings"] = event.get("ReplacementStrings")

            security_event = {
                "timestamp": event.get("TimeCreated", "").replace("Z", ""),
                "sourceSystem": "WINDOWS",
                "eventType": event_type,
                "category": "SECURITY",
                "severity": severity,
                "eventCode": event_id,
                "rawMessage": event.get("Message", ""),
                "normalizedMessage": f"Windows安全事件[{event_id}]: {event_type}",
                "hostName": event.get("MachineName", ""),
                "userId": event.get("UserId"),
                "eventData": event_data,
                "rawData": self._safe_json_dumps(event)
            }

            # 注意：这里不设置异常相关字段，由Java端分析检测
            # Python只负责收集，Java负责分析

            return security_event

        except Exception as e:
            logger.warning(f"解析Windows安全事件失败: {e}")
            return None

    def _parse_unix_security_log(self, line: str, log_file: str) -> Optional[Dict]:
        """解析Unix安全日志"""
        try:
            # 检测日志类型和严重性
            event_type = self._detect_unix_security_event_type(line)
            severity = self._detect_unix_security_level(line)

            # 提取关键信息
            user_match = re.search(r'user=(\w+)', line)
            source_match = re.search(r'from=([\d\.]+)', line)

            security_event = {
                "timestamp": datetime.now().isoformat(),
                "sourceSystem": "LINUX",
                "eventType": event_type,
                "category": "SECURITY",
                "severity": severity,
                "rawMessage": line,
                "normalizedMessage": self._create_unix_security_message(line, event_type),
                "eventData": {
                    "logFile": log_file,
                    "collectorHost": self.collector_host,
                    "originalLine": line
                },
                "rawData": self._safe_json_dumps({
                    "logFile": log_file,
                    "line": line
                })
            }

            if user_match:
                security_event["userId"] = user_match.group(1)
            if source_match:
                security_event["sourceIp"] = source_match.group(1)

            # 注意：这里不设置异常相关字段，由Java端分析检测

            return security_event

        except Exception as e:
            logger.warning(f"解析Unix安全日志失败: {e}")
            return None

    def _parse_network_security_event(self, line: str) -> Optional[Dict]:
        """解析网络安全事件"""
        try:
            is_windows = platform.system() == "Windows"

            event = {
                "timestamp": datetime.now().isoformat(),
                "sourceSystem": "NETWORK",
                "eventType": "NETWORK_CONNECTION",
                "category": "NETWORK_SECURITY",
                "severity": "INFO",  # 基础级别，Java分析后会调整
                "rawMessage": line,
                "normalizedMessage": f"网络连接: {line.strip()}"
            }

            parts = line.strip().split()

            if is_windows and len(parts) >= 3:
                event["protocol"] = parts[0]

                if ":" in parts[1]:
                    local_parts = parts[1].split(":")
                    if len(local_parts) == 2:
                        event["hostIp"] = local_parts[0]
                        try:
                            event["sourcePort"] = int(local_parts[1])
                        except ValueError:
                            pass

                if len(parts) >= 3 and ":" in parts[2]:
                    remote_parts = parts[2].split(":")
                    if len(remote_parts) == 2:
                        event["destinationIp"] = remote_parts[0]
                        try:
                            event["destinationPort"] = int(remote_parts[1])
                        except ValueError:
                            pass

                if len(parts) >= 4:
                    state = parts[3]
                    event["eventSubType"] = state

                    # 检测可疑连接（只设置基础标记，Java端会详细分析）
                    if self._is_suspicious_connection(event):
                        event["severity"] = "WARN"
                        event.setdefault("eventData", {})
                        event["eventData"]["suspiciousReason"] = self._get_suspicious_connection_reason(event)

            elif not is_windows and len(parts) >= 6:
                event["protocol"] = parts[0]

                if ":" in parts[3]:
                    local_parts = parts[3].split(":")
                    if len(local_parts) >= 2:
                        event["hostIp"] = "localhost" if local_parts[0] == "0.0.0.0" else local_parts[0]
                        try:
                            event["sourcePort"] = int(local_parts[1])
                        except ValueError:
                            pass

                if ":" in parts[4]:
                    remote_parts = parts[4].split(":")
                    if len(remote_parts) >= 2:
                        event["destinationIp"] = remote_parts[0]
                        try:
                            event["destinationPort"] = int(remote_parts[1])
                        except ValueError:
                            pass

                state = parts[5]
                event["eventSubType"] = state

                # 检测可疑连接（只设置基础标记，Java端会详细分析）
                if self._is_suspicious_connection(event):
                    event["severity"] = "WARN"
                    event.setdefault("eventData", {})
                    event["eventData"]["suspiciousReason"] = self._get_suspicious_connection_reason(event)

            connection_snapshot = {
                "collectorHost": self.collector_host,
                "connectionLine": line,
                "protocol": event.get("protocol"),
                "state": event.get("eventSubType"),
                "sourceIp": event.get("hostIp"),
                "sourcePort": event.get("sourcePort"),
                "destinationIp": event.get("destinationIp"),
                "destinationPort": event.get("destinationPort")
            }
            if event.get("eventData"):
                connection_snapshot.update(event["eventData"])

            event["eventData"] = connection_snapshot
            event["rawData"] = self._safe_json_dumps(connection_snapshot)

            return event

        except Exception as e:
            logger.warning(f"解析网络安全事件失败: {e}")
            return None

    def _create_suspicious_process_event(self, proc_info: Dict) -> Optional[Dict]:
        """创建可疑进程事件"""
        try:
            process_name = proc_info.get('name', '')
            username = proc_info.get('username', '')
            exe_path = proc_info.get('exe', '')

            event = {
                "timestamp": datetime.now().isoformat(),
                "sourceSystem": "SYSTEM",
                "eventType": "SUSPICIOUS_PROCESS",
                "category": "PROCESS_SECURITY",
                "severity": "HIGH",  # 基础级别，Java分析后会调整
                "processId": proc_info.get('pid'),
                "processName": process_name,
                "userId": username,
                "normalizedMessage": f"检测到可疑进程: {process_name} (PID: {proc_info.get('pid')}, 用户: {username})",
                "isAnomaly": False,  # 由Java分析决定
                "eventData": {
                    "exe_path": exe_path,
                    "cmdline": proc_info.get('cmdline', []),
                    "create_time": proc_info.get('create_time'),
                    "memory_info": proc_info.get('memory_info'),
                    "cpu_percent": proc_info.get('cpu_percent'),
                    "collectorHost": self.collector_host
                },
                "rawData": self._safe_json_dumps(proc_info)
            }

            return event

        except Exception as e:
            logger.warning(f"创建可疑进程事件失败: {e}")
            return None

    def _create_privileged_process_event(self, proc_info: Dict) -> Optional[Dict]:
        """创建高权限进程事件"""
        try:
            event = {
                "timestamp": datetime.now().isoformat(),
                "sourceSystem": "SYSTEM",
                "eventType": "PRIVILEGED_PROCESS",
                "category": "PROCESS_SECURITY",
                "severity": "MEDIUM",
                "processId": proc_info.get('pid'),
                "processName": proc_info.get('name', ''),
                "userId": proc_info.get('username', ''),
                "normalizedMessage": f"高权限进程: {proc_info.get('name', '')} (用户: {proc_info.get('username', '')})",
                "eventData": {
                    "exe_path": proc_info.get('exe'),
                    "cmdline": proc_info.get('cmdline'),
                    "collectorHost": self.collector_host,
                    "create_time": proc_info.get('create_time')
                },
                "rawData": self._safe_json_dumps(proc_info)
            }

            return event

        except Exception as e:
            logger.warning(f"创建高权限进程事件失败: {e}")
            return None

    def _collect_network_interface_info(self) -> List[Dict]:
        """收集网络接口信息"""
        events = []
        try:
            interfaces = psutil.net_if_addrs()
            for interface, addrs in interfaces.items():
                for addr in addrs:
                    if addr.family == 2:  # IPv4
                        event = {
                            "timestamp": datetime.now().isoformat(),
                            "sourceSystem": "NETWORK",
                            "eventType": "NETWORK_INTERFACE",
                            "category": "NETWORK_SECURITY",
                            "severity": "INFO",
                            "normalizedMessage": f"网络接口: {interface} - {addr.address}",
                            "eventData": {
                                "interface": interface,
                                "ip_address": addr.address,
                                "netmask": addr.netmask,
                                "collectorHost": self.collector_host
                            },
                            "rawData": self._safe_json_dumps({
                                "interface": interface,
                                "address": addr.address,
                                "netmask": addr.netmask
                            })
                        }
                        events.append(event)
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
                    errors='ignore'
                )
                if result.returncode == 0:
                    event = {
                        "timestamp": datetime.now().isoformat(),
                        "sourceSystem": "SECURITY",
                        "eventType": "FIREWALL_STATUS",
                        "category": "NETWORK_SECURITY",
                        "severity": "INFO",
                        "normalizedMessage": "Windows防火墙状态检查",
                        "eventData": {
                            "collectorHost": self.collector_host,
                            "output": result.stdout
                        },
                        "rawData": self._safe_json_dumps({
                            "output": result.stdout
                        })
                    }
                    events.append(event)
            else:
                # Linux iptables状态
                result = subprocess.run(
                    ["iptables", "-L", "-n"],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='ignore'
                )
                if result.returncode == 0:
                    event = {
                        "timestamp": datetime.now().isoformat(),
                        "sourceSystem": "SECURITY",
                        "eventType": "FIREWALL_STATUS",
                        "category": "NETWORK_SECURITY",
                        "severity": "INFO",
                        "normalizedMessage": "iptables防火墙规则",
                        "eventData": {
                            "collectorHost": self.collector_host,
                            "output": result.stdout
                        },
                        "rawData": self._safe_json_dumps({
                            "output": result.stdout
                        })
                    }
                    events.append(event)

        except Exception as e:
            logger.warning(f"收集防火墙信息失败: {e}")

        return events

    def _is_suspicious_process(self, process_name: str, exe_path: str, cmdline: List[str]) -> bool:
        """检测可疑进程"""
        if not process_name:
            return False

        lower_name = process_name.lower()
        lower_exe = exe_path.lower() if exe_path else ""
        lower_cmdline = " ".join(cmdline).lower() if cmdline else ""

        # 检查进程名
        if any(keyword in lower_name for keyword in self.SUSPICIOUS_KEYWORDS):
            return True

        # 检查可执行文件路径
        if any(suspicious_path in lower_exe for suspicious_path in self.SUSPICIOUS_PATHS):
            return True

        # 检查命令行参数
        if any(keyword in lower_cmdline for keyword in self.SUSPICIOUS_KEYWORDS):
            return True

        return False

    def _is_suspicious_connection(self, connection: Dict) -> bool:
        """检测可疑网络连接"""
        # 检查可疑端口
        if connection.get("destinationPort") in self.SUSPICIOUS_PORTS:
            return True

        # 检查外部IP连接（简单示例）
        dest_ip = connection.get("destinationIp", "")
        if dest_ip and not dest_ip.startswith(("127.", "10.", "192.168.", "172.16.")):
            if connection.get("destinationPort", 0) > 1024:  # 非标准端口
                return True

        return False

    def _get_suspicious_connection_reason(self, connection: Dict) -> str:
        """获取可疑连接的原因"""
        reasons = []

        if connection.get("destinationPort") in self.SUSPICIOUS_PORTS:
            reasons.append(f"连接到可疑端口 {connection['destinationPort']}")

        dest_ip = connection.get("destinationIp", "")
        if dest_ip and not dest_ip.startswith(("127.", "10.", "192.168.", "172.16.")):
            reasons.append(f"连接到外部IP {dest_ip}")

        return "; ".join(reasons) if reasons else "未知可疑行为"

    def _map_windows_security_event_id(self, event_id: int) -> str:
        """映射Windows安全事件ID到事件类型"""
        mapping = {
            4624: "LOGON_SUCCESS",
            4625: "LOGON_FAILED",
            4648: "EXPLICIT_LOGON",
            4672: "SPECIAL_PRIVILEGE",
            4720: "USER_CREATED",
            4732: "GROUP_MEMBER_ADDED",
            4733: "GROUP_MEMBER_REMOVED",
            4740: "USER_ACCOUNT_LOCKED",
            4768: "KERBEROS_TICKET_REQUEST",
            4776: "CREDENTIAL_VALIDATION"
        }
        return mapping.get(event_id, "WINDOWS_SECURITY_EVENT")

    def _map_windows_security_level(self, event_id: int, level: str) -> str:
        """映射Windows安全事件严重级别"""
        # 关键安全事件提升级别
        critical_events = {4625, 4732, 4733, 4740}  # 登录失败、账户变更等

        if event_id in critical_events:
            return "HIGH"
        elif level == "Error":
            return "ERROR"
        elif level == "Warning":
            return "WARN"
        else:
            return "INFO"

    def _detect_unix_security_event_type(self, line: str) -> str:
        """检测Unix安全事件类型"""
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
        else:
            return "UNIX_SECURITY_EVENT"

    def _detect_unix_security_level(self, line: str) -> str:
        """检测Unix安全事件严重级别"""
        line_lower = line.lower()

        if any(word in line_lower for word in ["error", "failed", "invalid", "refused", "attack"]):
            return "HIGH"
        elif any(word in line_lower for word in ["warn", "warning", "unauthorized"]):
            return "WARN"
        else:
            return "INFO"

    def _create_unix_security_message(self, line: str, event_type: str) -> str:
        """创建Unix安全事件消息"""
        if len(line) > 200:
            short_line = line[:200] + "..."
        else:
            short_line = line

        return f"Unix安全事件[{event_type}]: {short_line}"

    def _create_error_event(self, collector: str, error: str) -> Dict:
        """创建错误事件"""
        return {
            "timestamp": datetime.now().isoformat(),
            "sourceSystem": "COLLECTOR",
            "eventType": "COLLECTOR_ERROR",
            "category": "SYSTEM",
            "severity": "ERROR",
            "normalizedMessage": f"安全收集器 {collector} 错误: {error}",
            "isAnomaly": False,
            "eventData": {
                "collector": collector,
                "error": error,
                "collectorHost": self.collector_host
            },
            "rawData": self._safe_json_dumps({
                "collector": collector,
                "error": error
            })
        }

    def _safe_json_dumps(self, data: Any) -> str:
        try:
            return json.dumps(data, ensure_ascii=False, default=str)
        except Exception:
            return str(data)

    def start_security_collection(self, interval_minutes: int = 5):
        """启动安全日志定时收集"""
        def run_security_scheduler():
            while True:
                try:
                    security_events = self.collect_security_logs()
                    if security_events:
                        success = self.send_to_java_backend(security_events)
                        if success:
                            logger.info(f"成功发送 {len(security_events)} 个安全事件到Java分析端")
                        else:
                            logger.error("发送安全事件到Java分析端失败")
                    else:
                        logger.info("本次收集没有发现安全事件")
                except Exception as e:
                    logger.error(f"安全日志定时收集失败: {e}")

                time.sleep(interval_minutes * 60)

        scheduler_thread = threading.Thread(target=run_security_scheduler, daemon=True)
        scheduler_thread.start()
        logger.info(f"启动安全日志定时收集，间隔: {interval_minutes} 分钟")

def main():
    """安全日志收集器主函数"""
    collector = SecurityLogCollector("http://localhost:8080")

    # 测试Java后端连接
    test_events = [{
        "timestamp": datetime.now().isoformat(),
        "sourceSystem": "SECURITY_TEST",
        "eventType": "SECURITY_TEST_EVENT",
        "category": "SECURITY",
        "severity": "INFO",
        "normalizedMessage": "安全日志收集器测试事件"
    }]

    if collector.send_to_java_backend(test_events):
        logger.info("Java后端安全服务连接测试成功")
    else:
        logger.wning("Java后端安全服务连接测试失败，请检查后端服务是否启动")
        return

    # 启动安全日志定时收集
    collector.start_security_collection(interval_minutes=5)

    # 保持主线程运行
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("收到中断信号，停止安全日志收集器")

if __name__ == "__main__":
    main()
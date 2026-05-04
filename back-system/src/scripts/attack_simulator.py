#!/usr/bin/env python3
"""
attack_simulator.py
攻击场景模拟器 - 通过 API 向系统注入测试事件，验证规则引擎和告警功能

用法:
    python attack_simulator.py                    # 运行所有场景
    python attack_simulator.py --scenario brute   # 只运行暴力破解场景
    python attack_simulator.py --list             # 列出所有场景
    python attack_simulator.py --clean            # 清理测试数据（需要手动执行 SQL）

支持的场景:
    brute       - 暴力破解攻击（多次登录失败）
    privesc     - 权限提升
    lateral     - 横向移动
    exfil       - 数据渗出
    malware     - 恶意进程
    scan        - 网络扫描
    full_chain  - 完整 APT 攻击链（以上所有场景按顺序执行）
"""

import argparse
import json
import time
import uuid
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any

# ==================== 配置 ====================

BASE_URL = "http://localhost:8080/api"
EVENTS_URL = f"{BASE_URL}/events"
ALERTS_URL = f"{BASE_URL}/alerts"

# 测试用的虚假 IP 和用户（不会影响真实系统）
ATTACKER_IP = "192.168.100.200"
VICTIM_IP = "192.168.1.50"
INTERNAL_IP = "10.0.0.15"
TEST_USER = "test_victim_user"
ADMIN_USER = "administrator"
HOST = "WORKSTATION-TEST01"

SESSION = requests.Session()
SESSION.headers.update({
    "Content-Type": "application/json",
    "X-Test-Simulator": "attack_simulator/1.0"
})

def login(username: str = "admin", password: str = "123456") -> bool:
    """登录并将 token 写入 SESSION headers"""
    try:
        resp = SESSION.post(
            f"{BASE_URL}/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token")
        if token:
            SESSION.headers["Authorization"] = f"Bearer {token}"
            print(f"✓ 登录成功，用户: {username}")
            return True
        print(f"✗ 登录响应中无 token: {data}")
        return False
    except Exception as e:
        print(f"✗ 登录失败: {e}")
        return False

# ==================== 工具函数 ====================

def ts(offset_seconds: int = 0) -> str:
    """生成 ISO 格式时间戳，支持偏移"""
    t = datetime.now() + timedelta(seconds=offset_seconds)
    return t.isoformat()

def post_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """发送单个事件到后端，失败时重试一次"""
    for attempt in range(2):
        try:
            resp = SESSION.post(EVENTS_URL, json=event, timeout=10)
            if resp.status_code in (200, 201):
                result = resp.json()
                print(f"  ✓ 事件已注入: [{event['eventType']}] id={result.get('id', '?')}")
                return result
            elif resp.status_code == 500 and attempt == 0:
                print(f"  ⚠ 500错误，URL={EVENTS_URL}, Auth={SESSION.headers.get('Authorization','NONE')[:30]}, 重试...")
                time.sleep(1)  # 等待后端恢复后重试
                continue
            else:
                print(f"  ✗ 注入失败 [{event['eventType']}]: HTTP {resp.status_code} - {resp.text[:200]}")
                return {}
        except Exception as e:
            print(f"  ✗ 注入失败 [{event['eventType']}]: {e}")
            return {}
    return {}

def post_events_batch(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """批量发送事件 - 逐个发送以避免批量接口问题"""
    results = []
    for event in events:
        r = post_event(event)
        if r:
            results.append(r)
        time.sleep(0.2)  # 200ms 间隔，避免后端规则引擎并发问题
    return results

def make_event(
    event_type: str,
    category: str,
    severity: str,
    raw_message: str,
    normalized_message: str = None,
    source_ip: str = None,
    user_name: str = None,
    process_name: str = None,
    event_code: int = None,
    is_anomaly: bool = False,
    anomaly_score: float = 0.0,
    offset_seconds: int = 0,
    **extra
) -> Dict[str, Any]:
    """构造标准事件字典"""
    event = {
        "timestamp": ts(offset_seconds),
        "sourceSystem": "ATTACK_SIMULATOR",
        "eventType": event_type,
        "category": category,
        "severity": severity,
        "rawMessage": raw_message,
        "normalizedMessage": normalized_message or raw_message,
        "hostName": HOST,
        "hostIp": VICTIM_IP,
        "isAnomaly": is_anomaly,
        "anomalyScore": anomaly_score,
        "threatLevel": severity,
        "status": "NEW",
    }
    if source_ip:
        event["sourceIp"] = source_ip
    if user_name:
        event["userName"] = user_name
        event["userId"] = user_name
    if process_name:
        event["processName"] = process_name
    if event_code:
        event["eventCode"] = event_code
    event.update(extra)
    return event

# ==================== 攻击场景 ====================

def scenario_brute_force():
    """
    场景1: 暴力破解攻击
    模拟攻击者在短时间内对同一账户发起大量登录失败，最终成功登录
    预期触发: BRUTE_FORCE_ATTACK 告警
    """
    print("\n[场景1] 暴力破解攻击 (Brute Force)")
    print(f"  攻击者IP: {ATTACKER_IP} → 目标用户: {ADMIN_USER}")

    events = []
    # 30 次登录失败（Windows 事件 ID 4625）
    for i in range(30):
        events.append(make_event(
            event_type="LOGIN_FAILURE",
            category="AUTHENTICATION",
            severity="MEDIUM",
            raw_message=f"An account failed to log on. Account: {ADMIN_USER}, Source IP: {ATTACKER_IP}, Failure reason: Unknown user name or bad password",
            normalized_message=f"登录失败: 用户 {ADMIN_USER} 来自 {ATTACKER_IP}，密码错误 (第{i+1}次)",
            source_ip=ATTACKER_IP,
            user_name=ADMIN_USER,
            event_code=4625,
            is_anomaly=(i >= 5),
            anomaly_score=min(0.3 + i * 0.02, 0.95),
            offset_seconds=i * 10,  # 每10秒一次
        ))

    # 最终登录成功（可能是猜对了密码）
    events.append(make_event(
        event_type="LOGIN_SUCCESS",
        category="AUTHENTICATION",
        severity="HIGH",
        raw_message=f"An account was successfully logged on. Account: {ADMIN_USER}, Source IP: {ATTACKER_IP}",
        normalized_message=f"登录成功: 用户 {ADMIN_USER} 来自 {ATTACKER_IP}（暴力破解后成功）",
        source_ip=ATTACKER_IP,
        user_name=ADMIN_USER,
        event_code=4624,
        is_anomaly=True,
        anomaly_score=0.95,
        offset_seconds=310,
    ))

    results = post_events_batch(events)
    print(f"  → 注入 {len(results)} 个事件，预期触发 BRUTE_FORCE_ATTACK 告警")
    return results


def scenario_privilege_escalation():
    """
    场景2: 权限提升
    模拟普通用户通过 UAC 绕过或漏洞利用提升到管理员权限
    预期触发: PRIVILEGE_ESCALATION 告警
    """
    print("\n[场景2] 权限提升 (Privilege Escalation)")

    events = [
        # 普通用户登录
        make_event(
            event_type="LOGIN_SUCCESS",
            category="AUTHENTICATION",
            severity="LOW",
            raw_message=f"User {TEST_USER} logged on from {INTERNAL_IP}",
            normalized_message=f"普通用户登录: {TEST_USER}",
            source_ip=INTERNAL_IP,
            user_name=TEST_USER,
            event_code=4624,
            offset_seconds=0,
        ),
        # 尝试访问特权资源（权限拒绝）
        make_event(
            event_type="PERMISSION_DENIED",
            category="ACCESS_CONTROL",
            severity="MEDIUM",
            raw_message=f"Access denied: {TEST_USER} attempted to access C:\\Windows\\System32\\config\\SAM",
            normalized_message=f"权限拒绝: {TEST_USER} 尝试访问 SAM 数据库",
            user_name=TEST_USER,
            event_code=4656,
            is_anomaly=True,
            anomaly_score=0.7,
            offset_seconds=30,
        ),
        # 执行可疑进程（mimikatz 特征）
        make_event(
            event_type="SUSPICIOUS_ACTIVITY",
            category="PROCESS",
            severity="CRITICAL",
            raw_message=f"Process created: svchost.exe spawned by {TEST_USER}, CommandLine: sekurlsa::logonpasswords",
            normalized_message=f"可疑进程: 检测到凭据转储工具特征，用户: {TEST_USER}",
            user_name=TEST_USER,
            process_name="svchost.exe",
            event_code=4688,
            is_anomaly=True,
            anomaly_score=0.98,
            offset_seconds=60,
            eventSubType="CREDENTIAL_DUMP",
        ),
        # 特权账户操作（提升成功）
        make_event(
            event_type="PRIVILEGE_ESCALATION",
            category="ACCESS_CONTROL",
            severity="CRITICAL",
            raw_message=f"Special privileges assigned to new logon. Account: {TEST_USER}, Privileges: SeDebugPrivilege, SeTcbPrivilege",
            normalized_message=f"权限提升成功: {TEST_USER} 获得 SeDebugPrivilege 调试权限",
            user_name=TEST_USER,
            event_code=4672,
            is_anomaly=True,
            anomaly_score=0.99,
            offset_seconds=90,
        ),
    ]

    results = post_events_batch(events)
    print(f"  → 注入 {len(results)} 个事件，预期触发 PRIVILEGE_ESCALATION 告警")
    return results


def scenario_lateral_movement():
    """
    场景3: 横向移动
    模拟攻击者在内网中横向扩展，访问多台主机
    预期触发: LATERAL_MOVEMENT / NETWORK_SCAN 告警
    """
    print("\n[场景3] 横向移动 (Lateral Movement)")

    targets = ["10.0.0.20", "10.0.0.21", "10.0.0.22", "10.0.0.23", "10.0.0.24"]
    events = []

    # 扫描内网多个主机的 SMB 端口
    for i, target_ip in enumerate(targets):
        events.append(make_event(
            event_type="NETWORK_CONNECTION",
            category="NETWORK",
            severity="HIGH",
            raw_message=f"Outbound connection from {VICTIM_IP}:{45000+i} to {target_ip}:445 (SMB)",
            normalized_message=f"SMB 扫描: {VICTIM_IP} → {target_ip}:445",
            source_ip=VICTIM_IP,
            destinationIp=target_ip,
            destinationPort=445,
            protocol="TCP",
            is_anomaly=True,
            anomaly_score=0.8,
            offset_seconds=i * 5,
        ))

    # 成功连接到一台主机并执行命令
    events.append(make_event(
        event_type="SUSPICIOUS_ACTIVITY",
        category="NETWORK",
        severity="CRITICAL",
        raw_message=f"Remote command execution via SMB: {VICTIM_IP} → 10.0.0.21, Command: net user /domain",
        normalized_message=f"横向移动: 通过 SMB 在 10.0.0.21 执行远程命令",
        source_ip=VICTIM_IP,
        destinationIp="10.0.0.21",
        destinationPort=445,
        protocol="TCP",
        is_anomaly=True,
        anomaly_score=0.95,
        offset_seconds=60,
        eventSubType="REMOTE_EXECUTION",
    ))

    results = post_events_batch(events)
    print(f"  → 注入 {len(results)} 个事件，预期触发网络扫描/横向移动告警")
    return results


def scenario_data_exfiltration():
    """
    场景4: 数据渗出
    模拟攻击者将敏感数据通过 DNS 或 HTTP 传输到外部
    预期触发: DATA_EXFILTRATION 告警
    """
    print("\n[场景4] 数据渗出 (Data Exfiltration)")

    EXTERNAL_C2 = "203.0.113.100"  # 文档保留地址，不会路由到真实主机

    events = [
        # 大量文件访问
        make_event(
            event_type="FILE_ACCESS",
            category="DATA_ACCESS",
            severity="HIGH",
            raw_message=f"Mass file access: {TEST_USER} accessed 500 files in C:\\Users\\sensitive_data\\ within 60 seconds",
            normalized_message=f"异常文件访问: {TEST_USER} 在60秒内访问了500个文件",
            user_name=TEST_USER,
            event_code=4663,
            is_anomaly=True,
            anomaly_score=0.85,
            offset_seconds=0,
        ),
        # 压缩敏感文件
        make_event(
            event_type="SUSPICIOUS_ACTIVITY",
            category="PROCESS",
            severity="HIGH",
            raw_message=f"Process: 7z.exe a -p secret123 C:\\Temp\\data.zip C:\\Users\\sensitive_data\\*",
            normalized_message=f"可疑压缩: 使用密码压缩敏感目录",
            user_name=TEST_USER,
            process_name="7z.exe",
            event_code=4688,
            is_anomaly=True,
            anomaly_score=0.88,
            offset_seconds=30,
        ),
        # 向外部 IP 发送大量数据
        make_event(
            event_type="NETWORK_CONNECTION",
            category="NETWORK",
            severity="CRITICAL",
            raw_message=f"Large outbound transfer: {VICTIM_IP} → {EXTERNAL_C2}:443, bytes_sent=52428800 (50MB)",
            normalized_message=f"数据渗出: 向外部 {EXTERNAL_C2} 传输 50MB 数据",
            source_ip=VICTIM_IP,
            destinationIp=EXTERNAL_C2,
            destinationPort=443,
            protocol="HTTPS",
            is_anomaly=True,
            anomaly_score=0.97,
            offset_seconds=90,
            eventSubType="DATA_EXFILTRATION",
        ),
    ]

    results = post_events_batch(events)
    print(f"  → 注入 {len(results)} 个事件，预期触发数据渗出告警")
    return results


def scenario_malware():
    """
    场景5: 恶意软件
    模拟恶意进程创建、持久化和 C2 通信
    预期触发: MALWARE_DETECTED 告警
    """
    print("\n[场景5] 恶意软件 (Malware)")

    EXTERNAL_C2 = "198.51.100.50"  # 文档保留地址

    events = [
        # 可疑进程创建（矿工特征）
        make_event(
            event_type="SUSPICIOUS_ACTIVITY",
            category="MALWARE",
            severity="CRITICAL",
            raw_message=f"Suspicious process: xmrig.exe started by explorer.exe, CPU=95%, connecting to pool.minexmr.com:4444",
            normalized_message=f"检测到挖矿程序: xmrig.exe CPU占用95%，连接到矿池",
            process_name="xmrig.exe",
            event_code=4688,
            is_anomaly=True,
            anomaly_score=0.99,
            offset_seconds=0,
            eventSubType="CRYPTOMINER",
        ),
        # 注册表持久化
        make_event(
            event_type="CONFIGURATION_CHANGE",
            category="SYSTEM",
            severity="HIGH",
            raw_message=f"Registry modification: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svchost32 = C:\\Users\\Public\\svchost32.exe",
            normalized_message=f"注册表持久化: 恶意程序写入自启动项",
            process_name="svchost32.exe",
            event_code=4657,
            is_anomaly=True,
            anomaly_score=0.92,
            offset_seconds=10,
        ),
        # C2 通信
        make_event(
            event_type="NETWORK_CONNECTION",
            category="NETWORK",
            severity="CRITICAL",
            raw_message=f"C2 communication: svchost32.exe → {EXTERNAL_C2}:4444 (known C2 port)",
            normalized_message=f"C2 通信: 恶意进程连接到 {EXTERNAL_C2}:4444",
            source_ip=VICTIM_IP,
            destinationIp=EXTERNAL_C2,
            destinationPort=4444,
            protocol="TCP",
            process_name="svchost32.exe",
            is_anomaly=True,
            anomaly_score=0.98,
            offset_seconds=30,
            eventSubType="C2_COMMUNICATION",
        ),
    ]

    results = post_events_batch(events)
    print(f"  → 注入 {len(results)} 个事件，预期触发恶意软件告警")
    return results


def scenario_network_scan():
    """
    场景6: 网络扫描
    模拟端口扫描和服务发现
    预期触发: NETWORK_SCAN 告警
    """
    print("\n[场景6] 网络扫描 (Network Scan)")

    common_ports = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 3306, 3389, 5432, 6379, 8080, 8443]
    events = []

    for i, port in enumerate(common_ports):
        events.append(make_event(
            event_type="NETWORK_CONNECTION",
            category="NETWORK",
            severity="MEDIUM",
            raw_message=f"Port scan detected: {ATTACKER_IP} → {VICTIM_IP}:{port} (SYN scan)",
            normalized_message=f"端口扫描: {ATTACKER_IP} 扫描 {VICTIM_IP}:{port}",
            source_ip=ATTACKER_IP,
            destinationIp=VICTIM_IP,
            destinationPort=port,
            protocol="TCP",
            is_anomaly=True,
            anomaly_score=0.75,
            offset_seconds=i * 2,
        ))

    results = post_events_batch(events)
    print(f"  → 注入 {len(results)} 个事件，预期触发网络扫描告警")
    return results

def scenario_full_apt_chain():
    """
    场景7: 完整 APT 攻击链
    按时间顺序模拟一次完整的 APT 攻击：侦察 → 初始访问 → 持久化 → 横向移动 → 渗出
    """
    print("\n[场景7] 完整 APT 攻击链 (Full APT Chain)")
    print("  按顺序执行所有攻击阶段，间隔 2 秒...")

    scenario_network_scan()
    time.sleep(2)
    scenario_brute_force()
    time.sleep(2)
    scenario_privilege_escalation()
    time.sleep(2)
    scenario_lateral_movement()
    time.sleep(2)
    scenario_malware()
    time.sleep(2)
    scenario_data_exfiltration()

    print("\n  ✓ 完整 APT 攻击链注入完成")


# ==================== 验证函数 ====================

def verify_alerts():
    """查询系统中最近生成的告警，验证规则引擎是否正确触发"""
    print("\n[验证] 查询最近告警...")
    try:
        resp = SESSION.get(
            f"{ALERTS_URL}/search",
            params={"page": 0, "size": 20, "sort": "createdTime,desc"},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        alerts = data.get("content", data) if isinstance(data, dict) else data

        if not alerts:
            print("  ⚠ 未发现告警，规则引擎可能未触发，请检查规则配置")
            return

        print(f"  发现 {len(alerts)} 条最近告警:")
        for alert in alerts[:10]:
            level = alert.get("alertLevel", "?")
            atype = alert.get("alertType", "?")
            desc = (alert.get("description") or "")[:60]
            handled = "✓" if alert.get("handled") else "○"
            print(f"    [{handled}] [{level:8s}] {atype:30s} {desc}")
    except Exception as e:
        print(f"  ✗ 查询告警失败: {e}")


def check_backend():
    """检查后端是否可达"""
    try:
        resp = SESSION.get(f"{BASE_URL}/events/recent?limit=1", timeout=5)
        if resp.status_code in (200, 401, 403):
            print(f"✓ 后端连接正常: {BASE_URL}")
            return True
        print(f"⚠ 后端响应异常: HTTP {resp.status_code}")
        return True  # 仍然尝试继续
    except Exception as e:
        print(f"✗ 无法连接后端 {BASE_URL}: {e}")
        print("  请确认后端已启动，或修改脚本顶部的 BASE_URL")
        return False


# ==================== 主入口 ====================

SCENARIOS = {
    "brute":      ("暴力破解攻击",    scenario_brute_force),
    "privesc":    ("权限提升",        scenario_privilege_escalation),
    "lateral":    ("横向移动",        scenario_lateral_movement),
    "exfil":      ("数据渗出",        scenario_data_exfiltration),
    "malware":    ("恶意软件",        scenario_malware),
    "scan":       ("网络扫描",        scenario_network_scan),
    "full_chain": ("完整APT攻击链",   scenario_full_apt_chain),
}


def main():
    global BASE_URL, EVENTS_URL, ALERTS_URL

    parser = argparse.ArgumentParser(
        description="攻击场景模拟器 - 向系统注入测试安全事件",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("--scenario", "-s", choices=list(SCENARIOS.keys()),
                        help="指定要运行的场景")
    parser.add_argument("--list", "-l", action="store_true",
                        help="列出所有可用场景")
    parser.add_argument("--url", "-u", default=BASE_URL,
                        help=f"后端地址 (默认: {BASE_URL})")
    parser.add_argument("--no-verify", action="store_true",
                        help="注入后不查询告警验证结果")
    args = parser.parse_args()

    # 更新全局 URL
    BASE_URL = args.url
    EVENTS_URL = f"{BASE_URL}/events"
    ALERTS_URL = f"{BASE_URL}/alerts"

    if args.list:
        print("可用攻击场景:")
        for key, (name, _) in SCENARIOS.items():
            print(f"  {key:12s} - {name}")
        return

    print("=" * 60)
    print("  攻击场景模拟器")
    print(f"  目标后端: {BASE_URL}")
    print("=" * 60)

    if not check_backend():
        return

    # 登录获取 token
    if not login():
        print("登录失败，退出")
        return

    if args.scenario:
        name, fn = SCENARIOS[args.scenario]
        print(f"\n运行场景: {name}")
        fn()
    else:
        print("\n运行所有场景（跳过 full_chain，避免重复）...")
        for key, (name, fn) in SCENARIOS.items():
            if key == "full_chain":
                continue
            fn()
            time.sleep(1)

    if not args.no_verify:
        time.sleep(2)  # 等待后端处理
        verify_alerts()

    print("\n完成。可在系统界面查看注入的事件和生成的告警。")
    print("清理测试数据: DELETE FROM unified_security_events WHERE source_system = 'ATTACK_SIMULATOR';")


if __name__ == "__main__":
    main()

"""
应用规则引擎补丁到unified_log_collector.py
此脚本会修改现有的采集器，添加规则引擎集成功能
"""

import os
import sys
import shutil
from datetime import datetime


def backup_original_file(file_path):
    """备份原始文件"""
    backup_path = f"{file_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"✅ 已备份原始文件到: {backup_path}")
    return backup_path


def apply_patch():
    """应用补丁"""
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    collector_file = os.path.join(script_dir, "unified_log_collector.py")
    
    if not os.path.exists(collector_file):
        print(f"❌ 找不到文件: {collector_file}")
        return False
    
    print(f"📝 准备修改文件: {collector_file}")
    
    # 备份原始文件
    backup_path = backup_original_file(collector_file)
    
    try:
        # 读取原始文件
        with open(collector_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否已经应用过补丁
        if 'from rule_engine_integration import' in content:
            print("⚠️  补丁已经应用过，跳过")
            return True
        
        # 应用补丁
        print("🔧 应用补丁...")
        
        # 1. 在导入部分添加规则引擎导入
        import_section = """from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from enum import Enum"""
        
        new_import = """from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from enum import Enum

# 规则引擎集成
try:
    from rule_engine_integration import RuleEngineClient
    RULE_ENGINE_AVAILABLE = True
except ImportError:
    RULE_ENGINE_AVAILABLE = False
    logger.warning("规则引擎集成模块未找到，规则引擎功能将被禁用")"""
        
        content = content.replace(import_section, new_import, 1)
        
        # 2. 在CollectorConfig中添加规则引擎配置
        config_section = """    # 网络配置
    request_timeout: int = 30
    max_retries: int = 3"""
        
        new_config = """    # 网络配置
    request_timeout: int = 30
    max_retries: int = 3
    
    # 规则引擎配置
    enable_rule_engine: bool = True      # 是否启用规则引擎分析
    rule_engine_timeout: int = 10        # 规则引擎分析超时时间（秒）"""
        
        content = content.replace(config_section, new_config, 1)
        
        # 3. 在__init__方法中初始化规则引擎客户端
        init_section = """        # 统计信息
        self.stats = {
            'total_events_collected': 0,
            'total_alerts_created': 0,
            'total_performance_checks': 0,
            'last_collection_time': None,
            'errors': []
        }

        logger.info(f"初始化安全告警收集器: {self.collector_host} (ID: {self.collector_id})")
        logger.info(f"Java后端地址: {self.config.java_backend_url}")"""
        
        new_init = """        # 统计信息
        self.stats = {
            'total_events_collected': 0,
            'total_alerts_created': 0,
            'total_performance_checks': 0,
            'last_collection_time': None,
            'errors': [],
            # 规则引擎统计
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
                logger.info("✅ 规则引擎客户端初始化成功")
            except Exception as e:
                logger.warning(f"规则引擎客户端初始化失败: {e}")
                self.rule_engine_client = None

        logger.info(f"初始化安全告警收集器: {self.collector_host} (ID: {self.collector_id})")
        logger.info(f"Java后端地址: {self.config.java_backend_url}")"""
        
        content = content.replace(init_section, new_init, 1)
        
        # 4. 修改send_security_events方法
        send_method_start = """    def send_security_events(self, events: List[Dict]) -> bool:
        \"\"\"
        发送安全事件到Java后端
        \"\"\"
        if not events:
            return True

        try:
            url = f"{self.config.java_backend_url}/api/events/batch"

            # 格式化事件数据
            formatted_events = []
            for event in events:"""
        
        new_send_method_start = """    def send_security_events(self, events: List[Dict]) -> bool:
        \"\"\"
        发送安全事件到Java后端（带规则引擎分析）
        \"\"\"
        if not events:
            return True

        try:
            url = f"{self.config.java_backend_url}/api/events/batch"

            # 格式化事件数据
            formatted_events = []
            for event in events:
                # ========== 规则引擎分析 ==========
                if self.rule_engine_client:
                    try:
                        event = self.rule_engine_client.analyze_event(event)
                        self.stats['rule_engine_analyzed'] += 1
                        if event.get('rule_matched'):
                            self.stats['rule_engine_matched'] += 1
                    except Exception as e:
                        logger.warning(f"规则引擎分析失败: {e}")
                        self.stats['rule_engine_failures'] += 1
                # =================================="""
        
        content = content.replace(send_method_start, new_send_method_start, 1)
        
        # 5. 在formatted_event中添加规则引擎字段
        formatted_event_section = """                "anomalyScore": float(analyzed_event.get("anomaly_score", 0.0)),
                "anomalyReason": analyzed_event.get("anomaly_reason"),
                "threatLevel": analyzed_event.get("threat_level"),
                "detectionAlgorithm": analyzed_event.get("detection_algorithm")"""
        
        new_formatted_event = """                "anomalyScore": float(event.get("anomaly_score", 0.0)),
                "anomalyReason": event.get("anomaly_reason"),
                "threatLevel": event.get("threat_level"),
                "detectionAlgorithm": event.get("detection_algorithm"),
                # 规则引擎分析结果
                "threatScore": event.get("threat_score"),
                "ruleMatched": event.get("rule_matched", False),
                "matchedRuleCount": event.get("matched_rule_count", 0),
                "matchedRules": event.get("matched_rules")"""
        
        content = content.replace(formatted_event_section, new_formatted_event, 1)
        
        # 写入修改后的文件
        with open(collector_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ 补丁应用成功！")
        print("\n修改内容:")
        print("  1. ✅ 添加规则引擎导入")
        print("  2. ✅ 添加规则引擎配置选项")
        print("  3. ✅ 初始化规则引擎客户端")
        print("  4. ✅ 修改send_security_events方法")
        print("  5. ✅ 添加规则引擎分析结果字段")
        print(f"\n原始文件已备份到: {backup_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ 应用补丁失败: {e}")
        print(f"正在恢复原始文件...")
        shutil.copy2(backup_path, collector_file)
        print("✅ 已恢复原始文件")
        return False


def verify_patch():
    """验证补丁是否正确应用"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    collector_file = os.path.join(script_dir, "unified_log_collector.py")
    
    with open(collector_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = [
        ('规则引擎导入', 'from rule_engine_integration import'),
        ('规则引擎配置', 'enable_rule_engine'),
        ('规则引擎客户端初始化', 'self.rule_engine_client'),
        ('规则引擎分析调用', 'rule_engine_client.analyze_event'),
        ('规则引擎结果字段', 'threatScore')
    ]
    
    print("\n🔍 验证补丁...")
    all_passed = True
    
    for check_name, check_string in checks:
        if check_string in content:
            print(f"  ✅ {check_name}")
        else:
            print(f"  ❌ {check_name}")
            all_passed = False
    
    if all_passed:
        print("\n✅ 所有检查通过！补丁已正确应用。")
    else:
        print("\n⚠️  部分检查未通过，请检查补丁应用情况。")
    
    return all_passed


if __name__ == "__main__":
    print("=" * 60)
    print("规则引擎补丁应用工具")
    print("=" * 60)
    print()
    
    # 应用补丁
    success = apply_patch()
    
    if success:
        # 验证补丁
        verify_patch()
        
        print("\n" + "=" * 60)
        print("下一步:")
        print("  1. 确保 rule_engine_integration.py 在同一目录")
        print("  2. 启动Java后端服务")
        print("  3. 运行采集器: python unified_log_collector.py")
        print("  4. 查看日志确认规则引擎工作正常")
        print("=" * 60)
    else:
        print("\n❌ 补丁应用失败，请检查错误信息")
        sys.exit(1)

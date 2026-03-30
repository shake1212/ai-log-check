"""
测试规则引擎集成
验证Python采集器是否正确集成规则引擎
"""

import logging
import sys
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("RuleEngineTest")

def test_rule_engine_import():
    """测试规则引擎模块导入"""
    logger.info("=" * 60)
    logger.info("测试1: 规则引擎模块导入")
    logger.info("=" * 60)
    
    try:
        from rule_engine_integration import RuleEngineClient
        logger.info("✅ 规则引擎模块导入成功")
        return True
    except ImportError as e:
        logger.error(f"❌ 规则引擎模块导入失败: {e}")
        return False

def test_rule_engine_client():
    """测试规则引擎客户端"""
    logger.info("\n" + "=" * 60)
    logger.info("测试2: 规则引擎客户端初始化")
    logger.info("=" * 60)
    
    try:
        from rule_engine_integration import RuleEngineClient
        
        client = RuleEngineClient(
            backend_url="http://localhost:8080",
            timeout=10,
            enabled=True
        )
        logger.info("✅ 规则引擎客户端初始化成功")
        
        # 测试连接
        logger.info("\n测试规则引擎连接...")
        if client.test_connection():
            logger.info("✅ 规则引擎连接测试成功")
            return True
        else:
            logger.warning("⚠️  规则引擎连接测试失败（可能后端未启动）")
            return False
            
    except Exception as e:
        logger.error(f"❌ 规则引擎客户端测试失败: {e}")
        return False

def test_event_analysis():
    """测试事件分析"""
    logger.info("\n" + "=" * 60)
    logger.info("测试3: 事件分析")
    logger.info("=" * 60)
    
    try:
        from rule_engine_integration import RuleEngineClient
        
        client = RuleEngineClient(
            backend_url="http://localhost:8080",
            timeout=10,
            enabled=True
        )
        
        # 创建测试事件
        test_event = {
            "event_id": "4625",
            "timestamp": datetime.now().isoformat(),
            "event_type": "LOGIN_FAILED",
            "severity": "WARN",
            "process_name": "svchost.exe",
            "user_id": "admin",
            "normalized_message": "登录失败",
            "source_ip": "192.168.1.100"
        }
        
        logger.info(f"测试事件: {test_event['event_type']}")
        
        # 分析事件
        analyzed_event = client.analyze_event(test_event)
        
        # 检查结果
        if 'threat_score' in analyzed_event:
            logger.info("✅ 事件分析成功")
            logger.info(f"   威胁等级: {analyzed_event.get('threat_level', 'N/A')}")
            logger.info(f"   威胁分数: {analyzed_event.get('threat_score', 0)}")
            logger.info(f"   规则匹配: {analyzed_event.get('rule_matched', False)}")
            logger.info(f"   匹配规则数: {analyzed_event.get('matched_rule_count', 0)}")
            
            if analyzed_event.get('matched_rules'):
                logger.info("   匹配的规则:")
                for rule in analyzed_event['matched_rules']:
                    logger.info(f"     - {rule['rule_name']} ({rule['threat_type']})")
            
            return True
        else:
            logger.warning("⚠️  事件分析未返回威胁分数（可能后端未启动）")
            return False
            
    except Exception as e:
        logger.error(f"❌ 事件分析测试失败: {e}")
        return False

def test_collector_integration():
    """测试采集器集成"""
    logger.info("\n" + "=" * 60)
    logger.info("测试4: 采集器集成")
    logger.info("=" * 60)
    
    try:
        # 导入采集器
        import sys
        import os
        
        # 确保可以导入unified_log_collector
        script_dir = os.path.dirname(os.path.abspath(__file__))
        if script_dir not in sys.path:
            sys.path.insert(0, script_dir)
        
        from unified_log_collector import IntegratedSecurityAlertCollector, CollectorConfig
        
        # 创建配置（启用规则引擎）
        config = CollectorConfig(
            java_backend_url="http://localhost:8080",
            enable_rule_engine=True,
            rule_engine_timeout=10
        )
        
        # 创建采集器实例
        collector = IntegratedSecurityAlertCollector(config)
        
        # 检查规则引擎客户端是否初始化
        if hasattr(collector, 'rule_engine_client'):
            if collector.rule_engine_client:
                logger.info("✅ 采集器规则引擎客户端已初始化")
                
                # 检查统计信息
                if 'rule_engine_analyzed' in collector.stats:
                    logger.info("✅ 采集器统计信息包含规则引擎字段")
                    return True
                else:
                    logger.error("❌ 采集器统计信息缺少规则引擎字段")
                    return False
            else:
                logger.warning("⚠️  采集器规则引擎客户端未初始化（可能模块不可用）")
                return False
        else:
            logger.error("❌ 采集器缺少rule_engine_client属性")
            return False
            
    except Exception as e:
        logger.error(f"❌ 采集器集成测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_config_loading():
    """测试配置加载"""
    logger.info("\n" + "=" * 60)
    logger.info("测试5: 从后端加载配置")
    logger.info("=" * 60)
    
    try:
        from unified_log_collector import IntegratedSecurityAlertCollector, CollectorConfig
        
        config = CollectorConfig(java_backend_url="http://localhost:8080")
        collector = IntegratedSecurityAlertCollector(config)
        
        # 测试加载配置
        logger.info("尝试从后端加载配置...")
        success = collector.load_config_from_backend()
        
        if success:
            logger.info("✅ 配置加载成功")
            logger.info(f"   规则引擎状态: {'启用' if collector.rule_engine_client else '禁用'}")
            logger.info(f"   规则引擎超时: {collector.config.rule_engine_timeout}秒")
            return True
        else:
            logger.warning("⚠️  配置加载失败（可能后端未启动）")
            return False
            
    except Exception as e:
        logger.error(f"❌ 配置加载测试失败: {e}")
        return False

def main():
    """运行所有测试"""
    logger.info("开始规则引擎集成测试...")
    logger.info("=" * 60)
    
    results = {
        "模块导入": test_rule_engine_import(),
        "客户端初始化": test_rule_engine_client(),
        "事件分析": test_event_analysis(),
        "采集器集成": test_collector_integration(),
        "配置加载": test_config_loading()
    }
    
    # 输出测试结果
    logger.info("\n" + "=" * 60)
    logger.info("测试结果汇总")
    logger.info("=" * 60)
    
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        logger.info(f"{test_name}: {status}")
    
    # 计算通过率
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    pass_rate = (passed / total) * 100
    
    logger.info("\n" + "=" * 60)
    logger.info(f"通过率: {passed}/{total} ({pass_rate:.1f}%)")
    logger.info("=" * 60)
    
    if pass_rate == 100:
        logger.info("\n🎉 所有测试通过！规则引擎集成成功！")
        return 0
    elif pass_rate >= 60:
        logger.warning("\n⚠️  部分测试失败，可能是后端未启动")
        return 1
    else:
        logger.error("\n❌ 多个测试失败，请检查配置")
        return 2

if __name__ == "__main__":
    sys.exit(main())

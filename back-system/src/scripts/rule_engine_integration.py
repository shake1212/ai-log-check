"""
规则引擎集成模块
用于将Python采集器与Java规则引擎集成
"""

import logging
import requests
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger("RuleEngineIntegration")


class RuleEngineClient:
    """
    规则引擎客户端
    负责与Java规则引擎API通信
    """
    
    def __init__(self, backend_url: str = "http://localhost:8080", 
                 timeout: int = 10, 
                 enabled: bool = True):
        """
        初始化规则引擎客户端
        
        Args:
            backend_url: Java后端地址
            timeout: API调用超时时间（秒）
            enabled: 是否启用规则引擎分析
        """
        self.backend_url = backend_url
        self.timeout = timeout
        self.enabled = enabled
        self.session = requests.Session()
        
        # 统计信息
        self.stats = {
            'total_analyzed': 0,
            'total_matched': 0,
            'total_failures': 0,
            'total_timeouts': 0,
            'total_time': 0.0
        }
        
        logger.info(f"规则引擎客户端初始化: enabled={enabled}, url={backend_url}")
    
    def analyze_event(self, event: Dict) -> Dict:
        """
        使用规则引擎分析单个事件
        
        Args:
            event: 原始事件数据
            
        Returns:
            包含规则匹配结果的事件数据
        """
        if not self.enabled:
            return event
        
        start_time = datetime.now()
        
        try:
            url = f"{self.backend_url}/api/rule-engine/analyze"
            
            # 准备分析请求数据
            analysis_payload = self._prepare_analysis_payload(event)
            
            # 调用规则引擎API
            response = self.session.post(
                url,
                json=analysis_payload,
                timeout=self.timeout
            )
            
            # 计算耗时
            elapsed = (datetime.now() - start_time).total_seconds()
            self.stats['total_time'] += elapsed
            self.stats['total_analyzed'] += 1
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('success'):
                    # 更新事件数据
                    updated_event = self._update_event_with_analysis(event, result)
                    
                    if result.get('hasMatch'):
                        self.stats['total_matched'] += 1
                    
                    logger.debug(
                        f"规则引擎分析完成: 威胁等级={result.get('threatLevel')}, "
                        f"分数={result.get('threatScore')}, 耗时={elapsed:.3f}s"
                    )
                    
                    return updated_event
                else:
                    logger.warning(f"规则引擎分析失败: {result.get('error')}")
                    self.stats['total_failures'] += 1
                    return event
            else:
                logger.warning(f"规则引擎API返回错误: {response.status_code}")
                self.stats['total_failures'] += 1
                return event
                
        except requests.exceptions.Timeout:
            logger.warning("规则引擎分析超时，跳过分析")
            self.stats['total_timeouts'] += 1
            return event
        except Exception as e:
            logger.warning(f"规则引擎分析异常: {e}")
            self.stats['total_failures'] += 1
            return event
    
    def analyze_events_batch(self, events: List[Dict]) -> List[Dict]:
        """
        批量分析事件
        
        Args:
            events: 事件列表
            
        Returns:
            分析后的事件列表
        """
        if not self.enabled or not events:
            return events
        
        analyzed_events = []
        
        for event in events:
            analyzed_event = self.analyze_event(event)
            analyzed_events.append(analyzed_event)
        
        return analyzed_events
    
    def _prepare_analysis_payload(self, event: Dict) -> Dict:
        """
        准备规则引擎分析请求数据
        
        Args:
            event: 原始事件数据
            
        Returns:
            规则引擎API期望的数据格式
        """
        # 提取关键字段
        payload = {
            "eventId": str(event.get("event_id", "")),
            "processName": event.get("process_name"),
            "commandLine": event.get("command_line"),
            "message": event.get("normalized_message") or event.get("raw_message"),
            "userName": event.get("user_id"),
            "sourceIp": event.get("source_ip"),
            "destinationIp": event.get("destination_ip"),
            "destinationPort": event.get("destination_port"),
            "sourcePort": event.get("source_port"),
            "filePath": event.get("file_path"),
            "timestamp": event.get("timestamp")
        }
        
        # 移除None值
        payload = {k: v for k, v in payload.items() if v is not None}
        
        return payload
    
    def _update_event_with_analysis(self, event: Dict, analysis_result: Dict) -> Dict:
        """
        使用规则引擎分析结果更新事件
        
        Args:
            event: 原始事件
            analysis_result: 规则引擎分析结果
            
        Returns:
            更新后的事件
        """
        # 提取分析结果
        threat_score = analysis_result.get('threatScore', 0)  # 0-100分
        threat_level = analysis_result.get('threatLevel', 'LOW')
        has_match = analysis_result.get('hasMatch', False)
        rule_matches = analysis_result.get('ruleMatches', {})
        matched_rules = rule_matches.get('matchedRules', [])
        
        # 更新事件数据
        event['threat_score'] = threat_score
        event['threat_level'] = threat_level
        event['rule_matched'] = has_match
        event['matched_rule_count'] = len(matched_rules)
        
        # 添加匹配的规则信息
        if matched_rules:
            event['matched_rules'] = [
                {
                    'rule_id': rule.get('ruleId'),
                    'rule_name': rule.get('ruleName'),
                    'threat_type': rule.get('threatType'),
                    'severity': rule.get('severity'),
                    'score': rule.get('score'),
                    'category': rule.get('ruleCategory')
                }
                for rule in matched_rules
            ]
            
            # 更新事件严重程度（如果规则匹配结果更严重）
            if threat_level in ['HIGH', 'CRITICAL']:
                event['severity'] = threat_level
        
        return event
    
    def get_statistics(self) -> Dict:
        """
        获取规则引擎客户端统计信息
        
        Returns:
            统计信息字典
        """
        avg_time = (self.stats['total_time'] / self.stats['total_analyzed'] 
                   if self.stats['total_analyzed'] > 0 else 0)
        
        return {
            'enabled': self.enabled,
            'total_analyzed': self.stats['total_analyzed'],
            'total_matched': self.stats['total_matched'],
            'total_failures': self.stats['total_failures'],
            'total_timeouts': self.stats['total_timeouts'],
            'match_rate': (self.stats['total_matched'] / self.stats['total_analyzed'] * 100
                          if self.stats['total_analyzed'] > 0 else 0),
            'failure_rate': (self.stats['total_failures'] / self.stats['total_analyzed'] * 100
                            if self.stats['total_analyzed'] > 0 else 0),
            'avg_analysis_time': avg_time
        }
    
    def test_connection(self) -> bool:
        """
        测试规则引擎连接
        
        Returns:
            连接是否成功
        """
        try:
            url = f"{self.backend_url}/api/rule-engine/statistics"
            response = self.session.get(url, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    stats = result.get('statistics', {})
                    logger.info(f"规则引擎连接成功，已加载 {stats.get('totalRules', 0)} 条规则")
                    return True
            
            logger.warning(f"规则引擎连接测试失败: {response.status_code}")
            return False
            
        except Exception as e:
            logger.warning(f"规则引擎连接测试异常: {e}")
            return False


# 便捷函数
def create_rule_engine_client(backend_url: str = "http://localhost:8080",
                              timeout: int = 10,
                              enabled: bool = True) -> RuleEngineClient:
    """
    创建规则引擎客户端
    
    Args:
        backend_url: Java后端地址
        timeout: 超时时间
        enabled: 是否启用
        
    Returns:
        规则引擎客户端实例
    """
    return RuleEngineClient(backend_url, timeout, enabled)


if __name__ == "__main__":
    # 测试代码
    logging.basicConfig(level=logging.DEBUG)
    
    # 创建客户端
    client = create_rule_engine_client()
    
    # 测试连接
    if client.test_connection():
        print("✅ 规则引擎连接成功")
        
        # 测试事件分析
        test_event = {
            "event_id": "4625",
            "process_name": "svchost.exe",
            "user_id": "admin",
            "normalized_message": "登录失败",
            "source_ip": "192.168.1.100",
            "timestamp": datetime.now().isoformat()
        }
        
        print("\n测试事件分析...")
        analyzed = client.analyze_event(test_event)
        
        print(f"威胁等级: {analyzed.get('threat_level')}")
        print(f"威胁分数: {analyzed.get('threat_score')}")
        print(f"规则匹配: {analyzed.get('rule_matched')}")
        print(f"匹配规则数: {analyzed.get('matched_rule_count')}")
        
        if analyzed.get('matched_rules'):
            print("\n匹配的规则:")
            for rule in analyzed['matched_rules']:
                print(f"  - {rule['rule_name']} ({rule['threat_type']})")
        
        # 显示统计信息
        print("\n统计信息:")
        stats = client.get_statistics()
        for key, value in stats.items():
            print(f"  {key}: {value}")
    else:
        print("❌ 规则引擎连接失败")

package com.security.ailogsystem.service;

import java.util.List;
import java.util.Map;

/**
 * Python集成服务接口
 */
public interface PythonIntegrationService {

    /**
     * 运行威胁分析
     */
    Map<String, Object> runThreatAnalysis();

    /**
     * 运行合规扫描
     */
    Map<String, Object> runComplianceScan();

    /**
     * 运行异常检测
     */
    Map<String, Object> runAnomalyDetection();

    /**
     * 测试Python收集器连接
     */
    boolean testPythonCollectorConnection();

    /**
     * 获取Python收集器状态
     */
    Map<String, Object> getPythonCollectorStatus();

    /**
     * 发送事件到Python收集器
     */
    boolean sendEventsToPython(List<Map<String, Object>> events);
}
package com.security.ailogsystem.service;

import java.util.List;
import java.util.Map;

/**
 * 系统信息采集服务接口
 * 支持跨平台系统信息采集和实时数据获取
 */
public interface SystemInfoService {

    /**
     * 收集所有系统信息
     */
    Map<String, Object> collectSystemInfo();

    /**
     * 收集特定类型的系统信息
     */
    Map<String, Object> collectSpecificInfo(String infoType);

    /**
     * 测试Python环境
     */
    boolean testPythonEnvironment();

    /**
     * 获取支持的信息类型列表
     */
    List<String> getSupportedInfoTypes();

    /**
     * 获取信息类型的属性列表
     */
    List<String> getInfoTypeProperties(String infoType);

    /**
     * 提取性能指标
     */
    Map<String, Object> extractPerformanceMetrics();

    // ================ 新增实时数据方法 ================

    /**
     * 快速收集性能数据（CPU、内存）
     */
    Map<String, Object> collectPerformanceDataQuick();

    /**
     * 快速收集进程信息
     */
    Map<String, Object> collectQuickProcessInfo(int limit);

    /**
     * 收集网络统计信息
     */
    Map<String, Object> collectNetworkStats();

    /**
     * 收集系统指标
     */
    Map<String, Object> collectSystemMetrics();

    /**
     * 收集实时系统状态
     */
    Map<String, Object> collectRealTimeStatus();

    /**
     * 批量收集实时数据（优化性能）
     */
    Map<String, Object> collectBatchRealTimeData();

    /**
     * 获取数据采集频率配置
     */
    Map<String, Integer> getCollectionIntervals();
}
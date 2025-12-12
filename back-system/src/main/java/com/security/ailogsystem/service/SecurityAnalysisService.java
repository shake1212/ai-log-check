package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.ThreatIntelSyncRequest;
import com.security.ailogsystem.entity.SecurityAnalysisTask;
import com.security.ailogsystem.entity.ThreatIntelligence;
import org.springframework.scheduling.annotation.Async;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 安全分析服务接口
 */
public interface SecurityAnalysisService {

    /**
     * 获取所有安全分析任务
     */
    List<SecurityAnalysisTask> getSecurityAnalyses();

    /**
     * 获取所有威胁情报
     */
    List<ThreatIntelligence> getThreatIntelligence();

    /**
     * 运行威胁分析（异步）
     */
    @Async
    CompletableFuture<Map<String, Object>> runThreatAnalysis();

    /**
     * 运行合规扫描（异步）
     */
    @Async
    CompletableFuture<Map<String, Object>> runComplianceScan();

    /**
     * 运行异常检测（异步）
     */
    @Async
    CompletableFuture<Map<String, Object>> runAnomalyDetection();

    /**
     * 同步云端威胁情报
     */
    Map<String, Object> syncCloudThreatIntel(ThreatIntelSyncRequest request);

    /**
     * 获取分析结果统计
     */
    Map<String, Object> getAnalysisStats();

    /**
     * 获取威胁情报统计
     */
    Map<String, Object> getThreatIntelStats();

    /**
     * 根据ID获取分析任务
     */
    SecurityAnalysisTask getAnalysisTaskById(String taskId);

    /**
     * 根据ID获取威胁情报
     */
    ThreatIntelligence getThreatIntelligenceById(String threatId);

    /**
     * 创建分析任务
     */
    SecurityAnalysisTask createAnalysisTask(SecurityAnalysisTask task);

    /**
     * 更新分析任务状态
     */
    SecurityAnalysisTask updateTaskStatus(String taskId, String status, String error);
}
// service/ThreatDetectionService.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;

import java.util.List;
import java.util.Map;

/**
 * 威胁检测服务接口
 */
public interface ThreatDetectionService {

    /**
     * 分析日志威胁等级
     * @param log 安全日志
     */
    void analyzeThreat(SecurityLog log);

    /**
     * 批量分析日志威胁
     * @param logs 日志列表
     * @return 检测到的威胁列表
     */
    List<SecurityAlert> analyzeThreats(List<SecurityLog> logs);

    /**
     * 检测暴力破解攻击
     * @param log 登录失败日志
     * @return 是否检测到暴力破解
     */
    boolean detectBruteForceAttack(SecurityLog log);

    /**
     * 检测异常登录行为
     * @param log 登录日志
     * @return 是否异常
     */
    boolean detectUnusualLogin(SecurityLog log);

    /**
     * 检测特权账户操作
     * @param log 操作日志
     * @return 是否特权操作
     */
    boolean detectPrivilegedOperation(SecurityLog log);

    /**
     * 获取威胁统计信息
     * @return 统计信息
     */
    Map<String, Object> getThreatStatistics();

    /**
     * 更新检测规则
     * @param rules 规则配置
     */
    void updateDetectionRules(Map<String, Object> rules);
}
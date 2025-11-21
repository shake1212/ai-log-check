// SimpleWmiService.java - 服务接口层（修改后）
package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.SystemInfoIngestRequest;
import com.security.ailogsystem.model.SimpleWmiData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 系统信息采集服务接口
 * 改为使用Python采集跨平台系统信息
 */
public interface RealTimeSystemService {

    // 原有的数据访问方法保持不变
    SimpleWmiData saveWmiData(SimpleWmiData wmiData);
    List<SimpleWmiData> saveWmiDataList(List<SimpleWmiData> wmiDataList);
    SimpleWmiData getWmiDataById(Long id);
    List<SimpleWmiData> getWmiDataByHostname(String hostname);
    List<SimpleWmiData> getWmiDataByIpAddress(String ipAddress);
    List<SimpleWmiData> getWmiDataByType(SimpleWmiData.DataType dataType);
    List<SimpleWmiData> getWmiDataByTimeRange(LocalDateTime startTime, LocalDateTime endTime);
    Page<SimpleWmiData> getWmiDataPage(String hostname, Pageable pageable);
    List<SimpleWmiData> getLatestWmiData(String hostname, SimpleWmiData.DataType dataType, int limit);
    Map<String, Object> getWmiStatistics();
    Map<String, Object> getHostStatistics(String hostname);
    void deleteExpiredData(int days);
    SimpleWmiData collectWmiData(String hostname, String ipAddress, SimpleWmiData.DataType dataType);
    List<SimpleWmiData> batchCollectWmiData(String hostname, String ipAddress);

    // 修改方法 - 改为系统信息查询
    List<Map<String, Object>> executeSystemInfoQuery(String infoType);

    // 修改方法 - 测试系统信息采集环境
    boolean testSystemInfoEnvironment();

    // 修改方法 - 获取支持的信息类型
    List<String> getAvailableInfoTypes();

    // 修改方法 - 获取信息类型属性
    List<String> getInfoTypeProperties(String infoType);
    /**
     * 创建实时数据流连接
     */
    SseEmitter createConnection(String clientId);

    /**
     * 获取活跃连接数
     */
    int getActiveConnections();

    // 修改方法 - 获取系统性能指标
    Map<String, Object> getSystemPerformanceMetrics();
    Map<String, Object> getRealTimeStatus();
    Map<String, Object> getBatchRealTimeData();
    Map<String, Object> getPerformanceDataQuick();
    Map<String, Object> getNetworkStats();
    Map<String, Object> getQuickProcessInfo(int limit);
    SimpleWmiData ingestSystemInfoData(SystemInfoIngestRequest request);
}
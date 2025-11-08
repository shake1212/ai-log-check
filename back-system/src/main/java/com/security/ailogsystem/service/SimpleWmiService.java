package com.security.ailogsystem.service;

import com.security.ailogsystem.model.SimpleWmiData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 扩展的WMI服务接口
 * 支持真实WMI数据采集
 */
public interface SimpleWmiService {

    // 原有的方法保持不变
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

    // 新增方法 - 真实WMI查询
    List<Map<String, Object>> executeRealWmiQuery(String hostname, String username, String password,
                                                  String domain, String namespace, String query);

    // 新增方法 - 测试WMI连接
    boolean testWmiConnection(String hostname, String username, String password, String domain);

    // 新增方法 - 获取WMI类列表
    List<String> getAvailableWmiClasses(String hostname, String username, String password, String domain);

    // 新增方法 - 获取WMI类属性
    List<String> getWmiClassProperties(String hostname, String username, String password,
                                       String domain, String wmiClass);

    // 新增方法 - 获取系统性能指标
    Map<String, Object> getSystemPerformanceMetrics(String hostname, String username, String password, String domain);
}
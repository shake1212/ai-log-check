package com.security.ailogsystem.service;

import com.security.ailogsystem.model.SimpleWmiData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 简单WMI服务接口
 * 轻量级实现，适合大创项目
 * 
 * @author AI Log System
 * @version 1.0
 */
public interface SimpleWmiService {
    
    /**
     * 保存WMI数据
     */
    SimpleWmiData saveWmiData(SimpleWmiData wmiData);
    
    /**
     * 批量保存WMI数据
     */
    List<SimpleWmiData> saveWmiDataList(List<SimpleWmiData> wmiDataList);
    
    /**
     * 根据ID查询
     */
    SimpleWmiData getWmiDataById(Long id);
    
    /**
     * 根据主机名查询
     */
    List<SimpleWmiData> getWmiDataByHostname(String hostname);
    
    /**
     * 根据IP地址查询
     */
    List<SimpleWmiData> getWmiDataByIpAddress(String ipAddress);
    
    /**
     * 根据数据类型查询
     */
    List<SimpleWmiData> getWmiDataByType(SimpleWmiData.DataType dataType);
    
    /**
     * 根据时间范围查询
     */
    List<SimpleWmiData> getWmiDataByTimeRange(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 分页查询
     */
    Page<SimpleWmiData> getWmiDataPage(String hostname, Pageable pageable);
    
    /**
     * 获取最新数据
     */
    List<SimpleWmiData> getLatestWmiData(String hostname, SimpleWmiData.DataType dataType, int limit);
    
    /**
     * 获取统计信息
     */
    Map<String, Object> getWmiStatistics();
    
    /**
     * 获取主机统计
     */
    Map<String, Object> getHostStatistics(String hostname);
    
    /**
     * 删除过期数据
     */
    void deleteExpiredData(int days);
    
    /**
     * 模拟采集WMI数据
     */
    SimpleWmiData collectWmiData(String hostname, String ipAddress, SimpleWmiData.DataType dataType);
    
    /**
     * 批量模拟采集
     */
    List<SimpleWmiData> batchCollectWmiData(String hostname, String ipAddress);
}

package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.SimpleWmiData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 简单WMI数据仓库接口
 * 
 * @author AI Log System
 * @version 1.0
 */
@Repository
public interface SimpleWmiDataRepository extends JpaRepository<SimpleWmiData, Long> {
    
    /**
     * 根据主机名查询
     */
    List<SimpleWmiData> findByHostname(String hostname);
    
    /**
     * 根据IP地址查询
     */
    List<SimpleWmiData> findByIpAddress(String ipAddress);
    
    /**
     * 根据数据类型查询
     */
    List<SimpleWmiData> findByDataType(SimpleWmiData.DataType dataType);
    
    /**
     * 根据主机名和数据类型查询
     */
    List<SimpleWmiData> findByHostnameAndDataType(String hostname, SimpleWmiData.DataType dataType);
    
    /**
     * 按数据类型获取最新数据
     */
    List<SimpleWmiData> findByDataTypeOrderByCollectTimeDesc(SimpleWmiData.DataType dataType, Pageable pageable);
    
    /**
     * 获取最新数据
     */
    @Query("SELECT s FROM SimpleWmiData s WHERE s.hostname = :hostname AND s.dataType = :dataType ORDER BY s.collectTime DESC")
    List<SimpleWmiData> findLatestByHostnameAndDataType(@Param("hostname") String hostname, @Param("dataType") SimpleWmiData.DataType dataType, Pageable pageable);
    
    /**
     * 根据时间范围查询
     */
    List<SimpleWmiData> findByCollectTimeBetween(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 根据主机名和时间范围查询
     */
    List<SimpleWmiData> findByHostnameAndCollectTimeBetween(String hostname, LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 分页查询
     */
    Page<SimpleWmiData> findByHostnameContainingIgnoreCase(String hostname, Pageable pageable);
    
    /**
     * 统计各状态数量
     */
    @Query("SELECT s.status, COUNT(s) FROM SimpleWmiData s GROUP BY s.status")
    List<Object[]> countByStatus();
    
    /**
     * 统计各数据类型数量
     */
    @Query("SELECT s.dataType, COUNT(s) FROM SimpleWmiData s GROUP BY s.dataType")
    List<Object[]> countByDataType();
    
    /**
     * 统计各主机数量
     */
    @Query("SELECT s.hostname, COUNT(s) FROM SimpleWmiData s GROUP BY s.hostname")
    List<Object[]> countByHostname();
    
    /**
     * 删除过期数据
     */
    void deleteByCollectTimeBefore(LocalDateTime expireTime);
}
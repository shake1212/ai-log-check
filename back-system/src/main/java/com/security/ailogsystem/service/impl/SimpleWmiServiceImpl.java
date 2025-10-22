package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.model.SimpleWmiData;
import com.security.ailogsystem.repository.SimpleWmiDataRepository;
import com.security.ailogsystem.service.SimpleWmiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 简单WMI服务实现
 * 轻量级实现，适合大创项目
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@Service
@Transactional
public class SimpleWmiServiceImpl implements SimpleWmiService {

    @Autowired
    private SimpleWmiDataRepository wmiDataRepository;

    @Override
    public SimpleWmiData saveWmiData(SimpleWmiData wmiData) {
        try {
            return wmiDataRepository.save(wmiData);
        } catch (Exception e) {
            log.error("保存WMI数据失败: {}", e.getMessage(), e);
            throw new RuntimeException("保存WMI数据失败", e);
        }
    }

    @Override
    public List<SimpleWmiData> saveWmiDataList(List<SimpleWmiData> wmiDataList) {
        try {
            return wmiDataRepository.saveAll(wmiDataList);
        } catch (Exception e) {
            log.error("批量保存WMI数据失败: {}", e.getMessage(), e);
            throw new RuntimeException("批量保存WMI数据失败", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SimpleWmiData getWmiDataById(Long id) {
        return wmiDataRepository.findById(id).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByHostname(String hostname) {
        return wmiDataRepository.findByHostname(hostname);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByIpAddress(String ipAddress) {
        return wmiDataRepository.findByIpAddress(ipAddress);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByType(SimpleWmiData.DataType dataType) {
        return wmiDataRepository.findByDataType(dataType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        return wmiDataRepository.findByCollectTimeBetween(startTime, endTime);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SimpleWmiData> getWmiDataPage(String hostname, Pageable pageable) {
        if (hostname == null || hostname.trim().isEmpty()) {
            return wmiDataRepository.findAll(pageable);
        }
        return wmiDataRepository.findByHostnameContainingIgnoreCase(hostname, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getLatestWmiData(String hostname, SimpleWmiData.DataType dataType, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return wmiDataRepository.findLatestByHostnameAndDataType(hostname, dataType, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getWmiStatistics() {
        Map<String, Object> statistics = new HashMap<>();
        
        // 总数据量
        long totalCount = wmiDataRepository.count();
        statistics.put("totalCount", totalCount);
        
        // 按状态统计
        List<Object[]> statusCounts = wmiDataRepository.countByStatus();
        Map<String, Long> statusStats = new HashMap<>();
        for (Object[] row : statusCounts) {
            statusStats.put(row[0].toString(), (Long) row[1]);
        }
        statistics.put("statusStatistics", statusStats);
        
        // 按数据类型统计
        List<Object[]> typeCounts = wmiDataRepository.countByDataType();
        Map<String, Long> typeStats = new HashMap<>();
        for (Object[] row : typeCounts) {
            typeStats.put(row[0].toString(), (Long) row[1]);
        }
        statistics.put("typeStatistics", typeStats);
        
        // 按主机统计
        List<Object[]> hostCounts = wmiDataRepository.countByHostname();
        Map<String, Long> hostStats = new HashMap<>();
        for (Object[] row : hostCounts) {
            hostStats.put(row[0].toString(), (Long) row[1]);
        }
        statistics.put("hostStatistics", hostStats);
        
        return statistics;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getHostStatistics(String hostname) {
        Map<String, Object> statistics = new HashMap<>();
        
        List<SimpleWmiData> hostData = wmiDataRepository.findByHostname(hostname);
        statistics.put("hostname", hostname);
        statistics.put("totalCount", hostData.size());
        
        // 按数据类型统计
        Map<String, Long> typeStats = new HashMap<>();
        for (SimpleWmiData data : hostData) {
            String type = data.getDataType().name();
            typeStats.put(type, typeStats.getOrDefault(type, 0L) + 1);
        }
        statistics.put("typeStatistics", typeStats);
        
        // 按状态统计
        Map<String, Long> statusStats = new HashMap<>();
        for (SimpleWmiData data : hostData) {
            String status = data.getStatus().name();
            statusStats.put(status, statusStats.getOrDefault(status, 0L) + 1);
        }
        statistics.put("statusStatistics", statusStats);
        
        // 最新采集时间
        Optional<LocalDateTime> latestTime = hostData.stream()
                .map(SimpleWmiData::getCollectTime)
                .max(LocalDateTime::compareTo);
        statistics.put("latestCollectTime", latestTime.orElse(null));
        
        return statistics;
    }

    @Override
    public void deleteExpiredData(int days) {
        LocalDateTime expireTime = LocalDateTime.now().minusDays(days);
        wmiDataRepository.deleteByCollectTimeBefore(expireTime);
        log.info("删除{}天前的过期WMI数据", days);
    }

    @Override
    public SimpleWmiData collectWmiData(String hostname, String ipAddress, SimpleWmiData.DataType dataType) {
        try {
            // 模拟WMI数据采集
            String dataValue = generateMockData(dataType);
            
            SimpleWmiData wmiData = SimpleWmiData.builder()
                    .hostname(hostname)
                    .ipAddress(ipAddress)
                    .dataType(dataType)
                    .dataValue(dataValue)
                    .status(SimpleWmiData.Status.SUCCESS)
                    .remark("模拟采集数据")
                    .build();
            
            return saveWmiData(wmiData);
        } catch (Exception e) {
            log.error("采集WMI数据失败: {}", e.getMessage(), e);
            
            // 保存失败记录
            SimpleWmiData failedData = SimpleWmiData.builder()
                    .hostname(hostname)
                    .ipAddress(ipAddress)
                    .dataType(dataType)
                    .dataValue("采集失败")
                    .status(SimpleWmiData.Status.FAILED)
                    .remark("采集失败: " + e.getMessage())
                    .build();
            
            return saveWmiData(failedData);
        }
    }

    @Override
    public List<SimpleWmiData> batchCollectWmiData(String hostname, String ipAddress) {
        List<SimpleWmiData> wmiDataList = new ArrayList<>();
        
        // 采集多种类型的数据
        SimpleWmiData.DataType[] dataTypes = {
                SimpleWmiData.DataType.CPU_USAGE,
                SimpleWmiData.DataType.MEMORY_USAGE,
                SimpleWmiData.DataType.DISK_USAGE,
                SimpleWmiData.DataType.NETWORK_TRAFFIC,
                SimpleWmiData.DataType.PROCESS_COUNT
        };
        
        for (SimpleWmiData.DataType dataType : dataTypes) {
            SimpleWmiData wmiData = collectWmiData(hostname, ipAddress, dataType);
            wmiDataList.add(wmiData);
        }
        
        return wmiDataList;
    }
    
    /**
     * 生成模拟数据
     */
    private String generateMockData(SimpleWmiData.DataType dataType) {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        
        switch (dataType) {
            case CPU_USAGE:
                return String.format("%.2f%%", random.nextDouble(10, 90));
            case MEMORY_USAGE:
                return String.format("%.2f%%", random.nextDouble(20, 85));
            case DISK_USAGE:
                return String.format("%.2f%%", random.nextDouble(30, 80));
            case NETWORK_TRAFFIC:
                return String.format("上行: %.2f MB/s, 下行: %.2f MB/s", 
                        random.nextDouble(1, 100), random.nextDouble(1, 200));
            case PROCESS_COUNT:
                return String.valueOf(random.nextInt(50, 200));
            case SERVICE_STATUS:
                return random.nextBoolean() ? "运行中" : "已停止";
            case SYSTEM_INFO:
                return String.format("系统: Windows 10, 版本: %d.%d", 
                        random.nextInt(10, 11), random.nextInt(0, 3));
            default:
                return "未知数据类型";
        }
    }
}

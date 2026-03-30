package com.security.ailogsystem.enums;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 数据源类型枚举
 * 定义系统支持的所有数据源类型
 * 
 * @author AI Log System
 */
public enum DataSourceType {
    // Windows事件日志数据源
    SECURITY("security", "安全日志", "Windows安全事件日志", "event-log"),
    SYSTEM("system", "系统日志", "Windows系统事件日志", "event-log"),
    APPLICATION("application", "应用日志", "Windows应用程序事件日志", "event-log"),
    
    // 系统性能指标数据源
    CPU("cpu", "CPU信息", "CPU使用率和性能指标", "performance"),
    MEMORY("memory", "内存信息", "内存使用率和分配信息", "performance"),
    DISK("disk", "磁盘信息", "磁盘使用率和I/O性能", "performance"),
    NETWORK("network", "网络信息", "网络流量和连接状态", "performance"),
    PROCESS("process", "进程信息", "进程列表和资源占用", "performance");
    
    private final String code;
    private final String displayName;
    private final String description;
    private final String category;
    
    DataSourceType(String code, String displayName, String description, String category) {
        this.code = code;
        this.displayName = displayName;
        this.description = description;
        this.category = category;
    }
    
    public String getCode() {
        return code;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public String getDescription() {
        return description;
    }
    
    public String getCategory() {
        return category;
    }
    
    /**
     * 根据代码获取数据源类型
     * @param code 数据源代码
     * @return 数据源类型
     * @throws IllegalArgumentException 如果代码无效
     */
    public static DataSourceType fromCode(String code) {
        if (code == null) {
            throw new IllegalArgumentException("数据源代码不能为空");
        }
        
        for (DataSourceType type : values()) {
            if (type.code.equalsIgnoreCase(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("未知的数据源类型: " + code);
    }
    
    /**
     * 验证数据源代码是否有效
     * @param code 数据源代码
     * @return 是否有效
     */
    public static boolean isValid(String code) {
        if (code == null) {
            return false;
        }
        
        try {
            fromCode(code);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
    
    /**
     * 获取所有数据源代码
     * @return 数据源代码列表
     */
    public static List<String> getAllCodes() {
        return Arrays.stream(values())
                .map(DataSourceType::getCode)
                .collect(Collectors.toList());
    }
    
    /**
     * 获取所有数据源显示名称
     * @return 显示名称列表
     */
    public static List<String> getAllDisplayNames() {
        return Arrays.stream(values())
                .map(DataSourceType::getDisplayName)
                .collect(Collectors.toList());
    }
    
    /**
     * 根据类别获取数据源
     * @param category 类别（event-log 或 performance）
     * @return 该类别的数据源列表
     */
    public static List<DataSourceType> getByCategory(String category) {
        return Arrays.stream(values())
                .filter(type -> type.category.equals(category))
                .collect(Collectors.toList());
    }
    
    /**
     * 判断是否为事件日志数据源
     * @return 是否为事件日志
     */
    public boolean isEventLog() {
        return "event-log".equals(this.category);
    }
    
    /**
     * 判断是否为性能指标数据源
     * @return 是否为性能指标
     */
    public boolean isPerformance() {
        return "performance".equals(this.category);
    }
}

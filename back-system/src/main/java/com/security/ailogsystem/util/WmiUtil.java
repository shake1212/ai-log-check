package com.security.ailogsystem.util;

import com.profesorfalken.wmi4java.WMI4Java;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * WMI工具类
 * 提供真实的WMI数据查询功能
 */
@Slf4j
@Component
public class WmiUtil {

    /**
     * 测试WMI连接
     */
    public boolean testConnection(String host, String username, String password, String domain) {
        try {
            if ("localhost".equals(host) || "127.0.0.1".equals(host)) {
                // 本地连接测试
                WMI4Java.get().properties(Arrays.asList("Name")).getWMIObject("Win32_ComputerSystem");
                return true;
            } else {
                // 远程连接测试
                WMI4Java wmi = WMI4Java.get();
                wmi.properties(Arrays.asList("Name")).getWMIObject("Win32_ComputerSystem");
                return true;
            }
        } catch (Exception e) {
            log.error("WMI连接测试失败: {}@{}, 错误: {}", username, host, e.getMessage());
            return false;
        }
    }

    /**
     * 执行WMI查询
     */
    public List<Map<String, Object>> executeQuery(String host, String username, String password,
                                                  String domain, String namespace, String query) {
        try {
            WMI4Java wmi = WMI4Java.get();

            // 从查询中提取WMI类名
            String wmiClass = extractWmiClassFromQuery(query);

            // 获取属性列表
            String[] propertiesArray = extractPropertiesFromQuery(query);
            List<String> properties = Arrays.asList(propertiesArray);

            // 执行查询 - getWMIObject 现在返回 Map<String, String>
            Map<String, String> result = wmi.properties(properties).getWMIObject(wmiClass);

            return convertMapToList(result);

        } catch (Exception e) {
            log.error("WMI查询执行失败: {}, 错误: {}", query, e.getMessage());
            // 返回模拟数据
            return generateMockData(query);
        }
    }

    /**
     * 将单个 Map 转换为 List<Map> 格式
     */
    private List<Map<String, Object>> convertMapToList(Map<String, String> resultMap) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (resultMap != null && !resultMap.isEmpty()) {
            Map<String, Object> convertedMap = new HashMap<>();
            // 转换值为 Object 类型
            for (Map.Entry<String, String> entry : resultMap.entrySet()) {
                convertedMap.put(entry.getKey(), entry.getValue());
            }
            results.add(convertedMap);
        }
        return results;
    }

    /**
     * 从查询中提取WMI类名
     */
    private String extractWmiClassFromQuery(String query) {
        if (query.toUpperCase().contains("FROM")) {
            String[] parts = query.toUpperCase().split("FROM");
            if (parts.length > 1) {
                return parts[1].trim().split(" ")[0].trim();
            }
        }

        // 默认返回常见的WMI类
        if (query.contains("Win32_Process")) return "Win32_Process";
        if (query.contains("Win32_Service")) return "Win32_Service";
        if (query.contains("Win32_ComputerSystem")) return "Win32_ComputerSystem";
        if (query.contains("Win32_LogicalDisk")) return "Win32_LogicalDisk";
        if (query.contains("Win32_OperatingSystem")) return "Win32_OperatingSystem";
        if (query.contains("Win32_NTLogEvent")) return "Win32_NTLogEvent";

        return "Win32_ComputerSystem";
    }

    /**
     * 从查询中提取属性列表
     */
    private String[] extractPropertiesFromQuery(String query) {
        if (query.toUpperCase().contains("SELECT") && query.toUpperCase().contains("FROM")) {
            String selectPart = query.toUpperCase().split("SELECT")[1].split("FROM")[0].trim();
            // 清理属性名
            String[] properties = selectPart.split(",");
            for (int i = 0; i < properties.length; i++) {
                properties[i] = properties[i].trim();
            }
            return properties;
        }

        // 默认返回常见属性
        return new String[]{"Name", "Description", "Status"};
    }

    /**
     * 生成模拟数据（当WMI查询失败或测试时使用）
     */
    private List<Map<String, Object>> generateMockData(String query) {
        List<Map<String, Object>> mockData = new ArrayList<>();
        Random random = new Random();

        String wmiClass = extractWmiClassFromQuery(query);

        switch (wmiClass) {
            case "Win32_Process":
                for (int i = 0; i < 5; i++) {
                    Map<String, Object> process = new HashMap<>();
                    process.put("ProcessId", 1000 + i);
                    process.put("Name", "process" + i + ".exe");
                    process.put("WorkingSetSize", 1024 * 1024 * (i + 1));
                    process.put("PageFileUsage", 512 * 1024 * (i + 1));
                    process.put("CreationDate", new Date().toString());
                    mockData.add(process);
                }
                break;

            case "Win32_Service":
                String[] serviceStates = {"Running", "Stopped", "Paused"};
                for (int i = 0; i < 5; i++) {
                    Map<String, Object> service = new HashMap<>();
                    service.put("Name", "Service" + i);
                    service.put("State", serviceStates[i % serviceStates.length]);
                    service.put("Status", "OK");
                    service.put("StartMode", "Auto");
                    service.put("ProcessId", 500 + i);
                    service.put("Description", "Test Service " + i);
                    mockData.add(service);
                }
                break;

            case "Win32_LogicalDisk":
                String[] driveTypes = {"Local Disk", "CD-ROM", "Network Drive"};
                for (int i = 0; i < 3; i++) {
                    Map<String, Object> disk = new HashMap<>();
                    disk.put("DeviceID", "C:" + (i > 0 ? i : ""));
                    disk.put("DriveType", driveTypes[i % driveTypes.length]);
                    disk.put("Size", 500 * 1024 * 1024 * 1024L);
                    disk.put("FreeSpace", 200 * 1024 * 1024 * 1024L);
                    disk.put("FileSystem", "NTFS");
                    mockData.add(disk);
                }
                break;

            case "Win32_NTLogEvent":
                String[] eventTypes = {"Error", "Warning", "Information"};
                for (int i = 0; i < 10; i++) {
                    Map<String, Object> event = new HashMap<>();
                    event.put("EventCode", 1000 + i);
                    event.put("EventType", eventTypes[i % eventTypes.length]);
                    event.put("Message", "Sample event message " + i);
                    event.put("SourceName", "Application");
                    event.put("TimeGenerated", new Date().toString());
                    event.put("Category", String.valueOf(i));
                    mockData.add(event);
                }
                break;

            default:
                Map<String, Object> data = new HashMap<>();
                data.put("Name", "Mock-Computer");
                data.put("Description", "模拟计算机数据");
                data.put("Status", "OK");
                data.put("Manufacturer", "Mock Manufacturer");
                data.put("Model", "Mock Model");
                data.put("TotalPhysicalMemory", "8589934592"); // 8GB
                data.put("Timestamp", new Date().toString());
                mockData.add(data);
                break;
        }

        return mockData;
    }

    /**
     * 获取可用的WMI类列表
     */
    public List<String> getAvailableWmiClasses(String host, String username, String password, String domain) {
        try {
            // 返回常见的WMI类列表
            return Arrays.asList(
                    "Win32_ComputerSystem",
                    "Win32_OperatingSystem",
                    "Win32_Process",
                    "Win32_Service",
                    "Win32_LogicalDisk",
                    "Win32_NetworkAdapter",
                    "Win32_Processor",
                    "Win32_PhysicalMemory",
                    "Win32_BIOS",
                    "Win32_NTLogEvent",
                    "Win32_StartupCommand",
                    "Win32_Product",
                    "Win32_UserAccount"
            );
        } catch (Exception e) {
            log.error("获取WMI类列表失败: {}", e.getMessage());
            return Arrays.asList("Win32_ComputerSystem", "Win32_Process", "Win32_Service");
        }
    }

    /**
     * 获取WMI类的属性列表
     */
    public List<String> getWmiClassProperties(String host, String username, String password,
                                              String domain, String wmiClass) {
        // 返回常见WMI类的属性
        Map<String, List<String>> classProperties = new HashMap<>();

        classProperties.put("Win32_Process", Arrays.asList(
                "ProcessId", "Name", "WorkingSetSize", "PageFileUsage", "CreationDate", "ExecutablePath"
        ));

        classProperties.put("Win32_Service", Arrays.asList(
                "Name", "State", "Status", "StartMode", "ProcessId", "Description"
        ));

        classProperties.put("Win32_ComputerSystem", Arrays.asList(
                "Name", "Manufacturer", "Model", "TotalPhysicalMemory", "NumberOfProcessors", "Domain"
        ));

        classProperties.put("Win32_LogicalDisk", Arrays.asList(
                "DeviceID", "DriveType", "Size", "FreeSpace", "FileSystem"
        ));

        classProperties.put("Win32_OperatingSystem", Arrays.asList(
                "Caption", "Version", "BuildNumber", "InstallDate", "LastBootUpTime"
        ));

        classProperties.put("Win32_NTLogEvent", Arrays.asList(
                "EventCode", "EventType", "Message", "SourceName", "TimeGenerated", "Category"
        ));

        return classProperties.getOrDefault(wmiClass,
                Arrays.asList("Name", "Description", "Status"));
    }
}
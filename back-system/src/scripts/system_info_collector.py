#!/usr/bin/env python3
"""
系统信息收集器 - 支持多种数据类型
支持的数据类型: performance, cpu_info, system_basic, memory_info, disk_info, process_info
"""

import psutil
import platform
import json
import sys
import time
import os
from datetime import datetime

def collect_performance():
    """收集性能数据"""
    try:
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)

        # 内存信息
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used = memory.used
        memory_available = memory.available

        return {
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "memory_used": memory_used,
            "memory_available": memory_available,
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": f"性能数据收集失败: {str(e)}"}

def collect_cpu_info():
    """收集CPU详细信息"""
    try:
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)

        # CPU频率
        cpu_freq = psutil.cpu_freq()
        current_freq = cpu_freq.current if cpu_freq else 0
        max_freq = cpu_freq.max if cpu_freq else 0

        # CPU核心数
        cpu_cores = psutil.cpu_count(logical=False)  # 物理核心
        cpu_logical_cores = psutil.cpu_count(logical=True)  # 逻辑核心

        # CPU时间
        cpu_times = psutil.cpu_times()

        # 每个核心的使用率
        cpu_percent_per_core = psutil.cpu_percent(interval=1, percpu=True)

        return {
            "usage": cpu_percent,
            "cores": cpu_logical_cores,
            "physical_cores": cpu_cores,
            "frequency": current_freq,
            "max_frequency": max_freq,
            "user_time": getattr(cpu_times, 'user', 0),
            "system_time": getattr(cpu_times, 'system', 0),
            "idle_time": getattr(cpu_times, 'idle', 0),
            "usage_per_core": cpu_percent_per_core,
            "load_average": get_load_average(),
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": f"CPU信息收集失败: {str(e)}"}

def collect_system_basic():
    """收集系统基本信息"""
    try:
        # 系统信息
        system_info = platform.uname()

        # 启动时间
        boot_time = psutil.boot_time()
        boot_time_str = datetime.fromtimestamp(boot_time).strftime("%Y-%m-%d %H:%M:%S")

        # 用户信息
        users = psutil.users()
        user_count = len(users)
        current_user = os.getlogin() if hasattr(os, 'getlogin') else 'unknown'

        return {
            "hostname": system_info.node,
            "platform": system_info.system,
            "platform_version": system_info.version,
            "architecture": system_info.machine,
            "processor": system_info.processor,
            "boot_time": boot_time,
            "boot_time_str": boot_time_str,
            "users": user_count,
            "current_user": current_user,
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": f"系统基本信息收集失败: {str(e)}"}

def collect_memory_info():
    """收集内存详细信息"""
    try:
        # 物理内存
        virtual_memory = psutil.virtual_memory()

        # 交换内存
        swap_memory = psutil.swap_memory()

        return {
            "usage": virtual_memory.percent,
            "used": virtual_memory.used,
            "available": virtual_memory.available,
            "total": virtual_memory.total,
            "free": virtual_memory.free,
            "swap_used": swap_memory.used,
            "swap_total": swap_memory.total,
            "swap_free": swap_memory.free,
            "swap_percent": swap_memory.percent,
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": f"内存信息收集失败: {str(e)}"}

def collect_disk_info():
    """收集磁盘信息"""
    try:
        # 磁盘使用情况
        disk_usage = psutil.disk_usage('/')

        # 磁盘IO
        disk_io = psutil.disk_io_counters()

        # 分区信息
        partitions = []
        for partition in psutil.disk_partitions():
            try:
                partition_usage = psutil.disk_usage(partition.mountpoint)
                partitions.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": partition_usage.total,
                    "used": partition_usage.used,
                    "free": partition_usage.free,
                    "percent": partition_usage.percent
                })
            except Exception:
                # 跳过无法访问的分区
                continue

        return {
            "usage": disk_usage.percent,
            "used": disk_usage.used,
            "available": disk_usage.free,
            "total": disk_usage.total,
            "read_bytes": disk_io.read_bytes if disk_io else 0,
            "write_bytes": disk_io.write_bytes if disk_io else 0,
            "read_count": disk_io.read_count if disk_io else 0,
            "write_count": disk_io.write_count if disk_io else 0,
            "partitions": partitions,
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": f"磁盘信息收集失败: {str(e)}"}

def collect_process_info():
    """收集进程信息"""
    try:
        processes = []
        process_count = 0
        running_count = 0
        sleeping_count = 0

        # 获取进程列表
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                process_info = proc.info
                process_count += 1

                # 统计状态
                if process_info['status'] == psutil.STATUS_RUNNING:
                    running_count += 1
                elif process_info['status'] == psutil.STATUS_SLEEPING:
                    sleeping_count += 1

                # 只收集前20个进程的信息，避免数据量过大
                if len(processes) < 20:
                    processes.append({
                        "pid": process_info['pid'],
                        "name": process_info['name'],
                        "cpu": process_info['cpu_percent'] or 0,
                        "memory": process_info['memory_percent'] or 0,
                        "status": process_info['status'],
                        "memory_rss": proc.memory_info().rss if hasattr(proc, 'memory_info') else 0
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                # 进程可能已经结束或无权限访问
                continue

        # 按CPU使用率排序
        processes.sort(key=lambda x: x['cpu'], reverse=True)

        return {
            "total": process_count,
            "running": running_count,
            "sleeping": sleeping_count,
            "processes": processes,
            "timestamp": time.time()
        }
    except Exception as e:
        return {"error": f"进程信息收集失败: {str(e)}"}

def get_load_average():
    """获取系统负载（兼容Windows和Linux）"""
    try:
        if hasattr(os, 'getloadavg'):
            return list(os.getloadavg())
        else:
            # Windows系统返回模拟值
            cpu_percent = psutil.cpu_percent(interval=1)
            return [cpu_percent / 100, 0, 0]
    except:
        return [0, 0, 0]

def main():
    if len(sys.argv) < 2:
        # 默认返回性能数据
        result = collect_performance()
    else:
        data_type = sys.argv[1]

        # 根据数据类型调用相应的收集函数
        if data_type == "performance":
            result = collect_performance()
        elif data_type == "cpu_info":
            result = collect_cpu_info()
        elif data_type == "system_basic":
            result = collect_system_basic()
        elif data_type == "memory_info":
            result = collect_memory_info()
        elif data_type == "disk_info":
            result = collect_disk_info()
        elif data_type == "process_info":
            result = collect_process_info()
        else:
            result = {"error": f"未知的数据类型: {data_type}"}

    # 输出JSON结果
    print(json.dumps(result))

if __name__ == "__main__":
    main()
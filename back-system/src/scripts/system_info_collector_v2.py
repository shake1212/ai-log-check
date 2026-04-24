#!/usr/bin/env python3
"""
系统信息收集器 v2.0 - 改进版
- 添加重试机制
- 使用logging模块
- 添加数据验证
- 添加配置文件支持
"""

import psutil
import platform
import json
import sys
import time
import os
import socket
import requests
import logging
from datetime import datetime
from functools import wraps

# ==================== 日志配置 ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('system_collector.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ==================== 配置 ====================
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8080/api/events/batch')
SYSTEM_INFO_API_URL = os.getenv('SYSTEM_INFO_API_URL', 'http://localhost:8080/api/system-info/ingest')
HOST_NAME = platform.node() or "unknown-host"
PLATFORM_INFO = platform.platform()

try:
    HOST_IP = socket.gethostbyname(socket.gethostname())
except Exception:
    HOST_IP = "127.0.0.1"

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 2
REQUEST_TIMEOUT = 30

# ==================== 装饰器 ====================

def retry_on_failure(max_retries=MAX_RETRIES, delay=RETRY_DELAY):
    """重试装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.Timeout:
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)
                        logger.warning(f"请求超时,{wait_time}秒后重试... ({attempt+1}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"重试{max_retries}次后仍然超时")
                        raise
                except requests.exceptions.ConnectionError:
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)
                        logger.warning(f"连接失败,{wait_time}秒后重试... ({attempt+1}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"重试{max_retries}次后仍然无法连接")
                        raise
                except requests.exceptions.RequestException as e:
                    if attempt < max_retries - 1:
                        wait_time = delay * (2 ** attempt)
                        logger.warning(f"请求失败: {e}, {wait_time}秒后重试... ({attempt+1}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"重试{max_retries}次后仍然失败: {e}")
                        raise
            return None
        return wrapper
    return decorator

# ==================== 数据验证 ====================

def validate_event(event):
    """验证事件数据格式"""
    required_fields = ['timestamp', 'sourceSystem', 'eventType', 'category', 'severity']
    
    for field in required_fields:
        if field not in event or not event[field]:
            raise ValueError(f"缺少必填字段: {field}")
    
    # 验证严重级别
    valid_severities = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL', 'LOW', 'MEDIUM', 'HIGH']
    if event['severity'] not in valid_severities:
        raise ValueError(f"无效的严重级别: {event['severity']}")
    
    return True

# ==================== 数据收集函数 ====================

def collect_performance():
    """收集性能数据"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        data = {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used": memory.used,
            "memory_available": memory.available,
            "memory_total": memory.total,
            "cpu_count": psutil.cpu_count(logical=True),
            "load_average": get_load_average(),
            "host": HOST_NAME,
            "timestamp": time.time(),
            "collected_at": datetime.now().isoformat()
        }
        
        logger.debug(f"性能数据: CPU={cpu_percent}%, 内存={memory.percent}%")
        return data
        
    except Exception as e:
        logger.error(f"性能数据收集失败: {e}")
        return {"error": str(e)}

def collect_cpu_info():
    """收集CPU详细信息"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_freq = psutil.cpu_freq()
        cpu_times = psutil.cpu_times()
        
        data = {
            "usage": cpu_percent,
            "cores": psutil.cpu_count(logical=True),
            "physical_cores": psutil.cpu_count(logical=False),
            "frequency": cpu_freq.current if cpu_freq else 0,
            "max_frequency": cpu_freq.max if cpu_freq else 0,
            "user_time": getattr(cpu_times, 'user', 0),
            "system_time": getattr(cpu_times, 'system', 0),
            "idle_time": getattr(cpu_times, 'idle', 0),
            "usage_per_core": psutil.cpu_percent(interval=1, percpu=True),
            "load_average": get_load_average(),
            "timestamp": time.time(),
            "host": HOST_NAME,
            "collected_at": datetime.now().isoformat()
        }
        
        logger.debug(f"CPU信息: {cpu_percent}%, {psutil.cpu_count()}核心")
        return data
        
    except Exception as e:
        logger.error(f"CPU信息收集失败: {e}")
        return {"error": str(e)}

def collect_memory_info():
    """收集内存详细信息"""
    try:
        virtual_memory = psutil.virtual_memory()
        swap_memory = psutil.swap_memory()
        
        data = {
            "usage": virtual_memory.percent,
            "used": virtual_memory.used,
            "available": virtual_memory.available,
            "total": virtual_memory.total,
            "free": virtual_memory.free,
            "swap_used": swap_memory.used,
            "swap_total": swap_memory.total,
            "swap_free": swap_memory.free,
            "swap_percent": swap_memory.percent,
            "timestamp": time.time(),
            "host": HOST_NAME,
            "collected_at": datetime.now().isoformat()
        }
        
        logger.debug(f"内存信息: {virtual_memory.percent}%")
        return data
        
    except Exception as e:
        logger.error(f"内存信息收集失败: {e}")
        return {"error": str(e)}

def collect_disk_info():
    """收集磁盘信息"""
    try:
        disk_usage = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()
        
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
                continue
        
        data = {
            "usage": disk_usage.percent,
            "used": disk_usage.used,
            "available": disk_usage.free,
            "total": disk_usage.total,
            "read_bytes": disk_io.read_bytes if disk_io else 0,
            "write_bytes": disk_io.write_bytes if disk_io else 0,
            "read_count": disk_io.read_count if disk_io else 0,
            "write_count": disk_io.write_count if disk_io else 0,
            "partitions": partitions,
            "timestamp": time.time(),
            "host": HOST_NAME,
            "collected_at": datetime.now().isoformat()
        }
        
        logger.debug(f"磁盘信息: {disk_usage.percent}%")
        return data
        
    except Exception as e:
        logger.error(f"磁盘信息收集失败: {e}")
        return {"error": str(e)}

def collect_process_info(top_n=20, min_cpu=5.0):
    """收集进程信息 - 只收集高资源占用的进程"""
    try:
        all_procs = []
        process_count = 0
        running_count = 0
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                info = proc.info
                process_count += 1
                
                if info['status'] == psutil.STATUS_RUNNING:
                    running_count += 1
                
                cpu = info.get('cpu_percent', 0) or 0
                mem = info.get('memory_percent', 0) or 0
                
                # 只记录高资源占用的进程
                if cpu >= min_cpu or mem >= 5.0:
                    all_procs.append({
                        "pid": info['pid'],
                        "name": info['name'],
                        "cpu": cpu,
                        "memory": mem,
                        "status": info['status']
                    })
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # 按CPU排序,取前N个
        all_procs.sort(key=lambda x: x['cpu'], reverse=True)
        top_processes = all_procs[:top_n]
        
        data = {
            "total": process_count,
            "running": running_count,
            "high_usage_count": len(all_procs),
            "processes": top_processes,
            "timestamp": time.time(),
            "host": HOST_NAME,
            "collected_at": datetime.now().isoformat()
        }
        
        logger.debug(f"进程信息: 总数={process_count}, 高占用={len(all_procs)}")
        return data
        
    except Exception as e:
        logger.error(f"进程信息收集失败: {e}")
        return {"error": str(e)}

def get_load_average():
    """获取系统负载"""
    try:
        if hasattr(os, 'getloadavg'):
            return list(os.getloadavg())
        else:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            return [cpu_percent / 100, 0, 0]
    except:
        return [0, 0, 0]

# ==================== 数据发送函数 ====================

def build_enriched_payload(data_type: str, data: dict) -> dict:
    """构建增强的数据负载"""
    return {
        "collector": "system_info_collector_v2",
        "host": HOST_NAME,
        "ip": HOST_IP,
        "platform": PLATFORM_INFO,
        "dataType": data_type,
        "collectedAt": datetime.now().isoformat(),
        "data": data
    }

@retry_on_failure(max_retries=MAX_RETRIES, delay=RETRY_DELAY)
def send_to_backend(data, data_type):
    """发送数据到Java后端 - 带重试"""
    try:
        enriched = build_enriched_payload(data_type, data)
        
        event = {
            "timestamp": datetime.now().isoformat(),
            "sourceSystem": "SYSTEM_INFO_COLLECTOR",
            "eventType": f"SYSTEM_{data_type.upper()}",
            "category": "SYSTEM_PERFORMANCE",
            "severity": "INFO",
            "normalizedMessage": f"系统{data_type}信息收集",
            "hostName": HOST_NAME,
            "eventData": enriched,
            "rawData": json.dumps(enriched, ensure_ascii=False)
        }
        
        # 验证数据
        validate_event(event)
        
        # 发送请求
        response = requests.post(
            BACKEND_URL,
            json=[event],
            headers={'Content-Type': 'application/json'},
            timeout=REQUEST_TIMEOUT
        )
        
        response.raise_for_status()
        
        logger.info(f"✅ 数据发送成功: {data_type}")
        return enriched
        
    except ValueError as e:
        logger.error(f"❌ 数据验证失败: {e}")
        return None
    except requests.exceptions.HTTPError as e:
        logger.error(f"❌ HTTP错误: {e.response.status_code}")
        raise
    except Exception as e:
        logger.error(f"❌ 发送失败: {e}")
        raise

@retry_on_failure(max_retries=MAX_RETRIES, delay=RETRY_DELAY)
def send_to_system_info_service(enriched_payload, data_type):
    """发送到系统信息管理接口 - 带重试"""
    if enriched_payload is None:
        return False
    
    ingest_payload = {
        "hostname": enriched_payload.get("host", HOST_NAME),
        "ipAddress": enriched_payload.get("ip", HOST_IP),
        "dataType": data_type,
        "payload": enriched_payload,
        "status": "SUCCESS",
        "collectTime": enriched_payload.get("collectedAt")
    }
    
    try:
        response = requests.post(
            SYSTEM_INFO_API_URL,
            json=ingest_payload,
            timeout=REQUEST_TIMEOUT
        )
        
        response.raise_for_status()
        
        logger.info(f"✅ 系统信息入库成功: {data_type}")
        return True
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"❌ 系统信息入库失败: {e.response.status_code}")
        raise
    except Exception as e:
        logger.error(f"❌ 系统信息入库失败: {e}")
        raise

# ==================== 主函数 ====================

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("系统信息收集器 v2.0")
    logger.info(f"主机: {HOST_NAME}")
    logger.info(f"IP: {HOST_IP}")
    logger.info(f"平台: {PLATFORM_INFO}")
    logger.info("=" * 60)
    
    # 确定数据类型
    if len(sys.argv) < 2:
        data_type = "performance"
    else:
        data_type = sys.argv[1]
    
    # 收集数据
    logger.info(f"开始收集: {data_type}")
    
    collectors = {
        "performance": collect_performance,
        "cpu_info": collect_cpu_info,
        "memory_info": collect_memory_info,
        "disk_info": collect_disk_info,
        "process_info": collect_process_info
    }
    
    if data_type not in collectors:
        logger.error(f"未知的数据类型: {data_type}")
        logger.info(f"支持的类型: {', '.join(collectors.keys())}")
        return 1
    
    # 执行收集
    result = collectors[data_type]()
    
    # 输出JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    # 如果收集失败,退出
    if "error" in result:
        logger.error(f"收集失败: {result['error']}")
        return 1
    
    # 发送数据
    try:
        enriched_payload = send_to_backend(result, data_type)
        if enriched_payload:
            send_to_system_info_service(enriched_payload, data_type)
        
        logger.info("=" * 60)
        logger.info("✅ 采集完成")
        logger.info("=" * 60)
        return 0
        
    except Exception as e:
        logger.error(f"发送数据失败: {e}")
        logger.warning("数据已收集但未能发送到后端")
        return 1

if __name__ == "__main__":
    sys.exit(main())

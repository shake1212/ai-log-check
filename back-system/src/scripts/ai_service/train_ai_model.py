#!/usr/bin/env python3
"""
AI异常检测模型训练脚本
从数据库提取历史安全事件，训练孤立森林模型
"""
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder
import ipaddress
from datetime import datetime
import pymysql
from sqlalchemy import create_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '123456',
    'database': 'ai_log_system',
    'charset': 'utf8mb4'
}

# 严重级别映射
SEVERITY_MAP = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3}

def extract_features_from_event(event_dict):
    """
    从事件字典提取特征向量
    event_dict 应包含字段：
        timestamp, source_ip, destination_port, user_id, process_name, event_type, severity
    """
    # 时间特征：确保转换为 pandas Timestamp
    ts = event_dict.get('timestamp')
    if ts is None:
        dt = pd.Timestamp.now()
    else:
        # 兼容字符串和 datetime 对象
        dt = pd.Timestamp(ts)   # 统一转为 pandas Timestamp

    hour = dt.hour
    day_of_week = dt.dayofweek   # 现在安全

    # IP 转整数
    src_ip = event_dict.get('source_ip', '0.0.0.0')
    if src_ip is None:
        src_ip = '0.0.0.0'
    try:
        ip_int = int(ipaddress.IPv4Address(src_ip))
    except:
        ip_int = 0

    # 端口
    dst_port = event_dict.get('destination_port', 0)
    if dst_port is None:
        dst_port = 0

    # 用户ID哈希
    user_id = event_dict.get('user_id', '')
    if user_id is None:
        user_id = ''
    user_hash = hash(user_id) % 10000 if user_id else 0

    # 进程名（后续编码）
    process_name = event_dict.get('process_name', 'unknown')
    if process_name is None:
        process_name = 'unknown'
    # 事件类型（后续编码）
    event_type = event_dict.get('event_type', 'unknown')
    if event_type is None:
        event_type = 'unknown'
    # 严重级别
    severity = SEVERITY_MAP.get(event_dict.get('severity', 'LOW'), 0)

    # 返回特征向量（前6个数值特征 + 2个字符串特征待编码）
    return [hour, day_of_week, ip_int, dst_port, user_hash, severity, process_name, event_type]

def load_data_from_db(limit=100000):
    """从数据库加载历史事件"""
    engine = create_engine(
        f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset={DB_CONFIG['charset']}"
    )
    sql = """
    SELECT 
        timestamp,
        source_ip,
        destination_port,
        user_id,
        process_name,
        event_type,
        severity
    FROM unified_security_events
    WHERE timestamp >= NOW() - INTERVAL 30 DAY
    ORDER BY timestamp DESC
    LIMIT %s
    """
    df = pd.read_sql(sql, engine, params=(limit,))
    logger.info(f"加载了 {len(df)} 条事件")
    return df

def main():
    # 加载数据
    df = load_data_from_db()

    # 提取特征
    features_list = []
    for _, row in df.iterrows():
        event_dict = row.to_dict()
        feats = extract_features_from_event(event_dict)
        features_list.append(feats)

    # 分离数值特征和字符串特征
    numeric = np.array([f[:6] for f in features_list])
    string_vals = [f[6:] for f in features_list]   # [process_name, event_type]

    # 字符串特征编码
    proc_encoder = LabelEncoder()
    proc_encoder.fit([s[0] for s in string_vals])
    evt_encoder = LabelEncoder()
    evt_encoder.fit([s[1] for s in string_vals])

    # 构建完整特征矩阵
    X = np.hstack([
        numeric,
        proc_encoder.transform([s[0] for s in string_vals]).reshape(-1, 1),
        evt_encoder.transform([s[1] for s in string_vals]).reshape(-1, 1)
    ])

    logger.info(f"特征矩阵形状: {X.shape}")

    # 训练孤立森林
    model = IsolationForest(
        contamination=0.05,
        random_state=42,
        n_estimators=100,
        max_samples='auto'
    )
    model.fit(X)

    # 保存模型和编码器
    joblib.dump(model, 'anomaly_model.pkl')
    joblib.dump(proc_encoder, 'proc_encoder.pkl')
    joblib.dump(evt_encoder, 'evt_encoder.pkl')
    logger.info("模型和编码器已保存")

if __name__ == '__main__':
    main()
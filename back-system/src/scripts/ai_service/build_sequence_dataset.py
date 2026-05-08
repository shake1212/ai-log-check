#!/usr/bin/env python3
"""
从数据库读取历史事件，构造用于 LSTM 自编码器训练的序列数据集
输出保存到 ai_service/ 目录下
"""
import pandas as pd
import numpy as np
import joblib
import ipaddress
from sqlalchemy import create_engine
from sklearn.preprocessing import LabelEncoder, StandardScaler
import os
import warnings
warnings.filterwarnings('ignore')

# ========== 配置 ==========
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '123456',
    'database': 'ai_log_system',
    'charset': 'utf8mb4'
}

SEQ_LEN = 10          # 序列长度
STEP = 1              # 滑动步长
SEVERITY_MAP = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3}

# ========== 特征提取（与ai_service.py完全一致）==========
def extract_features(event):
    ts = event.get('timestamp')
    if ts is None:
        dt = pd.Timestamp.now()
    else:
        dt = pd.Timestamp(ts)
    hour = dt.hour
    day_of_week = dt.dayofweek

    src_ip = event.get('source_ip', '0.0.0.0') or '0.0.0.0'
    try:
        ip_int = int(ipaddress.IPv4Address(src_ip))
    except:
        ip_int = 0

    dst_port = event.get('destination_port', 0) or 0
    user_id = event.get('user_id', '') or ''
    user_hash = hash(user_id) % 10000 if user_id else 0

    process_name = event.get('process_name', 'unknown') or 'unknown'
    event_type = event.get('event_type', 'unknown') or 'unknown'
    severity = SEVERITY_MAP.get(event.get('severity', 'LOW'), 0)

    return [hour, day_of_week, ip_int, dst_port, user_hash, severity, process_name, event_type]

# ========== 主函数 ==========
def main():
    # 输出目录为 ai_service/
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = base_dir   # 直接使用脚本所在目录
    os.makedirs(output_dir, exist_ok=True)
    print(f"输出目录: {output_dir}")

    engine = create_engine(f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset={DB_CONFIG['charset']}")
    print("连接数据库，加载最近30天事件...")
    sql = """
    SELECT timestamp, source_ip, destination_port, user_id, process_name, event_type, severity
    FROM unified_security_events
    WHERE timestamp >= NOW() - INTERVAL 30 DAY
    ORDER BY timestamp ASC
    LIMIT 200000
    """
    df = pd.read_sql(sql, engine)
    print(f"加载了 {len(df)} 条事件")

    # 提取所有事件特征
    all_features = []
    for _, row in df.iterrows():
        feats = extract_features(row.to_dict())
        all_features.append(feats)

    numeric_part = np.array([f[:6] for f in all_features], dtype=np.float32)   # (N,6)
    str_part = [f[6:] for f in all_features]   # list of [proc, evt]

    # 字符串编码
    proc_encoder = LabelEncoder()
    evt_encoder = LabelEncoder()
    proc_vals = [p for p, _ in str_part]
    evt_vals = [e for _, e in str_part]
    proc_encoder.fit(proc_vals)
    evt_encoder.fit(evt_vals)
    proc_encoded = proc_encoder.transform(proc_vals)
    evt_encoded = evt_encoder.transform(evt_vals)

    # 完整特征矩阵 (N, 8)
    X_full = np.hstack([numeric_part, proc_encoded.reshape(-1,1), evt_encoded.reshape(-1,1)]).astype(np.float32)

    # 标准化
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_full)

    # 构造序列样本（滑动窗口）
    sequences = []
    for i in range(0, len(X_scaled) - SEQ_LEN + 1, STEP):
        seq = X_scaled[i:i+SEQ_LEN]   # (SEQ_LEN, 8)
        sequences.append(seq)

    X_seq = np.array(sequences)
    print(f"生成序列样本数: {X_seq.shape[0]}, 每个样本形状: {X_seq.shape[1:]}")

    # 保存到 ai_service/ 目录
    np.save(os.path.join(output_dir, 'X_seq.npy'), X_seq)
    joblib.dump(scaler, os.path.join(output_dir, 'lstm_scaler.pkl'))
    joblib.dump(proc_encoder, os.path.join(output_dir, 'proc_encoder_lstm.pkl'))
    joblib.dump(evt_encoder, os.path.join(output_dir, 'evt_encoder_lstm.pkl'))
    print("已保存: X_seq.npy, lstm_scaler.pkl, proc_encoder_lstm.pkl, evt_encoder_lstm.pkl")

if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""
AI异常检测服务
提供HTTP API，输入事件，输出异常分数
"""
from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
import ipaddress
from datetime import datetime
import logging
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
script_dir = os.path.dirname(os.path.abspath(__file__))

# 加载模型和编码器
model = joblib.load(os.path.join(script_dir, 'anomaly_model.pkl'))
proc_encoder = joblib.load(os.path.join(script_dir, 'proc_encoder.pkl'))
evt_encoder = joblib.load(os.path.join(script_dir, 'evt_encoder.pkl'))

# 严重级别映射
SEVERITY_MAP = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3}

def extract_features_from_event(event_dict):
    """与训练脚本一致的特征提取"""
    # 时间特征
    ts = event_dict.get('timestamp')
    if ts:
        dt = pd.Timestamp(ts)
    else:
        dt = pd.Timestamp.now()
    hour = dt.hour
    day_of_week = dt.dayofweek

    # IP
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

    # 用户ID
    user_id = event_dict.get('user_id', '')
    if user_id is None:
        user_id = ''
    user_hash = hash(user_id) % 10000 if user_id else 0

    # 进程名
    process_name = event_dict.get('process_name', 'unknown')
    if process_name is None:
        process_name = 'unknown'
    # 事件类型
    event_type = event_dict.get('event_type', 'unknown')
    if event_type is None:
        event_type = 'unknown'
    # 严重级别
    severity = SEVERITY_MAP.get(event_dict.get('severity', 'LOW'), 0)

    return [hour, day_of_week, ip_int, dst_port, user_hash, severity, process_name, event_type]

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data'}), 400

    try:
        # 提取特征
        feats = extract_features_from_event(data)
        numeric = feats[:6]
        proc_name = feats[6]
        evt_type = feats[7]

        # 编码字符串特征
        try:
            proc_enc = int(proc_encoder.transform([proc_name])[0])
        except:
            proc_enc = 0
        try:
            evt_enc = int(evt_encoder.transform([evt_type])[0])
        except:
            evt_enc = 0

        # 组合特征
        X = np.array(numeric + [proc_enc, evt_enc], dtype=np.float64).reshape(1, -1)

        # 预测
        pred = model.predict(X)[0]   # -1异常, 1正常
        anomaly_score_raw = model.decision_function(X)[0]   # 负值越小越异常
        # 将原始分数映射到 [0,1]，分数越高越异常
        anomaly_score = 1.0 / (1.0 + np.exp(-anomaly_score_raw))   # sigmoid

        result = {
            'anomaly_score': float(anomaly_score),
            'is_anomaly': bool(pred == -1)
        }
        return jsonify(result)
    except Exception as e:
        logger.exception("预测失败")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    import os
    if os.environ.get('FLASK_ENV') == 'development':
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        from waitress import serve
        logger.info("AI服务启动(生产模式 waitress)，端口 5001")
        serve(app, host='0.0.0.0', port=5001)
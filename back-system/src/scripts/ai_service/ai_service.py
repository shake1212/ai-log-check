#!/usr/bin/env python3
"""
AI异常检测服务 - 混合架构
提供HTTP API，支持：
- 孤立森林（实时单点检测）
- LSTM自编码器（时序序列异常检测）
"""
from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
import ipaddress
from datetime import datetime
import logging
import os
import torch
import torch.nn as nn
from collections import defaultdict, deque
import numpy as np

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== 配置 ====================
SEQ_LEN = 10                     # 序列长度（必须与训练时一致）
FEATURE_DIM = 8                  # 特征维度
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# 严重级别映射（与训练脚本一致）
SEVERITY_MAP = {'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3}

# ==================== 加载孤立森林模型及相关编码器 ====================
try:
    model = joblib.load(os.path.join(SCRIPT_DIR, 'anomaly_model.pkl'))
    proc_encoder = joblib.load(os.path.join(SCRIPT_DIR, 'proc_encoder.pkl'))
    evt_encoder = joblib.load(os.path.join(SCRIPT_DIR, 'evt_encoder.pkl'))
    logger.info("孤立森林模型及编码器加载成功")
except Exception as e:
    logger.error(f"孤立森林模型加载失败: {e}")
    model = None
    proc_encoder = None
    evt_encoder = None

# ==================== LSTM 自编码器定义 ====================
class LSTM_Autoencoder(nn.Module):
    def __init__(self, input_dim=8, hidden_dim=64):
        super().__init__()
        self.encoder = nn.LSTM(input_dim, hidden_dim, batch_first=True, bidirectional=False)
        self.decoder = nn.LSTM(hidden_dim, input_dim, batch_first=True)

    def forward(self, x):
        # x: (batch, seq_len, input_dim)
        _, (hidden, _) = self.encoder(x)                # hidden: (1, batch, hidden_dim)
        seq_len = x.size(1)
        # 将隐藏状态重复 seq_len 次作为解码器的输入
        hidden_repeated = hidden.repeat(seq_len, 1, 1).permute(1, 0, 2)  # (batch, seq_len, hidden_dim)
        decoded, _ = self.decoder(hidden_repeated)
        return decoded

# ==================== 加载 LSTM 模型及相关组件 ====================
lstm_model = None
lstm_scaler = None
lstm_threshold = None
proc_encoder_lstm = None
evt_encoder_lstm = None

try:
    # 加载标准化器
    lstm_scaler = joblib.load(os.path.join(SCRIPT_DIR, 'lstm_scaler.pkl'))
    # 加载阈值
    threshold_dict = joblib.load(os.path.join(SCRIPT_DIR, 'lstm_threshold.pkl'))
    lstm_threshold = threshold_dict['threshold']
    # 加载字符串编码器
    proc_encoder_lstm = joblib.load(os.path.join(SCRIPT_DIR, 'proc_encoder_lstm.pkl'))
    evt_encoder_lstm = joblib.load(os.path.join(SCRIPT_DIR, 'evt_encoder_lstm.pkl'))
    # 加载 PyTorch 模型
    lstm_model = LSTM_Autoencoder(input_dim=FEATURE_DIM, hidden_dim=64)
    state_dict = torch.load(os.path.join(SCRIPT_DIR, 'lstm_autoencoder.pth'), map_location='cpu')
    lstm_model.load_state_dict(state_dict)
    lstm_model.eval()
    logger.info("LSTM 自编码器模型及相关组件加载成功")
except Exception as e:
    logger.warning(f"LSTM 模型加载失败（将禁用深度检测功能）: {e}")
    lstm_model = None

# 事件序列缓存（按源IP/主机分组）
event_queues = defaultdict(lambda: deque(maxlen=SEQ_LEN))

# ==================== 特征提取函数（与训练脚本保持一致） ====================
def extract_features_from_event(event_dict):
    """从事件字典提取特征向量（数值+字符串）"""
    # 时间特征
    ts = event_dict.get('timestamp')
    if ts:
        dt = pd.Timestamp(ts)
    else:
        dt = pd.Timestamp.now()
    hour = dt.hour
    day_of_week = dt.dayofweek

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

    # 返回数值特征 + 两个字符串
    return [hour, day_of_week, ip_int, dst_port, user_hash, severity, process_name, event_type]

# ==================== 原有孤立森林预测端点 ====================
@app.route('/predict', methods=['POST'])
def predict():
    """孤立森林单点异常检测"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data'}), 400

    if model is None:
        return jsonify({'error': 'Isolation Forest model not loaded'}), 503

    try:
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

        X = np.array(numeric + [proc_enc, evt_enc], dtype=np.float64).reshape(1, -1)
        pred = model.predict(X)[0]                     # -1 异常, 1 正常
        anomaly_score_raw = model.decision_function(X)[0]
        anomaly_score = 1.0 / (1.0 + np.exp(-anomaly_score_raw))   # sigmoid 映射到 [0,1]

        return jsonify({
            'model': 'isolation_forest',
            'anomaly_score': float(anomaly_score),
            'is_anomaly': bool(pred == -1)
        })
    except Exception as e:
        logger.exception("孤立森林预测失败")
        return jsonify({'error': str(e)}), 500

# ==================== LSTM 自编码器预测端点（时序） ====================
@app.route('/predict_deep', methods=['POST'])
def predict_deep():
    """LSTM自编码器时序异常检测（需要积累 SEQ_LEN 个事件）"""
    if lstm_model is None:
        return jsonify({'error': 'LSTM model not loaded'}), 503

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data'}), 400

    try:
        # 1. 特征提取
        feats = extract_features_from_event(data)
        numeric = feats[:6]
        proc_name = feats[6]
        evt_type = feats[7]

        # 编码字符串（使用 LSTM 专用的编码器）
        try:
            proc_enc = proc_encoder_lstm.transform([proc_name])[0]
        except:
            proc_enc = 0   # 未知类别
        try:
            evt_enc = evt_encoder_lstm.transform([evt_type])[0]
        except:
            evt_enc = 0

        feature_vec = np.array(numeric + [proc_enc, evt_enc], dtype=np.float32).reshape(1, -1)
        # 标准化
        feature_scaled = lstm_scaler.transform(feature_vec).flatten()

        # 2. 确定队列键（使用 source_ip + user_id 作为组合键，更精确）
        key = f"{data.get('source_ip', '0.0.0.0')}_{data.get('user_id', '')}"
        q = event_queues[key]
        q.append(feature_scaled)

        # 3. 如果序列未满，返回等待状态
        if len(q) < SEQ_LEN:
            return jsonify({
                'model': 'lstm_autoencoder',
                'status': 'collecting',
                'remaining': SEQ_LEN - len(q),
                'message': f'需要 {SEQ_LEN} 个事件完成序列分析，当前已收集 {len(q)} 个'
            })

        # 4. 序列已满，执行推理
        seq_input = np.array(list(q)).reshape(1, SEQ_LEN, FEATURE_DIM)
        seq_tensor = torch.tensor(seq_input, dtype=torch.float32)

        with torch.no_grad():
            recon = lstm_model(seq_tensor)
            mse = torch.mean((recon - seq_tensor) ** 2).item()

        is_anomaly = mse > lstm_threshold
        # 将重建误差映射到 [0,1] 分数（阈值处分数约为0.5，最大限制在1.0）
        anomaly_score = min(1.0, mse / lstm_threshold) if lstm_threshold > 0 else 0.0

        return jsonify({
            'model': 'lstm_autoencoder',
            'anomaly_score': float(anomaly_score),
            'is_anomaly': is_anomaly,
            'reconstruction_error': mse,
            'threshold': lstm_threshold,
            'sequence_key': key
        })

    except Exception as e:
        logger.exception("LSTM 预测失败")
        return jsonify({'error': str(e)}), 500

# ==================== 混合预测端点（结合孤立森林和LSTM） ====================
@app.route('/predict_ensemble', methods=['POST'])
def predict_ensemble():
    """
    综合孤立森林（实时分数）和 LSTM（序列分数）的最终异常判断
    注意：LSTM 部分需要积累序列，若未就绪则只返回孤立森林结果
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON data'}), 400

    result = {}
    # 获取孤立森林结果
    if model is not None:
        try:
            feats = extract_features_from_event(data)
            numeric = feats[:6]
            proc_name = feats[6]
            evt_type = feats[7]
            try:
                proc_enc = int(proc_encoder.transform([proc_name])[0])
            except:
                proc_enc = 0
            try:
                evt_enc = int(evt_encoder.transform([evt_type])[0])
            except:
                evt_enc = 0
            X = np.array(numeric + [proc_enc, evt_enc], dtype=np.float64).reshape(1, -1)
            pred = model.predict(X)[0]
            raw_score = model.decision_function(X)[0]
            iso_score = 1.0 / (1.0 + np.exp(-raw_score))
            result['isolation_forest'] = {
                'anomaly_score': float(iso_score),
                'is_anomaly': bool(pred == -1)
            }
        except Exception as e:
            logger.warning(f"孤立森林部分失败: {e}")
            result['isolation_forest'] = {'error': str(e)}

    # 获取 LSTM 结果（如果需要）
    if lstm_model is not None:
        try:
            feats = extract_features_from_event(data)
            numeric = feats[:6]
            proc_name = feats[6]
            evt_type = feats[7]
            try:
                proc_enc = proc_encoder_lstm.transform([proc_name])[0]
            except:
                proc_enc = 0
            try:
                evt_enc = evt_encoder_lstm.transform([evt_type])[0]
            except:
                evt_enc = 0
            feature_vec = np.array(numeric + [proc_enc, evt_enc], dtype=np.float32).reshape(1, -1)
            feature_scaled = lstm_scaler.transform(feature_vec).flatten()
            key = f"{data.get('source_ip', '0.0.0.0')}_{data.get('user_id', '')}"
            q = event_queues[key]
            q.append(feature_scaled)

            if len(q) >= SEQ_LEN:
                seq_input = np.array(list(q)).reshape(1, SEQ_LEN, FEATURE_DIM)
                seq_tensor = torch.tensor(seq_input, dtype=torch.float32)
                with torch.no_grad():
                    recon = lstm_model(seq_tensor)
                    mse = torch.mean((recon - seq_tensor) ** 2).item()
                is_anomaly = mse > lstm_threshold
                lstm_score = min(1.0, mse / lstm_threshold) if lstm_threshold > 0 else 0.0
                result['lstm_autoencoder'] = {
                    'anomaly_score': float(lstm_score),
                    'is_anomaly': bool(is_anomaly),          # 显式转为 bool
                    'reconstruction_error': float(mse),
                    'sequence_ready': True
                }
            else:
                result['lstm_autoencoder'] = {
                    'status': 'collecting',
                    'remaining': SEQ_LEN - len(q),
                    'sequence_ready': False
                }
        except Exception as e:
            logger.warning(f"LSTM部分失败: {e}")
            result['lstm_autoencoder'] = {'error': str(e)}

    # 综合判定：如果两个模型都可用且都已就绪，则综合分数（加权平均，权重可调）
    final_score = 0.0
    final_anomaly = False
    if 'isolation_forest' in result and 'anomaly_score' in result['isolation_forest']:
        final_score += 0.6 * result['isolation_forest']['anomaly_score']
        final_anomaly = final_anomaly or result['isolation_forest']['is_anomaly']
    if 'lstm_autoencoder' in result and 'anomaly_score' in result['lstm_autoencoder']:
        final_score += 0.4 * result['lstm_autoencoder']['anomaly_score']
        final_anomaly = final_anomaly or result['lstm_autoencoder']['is_anomaly']

    result['ensemble'] = {
        'anomaly_score': round(final_score, 4),
        'is_anomaly': bool(final_anomaly)        # 显式转为 bool
    }

    # ---------- 递归转换所有 NumPy 类型为 Python 原生类型 ----------
    def convert_to_native(obj):
        if isinstance(obj, dict):
            return {k: convert_to_native(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_to_native(i) for i in obj]
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        elif isinstance(obj, (np.floating, float)):
            return float(obj)
        elif isinstance(obj, (np.integer, int)):
            return int(obj)
        else:
            return obj

    result = convert_to_native(result)
    # ---------------------------------------------------------

    return jsonify(result)

# ==================== 健康检查 ====================
@app.route('/health', methods=['GET'])
def health():
    status = {
        'status': 'ok',
        'models': {
            'isolation_forest': model is not None,
            'lstm_autoencoder': lstm_model is not None
        }
    }
    return jsonify(status)

# ==================== 启动服务 ====================
if __name__ == '__main__':
    if os.environ.get('FLASK_ENV') == 'development':
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        from waitress import serve
        logger.info("AI服务启动(生产模式 waitress)，端口 5001")
        serve(app, host='0.0.0.0', port=5001)
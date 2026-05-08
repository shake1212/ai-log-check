#!/usr/bin/env python3
"""
训练 LSTM 自编码器，使用之前生成的 X_seq.npy
输出模型和阈值到 ai_service/ 目录
"""
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import joblib
import os

# ========== 配置 ==========
SEQ_LEN = 10
FEATURE_DIM = 8
HIDDEN_DIM = 64
BATCH_SIZE = 64
EPOCHS = 50
LEARNING_RATE = 0.001

# 输出目录：ai_service/
base_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = base_dir   # 直接使用脚本所在目录
os.makedirs(output_dir, exist_ok=True)

# 加载数据集
X_seq_path = os.path.join(output_dir, 'X_seq.npy')
if not os.path.exists(X_seq_path):
    raise FileNotFoundError(f"未找到 {X_seq_path}，请先运行 build_sequence_dataset.py")

X_seq = np.load(X_seq_path)
print(f"数据形状: {X_seq.shape}")   # (样本数, 10, 8)

# 划分训练/验证集
train_ratio = 0.8
split = int(len(X_seq) * train_ratio)
train_data = X_seq[:split]
val_data = X_seq[split:]

train_tensor = torch.tensor(train_data, dtype=torch.float32)
val_tensor = torch.tensor(val_data, dtype=torch.float32)

train_loader = DataLoader(TensorDataset(train_tensor), batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(TensorDataset(val_tensor), batch_size=BATCH_SIZE)

# ========== 定义 LSTM 自编码器 ==========
class LSTM_Autoencoder(nn.Module):
    def __init__(self, input_dim, hidden_dim):
        super().__init__()
        self.encoder = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        self.decoder = nn.LSTM(hidden_dim, input_dim, batch_first=True)

    def forward(self, x):
        _, (hidden, _) = self.encoder(x)
        seq_len = x.size(1)
        hidden_repeated = hidden.repeat(seq_len, 1, 1).permute(1, 0, 2)
        decoded, _ = self.decoder(hidden_repeated)
        return decoded

# ========== 初始化 ==========
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = LSTM_Autoencoder(FEATURE_DIM, HIDDEN_DIM).to(device)
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

print(f"使用设备: {device}")

# ========== 训练 ==========
for epoch in range(EPOCHS):
    model.train()
    total_loss = 0
    for batch in train_loader:
        x = batch[0].to(device)
        optimizer.zero_grad()
        x_recon = model(x)
        loss = criterion(x_recon, x)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    avg_train_loss = total_loss / len(train_loader)

    # 验证
    model.eval()
    val_loss = 0
    with torch.no_grad():
        for batch in val_loader:
            x = batch[0].to(device)
            x_recon = model(x)
            loss = criterion(x_recon, x)
            val_loss += loss.item()
    avg_val_loss = val_loss / len(val_loader)

    if (epoch+1) % 10 == 0:
        print(f"Epoch {epoch+1:3d} | Train Loss: {avg_train_loss:.6f} | Val Loss: {avg_val_loss:.6f}")

# ========== 计算异常阈值（训练集重建误差95分位数）==========
model.eval()
recon_errors = []
with torch.no_grad():
    for batch in train_loader:
        x = batch[0].to(device)
        x_recon = model(x)
        mse_per_sample = torch.mean((x_recon - x) ** 2, dim=(1,2)).cpu().numpy()
        recon_errors.extend(mse_per_sample)
threshold = np.percentile(recon_errors, 95)
print(f"异常阈值 (95%分位数): {threshold:.6f}")

# ========== 保存模型和阈值 ==========
torch.save(model.state_dict(), os.path.join(output_dir, 'lstm_autoencoder.pth'))
joblib.dump({'threshold': threshold}, os.path.join(output_dir, 'lstm_threshold.pkl'))
print(f"模型已保存到: {os.path.join(output_dir, 'lstm_autoencoder.pth')}")
print(f"阈值已保存到: {os.path.join(output_dir, 'lstm_threshold.pkl')}")
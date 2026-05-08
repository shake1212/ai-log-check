import pandas as pd
from sqlalchemy import create_engine
import os

DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '123456',
    'database': 'ai_log_system',
    'charset': 'utf8mb4'
}

# 读取假数据CSV
csv_path = 'fake_security_events.csv'
if not os.path.exists(csv_path):
    raise FileNotFoundError(f"请先运行 generate_fake_data.py 生成 {csv_path}")

df = pd.read_csv(csv_path)

# 添加 source_system 字段（必填，无默认值）
df['source_system'] = 'SIMULATED'

# 添加 category 字段（根据 event_type 映射）
def get_category(event_type):
    mapping = {
        'LOGIN': 'AUTH',
        'FILE_ACCESS': 'FILE',
        'PROCESS_START': 'PROCESS',
        'NETWORK_CONNECTION': 'NETWORK',
        'CONFIG_CHANGE': 'CONFIG'
    }
    return mapping.get(event_type, 'GENERAL')

df['category'] = df['event_type'].apply(get_category)

# 将 user_id 的空值替换为空字符串（避免 NULL 问题，表中允许 NULL 但这里为了整洁）
df['user_id'] = df['user_id'].fillna('')

# 确保 timestamp 为 datetime 类型（数据库需要）
df['timestamp'] = pd.to_datetime(df['timestamp'])

# 可选：添加 normalized_message（表中可为空，不需要额外处理）

# 连接数据库
engine = create_engine(f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}?charset={DB_CONFIG['charset']}")

# 插入数据（追加，不覆盖已有数据）
df.to_sql('unified_security_events', engine, if_exists='append', index=False)


print(f"成功追加 {len(df)} 条记录到数据库")
import pandas as pd
import random
import ipaddress
from datetime import datetime, timedelta

# 配置
OUTPUT_CSV = "fake_security_events.csv"   # 或直接连接数据库插入
NUM_EVENTS = 2000                         # 生成2000条模拟事件

# 正常行为的取值范围
users = ['user1', 'user2', 'user3', 'admin', 'operator', 'user4', 'user5']
ips = ['192.168.1.{}'.format(i) for i in range(2, 50)] + ['10.0.0.{}'.format(i) for i in range(1, 20)]
ports = [22, 80, 443, 3389, 3306, 8080, 53, 123, 161]   # 常见服务端口
processes = ['sshd', 'nginx', 'mysqld', 'java', 'python', 'explorer.exe', 'svchost.exe', 'winlogon.exe']
event_types = ['LOGIN', 'FILE_ACCESS', 'PROCESS_START', 'NETWORK_CONNECTION', 'CONFIG_CHANGE']
severities = ['LOW', 'MEDIUM', 'LOW', 'LOW', 'MEDIUM']   # 对应事件类型的正常严重度

# 时间范围：过去7天，随机分布
end_time = datetime.now()
start_time = end_time - timedelta(days=7)

events = []
for _ in range(NUM_EVENTS):
    # 随机选择组合，但保证分布接近真实（例如登录事件出现在白天）
    ts = start_time + timedelta(seconds=random.randint(0, 7*24*3600))
    # 添加一些规则：LOGIN 一般发生在工作时间
    if random.random() > 0.7:
        ts = ts.replace(hour=random.randint(8, 18), minute=random.randint(0, 59))
    src_ip = random.choice(ips)
    dst_port = random.choice(ports)
    user_id = random.choice(users)
    # 非登录事件可能没有user_id，设为空字符串
    if random.random() < 0.3:
        user_id = ''
    process_name = random.choice(processes)
    event_type = random.choice(event_types)
    # 根据事件类型映射严重度（简单模拟）
    if event_type == 'LOGIN_FAILED':
        severity = 'HIGH'   # 但我们生成的数据里不含失败登录，因为是正常数据集
    else:
        severity = 'LOW' if event_type in ['FILE_ACCESS', 'PROCESS_START'] else 'MEDIUM'

    events.append({
        'timestamp': ts.isoformat(),
        'source_ip': src_ip,
        'destination_port': dst_port,
        'user_id': user_id,
        'process_name': process_name,
        'event_type': event_type,
        'severity': severity
    })

# 按时间排序
df = pd.DataFrame(events)
df = df.sort_values('timestamp')
df.to_csv(OUTPUT_CSV, index=False)
print(f"生成 {len(df)} 条模拟事件，已保存到 {OUTPUT_CSV}")
print("前5条示例：")
print(df.head())
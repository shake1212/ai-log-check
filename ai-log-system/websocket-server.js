// 简单的WebSocket服务器模拟器
// 运行命令: node websocket-server.js

const WebSocket = require('ws');

// 创建WebSocket服务器
const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket服务器启动在端口 8080');

// 模拟数据生成
const generateMockLogData = () => {
  const sources = ['Web服务器', '数据库', '防火墙', '应用服务器'];
  const types = ['normal', 'anomaly'];
  const levels = ['low', 'medium', 'high'];
  
  return {
    time: new Date().toISOString(),
    value: Math.floor(Math.random() * 100),
    type: types[Math.floor(Math.random() * types.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    level: levels[Math.floor(Math.random() * levels.length)],
    description: Math.random() > 0.8 ? '检测到异常行为' : undefined
  };
};

const generateMockStats = () => {
  return {
    totalLogs: Math.floor(Math.random() * 1000) + 1000,
    anomalyCount: Math.floor(Math.random() * 20) + 5,
    highRiskCount: Math.floor(Math.random() * 5) + 1,
    systemHealth: Math.random() > 0.1 ? 'healthy' : 'warning',
    activeUsers: Math.floor(Math.random() * 50) + 20,
    responseTime: Math.floor(Math.random() * 200) + 50,
    throughput: Math.floor(Math.random() * 500) + 500
  };
};

// 处理连接
wss.on('connection', (ws) => {
  console.log('新的WebSocket连接建立');
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'WebSocket连接成功',
    timestamp: Date.now()
  }));

  // 定期发送日志数据
  const logInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const logData = generateMockLogData();
      ws.send(JSON.stringify({
        type: 'log_data',
        data: [logData],
        timestamp: Date.now()
      }));
    }
  }, 3000); // 每3秒发送一次

  // 定期发送统计数据
  const statsInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const stats = generateMockStats();
      ws.send(JSON.stringify({
        type: 'stats_update',
        data: stats,
        timestamp: Date.now()
      }));
    }
  }, 5000); // 每5秒发送一次

  // 处理客户端消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('收到客户端消息:', data);
      
      // 可以在这里处理客户端的请求
      if (data.type === 'request_data') {
        // 发送历史数据
        const historyData = Array.from({ length: 20 }, () => generateMockLogData());
        ws.send(JSON.stringify({
          type: 'history_data',
          data: historyData,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('解析客户端消息失败:', error);
    }
  });

  // 处理连接关闭
  ws.on('close', () => {
    console.log('WebSocket连接关闭');
    clearInterval(logInterval);
    clearInterval(statsInterval);
  });

  // 处理错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    clearInterval(logInterval);
    clearInterval(statsInterval);
  });
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭WebSocket服务器...');
  wss.close(() => {
    console.log('WebSocket服务器已关闭');
    process.exit(0);
  });
});

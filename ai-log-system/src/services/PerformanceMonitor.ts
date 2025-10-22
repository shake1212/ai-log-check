/**
 * 采集性能监控和优化模块
 * 监控WMI采集性能，提供优化建议和自动调优
 */

export interface PerformanceMetrics {
  timestamp: string;
  // 采集性能
  collectionRate: number; // 每秒采集数量
  processingRate: number; // 每秒处理数量
  throughput: number; // 总吞吐量 (MB/s)
  
  // 系统资源
  cpuUsage: number; // CPU使用率 (%)
  memoryUsage: number; // 内存使用量 (MB)
  diskUsage: number; // 磁盘使用量 (MB)
  networkLatency: number; // 网络延迟 (ms)
  
  // 质量指标
  successRate: number; // 成功率 (%)
  errorRate: number; // 错误率 (%)
  duplicateRate: number; // 重复率 (%)
  parsingConfidence: number; // 解析置信度
  
  // 延迟指标
  avgCollectionLatency: number; // 平均采集延迟 (ms)
  avgProcessingLatency: number; // 平均处理延迟 (ms)
  avgStorageLatency: number; // 平均存储延迟 (ms)
  
  // 队列状态
  queueSize: number; // 队列大小
  queueWaitTime: number; // 队列等待时间 (ms)
  
  // 连接状态
  activeConnections: number; // 活跃连接数
  connectionHealth: number; // 连接健康度 (%)
}

export interface PerformanceAlert {
  id: string;
  timestamp: string;
  type: 'warning' | 'critical' | 'info';
  category: 'performance' | 'resource' | 'quality' | 'connection';
  title: string;
  message: string;
  metrics: Partial<PerformanceMetrics>;
  recommendations: string[];
  acknowledged: boolean;
  resolved: boolean;
}

export interface OptimizationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'collection' | 'processing' | 'storage' | 'network' | 'system';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: number; // 预期改善百分比
  action: string;
  parameters?: Record<string, any>;
}

export interface PerformanceConfig {
  monitoringInterval: number; // 监控间隔 (ms)
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    latency: number;
    queueSize: number;
  };
  optimizationEnabled: boolean;
  autoTuningEnabled: boolean;
  retentionDays: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private config: PerformanceConfig;
  private isMonitoring: boolean = false;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private optimizationTimer: NodeJS.Timeout | null = null;
  private maxMetricsHistory: number = 1000;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      monitoringInterval: 5000, // 5秒
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 1024, // MB
        errorRate: 5, // %
        latency: 1000, // ms
        queueSize: 1000
      },
      optimizationEnabled: true,
      autoTuningEnabled: false,
      retentionDays: 7,
      ...config
    };

    this.startMonitoring();
    this.generateInitialRecommendations();
  }

  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
      } catch (error) {
        console.error('性能监控错误:', error);
      }
    }, this.config.monitoringInterval);

    // 启动优化检查
    if (this.config.optimizationEnabled) {
      this.optimizationTimer = setInterval(async () => {
        try {
          await this.analyzePerformance();
          await this.generateRecommendations();
        } catch (error) {
          console.error('性能优化分析错误:', error);
        }
      }, 60000); // 每分钟检查一次
    }
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
  }

  /**
   * 收集性能指标
   */
  private async collectMetrics(): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      // 模拟采集性能指标
      collectionRate: Math.random() * 100 + 50, // 50-150 条/秒
      processingRate: Math.random() * 120 + 60, // 60-180 条/秒
      throughput: Math.random() * 10 + 5, // 5-15 MB/s
      
      // 模拟系统资源指标
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 2000 + 500, // 500-2500 MB
      diskUsage: Math.random() * 10000 + 1000, // 1-11 GB
      networkLatency: Math.random() * 100 + 10, // 10-110 ms
      
      // 模拟质量指标
      successRate: Math.random() * 20 + 80, // 80-100%
      errorRate: Math.random() * 10, // 0-10%
      duplicateRate: Math.random() * 5, // 0-5%
      parsingConfidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      
      // 模拟延迟指标
      avgCollectionLatency: Math.random() * 500 + 100, // 100-600 ms
      avgProcessingLatency: Math.random() * 300 + 50, // 50-350 ms
      avgStorageLatency: Math.random() * 200 + 25, // 25-225 ms
      
      // 模拟队列状态
      queueSize: Math.floor(Math.random() * 1000),
      queueWaitTime: Math.random() * 1000 + 100, // 100-1100 ms
      
      // 模拟连接状态
      activeConnections: Math.floor(Math.random() * 10) + 1,
      connectionHealth: Math.random() * 20 + 80 // 80-100%
    };

    this.metrics.push(metrics);
    
    // 限制历史记录大小
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * 检查性能告警
   */
  private async checkAlerts(): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const alerts: PerformanceAlert[] = [];

    // 检查CPU使用率
    if (latestMetrics.cpuUsage > this.config.alertThresholds.cpuUsage) {
      alerts.push({
        id: `cpu_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: latestMetrics.cpuUsage > 90 ? 'critical' : 'warning',
        category: 'resource',
        title: 'CPU使用率过高',
        message: `CPU使用率达到 ${latestMetrics.cpuUsage.toFixed(1)}%`,
        metrics: { cpuUsage: latestMetrics.cpuUsage },
        recommendations: [
          '减少并发采集任务数量',
          '优化数据处理算法',
          '考虑增加CPU资源'
        ],
        acknowledged: false,
        resolved: false
      });
    }

    // 检查内存使用量
    if (latestMetrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        id: `memory_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: latestMetrics.memoryUsage > 2048 ? 'critical' : 'warning',
        category: 'resource',
        title: '内存使用量过高',
        message: `内存使用量达到 ${latestMetrics.memoryUsage.toFixed(0)}MB`,
        metrics: { memoryUsage: latestMetrics.memoryUsage },
        recommendations: [
          '启用数据压缩',
          '减少批量大小',
          '清理过期数据',
          '考虑增加内存资源'
        ],
        acknowledged: false,
        resolved: false
      });
    }

    // 检查错误率
    if (latestMetrics.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        id: `error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: latestMetrics.errorRate > 10 ? 'critical' : 'warning',
        category: 'quality',
        title: '错误率过高',
        message: `错误率达到 ${latestMetrics.errorRate.toFixed(1)}%`,
        metrics: { errorRate: latestMetrics.errorRate },
        recommendations: [
          '检查数据源连接状态',
          '验证解析规则配置',
          '增加重试机制',
          '优化错误处理逻辑'
        ],
        acknowledged: false,
        resolved: false
      });
    }

    // 检查延迟
    if (latestMetrics.avgCollectionLatency > this.config.alertThresholds.latency) {
      alerts.push({
        id: `latency_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: latestMetrics.avgCollectionLatency > 2000 ? 'critical' : 'warning',
        category: 'performance',
        title: '采集延迟过高',
        message: `平均采集延迟达到 ${latestMetrics.avgCollectionLatency.toFixed(0)}ms`,
        metrics: { avgCollectionLatency: latestMetrics.avgCollectionLatency },
        recommendations: [
          '优化网络连接',
          '减少查询复杂度',
          '启用连接池',
          '调整采集间隔'
        ],
        acknowledged: false,
        resolved: false
      });
    }

    // 检查队列大小
    if (latestMetrics.queueSize > this.config.alertThresholds.queueSize) {
      alerts.push({
        id: `queue_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: latestMetrics.queueSize > 2000 ? 'critical' : 'warning',
        category: 'performance',
        title: '队列积压严重',
        message: `队列大小达到 ${latestMetrics.queueSize}`,
        metrics: { queueSize: latestMetrics.queueSize },
        recommendations: [
          '增加处理线程数',
          '优化处理算法',
          '启用负载均衡',
          '调整队列配置'
        ],
        acknowledged: false,
        resolved: false
      });
    }

    // 添加新告警
    alerts.forEach(alert => {
      // 检查是否已存在类似告警
      const existingAlert = this.alerts.find(a => 
        a.category === alert.category && 
        a.type === alert.type &&
        !a.resolved &&
        Date.now() - new Date(a.timestamp).getTime() < 300000 // 5分钟内
      );
      
      if (!existingAlert) {
        this.alerts.push(alert);
      }
    });
  }

  /**
   * 分析性能趋势
   */
  private async analyzePerformance(): Promise<void> {
    if (this.metrics.length < 10) {
      return; // 需要足够的数据点进行分析
    }

    const recentMetrics = this.metrics.slice(-10);
    
    // 分析趋势
    const trends = this.calculateTrends(recentMetrics);
    
    // 基于趋势生成建议
    this.generateTrendBasedRecommendations(trends);
  }

  /**
   * 计算性能趋势
   */
  private calculateTrends(metrics: PerformanceMetrics[]): Record<string, number> {
    const trends: Record<string, number> = {};
    
    const fields: (keyof PerformanceMetrics)[] = [
      'collectionRate', 'processingRate', 'cpuUsage', 'memoryUsage',
      'errorRate', 'avgCollectionLatency', 'queueSize'
    ];
    
    fields.forEach(field => {
      if (field === 'timestamp') return;
      
      const values = metrics.map(m => m[field] as number);
      const trend = this.calculateLinearTrend(values);
      trends[field] = trend;
    });
    
    return trends;
  }

  /**
   * 计算线性趋势
   */
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * 基于趋势生成建议
   */
  private generateTrendBasedRecommendations(trends: Record<string, number>): void {
    // CPU使用率上升趋势
    if (trends.cpuUsage > 5) {
      this.addRecommendation({
        id: `cpu_trend_${Date.now()}`,
        priority: 'high',
        category: 'system',
        title: 'CPU使用率持续上升',
        description: '检测到CPU使用率呈上升趋势，可能影响系统性能',
        impact: '系统响应变慢，采集效率下降',
        effort: 'medium',
        estimatedImprovement: 20,
        action: '优化CPU密集型操作，考虑负载均衡'
      });
    }

    // 错误率上升趋势
    if (trends.errorRate > 1) {
      this.addRecommendation({
        id: `error_trend_${Date.now()}`,
        priority: 'high',
        category: 'quality',
        title: '错误率持续上升',
        description: '检测到错误率呈上升趋势，数据质量可能受影响',
        impact: '数据准确性下降，分析结果不可靠',
        effort: 'high',
        estimatedImprovement: 30,
        action: '检查数据源状态，优化解析规则'
      });
    }

    // 延迟上升趋势
    if (trends.avgCollectionLatency > 50) {
      this.addRecommendation({
        id: `latency_trend_${Date.now()}`,
        priority: 'medium',
        category: 'performance',
        title: '采集延迟持续增加',
        description: '检测到采集延迟呈上升趋势，可能影响实时性',
        impact: '数据时效性下降，实时监控延迟',
        effort: 'medium',
        estimatedImprovement: 25,
        action: '优化网络配置，调整采集策略'
      });
    }
  }

  /**
   * 生成初始建议
   */
  private generateInitialRecommendations(): void {
    const initialRecommendations: OptimizationRecommendation[] = [
      {
        id: 'opt_1',
        priority: 'medium',
        category: 'collection',
        title: '启用批量采集',
        description: '将单条采集改为批量采集，提高采集效率',
        impact: '减少网络开销，提高吞吐量',
        effort: 'low',
        estimatedImprovement: 30,
        action: '配置批量大小参数'
      },
      {
        id: 'opt_2',
        priority: 'low',
        category: 'storage',
        title: '启用数据压缩',
        description: '对存储数据进行压缩，减少磁盘使用量',
        impact: '减少存储空间，提高I/O性能',
        effort: 'low',
        estimatedImprovement: 40,
        action: '启用压缩算法'
      },
      {
        id: 'opt_3',
        priority: 'medium',
        category: 'processing',
        title: '优化解析算法',
        description: '使用更高效的解析算法，减少处理时间',
        impact: '提高处理速度，降低CPU使用率',
        effort: 'high',
        estimatedImprovement: 25,
        action: '重构解析逻辑'
      }
    ];

    this.recommendations = initialRecommendations;
  }

  /**
   * 生成优化建议
   */
  private async generateRecommendations(): Promise<void> {
    // 基于当前性能指标生成动态建议
    if (this.metrics.length === 0) return;
    
    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    // 内存使用量建议
    if (latestMetrics.memoryUsage > 1500) {
      this.addRecommendation({
        id: `memory_opt_${Date.now()}`,
        priority: 'high',
        category: 'system',
        title: '优化内存使用',
        description: '当前内存使用量较高，建议优化内存管理',
        impact: '防止内存溢出，提高系统稳定性',
        effort: 'medium',
        estimatedImprovement: 35,
        action: '实现内存池，优化数据结构'
      });
    }
    
    // 重复率建议
    if (latestMetrics.duplicateRate > 2) {
      this.addRecommendation({
        id: `duplicate_opt_${Date.now()}`,
        priority: 'medium',
        category: 'quality',
        title: '优化去重机制',
        description: '检测到较高的重复率，建议优化去重算法',
        impact: '减少存储空间，提高数据质量',
        effort: 'medium',
        estimatedImprovement: 20,
        action: '实现高效的去重算法'
      });
    }
  }

  /**
   * 添加优化建议
   */
  private addRecommendation(recommendation: OptimizationRecommendation): void {
    // 检查是否已存在相同建议
    const existing = this.recommendations.find(r => 
      r.category === recommendation.category && 
      r.title === recommendation.title &&
      !r.resolved
    );
    
    if (!existing) {
      this.recommendations.push(recommendation);
    }
  }

  /**
   * 应用优化建议
   */
  async applyRecommendation(recommendationId: string): Promise<boolean> {
    const recommendation = this.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      return false;
    }

    try {
      // 根据建议类型应用优化
      switch (recommendation.category) {
        case 'collection':
          await this.optimizeCollection(recommendation);
          break;
        case 'processing':
          await this.optimizeProcessing(recommendation);
          break;
        case 'storage':
          await this.optimizeStorage(recommendation);
          break;
        case 'network':
          await this.optimizeNetwork(recommendation);
          break;
        case 'system':
          await this.optimizeSystem(recommendation);
          break;
      }

      // 标记建议为已应用
      recommendation.resolved = true;
      return true;
    } catch (error) {
      console.error('应用优化建议失败:', error);
      return false;
    }
  }

  /**
   * 优化采集
   */
  private async optimizeCollection(recommendation: OptimizationRecommendation): Promise<void> {
    // 实现采集优化逻辑
    console.log(`应用采集优化: ${recommendation.title}`);
  }

  /**
   * 优化处理
   */
  private async optimizeProcessing(recommendation: OptimizationRecommendation): Promise<void> {
    // 实现处理优化逻辑
    console.log(`应用处理优化: ${recommendation.title}`);
  }

  /**
   * 优化存储
   */
  private async optimizeStorage(recommendation: OptimizationRecommendation): Promise<void> {
    // 实现存储优化逻辑
    console.log(`应用存储优化: ${recommendation.title}`);
  }

  /**
   * 优化网络
   */
  private async optimizeNetwork(recommendation: OptimizationRecommendation): Promise<void> {
    // 实现网络优化逻辑
    console.log(`应用网络优化: ${recommendation.title}`);
  }

  /**
   * 优化系统
   */
  private async optimizeSystem(recommendation: OptimizationRecommendation): Promise<void> {
    // 实现系统优化逻辑
    console.log(`应用系统优化: ${recommendation.title}`);
  }

  /**
   * 获取性能指标
   */
  getMetrics(limit?: number): PerformanceMetrics[] {
    const metrics = this.metrics;
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * 获取告警
   */
  getAlerts(resolved?: boolean): PerformanceAlert[] {
    if (resolved === undefined) {
      return this.alerts;
    }
    return this.alerts.filter(alert => alert.resolved === resolved);
  }

  /**
   * 获取优化建议
   */
  getRecommendations(resolved?: boolean): OptimizationRecommendation[] {
    if (resolved === undefined) {
      return this.recommendations;
    }
    return this.recommendations.filter(rec => rec.resolved === resolved);
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): any {
    if (this.metrics.length === 0) {
      return null;
    }

    const latest = this.metrics[this.metrics.length - 1];
    const avg = this.calculateAverageMetrics();
    
    return {
      current: latest,
      average: avg,
      trends: this.calculateTrends(this.metrics.slice(-10)),
      alerts: {
        total: this.alerts.length,
        unresolved: this.alerts.filter(a => !a.resolved).length,
        critical: this.alerts.filter(a => a.type === 'critical' && !a.resolved).length
      },
      recommendations: {
        total: this.recommendations.length,
        unresolved: this.recommendations.filter(r => !r.resolved).length,
        highPriority: this.recommendations.filter(r => r.priority === 'high' && !r.resolved).length
      },
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * 计算平均指标
   */
  private calculateAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) {
      return {};
    }

    const fields: (keyof PerformanceMetrics)[] = [
      'collectionRate', 'processingRate', 'throughput', 'cpuUsage', 'memoryUsage',
      'errorRate', 'avgCollectionLatency', 'avgProcessingLatency', 'queueSize'
    ];

    const averages: Partial<PerformanceMetrics> = {};
    
    fields.forEach(field => {
      if (field === 'timestamp') return;
      
      const values = this.metrics.map(m => m[field] as number);
      const sum = values.reduce((total, val) => total + val, 0);
      averages[field] = sum / values.length;
    });

    return averages;
  }

  /**
   * 清理历史数据
   */
  cleanup(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    // 清理历史指标
    this.metrics = this.metrics.filter(m => new Date(m.timestamp) > cutoffTime);
    
    // 清理已解决的告警
    this.alerts = this.alerts.filter(a => !a.resolved || new Date(a.timestamp) > cutoffTime);
    
    // 清理已应用的建议
    this.recommendations = this.recommendations.filter(r => !r.resolved || new Date().getTime() - new Date(r.id).getTime() < 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重启监控以应用新配置
    if (config.monitoringInterval || config.optimizationEnabled !== undefined) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

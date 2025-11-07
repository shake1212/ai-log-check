/**
 * 增量日志采集机制
 * 实现高效的增量日志采集，避免重复采集和遗漏
 */

export interface LogCollectionConfig {
  collectionInterval: number; // 采集间隔（毫秒）
  batchSize: number; // 批量大小
  maxRetries: number; // 最大重试次数
  retryDelay: number; // 重试延迟（毫秒）
  enableIncremental: boolean; // 启用增量采集
  checkpointInterval: number; // 检查点间隔（毫秒）
  enableCompression: boolean; // 启用压缩
  maxMemoryUsage: number; // 最大内存使用量（MB）
}

export interface LogCheckpoint {
  id: string;
  sourceId: string;
  lastTimestamp: string;
  lastEventId: string;
  lastPosition: number;
  totalCollected: number;
  lastUpdate: string;
  checksum: string;
}

export interface CollectionTask {
  id: string;
  sourceId: string;
  name: string;
  enabled: boolean;
  config: LogCollectionConfig;
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'paused' | 'error';
  errorCount: number;
  successCount: number;
  totalCollected: number;
}

export interface CollectionResult {
  taskId: string;
  timestamp: string;
  collectedCount: number;
  newCount: number;
  duplicateCount: number;
  errorCount: number;
  processingTime: number;
  memoryUsage: number;
  errors: string[];
}

export interface IncrementalData {
  newEvents: any[];
  updatedEvents: any[];
  deletedEvents: any[];
  checkpoint: LogCheckpoint;
}

// 浏览器环境兼容的 memoryUsage 函数
const getMemoryUsage = (): any => {
  if (typeof process !== 'undefined' && process.memoryUsage && typeof process.memoryUsage === 'function') {
    return process.memoryUsage();
  } else {
    // 浏览器环境返回模拟数据
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      // 使用 Chrome 的 performance.memory
      const mem = (window as any).performance.memory;
      return {
        rss: mem.usedJSHeapSize,
        heapTotal: mem.totalJSHeapSize,
        heapUsed: mem.usedJSHeapSize,
        external: 0,
        arrayBuffers: 0
      };
    } else {
      // 其他浏览器返回默认值
      return {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0
      };
    }
  }
};

// 获取堆内存使用量（MB）
const getHeapUsedMB = (): number => {
  const memoryUsage = getMemoryUsage();
  return memoryUsage.heapUsed / 1024 / 1024;
};

export class IncrementalLogCollector {
  private tasks: Map<string, CollectionTask> = new Map();
  private checkpoints: Map<string, LogCheckpoint> = new Map();
  private collectionHistory: CollectionResult[] = [];
  private isRunning: boolean = false;
  private scheduler: any = null; // 改为 any 类型以兼容浏览器和 Node.js
  private memoryUsage: number = 0;
  private maxHistorySize: number = 1000;

  constructor() {
    this.initializeDefaultTasks();
    this.startScheduler();
  }

  /**
   * 添加采集任务
   */
  addCollectionTask(task: CollectionTask): boolean {
    try {
      this.tasks.set(task.id, task);
      
      // 初始化检查点
      if (!this.checkpoints.has(task.sourceId)) {
        this.checkpoints.set(task.sourceId, {
          id: `cp_${task.sourceId}`,
          sourceId: task.sourceId,
          lastTimestamp: new Date(0).toISOString(),
          lastEventId: '0',
          lastPosition: 0,
          totalCollected: 0,
          lastUpdate: new Date().toISOString(),
          checksum: ''
        });
      }
      
      return true;
    } catch (error) {
      console.error('添加采集任务失败:', error);
      return false;
    }
  }

  /**
   * 启动采集任务
   */
  async startCollectionTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = 'running';
    task.lastRun = new Date().toISOString();
    
    try {
      const result = await this.executeCollectionTask(task);
      this.recordCollectionResult(result);
      return true;
    } catch (error) {
      task.status = 'error';
      task.errorCount++;
      console.error(`采集任务 ${taskId} 执行失败:`, error);
      return false;
    }
  }

  /**
   * 执行采集任务
   */
  private async executeCollectionTask(task: CollectionTask): Promise<CollectionResult> {
    const startTime = Date.now();
    const startMemory = getHeapUsedMB(); // 使用兼容的内存获取方法
    const errors: string[] = [];
    
    let collectedCount = 0;
    let newCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    try {
      // 获取检查点
      const checkpoint = this.checkpoints.get(task.sourceId);
      if (!checkpoint) {
        throw new Error('检查点不存在');
      }

      // 执行增量采集
      const incrementalData = await this.collectIncrementalData(task, checkpoint);
      
      // 处理采集的数据
      const processedData = await this.processCollectedData(incrementalData);
      
      collectedCount = processedData.totalCount;
      newCount = processedData.newEvents.length;
      duplicateCount = processedData.duplicateCount;
      errorCount = processedData.errorCount;

      // 更新检查点
      await this.updateCheckpoint(task.sourceId, incrementalData.checkpoint);
      
      // 更新任务统计
      task.successCount++;
      task.totalCollected += newCount;
      task.lastRun = new Date().toISOString();
      task.nextRun = new Date(Date.now() + task.config.collectionInterval).toISOString();

    } catch (error) {
      errorCount++;
      errors.push(error instanceof Error ? error.message : '采集失败');
    }

    const processingTime = Date.now() - startTime;
    const endMemory = getHeapUsedMB(); // 使用兼容的内存获取方法
    const memoryUsage = endMemory - startMemory; // MB

    return {
      taskId: task.id,
      timestamp: new Date().toISOString(),
      collectedCount,
      newCount,
      duplicateCount,
      errorCount,
      processingTime,
      memoryUsage,
      errors
    };
  }

  /**
   * 执行增量数据采集
   */
  private async collectIncrementalData(task: CollectionTask, checkpoint: LogCheckpoint): Promise<IncrementalData> {
    const newEvents: any[] = [];
    const updatedEvents: any[] = [];
    const deletedEvents: any[] = [];

    try {
      // 模拟从数据源获取增量数据
      const rawData = await this.fetchIncrementalData(task, checkpoint);
      
      // 过滤新事件
      for (const event of rawData) {
        if (this.isNewEvent(event, checkpoint)) {
          newEvents.push(event);
        } else if (this.isUpdatedEvent(event, checkpoint)) {
          updatedEvents.push(event);
        }
      }

      // 检测删除的事件（这里简化处理）
      // 在实际应用中，可能需要与历史数据对比

      // 更新检查点
      const newCheckpoint = this.calculateNewCheckpoint(checkpoint, rawData);

      return {
        newEvents,
        updatedEvents,
        deletedEvents,
        checkpoint: newCheckpoint
      };

    } catch (error) {
      throw new Error(`增量数据采集失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 从数据源获取增量数据
   */
  private async fetchIncrementalData(task: CollectionTask, checkpoint: LogCheckpoint): Promise<any[]> {
    // 模拟从WMI或其他数据源获取数据
    const events: any[] = [];
    const eventCount = Math.floor(Math.random() * 50) + 10;
    
    for (let i = 0; i < eventCount; i++) {
      const event = {
        id: `evt_${Date.now()}_${i}`,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        eventId: Math.floor(Math.random() * 1000) + 1000,
        source: task.sourceId,
        message: `Event message ${i}`,
        data: {
          processId: Math.floor(Math.random() * 1000) + 100,
          userId: `user_${Math.floor(Math.random() * 100)}`,
          computerName: 'COMPUTER-01'
        }
      };
      
      events.push(event);
    }
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    return events;
  }

  /**
   * 处理采集的数据
   */
  private async processCollectedData(incrementalData: IncrementalData): Promise<{
    newEvents: any[];
    duplicateCount: number;
    errorCount: number;
    totalCount: number;
  }> {
    const { newEvents, updatedEvents } = incrementalData;
    let duplicateCount = 0;
    let errorCount = 0;

    // 去重处理
    const uniqueEvents = this.deduplicateEvents([...newEvents, ...updatedEvents]);
    duplicateCount = newEvents.length + updatedEvents.length - uniqueEvents.length;

    // 数据验证
    const validatedEvents = [];
    for (const event of uniqueEvents) {
      try {
        if (this.validateEvent(event)) {
          validatedEvents.push(event);
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    return {
      newEvents: validatedEvents,
      duplicateCount,
      errorCount,
      totalCount: validatedEvents.length
    };
  }

  /**
   * 判断是否为新事件
   */
  private isNewEvent(event: any, checkpoint: LogCheckpoint): boolean {
    const eventTime = new Date(event.timestamp).getTime();
    const checkpointTime = new Date(checkpoint.lastTimestamp).getTime();
    
    return eventTime > checkpointTime || 
           (eventTime === checkpointTime && event.id > checkpoint.lastEventId);
  }

  /**
   * 判断是否为更新事件
   */
  private isUpdatedEvent(event: any, checkpoint: LogCheckpoint): boolean {
    // 简化实现：检查事件ID是否已存在但内容有变化
    return false; // 在实际应用中需要更复杂的逻辑
  }

  /**
   * 计算新的检查点
   */
  private calculateNewCheckpoint(checkpoint: LogCheckpoint, events: any[]): LogCheckpoint {
    if (events.length === 0) {
      return checkpoint;
    }

    // 找到最新的事件
    const latestEvent = events.reduce((latest, current) => {
      const currentTime = new Date(current.timestamp).getTime();
      const latestTime = new Date(latest.timestamp).getTime();
      return currentTime > latestTime ? current : latest;
    });

    return {
      ...checkpoint,
      lastTimestamp: latestEvent.timestamp,
      lastEventId: latestEvent.id,
      lastPosition: checkpoint.lastPosition + events.length,
      totalCollected: checkpoint.totalCollected + events.length,
      lastUpdate: new Date().toISOString(),
      checksum: this.calculateChecksum(events)
    };
  }

  /**
   * 更新检查点
   */
  private async updateCheckpoint(sourceId: string, checkpoint: LogCheckpoint): Promise<void> {
    this.checkpoints.set(sourceId, checkpoint);
    
    // 在实际应用中，这里应该持久化到数据库或文件
    // await this.saveCheckpoint(checkpoint);
  }

  /**
   * 事件去重
   */
  private deduplicateEvents(events: any[]): any[] {
    const seen = new Set<string>();
    return events.filter(event => {
      if (seen.has(event.id)) {
        return false;
      }
      seen.add(event.id);
      return true;
    });
  }

  /**
   * 验证事件数据
   */
  private validateEvent(event: any): boolean {
    return event && 
           event.id && 
           event.timestamp && 
           event.eventId && 
           event.source;
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(events: any[]): string {
    const data = events.map(e => `${e.id}_${e.timestamp}`).join(',');
    // 简化的校验和计算
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 记录采集结果
   */
  private recordCollectionResult(result: CollectionResult): void {
    this.collectionHistory.push(result);
    
    // 限制历史记录大小
    if (this.collectionHistory.length > this.maxHistorySize) {
      this.collectionHistory = this.collectionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 启动调度器
   */
  private startScheduler(): void {
    if (this.scheduler) {
      clearInterval(this.scheduler);
    }

    // 使用 window.setInterval 确保浏览器兼容性
    this.scheduler = setInterval(async () => {
      if (!this.isRunning) {
        await this.runScheduledTasks();
      }
    }, 1000); // 每秒检查一次
  }

  /**
   * 运行计划任务
   */
  private async runScheduledTasks(): Promise<void> {
    this.isRunning = true;
    
    try {
      const now = new Date();
      const tasksToRun = Array.from(this.tasks.values()).filter(task => 
        task.enabled && 
        task.status === 'idle' && 
        (!task.nextRun || new Date(task.nextRun) <= now)
      );

      for (const task of tasksToRun) {
        try {
          await this.startCollectionTask(task.id);
        } catch (error) {
          console.error(`计划任务 ${task.id} 执行失败:`, error);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 初始化默认任务
   */
  private initializeDefaultTasks(): void {
    const defaultTasks: CollectionTask[] = [
      {
        id: 'task_1',
        sourceId: 'wmi_events',
        name: 'WMI事件日志采集',
        enabled: true,
        config: {
          collectionInterval: 30000, // 30秒
          batchSize: 100,
          maxRetries: 3,
          retryDelay: 5000,
          enableIncremental: true,
          checkpointInterval: 60000, // 1分钟
          enableCompression: true,
          maxMemoryUsage: 100
        },
        status: 'idle',
        errorCount: 0,
        successCount: 0,
        totalCollected: 0
      },
      {
        id: 'task_2',
        sourceId: 'system_logs',
        name: '系统日志采集',
        enabled: true,
        config: {
          collectionInterval: 60000, // 1分钟
          batchSize: 200,
          maxRetries: 3,
          retryDelay: 5000,
          enableIncremental: true,
          checkpointInterval: 120000, // 2分钟
          enableCompression: false,
          maxMemoryUsage: 200
        },
        status: 'idle',
        errorCount: 0,
        successCount: 0,
        totalCollected: 0
      }
    ];

    defaultTasks.forEach(task => {
      this.addCollectionTask(task);
    });
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): CollectionTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): CollectionTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取采集历史
   */
  getCollectionHistory(limit?: number): CollectionResult[] {
    const history = this.collectionHistory;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * 获取检查点信息
   */
  getCheckpoint(sourceId: string): LogCheckpoint | undefined {
    return this.checkpoints.get(sourceId);
  }

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'running') {
      task.status = 'paused';
      return true;
    }
    return false;
  }

  /**
   * 恢复任务
   */
  resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'idle';
      return true;
    }
    return false;
  }

  /**
   * 删除任务
   */
  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.delete(taskId);
      this.checkpoints.delete(task.sourceId);
      return true;
    }
    return false;
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    const tasks = Array.from(this.tasks.values());
    const totalTasks = tasks.length;
    const runningTasks = tasks.filter(t => t.status === 'running').length;
    const pausedTasks = tasks.filter(t => t.status === 'paused').length;
    const errorTasks = tasks.filter(t => t.status === 'error').length;
    const totalCollected = tasks.reduce((sum, task) => sum + task.totalCollected, 0);
    const totalErrors = tasks.reduce((sum, task) => sum + task.errorCount, 0);

    return {
      totalTasks,
      runningTasks,
      pausedTasks,
      errorTasks,
      totalCollected,
      totalErrors,
      memoryUsage: this.memoryUsage,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    this.isRunning = false;
  }
}

// 创建全局增量日志采集器实例
export const incrementalLogCollector = new IncrementalLogCollector();
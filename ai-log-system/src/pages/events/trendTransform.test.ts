import { describe, it, expect } from 'vitest';

interface TrendData {
  timestamp: string;
  eventCount: number;
  anomalyCount: number;
  anomalyRate: number;
}

function transformTrendItem(item: any): TrendData {
  const timestamp = item.timestamp || item.time || item.date || new Date().toISOString();
  const eventCount = item.eventCount || item.count || item.total || 0;
  const anomalyCount = item.anomalyCount || 0;
  const anomalyRate = item.anomalyRate != null ? item.anomalyRate : (eventCount > 0 ? anomalyCount / eventCount : 0);

  return { timestamp, eventCount, anomalyCount, anomalyRate };
}

describe('趋势数据转换测试', () => {
  it('应正确转换后端新格式 {timestamp, eventCount, anomalyCount, anomalyRate}', () => {
    const result = transformTrendItem({
      timestamp: '2026-05-01 10:00:00',
      eventCount: 100,
      anomalyCount: 10,
      anomalyRate: 0.1,
    });

    expect(result.timestamp).toBe('2026-05-01 10:00:00');
    expect(result.eventCount).toBe(100);
    expect(result.anomalyCount).toBe(10);
    expect(result.anomalyRate).toBeCloseTo(0.1);
  });

  it('应兼容旧格式 {timestamp, count}', () => {
    const result = transformTrendItem({
      timestamp: '2026-05-01 10:00:00',
      count: 50,
    });

    expect(result.eventCount).toBe(50);
    expect(result.anomalyCount).toBe(0);
    expect(result.anomalyRate).toBe(0);
  });

  it('应兼容 /trends 端点格式 {time, eventCount, anomalyCount}', () => {
    const result = transformTrendItem({
      time: '2026-05-01 10:00:00',
      eventCount: 80,
      anomalyCount: 8,
      anomalyRate: 0.1,
    });

    expect(result.timestamp).toBe('2026-05-01 10:00:00');
    expect(result.eventCount).toBe(80);
    expect(result.anomalyCount).toBe(8);
    expect(result.anomalyRate).toBeCloseTo(0.1);
  });

  it('anomalyRate 为 0 时不应被误判为 falsy 而重新计算', () => {
    const result = transformTrendItem({
      timestamp: '2026-05-01 10:00:00',
      eventCount: 50,
      anomalyCount: 0,
      anomalyRate: 0,
    });

    expect(result.anomalyRate).toBe(0);
    expect(result.anomalyCount).toBe(0);
  });

  it('anomalyRate 缺失时应从 eventCount 和 anomalyCount 计算', () => {
    const result = transformTrendItem({
      timestamp: '2026-05-01 10:00:00',
      eventCount: 200,
      anomalyCount: 20,
    });

    expect(result.anomalyRate).toBeCloseTo(0.1);
  });

  it('eventCount 为 0 且 anomalyRate 缺失时 anomalyRate 应为 0 而非 NaN', () => {
    const result = transformTrendItem({
      timestamp: '2026-05-01 10:00:00',
      eventCount: 0,
      anomalyCount: 0,
    });

    expect(result.anomalyRate).toBe(0);
    expect(Number.isNaN(result.anomalyRate)).toBe(false);
  });

  it('所有事件都是异常时 anomalyRate 应为 1.0', () => {
    const result = transformTrendItem({
      timestamp: '2026-05-01 10:00:00',
      eventCount: 30,
      anomalyCount: 30,
    });

    expect(result.anomalyRate).toBeCloseTo(1.0);
  });

  it('应兼容 {date, total} 格式', () => {
    const result = transformTrendItem({
      date: '2026-05-01T10:00:00Z',
      total: 60,
    });

    expect(result.timestamp).toBe('2026-05-01T10:00:00Z');
    expect(result.eventCount).toBe(60);
  });

  it('批量转换应保持数据完整性', () => {
    const rawData = [
      { timestamp: '2026-05-01 08:00:00', eventCount: 100, anomalyCount: 5, anomalyRate: 0.05 },
      { timestamp: '2026-05-01 09:00:00', eventCount: 80, anomalyCount: 0, anomalyRate: 0 },
      { timestamp: '2026-05-01 10:00:00', eventCount: 200, anomalyCount: 40, anomalyRate: 0.2 },
    ];

    const results = rawData.map(transformTrendItem);

    expect(results).toHaveLength(3);
    expect(results[0].anomalyRate).toBeCloseTo(0.05);
    expect(results[1].anomalyRate).toBe(0);
    expect(results[2].anomalyRate).toBeCloseTo(0.2);
  });
});

/**
 * 连接池使用率计算工具
 * 用于计算连接池使用率并判断是否需要警告
 */

export interface PoolUsageResult {
  usagePercent: number;
  isWarning: boolean;
}

/**
 * 计算连接池使用率
 * @param activeConnections 活跃连接数
 * @param totalConnections 总连接数
 * @returns 使用率百分比和警告状态
 */
export function calculatePoolUsage(
  activeConnections: number,
  totalConnections: number
): PoolUsageResult {
  // 如果总连接数为 0 或负数，返回 0% 使用率，无警告
  if (totalConnections <= 0) {
    return {
      usagePercent: 0,
      isWarning: false
    };
  }

  // 计算使用率百分比（四舍五入）
  const usagePercent = Math.round((activeConnections / totalConnections) * 100);

  // 判断是否超过 80% 警告阈值
  const isWarning = usagePercent > 80;

  return {
    usagePercent,
    isWarning
  };
}

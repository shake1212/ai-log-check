/**
 * Property-Based Tests for Pool Usage Calculator
 * Feature: database-management-page, Property 1: 连接池使用率警告阈值
 * Validates: Requirements 3.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculatePoolUsage } from './poolUsageCalculator';

describe('Pool Usage Calculator - Property-Based Tests', () => {
  /**
   * Property 1: 连接池使用率警告阈值
   * For any 连接池活跃连接数和总连接数的组合，
   * 当使用率（activeConnections / totalConnections）超过 80% 时，
   * 进度条状态应为 "exception"（警告色）；
   * 当使用率不超过 80% 时，进度条状态应为 "normal"（正常色）
   */
  it('Property 1: should correctly determine warning status based on 80% threshold', () => {
    fc.assert(
      fc.property(
        // 生成总连接数：1 到 100 之间的整数，以及活跃连接数（0 到总连接数）
        fc.integer({ min: 1, max: 100 }).chain(totalConnections =>
          fc.tuple(fc.integer({ min: 0, max: totalConnections }), fc.constant(totalConnections))
        ),
        ([activeConnections, totalConnections]) => {
          const result = calculatePoolUsage(activeConnections, totalConnections);
          
          // 计算实际使用率
          const actualUsagePercent = (activeConnections / totalConnections) * 100;
          
          // 验证使用率计算正确（允许四舍五入误差）
          expect(result.usagePercent).toBe(Math.round(actualUsagePercent));
          
          // 验证警告状态：使用率 > 80% 时应该警告
          if (actualUsagePercent > 80) {
            expect(result.isWarning).toBe(true);
          } else {
            expect(result.isWarning).toBe(false);
          }
        }
      ),
      { numRuns: 100 } // 运行 100 次测试
    );
  });

  /**
   * Edge Case: 总连接数为 0 时应该返回 0% 使用率且无警告
   */
  it('should handle zero total connections gracefully', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (activeConnections) => {
          const result = calculatePoolUsage(activeConnections, 0);
          
          expect(result.usagePercent).toBe(0);
          expect(result.isWarning).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge Case: 活跃连接数等于总连接数时应该是 100% 使用率且警告
   */
  it('should show warning when pool is fully utilized', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (totalConnections) => {
          const result = calculatePoolUsage(totalConnections, totalConnections);
          
          expect(result.usagePercent).toBe(100);
          expect(result.isWarning).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge Case: 活跃连接数为 0 时应该是 0% 使用率且无警告
   */
  it('should show no warning when pool is idle', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (totalConnections) => {
          const result = calculatePoolUsage(0, totalConnections);
          
          expect(result.usagePercent).toBe(0);
          expect(result.isWarning).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Boundary Test: 使用率恰好为 80% 时不应该警告
   */
  it('should not warn at exactly 80% usage', () => {
    // 80% 的情况：activeConnections = 80, totalConnections = 100
    const result = calculatePoolUsage(80, 100);
    
    expect(result.usagePercent).toBe(80);
    expect(result.isWarning).toBe(false);
  });

  /**
   * Boundary Test: 使用率刚超过 80% 时应该警告
   */
  it('should warn just above 80% usage', () => {
    // 81% 的情况：activeConnections = 81, totalConnections = 100
    const result = calculatePoolUsage(81, 100);
    
    expect(result.usagePercent).toBe(81);
    expect(result.isWarning).toBe(true);
  });
});

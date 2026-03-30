// 规则引擎API服务
import request from '@/utils/request';

const API_BASE_URL = '/api/rule-engine';

// 规则匹配结果接口
export interface RuleMatchResult {
  ruleId: number;
  ruleName: string;
  threatType: string;
  severity: string;
  score: number;
  category: string;
}

// 规则引擎分析结果接口
export interface RuleEngineAnalysisResult {
  threatScore: number;
  threatLevel: string;
  ruleMatched: boolean;
  matchedRuleCount: number;
  matchedRules: RuleMatchResult[];
}

// 规则统计接口
export interface RuleStatistics {
  totalRules: number;
  lastLoadTime: string;
  categoryStats: Record<string, number>;
  severityStats: Record<string, number>;
}

// 规则引擎API
export const ruleEngineApi = {
  // 分析单个事件
  analyzeEvent: (event: any): Promise<RuleEngineAnalysisResult> =>
    request(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      data: event,
    }),

  // 刷新规则缓存
  refreshRules: (): Promise<{ message: string; rulesLoaded: number }> =>
    request(`${API_BASE_URL}/refresh`, {
      method: 'POST',
    }),

  // 获取规则统计
  getStatistics: (): Promise<RuleStatistics> =>
    request(`${API_BASE_URL}/statistics`),
};

export default ruleEngineApi;

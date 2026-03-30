// 规则管理API服务
import request from '@/utils/request';

const API_BASE_URL = '/api/rules';

// 规则接口
export interface Rule {
  id: number;
  name: string;
  description: string;
  category: string;
  patternType: string;
  pattern: string;
  threatType: string;
  severity: string;
  score: number;
  enabled: boolean;
  hitCount: number;
  lastHitTime: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// 分页响应接口
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// 查询参数接口
export interface RuleQueryParams {
  page?: number;
  size?: number;
  keyword?: string;
  category?: string;
  severity?: string;
}

// 规则管理API
export const ruleManagementApi = {
  // 查询规则列表
  getRules: (params: RuleQueryParams = {}): Promise<PageResponse<Rule>> =>
    request(`${API_BASE_URL}`, {
      method: 'GET',
      params,
    }),

  // 获取规则详情
  getRuleById: (id: number): Promise<{ rule: Rule }> =>
    request(`${API_BASE_URL}/${id}`, {
      method: 'GET',
    }),

  // 启用/禁用规则
  toggleRule: (id: number, enabled: boolean): Promise<{ success: boolean; message: string; rule: Rule }> =>
    request(`${API_BASE_URL}/${id}/toggle`, {
      method: 'PUT',
      data: { enabled },
    }),
};

export default ruleManagementApi;

import { request } from 'umi';

export interface ExportParams {
  format: string;
  startTime?: string;
  endTime?: string;
  [key: string]: any;
}

/**
 * 数据导出服务
 */
class DataExportService {
  /**
   * 导出日志数据
   */
  async exportLogs(params: ExportParams): Promise<Blob> {
    return request('/api/export/logs', {
      method: 'GET',
      params,
      responseType: 'blob',
    });
  }

  /**
   * 导出告警数据
   */
  async exportAlerts(params: ExportParams): Promise<Blob> {
    return request('/api/export/alerts', {
      method: 'GET',
      params,
      responseType: 'blob',
    });
  }

  /**
   * 导出安全事件数据
   */
  async exportEvents(params: ExportParams): Promise<Blob> {
    return request('/api/export/events', {
      method: 'GET',
      params,
      responseType: 'blob',
    });
  }

  /**
   * 导出Windows安全日志
   */
  async exportSecurityLogs(params: ExportParams): Promise<Blob> {
    return request('/api/export/security-logs', {
      method: 'GET',
      params,
      responseType: 'blob',
    });
  }

  /**
   * 导出系统性能指标
   */
  async exportSystemMetrics(params: ExportParams): Promise<Blob> {
    return request('/api/export/system-metrics', {
      method: 'GET',
      params,
      responseType: 'blob',
    });
  }

  /**
   * 批量导出数据
   */
  async batchExport(
    dataTypes: string[],
    params: ExportParams
  ): Promise<Blob> {
    return request('/api/export/batch', {
      method: 'POST',
      params,
      data: dataTypes,
      responseType: 'blob',
    });
  }

  /**
   * 下载文件
   */
  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new DataExportService();

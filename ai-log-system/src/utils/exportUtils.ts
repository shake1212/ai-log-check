import * as XLSX from 'xlsx';

// 安装xlsx依赖
// pnpm add xlsx

export interface ExportData {
  [key: string]: any;
}

export const exportToExcel = (data: ExportData[], filename: string = 'data.xlsx') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Export to Excel failed:', error);
    throw error;
  }
};

export const exportToCSV = (data: ExportData[], filename: string = 'data.csv') => {
  try {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // 处理包含逗号或引号的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export to CSV failed:', error);
    throw error;
  }
};

export const exportToJSON = (data: ExportData[], filename: string = 'data.json') => {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export to JSON failed:', error);
    throw error;
  }
};

export const generateReport = (data: {
  title: string;
  period: string;
  statistics: any;
  charts: any[];
  logs: any[];
}) => {
  const reportContent = `
# ${data.title}

## 报告期间: ${data.period}

## 统计概览
- 总日志数: ${data.statistics.totalLogs}
- 异常事件: ${data.statistics.anomalyCount}
- 高风险事件: ${data.statistics.highRiskCount}
- 系统健康度: ${data.statistics.systemHealth}

## 详细数据
${data.logs.map(log => `
### ${log.time}
- 类型: ${log.type}
- 来源: ${log.source}
- 风险等级: ${log.level}
- 描述: ${log.description || '无'}
`).join('\n')}

---
生成时间: ${new Date().toLocaleString()}
  `;

  const blob = new Blob([reportContent], { type: 'text/markdown' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `report_${new Date().toISOString().split('T')[0]}.md`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

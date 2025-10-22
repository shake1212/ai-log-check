import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from 'antd';

interface LineChartProps {
  data: Array<{
    time: string;
    value: number;
    type: string;
  }>;
  title?: string;
  height?: number;
}

const LineChart: React.FC<LineChartProps> = ({ data, title = '实时数据流', height = 300 }) => {
  // 处理数据，按类型分组
  const processedData = data.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push([item.time, item.value]);
    return acc;
  }, {} as Record<string, Array<[string, number]>>);

  const option = {
    title: {
      text: title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: bold;">${params[0].axisValue}</div>`;
        params.forEach((param: any) => {
          const color = param.color;
          const name = param.seriesName === 'anomaly' ? '异常' : '正常';
          result += `<div style="margin: 5px 0;">
            <span style="display: inline-block; width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></span>
            ${name}: ${param.value[1]}
          </div>`;
        });
        return result;
      }
    },
    legend: {
      data: ['正常', '异常'],
      top: 30,
      left: 'center'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      },
      axisLabel: {
        color: '#666',
        formatter: (value: number) => {
          return new Date(value).toLocaleTimeString();
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      },
      axisLabel: {
        color: '#666'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: '正常',
        type: 'line',
        data: processedData.normal || [],
        smooth: true,
        lineStyle: {
          color: '#52c41a',
          width: 2
        },
        itemStyle: {
          color: '#52c41a'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.05)' }
            ]
          }
        },
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      },
      {
        name: '异常',
        type: 'line',
        data: processedData.anomaly || [],
        smooth: true,
        lineStyle: {
          color: '#ff4d4f',
          width: 2
        },
        itemStyle: {
          color: '#ff4d4f'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
              { offset: 1, color: 'rgba(255, 77, 79, 0.05)' }
            ]
          }
        },
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      }
    ],
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  };

  return (
    <Card>
      <ReactECharts
        option={option}
        style={{ height: height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </Card>
  );
};

export default LineChart;

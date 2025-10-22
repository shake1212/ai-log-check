import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from 'antd';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  height?: number;
  xAxisName?: string;
  yAxisName?: string;
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  title = '柱状图', 
  height = 300,
  xAxisName = '类别',
  yAxisName = '数值'
}) => {
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
        type: 'shadow'
      },
      formatter: (params: any) => {
        const param = params[0];
        return `${param.name}<br/>${param.seriesName}: ${param.value}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      },
      axisLabel: {
        color: '#666',
        rotate: data.length > 6 ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: {
        color: '#666'
      },
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
        name: yAxisName,
        type: 'bar',
        data: data.map((item, index) => ({
          value: item.value,
          itemStyle: {
            color: item.color || `hsl(${index * 60}, 70%, 50%)`,
            borderRadius: [4, 4, 0, 0]
          }
        })),
        barWidth: '60%',
        animation: true,
        animationDuration: 1000,
        animationEasing: 'elasticOut',
        animationDelay: (idx: number) => idx * 100
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

export default BarChart;

import { get } from '/@/utils/request';
import type {
  OverviewStatistics,
  ComplaintTypeDistribution,
  MonthlyTrend,
  AreaDistribution,
  StatisticsQueryParams
} from './type';

export default {
  // 获取概要统计
  overview: (params?: StatisticsQueryParams): Promise<OverviewStatistics> => get('/statistics/overview', params),

  // 获取投诉类型分布
  types: (): Promise<ComplaintTypeDistribution[]> => get('/statistics/types'),

  // 获取月度趋势
  monthlyTrends: (): Promise<MonthlyTrend[]> => get('/statistics/monthly-trends'),

  // 获取区域分布
  areas: (): Promise<AreaDistribution[]> => get('/statistics/areas')
};

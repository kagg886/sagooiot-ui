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
  overview: (params?: StatisticsQueryParams): Promise<OverviewStatistics> => get('/system/complaint/overview', params),

  // 获取投诉类型分布
  types: (): Promise<ComplaintTypeDistribution[]> => get('/system/complaint/types').then((res: {data: ComplaintTypeDistribution[]}) => res.data),

  // 获取月度趋势
  monthlyTrends: (): Promise<MonthlyTrend[]> => get('/system/complaint/monthly-trends').then((res: {data: MonthlyTrend[]}) => res.data),

  // 获取区域分布
  areas: (): Promise<AreaDistribution[]> => get('/system/complaint/areas').then((res: {data: AreaDistribution[]}) => res.data)
};

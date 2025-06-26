// 投诉区域枚举
export type ComplaintArea = 'A区' | 'B区'

// 投诉实体类型
export interface Complaint {
  id: string;
  title: string;
  content?: string;
  type: string;
  source: string;
  priority: string;
  status: string;
  complainant_name: string;
  complainant_contact?: string;
  area: ComplaintArea;
  assignee: string;
  satisfaction?: number | null;
  created_at: string;
  updated_at: string;
  processing_notes?: string;
}

// 投诉列表项类型（用于列表显示）
export interface ComplaintListItem {
  id: string;
  title: string;
  type: string;
  source: string;
  priority: string;
  status: string;
  complainant_name: string;
  area: ComplaintArea;
  assignee: string;
  created_at: string;
  updated_at: string;
}

// 创建投诉请求类型
export interface CreateComplaintRequest {
  title: string;
  content: string;
  type: string;
  source: string;
  priority: string;
  complainant_name: string;
  complainant_contact: string;
  area: ComplaintArea;
  assignee: string;
}

// 更新投诉请求类型
export interface UpdateComplaintRequest {
  title?: string;
  status?: string;
  assignee?: string;
  processing_notes?: string;
}

// 投诉查询参数类型
export interface ComplaintQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  type?: string;
  priority?: string;
  area?: ComplaintArea;
}

// 概要统计数据类型
export interface OverviewStatistics {
  totalComplaints: number;
  pendingComplaints: number;
  completedComplaints: number;
  urgentComplaints: number;
  averageProcessingTime: number;
  completionRate: number;
  satisfactionScore: number;
  satisfactionTotal: number;
}

// 投诉类型分布数据类型
export interface ComplaintTypeDistribution {
  type: string;
  count: number;
  percentage: number;
  trend: string;
}

// 月度趋势数据类型
export interface MonthlyTrend {
  month: string;
  completionRate: number;
  totalCount: number;
  completedCount: number;
}

// 区域分布数据类型
export interface AreaDistribution {
  area: ComplaintArea;
  count: number;
  percentage: number;
}

// 统计查询参数类型
export interface StatisticsQueryParams {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

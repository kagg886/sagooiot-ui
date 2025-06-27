// 投诉区域枚举
export type ComplaintArea = 'A区' | 'B区'

// 投诉实体类型
export interface Complaint {
  id: number;
  title: string;
  content?: string;
  type: string;
  source: string;
  priority: string;
  status: string;
  complainantName: string;
  contact?: string;
  area: ComplaintArea;
  assignee: string;
  satisfaction?: number | null;
  created_at: string;
  updated_at: string;
  processing_notes?: string;
}

// 投诉列表项类型（用于列表显示）
export type ComplaintListItem = {
	id: number;
	title: string;
	category: string; //来自字典：report_type
	source: string; //来自字典：report_source
	level: string; //来自字典：report_level
	content: string;
	status: 'pending' | 'processing' | 'completed';
	contact: string;
	complainantName: string;
	area: ComplaintArea;
	assignee: string;
	updatedAt: string;
}

export type CreateComplaintRequest = Pick<ComplaintListItem, 'title' | 'category' | 'source' | 'area' | 'complainantName' | 'contact' | 'level' | 'content'> & {
	assignee?: number;
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
  pageNum?: number;
  pageSize?: number;


  name?: string; //关键词
  status?: string; //状态
  category?: string; //类型
  level?: string; //等级
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

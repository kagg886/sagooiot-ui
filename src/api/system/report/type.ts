// 投诉区域枚举
export type ComplaintArea = 'A区' | 'B区'

export type ComplaintStatus = 'pending' | 'processing' | 'completed'

// 投诉实体类型
export interface Complaint {
  id: number;
  title: string;
  category: string;
  source: string;
	area: ComplaintArea;
	complainantName: string;
	contact?: string;
	level: string;
	content: string;
	assignee: number;
	status: ComplaintStatus;

  createdAt: string;
  updatedAt: string;
}

export type CreateComplaintRequest = Pick<Complaint, 'title' | 'category' | 'source' | 'area' | 'complainantName' | 'contact' | 'level' | 'content'> & {
	assignee?: number | null;
}
// 更新投诉请求类型
export type UpdateComplaintRequest = CreateComplaintRequest & {
  id: number;
}

export type BasePageQuery = {
	pageNum?: number;
	pageSize?: number;
}

// 投诉查询参数类型
export type ComplaintQueryParams = BasePageQuery & {

	dateRange?: [string, string]; //时间范围

  name?: string; //关键词
  status?: string; //状态
  category?: string; //类型
  level?: string; //等级

	orderBy?: 'asc' | 'desc'; //排序方式
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
export type ComplaintTypeDistribution = {
  type: string;
  count: number;
  percentage: number;
  trend: string;
}

// 月度趋势数据类型
export type MonthlyTrend = {
  month: string;
  completionRate: number;
  totalCount: number;
  completedCount: number;
}

// 区域分布数据类型
export type AreaDistribution = {
  area: ComplaintArea;
  count: number;
  percentage: number;
}

// 统计查询参数类型
export type StatisticsQueryParams = {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

export type Feedback = {
  id: number; // 反馈ID
	surveyCode: string; // 问卷编号
	ticketNo: number // 投诉编号
	investigatorName: string; // 调查者姓名
	contactInfo: string; // 联系信息
	processingSpeed: string; // 处理速度(字典related_level)
	staffAttitude: string; // 工作人员态度(字典related_level)
	resolutionEffect: string // 解决效果(字典related_level)
	otherSuggestions: string; // 其他建议
	createdAt: string; // 创建时间
}

export type FeedbackQueryParams = BasePageQuery & {
	investigatorName?: string;
}

export type FeedbackCreateParams = Omit<Feedback, 'id' | 'createdAt'>

export type ComplaintResolveHistory = {
	id: number;
	ticketNo: number;
	status: ComplaintStatus;
	operator: string;
	description: string
	createdAt: string;
	updatedAt: string
}

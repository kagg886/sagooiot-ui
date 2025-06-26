<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import { ElMessage } from 'element-plus'
import {
	Document, Clock, CircleCheck, Warning, Timer, TrendCharts,
	PieChart, Position, List, CaretTop, CaretBottom
} from '@element-plus/icons-vue'
import { useLoading } from '/@/utils/loading-util'
import api from '/@/api/system/report/statistics'
import type {
  OverviewStatistics,
  ComplaintTypeDistribution,
  MonthlyTrend,
  AreaDistribution, StatisticsQueryParams,
} from '/@/api/system/report/type'

// 按需引入 ECharts
import * as echarts from 'echarts/core'
import {
	PieChart as PieChartComponent,
	BarChart,
	LineChart
} from 'echarts/charts'
import {
	TitleComponent,
	TooltipComponent,
	LegendComponent,
	GridComponent
} from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import {useEventListener, useTimeout} from "@vueuse/core";
import {delay} from "/@/utils/delay";

// 注册必须的组件
echarts.use([
	TitleComponent,
	TooltipComponent,
	LegendComponent,
	GridComponent,
	PieChartComponent,
	BarChart,
	LineChart,
	LabelLayout,
	CanvasRenderer
])

// 响应式数据
const timeRange = ref<StatisticsQueryParams['timeRange']>('month')
const statistics = ref<OverviewStatistics>({
	totalComplaints: 0,
	pendingComplaints: 0,
	completedComplaints: 0,
	urgentComplaints: 0,
	averageProcessingTime: 0,
	completionRate: 0,
	satisfactionScore: 0,
	satisfactionTotal: 0
})
const typeDistributionData = ref<ComplaintTypeDistribution[]>([])
const monthlyTrendData = ref<MonthlyTrend[]>([])
const areaDistributionData = ref<AreaDistribution[]>([])

// DOM 引用
const satisfactionRef = ref<HTMLElement>()
const typeDistributionRef = ref<HTMLElement>()
const monthlyTrendRef = ref<HTMLElement>()
const areaDistributionRef = ref<HTMLElement>()

// 图表实例
let satisfactionChart: echarts.ECharts
let typeChart: echarts.ECharts
let trendChart: echarts.ECharts
let areaChart: echarts.ECharts

// 计算满意度星级
const satisfactionStars = computed(() => {
	return Math.round(statistics.value.satisfactionScore * 10) / 10
})

// 模拟最近投诉数据
const recentComplaints = ref([
	{
		id: '12345',
		priority: '紧急',
		type: '污水冒溢',
		title: '污水冒溢严重影响居民生活',
		time: '14:30',
		assignee: '李工程师',
		status: '处理中'
	},
	{
		id: '12346',
		priority: '重要',
		type: '设备故障',
		title: '电梯故障需要紧急维修',
		time: '13:45',
		assignee: '王主管',
		status: '待处理'
	},
	{
		id: '12347',
		priority: '一般',
		type: '环境卫生',
		title: '小区垃圾清理不及时',
		time: '12:20',
		assignee: '张队长',
		status: '已完成'
	},
	{
		id: '12348',
		priority: '重要',
		type: '服务质量',
		title: '物业服务态度问题',
		time: '11:15',
		assignee: '陈经理',
		status: '处理中'
	}
])

// 获取统计数据
const { loading: statisticsLoading, doLoading: getStatistics } = useLoading(async () => {
	const data = await api.overview({ timeRange: timeRange.value })
		.catch(() => ({
			totalComplaints: 1234,
			pendingComplaints: 89,
			completedComplaints: 1145,
			urgentComplaints: 23,
			averageProcessingTime: 2.3,
			completionRate: 92.8,
			satisfactionScore: 4.2,
			satisfactionTotal: 1266
		}))

	statistics.value = data
})

// 获取类型分布数据
const { loading: typeLoading, doLoading: getTypeDistribution } = useLoading(async () => {
	const data = await api.types()
		.catch(() => ([
			{ type: '污水冒溢', count: 456, percentage: 35, trend: 'up' },
			{ type: '设备故障', count: 342, percentage: 26, trend: 'down' },
			{ type: '环境卫生', count: 289, percentage: 22, trend: 'up' },
			{ type: '服务质量', count: 147, percentage: 11, trend: 'up' },
			{ type: '其它', count: 78, percentage: 6, trend: 'down' }
		]))

	typeDistributionData.value = data
})

// 获取月度趋势数据
const { loading: trendLoading, doLoading: getMonthlyTrend } = useLoading(async () => {
	const data = await api.monthlyTrends()
		.catch(() => ([
			{ month: '1月', completionRate: 91, totalCount: 120, completedCount: 109 },
			{ month: '2月', completionRate: 93, totalCount: 135, completedCount: 125 },
			{ month: '3月', completionRate: 94, totalCount: 142, completedCount: 133 },
			{ month: '4月', completionRate: 93, totalCount: 158, completedCount: 147 },
			{ month: '5月', completionRate: 94, totalCount: 163, completedCount: 153 },
			{ month: '6月', completionRate: 93, totalCount: 171, completedCount: 159 }
		]))

	monthlyTrendData.value = data
})

// 获取区域分布数据
const { loading: areaLoading, doLoading: getAreaDistribution } = useLoading(async () => {
	const data = await api.areas()
		.catch(() => ([
			{ area: 'A区' as const, count: 312, percentage: 25 },
			{ area: 'B区' as const, count: 289, percentage: 23 },
			{ area: 'A区' as const, count: 267, percentage: 22 },
			{ area: 'B区' as const, count: 234, percentage: 19 }
		]))

	areaDistributionData.value = data
})

// 工具函数
const getPriorityType = (priority: string) => {
	switch (priority) {
		case '紧急': return 'danger'
		case '重要': return 'warning'
		case '一般': return 'info'
		default: return 'info'
	}
}

const getStatusType = (status: string) => {
	switch (status) {
		case '待处理': return 'info'
		case '处理中': return 'warning'
		case '已完成': return 'success'
		default: return 'info'
	}
}

const getTypeColor = (type: string) => {
	const colors = ['', 'success', 'warning', 'danger', 'info']
	const index = ['污水冒溢', '设备故障', '环境卫生', '服务质量', '其它'].indexOf(type)
	return colors[index] || 'info'
}

// 事件处理
const handleTimeRangeChange = () => {
	getStatistics()
}

const viewAll = () => {
	ElMessage.info('跳转到投诉列表页面')
}

// 初始化图表
const initSatisfactionChart = () => {
	if (!satisfactionRef.value) return

	satisfactionChart = echarts.init(satisfactionRef.value)
	const option = {
		series: [{
			type: 'pie',
			radius: ['70%', '90%'],
			center: ['50%', '50%'],
			startAngle: 90,
			endAngle: 450,
			data: [
				{ value: statistics.value.satisfactionScore, itemStyle: { color: '#52c41a' }},
				{ value: 5 - statistics.value.satisfactionScore, itemStyle: { color: '#f0f0f0' }}
			],
			label: {
				show: true,
				position: 'center',
				formatter: () => `{value|${statistics.value.satisfactionScore}}\n{unit|/ 5}`,
				rich: {
					value: {
						fontSize: 32,
						fontWeight: 'bold',
						color: '#52c41a'
					},
					unit: {
						fontSize: 14,
						color: '#666'
					}
				}
			},
			labelLine: { show: false },
			silent: true
		}]
	}
	satisfactionChart.setOption(option)
}

const initTypeDistributionChart = () => {
	if (!typeDistributionRef.value) return

	typeChart = echarts.init(typeDistributionRef.value)
	const colors = ['#4285f4', '#ea4335', '#fbbc05', '#34a853', '#9aa0a6']

	const option = {
		color: colors,
		tooltip: {
			trigger: 'item',
			formatter: '{b}: {c} ({d}%)'
		},
		legend: {
			type: 'scroll',
			orient: 'vertical',
			right: '5%',
			top: 'center',
			itemGap: 20,
			textStyle: { fontSize: 12 }
		},
		series: [{
			type: 'pie',
			radius: ['0%', '60%'],
			center: ['35%', '50%'],
			data: typeDistributionData.value.map(item => ({
				name: item.type,
				value: item.count
			})),
			label: { show: false },
			emphasis: {
				itemStyle: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			}
		}]
	}
	typeChart.setOption(option)
}

const initMonthlyTrendChart = () => {
	if (!monthlyTrendRef.value) return

	trendChart = echarts.init(monthlyTrendRef.value)
	const option = {
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const data = params[0]
				return `${data.name}<br/>完成率: ${data.value}%`
			}
		},
		xAxis: {
			type: 'category',
			data: monthlyTrendData.value.map(item => item.month),
			axisLine: { show: false },
			axisTick: { show: false }
		},
		yAxis: {
			type: 'value',
			min: 85,
			max: 100,
			axisLine: { show: false },
			axisTick: { show: false },
			splitLine: {
				lineStyle: {
					color: '#f0f0f0',
					type: 'dashed'
				}
			}
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '3%',
			top: '3%',
			containLabel: true
		},
		series: [{
			type: 'bar',
			data: monthlyTrendData.value.map(item => item.completionRate),
			itemStyle: {
				color: '#000',
				borderRadius: [2, 2, 0, 0]
			},
			barWidth: '60%'
		}]
	}
	trendChart.setOption(option)
}

const initAreaDistributionChart = () => {
	if (!areaDistributionRef.value) return

	areaChart = echarts.init(areaDistributionRef.value)
	const option = {
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' }
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '3%',
			top: '3%',
			containLabel: true
		},
		xAxis: {
			type: 'value',
			axisLine: { show: false },
			axisTick: { show: false },
			splitLine: {
				lineStyle: {
					color: '#f0f0f0',
					type: 'dashed'
				}
			}
		},
		yAxis: {
			type: 'category',
			data: areaDistributionData.value.map(item => item.area),
			axisLine: { show: false },
			axisTick: { show: false }
		},
		series: [{
			type: 'bar',
			data: areaDistributionData.value.map(item => ({
				value: item.count,
				itemStyle: { color: '#666' }
			})),
			barWidth: '50%',
			itemStyle: {
				borderRadius: [0, 2, 2, 0]
			}
		}]
	}
	areaChart.setOption(option)
}
// 初始化
onMounted(async () => {
	// 获取数据
	await Promise.all([
		getStatistics(),
		getTypeDistribution(),
		getMonthlyTrend(),
		getAreaDistribution()
	])

  await delay(1000)

  initSatisfactionChart()
  initTypeDistributionChart()
  initMonthlyTrendChart()
  initAreaDistributionChart()
})


useEventListener('resize', () => {
  satisfactionChart?.resize()
  typeChart?.resize()
  trendChart?.resize()
  areaChart?.resize()
})
</script>

<template>
	<div class="page">
		<el-card shadow="never">
			<!-- 面包屑导航 -->
			<div class="breadcrumb-container mb-4">
				<span class="text-gray-500">投诉管理</span>
				<span class="mx-2 text-gray-400">/</span>
				<span>概要统计</span>
			</div>

			<!-- 标题和时间选择器 -->
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-xl font-semibold">概要统计</h2>
				<el-select v-model="timeRange" placeholder="本月" style="width: 120px" @change="handleTimeRangeChange">
					<el-option label="本周" value="week" />
					<el-option label="本月" value="month" />
					<el-option label="本季度" value="quarter" />
					<el-option label="本年" value="year" />
				</el-select>
			</div>

						<!-- 统计卡片区域 -->
			<el-row :gutter="16" class="mb-6">
				<!-- 满意度评分 - 占满一列 -->
				<el-col :xs="24" :sm="24" :md="6" :lg="6" :xl="6" class="satisfaction-col">
					<div class="stat-card satisfaction-card">
						<div class="satisfaction-circle" ref="satisfactionRef"></div>
						<div class="satisfaction-info">
							<div class="satisfaction-title">整体满意度</div>
							<div class="satisfaction-subtitle">基于 {{ statistics.satisfactionTotal }} 份反馈</div>
							<div class="satisfaction-stars">
								<el-rate
									v-model="satisfactionStars"
									disabled
									show-score
									text-color="#ff9900"
									score-template="{value}"
									:max="5"
								/>
							</div>
							<div class="satisfaction-trend">较上月 +0.3</div>
						</div>
					</div>
				</el-col>

				<!-- 其他统计卡片 -->
				<el-col :xs="24" :sm="24" :md="18" :lg="18" :xl="18">
					<el-row :gutter="16" class="stat-cards-container">
						<!-- 总投诉 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#409eff"><Document /></el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">总投诉</div>
									<div class="stat-value">{{ statistics.totalComplaints.toLocaleString() }}</div>
									<div class="stat-trend positive">
										<el-icon><CaretTop /></el-icon>
										+12%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 待处理 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#e6a23c"><Clock /></el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">待处理</div>
									<div class="stat-value">{{ statistics.pendingComplaints }}</div>
									<div class="stat-trend negative">
										<el-icon><CaretBottom /></el-icon>
										-5%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 已完成 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#67c23a"><CircleCheck /></el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">已完成</div>
									<div class="stat-value">{{ statistics.completedComplaints.toLocaleString() }}</div>
									<div class="stat-trend positive">
										<el-icon><CaretTop /></el-icon>
										+18%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 紧急 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#f56c6c"><Warning /></el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">紧急</div>
									<div class="stat-value">{{ statistics.urgentComplaints }}</div>
									<div class="stat-trend positive">
										<el-icon><CaretTop /></el-icon>
										+3%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 处理时间 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#909399"><Timer /></el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">处理时间</div>
									<div class="stat-value">{{ statistics.averageProcessingTime }}天</div>
									<div class="stat-trend negative">
										<el-icon><CaretBottom /></el-icon>
										-0.5天
									</div>
								</div>
							</div>
						</el-col>

						<!-- 完成率 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#409eff"><TrendCharts /></el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">完成率</div>
									<div class="stat-value">{{ statistics.completionRate }}%</div>
									<div class="stat-trend positive">
										<el-icon><CaretTop /></el-icon>
										+2.1%
									</div>
								</div>
							</div>
						</el-col>
					</el-row>
				</el-col>
			</el-row>

			<!-- 图表区域 -->
			<el-row :gutter="16" class="mb-6">
				<!-- 投诉类型分布 -->
				<el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
					<div class="chart-card">
						<div class="chart-title">
							<el-icon><PieChart /></el-icon>
							投诉类型分布
						</div>
						<div class="chart-container" ref="typeDistributionRef"></div>
					</div>
				</el-col>

				<!-- 月度完成率趋势 -->
				<el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
					<div class="chart-card">
						<div class="chart-title">
							<el-icon><TrendCharts /></el-icon>
							月度完成率趋势
						</div>
						<div class="chart-container" ref="monthlyTrendRef"></div>
					</div>
				</el-col>

				<!-- 区域分布 -->
				<el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
					<div class="chart-card">
						<div class="chart-title">
							<el-icon><Position /></el-icon>
							区域分布
						</div>
						<div class="chart-container" ref="areaDistributionRef"></div>
					</div>
				</el-col>
			</el-row>

			<!-- 最近投诉动态 -->
			<div class="recent-complaints">
				<div class="flex justify-between items-center mb-4">
					<div class="section-title">
						<el-icon><List /></el-icon>
						最近投诉动态
					</div>
					<el-button type="primary" link @click="viewAll">查看全部</el-button>
				</div>

				<div class="complaint-list">
					<div v-for="complaint in recentComplaints" :key="complaint.id" class="complaint-item">
						<div class="complaint-id">
							<span class="id-text">#{{ complaint.id }}</span>
							<el-tag :type="getPriorityType(complaint.priority)" size="small">
								{{ complaint.priority }}
							</el-tag>
							<el-tag :type="getTypeColor(complaint.type)" size="small">
								{{ complaint.type }}
							</el-tag>
						</div>
						<div class="complaint-title">{{ complaint.title }}</div>
						<div class="complaint-meta">
							<span class="complaint-time">{{ complaint.time }}</span>
							<span class="complaint-assignee">{{ complaint.assignee }}</span>
							<div class="complaint-actions">
								<el-tag :type="getStatusType(complaint.status)" size="small">
									{{ complaint.status }}
								</el-tag>
								<el-button type="primary" link size="small">详情</el-button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</el-card>
	</div>
</template>

<style scoped lang="scss">
.page {
	padding: 20px;
}

.breadcrumb-container {
	font-size: 14px;
	color: #606266;
}

.text-xl {
	font-size: 1.25rem;
}

.font-semibold {
	font-weight: 600;
}

.stat-card {
	background: white;
	border-radius: 8px;
	padding: 20px;
	height: 140px;
	border: 1px solid #e4e7ed;
	display: flex;
	align-items: center;
	gap: 16px;
	margin-bottom: 16px;

	.stat-icon {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: #f5f7fa;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat-content {
		flex: 1;

		.stat-label {
			font-size: 14px;
			color: #606266;
			margin-bottom: 8px;
		}

		.stat-value {
			font-size: 24px;
			font-weight: bold;
			color: #303133;
			margin-bottom: 4px;
		}

		.stat-trend {
			font-size: 12px;
			display: flex;
			align-items: center;
			gap: 2px;

			&.positive {
				color: #67c23a;
			}

			&.negative {
				color: #f56c6c;
			}
		}
	}
}

.satisfaction-card {
	flex-direction: column;
	height: 300px;
	justify-content: center;
	margin-bottom: 0;

	.satisfaction-circle {
		width: 120px;
		height: 120px;
		margin-bottom: 16px;
	}

	.satisfaction-info {
		text-align: center;

		.satisfaction-title {
			font-size: 14px;
			font-weight: bold;
			color: #303133;
			margin-bottom: 4px;
		}

		.satisfaction-subtitle {
			font-size: 12px;
			color: #909399;
			margin-bottom: 8px;
		}

		.satisfaction-stars {
			margin-bottom: 8px;
		}

		.satisfaction-trend {
			font-size: 12px;
			color: #67c23a;
		}
	}
}

.chart-card {
	background: white;
	border-radius: 8px;
	padding: 20px;
	height: 320px;
	border: 1px solid #e4e7ed;

	.chart-title {
		font-size: 16px;
		font-weight: bold;
		color: #303133;
		margin-bottom: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.chart-container {
		height: 260px;
	}
}

.recent-complaints {
	background: white;
	border-radius: 8px;
	padding: 20px;
	border: 1px solid #e4e7ed;

	.section-title {
		font-size: 16px;
		font-weight: bold;
		color: #303133;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.complaint-list {
		.complaint-item {
			border-bottom: 1px solid #f0f0f0;
			padding: 16px 0;

			&:last-child {
				border-bottom: none;
			}

			.complaint-id {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-bottom: 8px;

				.id-text {
					color: #409eff;
					font-weight: bold;
				}
			}

			.complaint-title {
				font-size: 14px;
				color: #303133;
				margin-bottom: 8px;
			}

			.complaint-meta {
				display: flex;
				align-items: center;
				justify-content: space-between;
				font-size: 12px;
				color: #909399;

				.complaint-actions {
					display: flex;
					align-items: center;
					gap: 8px;
				}
			}
		}
	}
}

// 通用样式
.flex {
	display: flex;
}

.justify-between {
	justify-content: space-between;
}

.items-center {
	align-items: center;
}

.mb-4 {
	margin-bottom: 16px;
}

.mb-6 {
	margin-bottom: 24px;
}

.text-gray-500 {
	color: #909399;
}

.text-gray-400 {
	color: #c0c4cc;
}

.mx-2 {
	margin-left: 8px;
	margin-right: 8px;
}

// 满意度卡片列的间距控制
.satisfaction-col {
	@media (max-width: 767px) {
		margin-bottom: 16px;
	}
}

// 为统计卡片行添加间距
.stat-cards-container {
	.el-col {
		margin-bottom: 0;

		@media (max-width: 767px) {
			margin-bottom: 16px;
		}
	}

	// 第二行卡片（紧急、处理时间、完成率）添加上边距
	.el-col:nth-child(n+4) {
		@media (min-width: 768px) {
			.stat-card {
				margin-top: 5px;
			}
		}
	}
}
</style>

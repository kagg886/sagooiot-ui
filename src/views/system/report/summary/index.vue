<script setup lang="ts">
import { ref, onMounted, computed, getCurrentInstance, unref, watch } from 'vue'
import {
	Document,
	Clock,
	CircleCheck,
	Warning,
	Timer,
	TrendCharts,
	PieChart,
	Position,
	List,
	CaretTop,
	CaretBottom,
} from '@element-plus/icons-vue'
import api from '/@/api/system/report/statistics'
import report from '/@/api/system/report/complaints'
import { Complaint, StatisticsQueryParams } from '/@/api/system/report/type'

// 按需引入 ECharts
import * as echarts from 'echarts/core'
import { PieChart as PieChartComponent, BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { useAsyncState, useEventListener } from '@vueuse/core'
import { BarSeriesOption, ComposeOption, PieSeriesOption } from 'echarts'
import ReportDetailDialog from '/@/views/system/report/componments/report-detail-dialog.vue'

// 注册必须的组件
echarts.use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, PieChartComponent, BarChart, LineChart, LabelLayout, CanvasRenderer])

const { proxy } = getCurrentInstance() as any

//投诉等级，投诉来源，投诉类型
const {
	report_level,
	report_source,
	report_type,
}: {
	[key: string]: Array<{
		label: string
		value: string
	}>
} = proxy.useDict('report_level', 'report_source', 'report_type')

// eslint-disable-next-line no-unused-vars
const formatReportLevel = computed<(value: string) => string>(() => {
	const levels = unref(report_level)
	return (value: string) => {
		if (value === undefined) {
			return '-'
		}
		if (levels === undefined) {
			return '-'
		}
		return proxy.selectDictLabel(levels, value)
	}
})

// eslint-disable-next-line no-unused-vars
const formatReportSource = computed<(value: string) => string>(() => {
	const sources = unref(report_source)
	return (value: string) => {
		if (value === undefined) {
			return '-'
		}
		if (sources === undefined) {
			return '-'
		}
		return proxy.selectDictLabel(sources, value)
	}
})
const formatReportStatus = (value: Complaint['status']) => {
	let a = '-'
	switch (value) {
		case 'completed':
			a = '已完成'
			break
		case 'pending':
			a = '待处理'
			break
		case 'processing':
			a = '进行中'
			break
	}
	return a
}

// 响应式数据
// const typeDistributionData = ref<ComplaintTypeDistribution[]>([])
// const monthlyTrendData = ref<MonthlyTrend[]>([])
// const areaDistributionData = ref<AreaDistribution[]>([])

// 统计部分

//表单
const timeRange = ref<StatisticsQueryParams['timeRange']>('month')
watch(timeRange, (newVal: StatisticsQueryParams['timeRange']) => {
	getStatistics(100, { timeRange: newVal })
})

//数据展示
const satisfactionRef = ref<HTMLElement>()
const satisfactionRefMounted = ref(false)
let satisfactionChart: echarts.ECharts

//初始化时挂载echarts
onMounted(() => {
	satisfactionChart = echarts.init(satisfactionRef.value!)
	satisfactionRefMounted.value = true
})

useEventListener('resize', () => {
	if (satisfactionChart) {
		satisfactionChart.resize()
	}
})

//异步获取数据
const {
	state: statistics,
	execute: getStatistics,
} = useAsyncState(async (range: StatisticsQueryParams) => api.overview(range), undefined)

//通过数据和组件挂载状态决定ECOption
const statisticsOption = computed(() => {
	const prepare = statistics.value
	if (prepare === undefined) {
		//数据加载必须完成
		return undefined
	}

	if (!satisfactionRefMounted.value) {
		//组件必须被挂载
		return undefined
	}

	const option: ComposeOption<PieSeriesOption> = {
		series: [
			{
				type: 'pie',
				radius: ['70%', '90%'],
				center: ['50%', '50%'],
				startAngle: 90,
				// endAngle: 450,
				data: [
					{ value: prepare.satisfactionScore, itemStyle: { color: '#52c41a' } },
					{ value: 5 - prepare.satisfactionScore, itemStyle: { color: '#f0f0f0' } },
				],
				label: {
					show: true,
					position: 'center',
					formatter: () => `{value|${prepare.satisfactionScore}%}`,
					rich: {
						value: {
							fontSize: 24,
							fontWeight: 'bold',
							color: '#52c41a',
						},
						unit: {
							fontSize: 14,
							color: '#666',
						},
					},
				},
				labelLine: { show: false },
				silent: true,
			},
		],
	}

	return option
})
watch(statisticsOption, (newVal) => {
	if (newVal !== undefined) {
		satisfactionChart.setOption(newVal)
	}
})
const satisfactionStars = computed(() => {
	return Math.round((statistics.value?.satisfactionScore ?? 0) * 10) / 10
})

const typeDistributionRef = ref<HTMLElement>()
const typeDistributionRefMounted = ref(false)
let typeChart: echarts.ECharts
//初始化时挂载echarts
onMounted(() => {
	typeChart = echarts.init(typeDistributionRef.value!)
	typeDistributionRefMounted.value = true
})

useEventListener('resize', () => {
	if (typeChart) {
		typeChart.resize()
	}
})

//异步获取数据
const { state: typeDistributionData } = useAsyncState(async () => api.types(), undefined)

//通过数据和组件挂载状态决定ECOption
const typeDistributionOption = computed(() => {
	const prepare = typeDistributionData.value
	if (prepare === undefined) {
		//数据加载必须完成
		return undefined
	}
	if (!typeDistributionRefMounted.value) {
		//组件必须被挂载
		return undefined
	}

	const report_type_impl = unref(report_type)

	const option: ComposeOption<PieSeriesOption> = {
		tooltip: {
			trigger: 'item',
			formatter: '{b}: {c} ({d}%)',
		},
		legend: {
			type: 'scroll',
			orient: 'vertical',
			right: '5%',
			top: 'center',
			itemGap: 20,
			textStyle: { fontSize: 12 },
		},
		series: [
			{
				type: 'pie',
				radius: ['0%', '60%'],
				center: ['35%', '50%'],
				data: prepare.map((item) => ({
					name: proxy.selectDictLabel(report_type_impl, item.type),
					value: item.count,
				})),
				label: { show: false },
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowOffsetX: 0,
						shadowColor: 'rgba(0, 0, 0, 0.5)',
					},
				},
			},
		],
	}

	return option
})

watch(typeDistributionOption, (newVal) => {
	if (newVal !== undefined) {
		typeChart.setOption(newVal)
	}
})

const monthlyTrendRef = ref<HTMLElement>()
const monthlyTrendRefMounted = ref(false)
let monthTrendChart: echarts.ECharts
//初始化时挂载echarts
onMounted(() => {
	monthTrendChart = echarts.init(monthlyTrendRef.value!)
	monthlyTrendRefMounted.value = true
})
useEventListener('resize', () => {
	if (monthTrendChart) {
		monthTrendChart.resize()
	}
})
//异步获取数据
const { state: monthlyTrendData } = useAsyncState(async () => api.monthlyTrends(), undefined)
//通过数据和组件挂载状态决定ECOption
const monthlyTrendOption = computed(() => {
	const prepare = monthlyTrendData.value
	if (prepare === undefined) {
		//数据加载必须完成
		return undefined
	}
	if (!monthlyTrendRefMounted.value) {
		//组件必须被挂载
		return undefined
	}
	const option: ComposeOption<BarSeriesOption> = {
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const data = params[0]
				return `${data.name}<br/>完成率: ${data.value}%`
			},
		},
		xAxis: {
			type: 'category',
			data: prepare.map((item) => item.month),
			axisLine: { show: false },
			axisTick: { show: false },
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
					type: 'dashed',
				},
			},
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '3%',
			top: '3%',
			containLabel: true,
		},
		series: [
			{
				type: 'bar',
				data: prepare.map((item) => item.completionRate),
				itemStyle: {
					color: '#000',
					borderRadius: [2, 2, 0, 0],
				},
				barWidth: '60%',
			},
		],
	}
	return option
})

watch(monthlyTrendOption, (newVal) => {
	if (newVal !== undefined) {
		monthTrendChart.setOption(newVal)
	}
})

useEventListener('resize', () => {
	if (monthTrendChart) {
		monthTrendChart.resize()
	}
})

const areaDistributionRef = ref<HTMLElement>()
const areaDistributionRefMounted = ref(false)
let areaChart: echarts.ECharts
//初始化时挂载echarts
onMounted(() => {
	areaChart = echarts.init(areaDistributionRef.value!)
	areaDistributionRefMounted.value = true
})
useEventListener('resize', () => {
	if (areaChart) {
		areaChart.resize()
	}
})
//异步获取数据
const { state: areaDistributionData } = useAsyncState(async () => api.areas(), undefined)
//通过数据和组件挂载状态决定ECOption
const areaDistributionOption = computed(() => {
	const prepare = areaDistributionData.value
	if (prepare === undefined) {
		//数据加载必须完成
		return undefined
	}
	if (!areaDistributionRefMounted.value) {
		//组件必须被挂载
		return undefined
	}

	const option: ComposeOption<BarSeriesOption> = {
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
		},
		grid: {
			left: '3%',
			right: '4%',
			bottom: '3%',
			top: '3%',
			containLabel: true,
		},
		xAxis: {
			type: 'value',
			axisLine: { show: false },
			axisTick: { show: false },
			splitLine: {
				lineStyle: {
					color: '#f0f0f0',
					type: 'dashed',
				},
			},
		},
		yAxis: {
			type: 'category',
			data: prepare.map(item => item.area),
			axisLine: { show: false },
			axisTick: { show: false },
		},
		series: [{
			type: 'bar',
			data: prepare.map(item => ({
				value: item.count,
				itemStyle: { color: '#666' },
			})),
			barWidth: '50%',
			itemStyle: {
				borderRadius: [0, 2, 2, 0],
			},
		}],
	}
	return option
})
watch(areaDistributionOption, (newVal) => {
	if (newVal!== undefined) {
		areaChart.setOption(newVal)
	}
})

const {state: recentComplaints} = useAsyncState<Complaint[]>(async () => report.getList({orderBy: 'desc',pageSize: 5}).then((res: {list: Complaint[]})=>res.list),[])


const detailVisible = ref(false)
const detailComplaint = ref<number|undefined>(undefined)
const handleDetail = (complaint: Complaint) => {
	detailComplaint.value = complaint.id
	detailVisible.value = true
}

const openAll = () => {
	proxy.$router.push('/system/report/list')
}
</script>

<template>
	<div class="page">
		<el-card shadow="never">
			<!-- 标题和时间选择器 -->
			<div class="flex justify-between flex-direction-end mb-6">
				<el-select v-model="timeRange" placeholder="本月" style="width: 120px">
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
							<div class="satisfaction-subtitle">基于 {{ statistics?.satisfactionTotal ?? 0 }} 份反馈</div>
							<div class="satisfaction-stars">
								<el-rate v-model="satisfactionStars" disabled show-score text-color="#ff9900" score-template="{value}" :max="5" />
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
									<el-icon size="24" color="#409eff">
										<Document />
									</el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">总投诉</div>
									<div class="stat-value">{{ statistics?.totalComplaints?.toLocaleString() ?? '-' }}</div>
									<div class="stat-trend positive">
										<el-icon>
											<CaretTop />
										</el-icon>
										+12%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 待处理 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#e6a23c">
										<Clock />
									</el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">待处理</div>
									<div class="stat-value">{{ statistics?.pendingComplaints ?? '-' }}</div>
									<div class="stat-trend negative">
										<el-icon>
											<CaretBottom />
										</el-icon>
										-5%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 已完成 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#67c23a">
										<CircleCheck />
									</el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">已完成</div>
									<div class="stat-value">{{ statistics?.completedComplaints?.toLocaleString() ?? '-' }}</div>
									<div class="stat-trend positive">
										<el-icon>
											<CaretTop />
										</el-icon>
										+18%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 紧急 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#f56c6c">
										<Warning />
									</el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">紧急</div>
									<div class="stat-value">{{ statistics?.urgentComplaints ?? '-' }}</div>
									<div class="stat-trend positive">
										<el-icon>
											<CaretTop />
										</el-icon>
										+3%
									</div>
								</div>
							</div>
						</el-col>

						<!-- 处理时间 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#909399">
										<Timer />
									</el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">处理时间</div>
									<div class="stat-value">{{ statistics?.averageProcessingTime ?? '-' }}天</div>
									<div class="stat-trend negative">
										<el-icon>
											<CaretBottom />
										</el-icon>
										-0.5天
									</div>
								</div>
							</div>
						</el-col>

						<!-- 完成率 -->
						<el-col :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
							<div class="stat-card">
								<div class="stat-icon">
									<el-icon size="24" color="#409eff">
										<TrendCharts />
									</el-icon>
								</div>
								<div class="stat-content">
									<div class="stat-label">完成率</div>
									<div class="stat-value">{{ statistics?.completionRate ?? '-' }}%</div>
									<div class="stat-trend positive">
										<el-icon>
											<CaretTop />
										</el-icon>
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
							<el-icon>
								<PieChart />
							</el-icon>
							投诉类型分布
						</div>
						<div class="chart-container" ref="typeDistributionRef"></div>
					</div>
				</el-col>

				<!-- 月度完成率趋势 -->
				<el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
					<div class="chart-card">
						<div class="chart-title">
							<el-icon>
								<TrendCharts />
							</el-icon>
							月度完成率趋势
						</div>
						<div class="chart-container" ref="monthlyTrendRef"></div>
					</div>
				</el-col>

				<!-- 区域分布 -->
				<el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
					<div class="chart-card">
						<div class="chart-title">
							<el-icon>
								<Position />
							</el-icon>
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
						<el-icon>
							<List />
						</el-icon>
						最近投诉动态
					</div>
					<el-button type="primary" link @click="openAll">查看全部</el-button>
				</div>

				<div class="complaint-list">
					<div v-for="complaint in recentComplaints" :key="complaint.id" class="complaint-item">
						<div class="complaint-id">
							<span class="id-text">#{{ complaint.id }}</span>
							<el-tag size="small">
								{{ formatReportLevel(complaint.level) }}
							</el-tag>
						</div>
						<div class="complaint-title">{{ complaint.title }}</div>
						<div class="complaint-meta">
							<span class="complaint-time">{{ complaint.createdAt }}</span>
							<span class="complaint-assignee">{{ complaint.assignee }}</span>
							<div class="complaint-actions">
								<el-tag size="small">
									{{ formatReportStatus(complaint.status) }}
								</el-tag>
								<el-button type="primary" link size="small" @click="handleDetail(complaint)">详情</el-button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</el-card>

		<report-detail-dialog :id="detailComplaint" v-model:visible="detailVisible"/>
	</div>
</template>

<style scoped lang="scss">
.flex-direction-end {
	flex-direction: row-reverse;
}
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

.items-end {
	align-items: end;
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
	.el-col:nth-child(n + 4) {
		@media (min-width: 768px) {
			.stat-card {
				margin-top: 5px;
			}
		}
	}
}
</style>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, unref, watch } from 'vue'
import { Complaint, ComplaintResolveHistoryInsertRequest } from '/@/api/system/report/type'
import { useAsyncState } from '@vueuse/core'
import complaint_resolve_history from '/@/api/system/report/complaint-resolve-history'
import complaints from '/@/api/system/report/complaints'
import { useLoading } from '/@/utils/loading-util'
import { ElMessage } from 'element-plus'

const { proxy } = getCurrentInstance() as any

//投诉等级，投诉来源，投诉类型
const {
	report_level,
	report_type,
	report_source,
}: {
	[key: string]: Array<{
		label: string
		value: string
	}>
} = proxy.useDict('report_level', 'report_type', 'report_source')

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
const formatReportType = computed<(value: string) => string>(() => {
	const types = unref(report_type)
	return (value: string) => {
		if (value === undefined) {
			return '-'
		}
		if (types === undefined) {
			return '-'
		}
		return proxy.selectDictLabel(types, value)
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

const props = defineProps<{
	id: number | undefined

	visible: boolean
}>()

const emit = defineEmits<{
	// eslint-disable-next-line no-unused-vars
	(e: 'update:visible', val: boolean): void
}>()

const visible = computed({
	get: () => props.visible,
	set: (val) => emit('update:visible', val),
})

const {
	state: complaintDetail,
	isLoading: complaintDetailLoading,
	execute: complaintDetailExecute,
} = useAsyncState<Complaint | undefined>(async () => {
	if (props.id === undefined) {
		return undefined
	}
	return complaints.detail(props.id)
}, undefined)

const {
	state: complaintResolveList,
	isLoading: isComplaintResolveLoading,
	execute: complaintResolveListExecute,
} = useAsyncState(async () => {
	if (props.id === undefined) {
		return []
	}
	return complaint_resolve_history.list(props.id)
}, [])

watch(
	() => props.id,
	() => {
		if (props.id !== undefined) {
			complaintDetailExecute(0)
			complaintResolveListExecute(0)
		}
	}
)

const currentResolveStatus = computed(() => complaintResolveList.value.at(-1) ?? undefined)

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

const showUpdateForm = ref(false)
const formComplaintResolve = ref<Omit<ComplaintResolveHistoryInsertRequest, 'ticketNo'>>({
	description: '',
	status: 'processing',
})

const handleCancelUpdate = () => {
	showUpdateForm.value = false
	formComplaintResolve.value = {
		description: '',
		status: 'processing',
	}
}

const { loading: createComplaintResolveLoading, doLoading: createComplaintResolve } = useLoading(async () => {
	const valid = formComplaintResolve.value?.description?.trim()
	if (!valid) {
		ElMessage.error('请输入处理描述')
		return
	}
	const result = await complaint_resolve_history
		.update({
			ticketNo: complaintDetail.value?.id!,
			...formComplaintResolve.value,
		})
		.then(() => true)
		.catch(() => false)

	if (!result) {
		return
	}
	ElMessage.success('处理状态更新成功')
	formComplaintResolve.value = {
		description: '',
		status: 'processing',
	}
	showUpdateForm.value = false
})
</script>

<template>
	<el-dialog v-model="visible" title="投诉详情" width="800px" :close-on-click-modal="false" @close="() => visible = false">
		<div class="complaint-detail">
			<!-- 头部信息 -->
			<div class="complaint-header" v-loading="complaintDetailLoading">
				<div class="complaint-id">
					<span class="id-text">#{{ complaintDetail?.id ?? '-1' }}</span>
					<el-tag :type="complaintDetail?.level === '1' ? 'danger' : complaintDetail?.level === '2' ? 'warning' : 'info'" class="ml-2">
						{{ formatReportLevel(complaintDetail?.level) }}
					</el-tag>
					<el-tag
						:type="complaintDetail?.status === 'pending' ? 'info' : complaintDetail?.status === 'processing' ? 'warning' : 'success'"
						class="ml-2"
					>
						{{ formatReportStatus(complaintDetail?.status) }}
					</el-tag>
				</div>
				<h2 class="complaint-title">{{ complaintDetail?.title ?? '-' }}</h2>
				<div class="complaint-time">
					<el-icon>
						<ele-Clock />
					</el-icon>
					<span>创建时间：{{ complaintDetail?.createdAt ?? '-' }}</span>
					<el-icon class="ml-4">
						<ele-Refresh />
					</el-icon>
					<span>更新时间：{{ complaintDetail?.updatedAt ?? '-' }}</span>
				</div>
			</div>

			<el-row :gutter="20" class="mt-4" >
				<!-- 左侧基本信息 -->
				<el-col :span="14">
					<el-card shadow="never" class="info-card">
						<template #header>
							<div class="card-header">
								<el-icon>
									<ele-Document />
								</el-icon>
								<span>基本信息</span>
							</div>
						</template>

						<div v-loading="complaintDetailLoading">
							<el-row :gutter="16" class="info-row" >
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">投诉类型</span>
										<span class="info-value">{{ formatReportType(complaintDetail?.category) }}</span>
									</div>
								</el-col>
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">投诉来源</span>
										<span class="info-value">{{ formatReportSource(complaintDetail?.source) }}</span>
									</div>
								</el-col>
							</el-row>

							<el-row :gutter="16" class="info-row">
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">投诉区域</span>
										<span class="info-value">{{ complaintDetail?.area }}</span>
									</div>
								</el-col>
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">负责人</span>
										<span class="info-value">{{ complaintDetail?.assignee ?? '-' }}</span>
									</div>
								</el-col>
							</el-row>
						</div>
					</el-card>

					<!-- 投诉内容 -->
					<el-card shadow="never" class="info-card mt-4">
						<template #header>
							<div class="card-header">
								<el-icon>
									<ele-ChatDotRound />
								</el-icon>
								<span>投诉内容</span>
							</div>
						</template>
						<div class="complaint-content" v-loading="complaintDetailLoading">
							{{ complaintDetail?.content ?? '' }}
						</div>
					</el-card>

					<!-- 处理记录 -->
					<el-card shadow="never" class="info-card mt-4">
						<template #header>
							<div class="card-header">
								<el-icon>
									<ele-Clock />
								</el-icon>
								<span>处理记录</span>
							</div>
						</template>
						<el-timeline v-loading="isComplaintResolveLoading">
							<el-timeline-item v-for="(record, index) in complaintResolveList" :key="index">
								<div class="timeline-content">
									<div class="timeline-header">
										<span class="timeline-title">{{ formatReportStatus(record.status) }}</span>
										<span class="timeline-operator">by {{ record.operator }}</span>
									</div>
									<p class="timeline-desc">{{ record.description }}</p>
									<span class="timeline-time">{{ record.createdAt }}</span>
								</div>
							</el-timeline-item>
						</el-timeline>
					</el-card>
				</el-col>

				<!-- 右侧投诉人信息 -->
				<el-col :span="10">
					<el-card shadow="never" class="info-card">
						<template #header>
							<div class="card-header">
								<el-icon>
									<ele-User />
								</el-icon>
								<span>投诉人信息</span>
							</div>
						</template>

						<div class="complainant-info">
							<div class="complainant-name">{{ complaintDetail?.complainantName ?? '-' }}</div>
							<div class="complainant-contact">
								<el-icon>
									<ele-Phone />
								</el-icon>
								<span>{{ complaintDetail?.contact ?? '暂无' }}</span>
							</div>
							<div class="complainant-area">
								<el-icon>
									<ele-Location />
								</el-icon>
								<span>{{ complaintDetail?.area ?? '-' }}</span>
							</div>
						</div>
					</el-card>

					<!-- 处理操作区域 -->
					<el-card shadow="never" class="info-card mt-4" v-if="!showUpdateForm">
						<template #header>
							<div class="card-header">
								<el-icon>
									<ele-Warning />
								</el-icon>
								<span>处理操作</span>
							</div>
						</template>

						<div class="process-info">
							<div class="current-status">
								<span class="status-label">当前状态</span>
								<div class="status-value">{{ formatReportStatus(currentResolveStatus?.status) }}</div>
							</div>

							<div class="process-note">
								<span class="note-label">处理备注</span>
								<div class="note-content">{{ currentResolveStatus?.description }}</div>
							</div>

							<el-button type="primary" size="large" class="update-btn" @click="showUpdateForm = true"> 更新处理状态 </el-button>
						</div>
					</el-card>

					<!-- 更新处理状态表单 -->
					<el-card shadow="never" class="info-card mt-4" v-else>
						<template #header>
							<div class="card-header">
								<el-icon>
									<ele-Warning />
								</el-icon>
								<span>处理操作</span>
							</div>
						</template>

						<div class="update-form">
							<div class="form-item">
								<span class="form-label">更新状态</span>
								<el-select v-model="formComplaintResolve.status" placeholder="选择状态" style="width: 100%">
									<el-option label="待处理" value="pending" />
									<el-option label="处理中" value="processing" />
									<el-option label="已完成" value="completed" />
								</el-select>
							</div>

							<div class="form-item">
								<span class="form-label">处理备注</span>
								<el-input
									v-model="formComplaintResolve.description"
									type="textarea"
									:rows="4"
									placeholder="请输入处理备注..."
									maxlength="500"
									show-word-limit
								/>
							</div>

							<div class="form-actions">
								<el-button type="primary" :loading="createComplaintResolveLoading" @click="createComplaintResolve">
									<el-icon>
										<ele-Document />
									</el-icon>
									保存
								</el-button>
								<el-button @click="handleCancelUpdate">取消</el-button>
							</div>
						</div>
					</el-card>
				</el-col>
			</el-row>
		</div>
	</el-dialog>
</template>

<style scoped lang="scss">
.complaint-detail {
	.complaint-header {
		border-bottom: 1px solid #ebeef5;
		padding-bottom: 16px;
		margin-bottom: 16px;

		.complaint-id {
			display: flex;
			align-items: center;
			margin-bottom: 8px;

			.id-text {
				font-size: 18px;
				font-weight: bold;
				color: #409eff;
			}
		}

		.complaint-title {
			font-size: 20px;
			font-weight: 600;
			color: #303133;
			margin: 8px 0;
		}

		.complaint-time {
			display: flex;
			align-items: center;
			color: #909399;
			font-size: 14px;

			.el-icon {
				margin-right: 4px;
			}
		}
	}

	.info-card {
		border: 1px solid #ebeef5;
		border-radius: 8px;

		.card-header {
			display: flex;
			align-items: center;
			font-weight: 600;
			color: #303133;

			.el-icon {
				margin-right: 8px;
				color: #409eff;
			}
		}

		.info-row {
			margin-bottom: 16px;

			&:last-child {
				margin-bottom: 0;
			}
		}

		.info-item {
			display: flex;
			flex-direction: column;
			margin-bottom: 12px;

			.info-label {
				font-size: 14px;
				color: #909399;
				margin-bottom: 4px;
			}

			.info-value {
				min-height: 20px;
				font-size: 14px;
				color: #303133;
				font-weight: 500;
			}
		}

		.complaint-content {
			padding: 16px;
			background-color: #f8f9fa;
			border-radius: 6px;
			line-height: 1.6;
			color: #303133;
			min-height: 80px;
		}
	}

	.complainant-info {
		text-align: center;
		padding: 20px;

		.complainant-name {
			font-size: 24px;
			font-weight: 600;
			color: #303133;
			margin-bottom: 16px;
		}

		.complainant-contact,
		.complainant-area {
			display: flex;
			align-items: center;
			justify-content: center;
			margin-bottom: 12px;
			color: #606266;

			.el-icon {
				margin-right: 8px;
				color: #909399;
			}
		}
	}

	.process-info {
		padding: 20px;

		.current-status {
			margin-bottom: 20px;

			.status-label {
				font-size: 14px;
				color: #909399;
				display: block;
				margin-bottom: 8px;
			}

			.status-value {
				font-size: 18px;
				font-weight: 600;
				color: #303133;
			}
		}

		.process-note {
			margin-bottom: 24px;

			.note-label {
				font-size: 14px;
				color: #909399;
				display: block;
				margin-bottom: 8px;
			}

			.note-content {
				padding: 12px;
				background-color: #f8f9fa;
				border-radius: 6px;
				color: #606266;
				line-height: 1.5;
				min-height: 60px;
			}
		}

		.update-btn {
			width: 100%;
			height: 48px;
			font-size: 16px;
			font-weight: 600;
			//background-color: #303133;
			//border-color: #303133;
			//
			//&:hover {
			//	background-color: #404040;
			//	border-color: #404040;
			//}
		}
	}

	.update-form {
		padding: 20px;

		.form-item {
			margin-bottom: 20px;

			.form-label {
				font-size: 14px;
				color: #303133;
				font-weight: 500;
				display: block;
				margin-bottom: 8px;
			}
		}

		.form-actions {
			display: flex;
			gap: 12px;
			margin-top: 24px;

			.el-button {
				flex: 1;
				height: 40px;
			}
		}
	}

	.timeline-content {
		flex: 1;
		padding-bottom: 16px;

		.timeline-header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 4px;

			.timeline-title {
				font-size: 14px;
				font-weight: 500;
				color: #303133;
			}

			.timeline-operator {
				font-size: 12px;
				color: #909399;
			}
		}

		.timeline-desc {
			margin: 0 0 4px 0;
			color: #606266;
			line-height: 1.5;
			font-size: 14px;
		}

		.timeline-time {
			font-size: 12px;
			color: #c0c4cc;
		}
	}
}
</style>

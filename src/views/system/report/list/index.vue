<script setup lang="ts">
import { ref, onMounted, getCurrentInstance, unref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete, Download, View, Edit } from '@element-plus/icons-vue'
import { useLoading } from '/@/utils/loading-util'
import complaints from '/@/api/system/report/complaints'
import type { ComplaintListItem, ComplaintQueryParams } from '/@/api/system/report/type'
import system from '/@/api/system'
import { useAsyncState } from '@vueuse/core'

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

const formatReportStatus = (value: ComplaintListItem['status']) => {
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
const tableData = ref<ComplaintListItem[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const queryRef = ref()

// 查询参数
const queryParams = ref<ComplaintQueryParams>({
	pageNum: 1,
	pageSize: 20,
})

// 获取列表数据
const { loading, doLoading: getComplaintList } = useLoading(async () => {
	const data = await complaints.getList(queryParams.value).catch(() => undefined)

	if (!data) {
		return
	}

	tableData.value = data.list
	total.value = data.total
})

// 事件处理
const handleSearch = () => {
	queryParams.value.pageNum = 1
	getComplaintList()
}

const handlePageChange = ({page,limit}: {page: number, limit: number}) => {
	queryParams.value.pageNum = page
	queryParams.value.pageSize = limit
	getComplaintList()
}

const handleSelectionChange = (selection: ComplaintListItem[]) => {
	selectedIds.value = selection.map((item) => item.id)
}

const handleAdd = () => {
	ElMessage.info('新增投诉功能开发中...')
}

const handleDetail = (row: ComplaintListItem) => {
	ElMessage.info(`查看投诉详情: ${row.title}`)
}

const handleEdit = (row: ComplaintListItem) => {
	ElMessage.info(`编辑投诉: ${row.title}`)
}

const handleDeleteSingle = async (row: ComplaintListItem) => {
	const status = await ElMessageBox.confirm(`确定要删除投诉 "${row.title}" 吗？`, '提示', {
		confirmButtonText: '确定',
		cancelButtonText: '取消',
		type: 'warning',
	})

	if (status !== 'confirm') {
		return
	}

	const result = await complaints
		.del([row.id])
		.then(() => true)
		.catch(() => false)

	if (result) {
		ElMessage.success('删除成功')
		await getComplaintList()
	}
}

const handleDelete = async () => {
	if (selectedIds.value.length === 0) {
		ElMessage.warning('请选择要删除的数据')
		return
	}

	const status = await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条投诉吗？`, '提示', {
		confirmButtonText: '确定',
		cancelButtonText: '取消',
		type: 'warning',
	})

	if (status!== 'confirm') {
		return
	}

	const result = await complaints
		.del(selectedIds.value)
		.then(() => true)
		.catch(() => false)

	if (result) {
		ElMessage.success('删除成功')
		await getComplaintList()
	}
}

const handleExport = () => {
	ElMessage.info('导出功能开发中...')
}

// 初始化
onMounted(() => {
	getComplaintList()
})

type SimpleUser = {
	id: number
	userNickname: string
}

//用户获取
const { state: userList ,isLoading: isLoadingUserList,execute: loadingUserList } = useAsyncState<SimpleUser[]>(async (name: string) => {
	const data = await system.user.getList({ keyWords: name }).catch(() => undefined)

	if (data === undefined) {
		return []
	}

	return data.list
}, [])
</script>

<template>
	<div class="page">
		<el-card shadow="never">
			<!-- 搜索和筛选区域 -->
			<el-form :model="queryParams" ref="queryRef" inline class="mb-4">
				<el-form-item>
					<el-input
						v-model="queryParams.name"
						placeholder="输入名称搜索设备"
						clearable
						style="width: 300px"
						:prefix-icon="Search"
						@keyup.enter="handleSearch"
					/>
				</el-form-item>
				<el-form-item>
					<el-select v-model="queryParams.status" placeholder="状态" style="width: 120px">
						<el-option label="全部" value="" />
						<el-option label="待处理" value="pending" />
						<el-option label="处理中" value="processing" />
						<el-option label="已完成" value="completed" />
					</el-select>
				</el-form-item>
				<el-form-item>
					<el-select v-model="queryParams.category" placeholder="分类" style="width: 120px">
						<el-option label="全部" value="" />
						<el-option v-for="i in report_type" :label="i.label" :value="i.value" :key="i.value" />
					</el-select>
				</el-form-item>
				<el-form-item>
					<el-select v-model="queryParams.level" placeholder="等级" style="width: 120px">
						<el-option label="全部" value="" />
						<el-option v-for="i in report_level" :label="i.label" :value="i.value" :key="i.value"></el-option>
					</el-select>
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="handleSearch">
						<el-icon>
							<Search />
						</el-icon>
						查询
					</el-button>
				</el-form-item>
			</el-form>

			<!-- 操作按钮区域 -->
			<div class="flex justify-between items-center mb-4">
				<div class="flex gap-2">
					<el-button type="primary" @click="handleAdd">
						<el-icon>
							<Plus />
						</el-icon>
						新增投诉
					</el-button>
					<el-button @click="handleDelete" :disabled="selectedIds.length === 0">
						<el-icon>
							<Delete />
						</el-icon>
						删除
					</el-button>
					<el-button @click="handleExport">
						<el-icon>
							<Download />
						</el-icon>
						导出
					</el-button>
				</div>
			</div>

			<!-- 表格 -->
			<el-table :data="tableData" v-loading="loading" @selection-change="handleSelectionChange" style="width: 100%">
				<el-table-column type="selection" width="55" align="center" />
				<el-table-column prop="id" label="标识" width="100" align="center">
					<template #default="{ row }">
						<div class="flex items-center">
							<div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
							<span class="text-blue-600">#{{ row.id }}</span>
						</div>
					</template>
				</el-table-column>
				<el-table-column prop="title" label="投诉标题" min-width="200" show-overflow-tooltip />
				<el-table-column prop="category" label="投诉类型" width="120" align="center">
					<template #default="{ row }: { row: ComplaintListItem }">
						<span>{{ formatReportType(row.category) }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="area" label="区域" width="80" align="center" />
				<el-table-column prop="level" label="等级" width="80" align="center">
					<template #default="{ row }: { row: ComplaintListItem }">
						<span>{{ formatReportLevel(row.level) }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="status" label="状态" width="100" align="center">
					<template #default="{ row }: { row: ComplaintListItem }">
						<span>{{ formatReportStatus(row.status) }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="updatedAt" label="最后更新时间" width="180" align="center" />
				<el-table-column prop="assignee" label="分配给" width="120" align="center" />
				<el-table-column label="操作" width="200" align="center" fixed="right">
					<template #default="{ row }">
						<el-button size="small" type="primary" link @click="handleDetail(row)">
							<el-icon>
								<View />
							</el-icon>
							详情
						</el-button>
						<el-button size="small" type="warning" link @click="handleEdit(row)">
							<el-icon>
								<Edit />
							</el-icon>
							修改
						</el-button>
						<el-button size="small" type="danger" link @click="handleDeleteSingle(row)">
							<el-icon>
								<Delete />
							</el-icon>
							删除
						</el-button>
					</template>
				</el-table-column>
			</el-table>

			<pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="handlePageChange" />

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

.flex {
	display: flex;
}

.justify-between {
	justify-content: space-between;
}

.items-center {
	align-items: center;
}

.gap-2 > * + * {
	margin-left: 8px;
}

.mb-4 {
	margin-bottom: 16px;
}

.mt-4 {
	margin-top: 16px;
}

.text-gray-500 {
	color: #909399;
}

.text-gray-400 {
	color: #c0c4cc;
}

.text-blue-600 {
	color: #409eff;
}

.mx-2 {
	margin-left: 8px;
	margin-right: 8px;
}

.mr-2 {
	margin-right: 8px;
}

.w-2 {
	width: 8px;
}

.h-2 {
	height: 8px;
}

.bg-blue-500 {
	background-color: #409eff;
}

.rounded-full {
	border-radius: 50%;
}

.text-sm {
	font-size: 12px;
}
</style>

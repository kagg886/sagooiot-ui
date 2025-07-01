<script setup lang="ts">
import { ref, onMounted, getCurrentInstance, unref, computed, toRefs } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete, View, Edit } from '@element-plus/icons-vue'
import { useLoading } from '/@/utils/loading-util'
import complaints from '/@/api/system/report/complaints'
import feedback_api from '/@/api/system/report/feedback'
import complaint_resolve_history from '/@/api/system/report/complaint-resolve-history'
import {
	ComplaintQueryParams,
	CreateComplaintRequest,
	ComplaintArea,
	UpdateComplaintRequest,
	Complaint,
	FeedbackCreateParams,
	ComplaintResolveHistoryInsertRequest,
} from '/@/api/system/report/type'
import system from '/@/api/system'
import { useAsyncState } from '@vueuse/core'
import { useRoute } from 'vue-router'

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
const tableData = ref<Complaint[]>([])
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

const handlePageChange = ({ page, limit }: { page: number; limit: number }) => {
	queryParams.value.pageNum = page
	queryParams.value.pageSize = limit
	getComplaintList()
}

const handleSelectionChange = (selection: Complaint[]) => {
	selectedIds.value = selection.map((item) => item.id)
}

// 新增投诉相关
const addDialogVisible = ref(false)
const addFormRef = ref()
const addForm = ref<CreateComplaintRequest>({
	title: '',
	category: '',
	source: '',
	area: 'A区' as ComplaintArea,
	complainantName: '',
	contact: '',
	level: '',
	content: '',
	assignee: undefined,
})

// 表单验证规则
const addFormRules = {
	title: [{ required: true, message: '请输入投诉标题', trigger: 'blur' }],
	category: [{ required: true, message: '请选择投诉类型', trigger: 'change' }],
	source: [{ required: true, message: '请选择投诉来源', trigger: 'change' }],
	area: [{ required: true, message: '请选择投诉区域', trigger: 'change' }],
	complainantName: [{ required: true, message: '请输入投诉人姓名', trigger: 'blur' }],
	level: [{ required: true, message: '请选择投诉等级', trigger: 'change' }],
	content: [{ required: true, message: '请输入投诉内容', trigger: 'blur' }],
}

const handleAdd = () => {
	addDialogVisible.value = true
}

const handleAddCancel = () => {
	addDialogVisible.value = false
	addFormRef.value?.resetFields()
}

const handleAddConfirm = async () => {
	const valid = await addFormRef.value?.validate().catch(() => false)
	if (!valid) {
		return
	}

	const result = await complaints
		.add(addForm.value)
		.then(() => true)
		.catch(() => false)

	if (result) {
		ElMessage.success('新增投诉成功')
		addDialogVisible.value = false
		addFormRef.value?.resetFields()
		await getComplaintList()
	} else {
		ElMessage.error('新增投诉失败')
	}
}

//修改投诉相关
const editDialogVisible = ref(false)
const editFormRef = ref()
const editForm = ref<UpdateComplaintRequest | undefined>(undefined)
const editFormRules = {
	title: [{ required: true, message: '请输入投诉标题', trigger: 'blur' }],
	category: [{ required: true, message: '请选择投诉类型', trigger: 'change' }],
	source: [{ required: true, message: '请选择投诉来源', trigger: 'change' }],
	area: [{ required: true, message: '请选择投诉区域', trigger: 'change' }],
	complainantName: [{ required: true, message: '请输入投诉人姓名', trigger: 'blur' }],
	level: [{ required: true, message: '请选择投诉等级', trigger: 'change' }],
	content: [{ required: true, message: '请输入投诉内容', trigger: 'blur' }],
}

const currentLoadingEdit = ref(-1)
const { loading: loadingEdit, doLoading: handleEdit } = useLoading(async (id: number) => {
	currentLoadingEdit.value = id
	const data = await complaints.detail(id).catch(() => undefined)
	if (!data) {
		return
	}
	editForm.value = data
	editDialogVisible.value = true
})

const handleEditCancel = () => {
	editDialogVisible.value = false
	editFormRef.value?.resetFields()
	currentLoadingEdit.value = -1
}

const handleEditConfirm = async () => {
	const valid = await editFormRef.value?.validate().catch(() => false)
	if (!valid) {
		return
	}
	const data = editForm.value
	if (!data) {
		return
	}
	const result = await complaints
		.edit(data)
		.then(() => true)
		.catch(() => false)

	if (result) {
		ElMessage.success('修改投诉成功')
		editDialogVisible.value = false
		editFormRef.value?.resetFields()

		await getComplaintList()
	}
}
const handleDeleteSingle = async (row: Complaint) => {
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

	if (status !== 'confirm') {
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

// 初始化
onMounted(() => {
	getComplaintList()
})

type SimpleUser = {
	id: number
	userNickname: string
}

//用户获取
const {
	state: userList,
	isLoading: isLoadingUserList,
	execute: loadingUserList,
} = useAsyncState<SimpleUser[]>(async (name: string) => {
	//为了防止默认情况下的用户列表不存在已经分配的用户，需要提前获取这个用户的bean。
	const user_id = editForm.value?.assignee ?? undefined

	const [origin_user, data]: [origin_user: SimpleUser | undefined, data: SimpleUser[]] = await Promise.all([
		user_id === undefined ? Promise.resolve(undefined) : system.user.detail(user_id).catch(() => undefined),
		system.user
			.getList({ keyWords: name, status: 1 })
			.then((res: { list: SimpleUser[] }) => res.list)
			.catch(() => []),
	])

	if (data.length === 0) {
		return origin_user !== undefined ? [origin_user] : []
	}

	if (data.filter((item) => item.id === origin_user?.id).length !== 0) {
		return data
	}

	if (origin_user !== undefined) {
		return [origin_user, ...data]
	} else {
		return data
	}
}, [])

const feedback = ref(false)
const feedFormRef = ref()
const feedCreateForm = ref<Omit<FeedbackCreateParams, 'surveyCode'>>({
	contactInfo: '',
	investigatorName: '',
	ticketNo: 0,
	processingSpeed: '',
	staffAttitude: '',
	resolutionEffect: '',
	otherSuggestions: '',
})

// 反馈表单验证规则
const feedFormRules = {
	surveyCode: [{ required: true, message: '请输入问卷编号', trigger: 'blur' }],
	investigatorName: [{ required: true, message: '请输入调查者姓名', trigger: 'blur' }],
	contactInfo: [
		{ required: true, message: '请输入联系信息', trigger: 'blur' },
		{ pattern: /^(1[3-9]\d{9}|[\w.-]+@[\w.-]+\.\w+)$/, message: '请输入正确的手机号或邮箱', trigger: 'blur' },
	],
	processingSpeed: [{ required: true, message: '请选择处理速度评价', trigger: 'change' }],
	staffAttitude: [{ required: true, message: '请选择工作人员态度评价', trigger: 'change' }],
	resolutionEffect: [{ required: true, message: '请选择解决效果评价', trigger: 'change' }],
}

//投诉等级，投诉来源，投诉类型
const {
	related_level,
}: {
	[key: string]: Array<{
		label: string
		value: string
	}>
} = proxy.useDict('related_level')

const handleFeedback = (row: Complaint) => {
	// 重置表单
	feedFormRef.value?.resetFields()
	// 设置投诉编号（不可修改）
	feedCreateForm.value.ticketNo = row.id
	// 清空其他字段
	feedCreateForm.value = {
		...feedCreateForm.value,
		contactInfo: '',
		investigatorName: '',
		processingSpeed: '',
		staffAttitude: '',
		resolutionEffect: '',
		otherSuggestions: '',
	}
	feedback.value = true
}

// 取消反馈
const handleFeedbackCancel = () => {
	feedback.value = false
	feedFormRef.value?.resetFields()
}

const { loading: createFeedbackLoading, doLoading: createFeedback } = useLoading(async () => {
	const valid = await feedFormRef.value?.validate().catch(() => false)
	if (!valid) {
		return
	}

	const result = await feedback_api
		.create({ surveyCode: `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDay()}-${(Math.random() * 100000).toFixed(0)}`, ...feedCreateForm.value })
		.then(() => true)
		.catch(() => false)

	if (result) {
		ElMessage.success('反馈成功')
	}
	handleFeedbackCancel()
})

//反馈详情
//如果路由有参数就直接获取

const {query} = toRefs(useRoute())

onMounted(async ()=> {
	if (query.value["id"]) {
		const result = await complaints.detail(Number(query.value["id"]))
			.catch(()=>undefined)

		if (result === undefined) {
			return
		}

		handleDetail(result)
	}
})

const complaintDetailDialogShow = ref(false)
const complaintDetail = ref<Complaint | undefined>(undefined)
const {
	state: complaintResolveList,
	isLoading: isComplaintResolveLoading,
	execute: getComplaintResolveList,
} = useAsyncState(async (id: number) => complaint_resolve_history.list(id), [], { immediate: false })

const currentResolveStatus = computed(() => complaintResolveList.value.at(-1) ?? undefined)

const showUpdateForm = ref(false)

const handleDetail = (row: Complaint) => {
	complaintDetail.value = row
	showUpdateForm.value = false
	getComplaintResolveList(0, row.id).then(() => (complaintDetailDialogShow.value = true))
}

const handleCancelUpdate = () => {
	showUpdateForm.value = false
	formComplaintResolve.value = {
		description: '',
		status: 'processing',
	}
}

const formComplaintResolve = ref<Omit<ComplaintResolveHistoryInsertRequest, 'ticketNo'>>({
	description: '',
	status: 'processing',
})

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
	await getComplaintResolveList(0, complaintDetail.value?.id!)
})
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
				</div>
			</div>

			<!-- 表格 -->
			<el-table :data="tableData" v-loading="loading" @selection-change="handleSelectionChange" style="width: 100%">
				<el-table-column type="selection" width="55" align="center" />
				<el-table-column prop="id" label="标识" width="160" align="center">
					<template #default="{ row }">
						<div class="flex items-center">
							<div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
							<span class="text-blue-600">#{{ row.id }}</span>
						</div>
					</template>
				</el-table-column>
				<el-table-column prop="title" label="投诉标题" min-width="200" show-overflow-tooltip />
				<el-table-column prop="category" label="投诉类型" width="120" align="center">
					<template #default="{ row }: { row: Complaint }">
						<span>{{ formatReportType(row.category) }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="area" label="区域" width="80" align="center" />
				<el-table-column prop="level" label="等级" width="80" align="center">
					<template #default="{ row }: { row: Complaint }">
						<span>{{ formatReportLevel(row.level) }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="status" label="状态" width="100" align="center">
					<template #default="{ row }: { row: Complaint }">
						<span>{{ formatReportStatus(row.status) }}</span>
					</template>
				</el-table-column>
				<el-table-column prop="updatedAt" label="最后更新时间" width="180" align="center" />
				<el-table-column prop="assignee" label="分配给" width="120" align="center" />
				<el-table-column label="操作" width="300" align="center" fixed="right">
					<template #default="{ row }: { row: Complaint }">
						<el-button
							size="small"
							type="primary"
							link
							@click="handleDetail(row)"
							:loading="isComplaintResolveLoading && complaintDetail?.id == row.id"
						>
							<el-icon>
								<View />
							</el-icon>
							详情
						</el-button>
						<el-button size="small" type="warning" link @click="handleEdit(row.id)" :loading="row.id == currentLoadingEdit && loadingEdit">
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

						<el-button size="small" type="info" link @click="handleFeedback(row)">
							<el-icon>
								<Search />
							</el-icon>
							反馈
						</el-button>
					</template>
				</el-table-column>
			</el-table>

			<pagination
				v-show="total > 0"
				:total="total"
				v-model:page="queryParams.pageNum"
				v-model:limit="queryParams.pageSize"
				@pagination="handlePageChange"
			/>
		</el-card>

		<!-- 新增投诉对话框 -->
		<el-dialog v-model="addDialogVisible" title="新建投诉" width="600px" :close-on-click-modal="false">
			<el-form ref="addFormRef" :model="addForm" :rules="addFormRules" label-width="100px" label-position="left">
				<el-form-item label="投诉标题" prop="title" required>
					<el-input v-model="addForm.title" placeholder="请输入投诉标题" maxlength="100" show-word-limit />
				</el-form-item>

				<el-form-item label="投诉类型" prop="category" required>
					<el-select v-model="addForm.category" placeholder="选择投诉类型" style="width: 100%">
						<el-option v-for="item in report_type" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>

				<el-form-item label="投诉来源" prop="source" required>
					<el-select v-model="addForm.source" placeholder="选择投诉来源" style="width: 100%">
						<el-option v-for="item in report_source" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>

				<el-form-item label="投诉区域" prop="area" required>
					<el-select v-model="addForm.area" placeholder="选择投诉区域" style="width: 100%">
						<el-option label="A区" value="A区" />
						<el-option label="B区" value="B区" />
					</el-select>
				</el-form-item>

				<el-form-item label="投诉人姓名" prop="complainantName" required>
					<el-input v-model="addForm.complainantName" placeholder="请输入投诉人姓名" maxlength="50" />
				</el-form-item>

				<el-form-item label="联系方式" prop="contact">
					<el-input v-model="addForm.contact" placeholder="请输入联系电话或邮箱" maxlength="50" />
				</el-form-item>

				<el-form-item label="投诉等级" prop="level" required>
					<el-radio-group v-model="addForm.level">
						<el-radio v-for="item in report_level" :label="item.value" :key="item.value">
							<span>{{ item.label }}</span>
						</el-radio>
					</el-radio-group>
				</el-form-item>

				<el-form-item label="投诉内容" prop="content" required>
					<el-input v-model="addForm.content" type="textarea" :rows="4" placeholder="请详细描述投诉内容..." maxlength="500" show-word-limit />
				</el-form-item>

				<el-form-item label="指派负责人" prop="assignee">
					<el-select
						v-model="addForm.assignee"
						placeholder="选择负责人"
						style="width: 100%"
						filterable
						remote
						:remote-method="(data: string) => loadingUserList(100,data)"
						:loading="isLoadingUserList"
						clearable
					>
						<el-option v-for="user in userList" :key="user.id" :label="user.userNickname" :value="user.id" />
					</el-select>
				</el-form-item>
			</el-form>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="handleAddCancel">取消</el-button>
					<el-button type="primary" @click="handleAddConfirm">
						<el-icon>
							<Plus />
						</el-icon>
						提交投诉
					</el-button>
					<el-button @click="handleAddCancel">保存草稿</el-button>
				</div>
			</template>
		</el-dialog>

		<!-- 编辑投诉对话框 -->
		<el-dialog v-model="editDialogVisible" title="编辑投诉" width="700px" :close-on-click-modal="false">
			<el-form ref="editFormRef" :model="editForm" :rules="editFormRules" label-width="100px" label-position="left">
				<el-row :gutter="35">
					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12" >
						<el-form-item label="投诉标题" prop="title" required>
							<el-input v-model="editForm.title" placeholder="请输入投诉标题" maxlength="100" show-word-limit />
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉类型" prop="category" required>
							<el-select v-model="editForm.category" placeholder="选择投诉类型" style="width: 100%">
								<el-option v-for="item in report_type" :key="item.value" :label="item.label" :value="item.value" />
							</el-select>
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉来源" prop="source" required>
							<el-select v-model="editForm.source" placeholder="选择投诉来源" style="width: 100%">
								<el-option v-for="item in report_source" :key="item.value" :label="item.label" :value="item.value" />
							</el-select>
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉区域" prop="area" required>
							<el-select v-model="editForm.area" placeholder="选择投诉区域" style="width: 100%">
								<el-option label="A区" value="A区" />
								<el-option label="B区" value="B区" />
							</el-select>
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉人姓名" prop="complainantName" required>
							<el-input v-model="editForm.complainantName" placeholder="请输入投诉人姓名" maxlength="50" />
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="联系方式" prop="contact">
							<el-input v-model="editForm.contact" placeholder="请输入联系电话或邮箱" maxlength="50" />
						</el-form-item>
					</el-col>
				</el-row>

				<el-form-item label="投诉等级" prop="level" required>
					<el-radio-group v-model="editForm.level">
						<el-radio v-for="item in report_level" :label="item.value" :key="item.value">
							<span>{{ item.label }}</span>
						</el-radio>
					</el-radio-group>
				</el-form-item>

				<el-form-item label="投诉内容" prop="content" required>
					<el-input v-model="editForm.content" type="textarea" :rows="4" placeholder="请详细描述投诉内容..." maxlength="500" show-word-limit />
				</el-form-item>
				<el-form-item label="指派负责人" prop="assignee">
					<el-select
						v-model="editForm.assignee"
						placeholder="选择负责人"
						style="width: 100%"
						filterable
						remote
						:remote-method="(data: string) => loadingUserList(100,data)"
						:loading="isLoadingUserList"
						clearable
					>
						<el-option v-for="user in userList" :key="user.id" :label="user.userNickname" :value="user.id" />
					</el-select>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="handleEditCancel">取消</el-button>
					<el-button type="primary" @click="handleEditConfirm">
						<el-icon>
							<ele-Check />
						</el-icon>
						提交修改
					</el-button>
					<el-button @click="handleEditCancel">保存草稿</el-button>
				</div>
			</template>
		</el-dialog>

		<!-- 反馈对话框 -->
		<el-dialog v-model="feedback" title="投诉反馈" width="700px" :close-on-click-modal="false">
			<el-form ref="feedFormRef" :model="feedCreateForm" :rules="feedFormRules" label-width="120px" label-position="left">
<!--				<el-form-item label="问卷编号" prop="surveyCode" required>-->
<!--					<el-input v-model="feedCreateForm.surveyCode" placeholder="请输入问卷编号" maxlength="50" />-->
<!--				</el-form-item>-->

<!--				<el-form-item label="投诉编号" prop="ticketNo">-->
<!--					<el-input v-model="feedCreateForm.ticketNo" placeholder="投诉编号" disabled />-->
<!--				</el-form-item>-->
				<div style="display: flex">
					<div style="flex: 1">
						<el-form-item label="调查者姓名" prop="investigatorName" required>
							<el-input v-model="feedCreateForm.investigatorName" placeholder="请输入调查者姓名" maxlength="50" />
						</el-form-item>
					</div>
					<div style="width: 32px"></div>
					<div style="flex: 1">
						<el-form-item label="联系信息" prop="contactInfo" required>
							<el-input v-model="feedCreateForm.contactInfo" placeholder="请输入联系电话或邮箱" maxlength="100" />
						</el-form-item>
					</div>
				</div>



				<el-form-item label="处理速度" prop="processingSpeed" required>
					<el-radio-group v-model="feedCreateForm.processingSpeed">
						<el-radio v-for="item in related_level" :label="item.value" :key="item.value">
							<span>{{ item.label }}</span>
						</el-radio>
					</el-radio-group>
					<!--					<el-select v-model="feedCreateForm.processingSpeed" placeholder="请选择处理速度评价" style="width: 100%">-->
					<!--						<el-option v-for="item in related_level" :key="item.value" :label="item.label" :value="item.value" />-->
					<!--					</el-select>-->
				</el-form-item>

				<el-form-item label="工作人员态度" prop="staffAttitude" required>
					<el-radio-group v-model="feedCreateForm.staffAttitude">
						<el-radio v-for="item in related_level" :label="item.value" :key="item.value">
							<span>{{ item.label }}</span>
						</el-radio>
					</el-radio-group>
					<!--					<el-select v-model="feedCreateForm.staffAttitude" placeholder="请选择工作人员态度评价" style="width: 100%">-->
					<!--						<el-option v-for="item in related_level" :key="item.value" :label="item.label" :value="item.value" />-->
					<!--					</el-select>-->
				</el-form-item>

				<el-form-item label="解决效果" prop="resolutionEffect" required>
					<el-radio-group v-model="feedCreateForm.resolutionEffect">
						<el-radio v-for="item in related_level" :label="item.value" :key="item.value">
							<span>{{ item.label }}</span>
						</el-radio>
					</el-radio-group>
					<!--					<el-select v-model="feedCreateForm.resolutionEffect" placeholder="请选择解决效果评价" style="width: 100%">-->
					<!--						<el-option v-for="item in related_level" :key="item.value" :label="item.label" :value="item.value" />-->
					<!--					</el-select>-->
				</el-form-item>

				<el-form-item label="其他建议" prop="otherSuggestions">
					<el-input
						v-model="feedCreateForm.otherSuggestions"
						type="textarea"
						:rows="4"
						placeholder="请输入其他建议..."
						maxlength="500"
						show-word-limit
					/>
				</el-form-item>
			</el-form>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="handleFeedbackCancel">取消</el-button>
					<el-button type="primary" @click="createFeedback" :loading="createFeedbackLoading">
						<el-icon>
							<Plus />
						</el-icon>
						提交反馈
					</el-button>
				</div>
			</template>
		</el-dialog>

		<el-dialog v-model="complaintDetailDialogShow" title="投诉详情" width="800px" :close-on-click-modal="false">
			<div v-if="complaintDetail" class="complaint-detail">
				<!-- 头部信息 -->
				<div class="complaint-header">
					<div class="complaint-id">
						<span class="id-text">#{{ complaintDetail.id }}</span>
						<el-tag :type="complaintDetail.level === '1' ? 'danger' : complaintDetail.level === '2' ? 'warning' : 'info'" class="ml-2">
							{{ formatReportLevel(complaintDetail.level) }}
						</el-tag>
						<el-tag
							:type="complaintDetail.status === 'pending' ? 'info' : complaintDetail.status === 'processing' ? 'warning' : 'success'"
							class="ml-2"
						>
							{{ formatReportStatus(complaintDetail.status) }}
						</el-tag>
					</div>
					<h2 class="complaint-title">{{ complaintDetail.title }}</h2>
					<div class="complaint-time">
						<el-icon>
							<ele-Clock />
						</el-icon>
						<span>创建时间：{{ complaintDetail.createdAt }}</span>
						<el-icon class="ml-4">
							<ele-Refresh />
						</el-icon>
						<span>更新时间：{{ complaintDetail.updatedAt }}</span>
					</div>
				</div>

				<el-row :gutter="20" class="mt-4">
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

							<el-row :gutter="16" class="info-row">
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">投诉类型</span>
										<span class="info-value">{{ formatReportType(complaintDetail.category) }}</span>
									</div>
								</el-col>
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">投诉来源</span>
										<span class="info-value">{{ formatReportSource(complaintDetail.source) }}</span>
									</div>
								</el-col>
							</el-row>

							<el-row :gutter="16" class="info-row">
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">投诉区域</span>
										<span class="info-value">{{ complaintDetail.area }}</span>
									</div>
								</el-col>
								<el-col :span="12">
									<div class="info-item">
										<span class="info-label">负责人</span>
										<span class="info-value">{{ complaintDetail.assignee || '-' }}</span>
									</div>
								</el-col>
							</el-row>
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
							<div class="complaint-content">
								{{ complaintDetail.content }}
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
								<div class="complainant-name">{{ complaintDetail.complainantName }}</div>
								<div class="complainant-contact">
									<el-icon>
										<ele-Phone />
									</el-icon>
									<span>{{ complaintDetail.contact || '暂无' }}</span>
								</div>
								<div class="complainant-area">
									<el-icon>
										<ele-Location />
									</el-icon>
									<span>{{ complaintDetail.area }}</span>
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
									<el-button @click="handleCancelUpdate"> 取消 </el-button>
								</div>
							</div>
						</el-card>
					</el-col>
				</el-row>
			</div>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="complaintDetailDialogShow = false">关闭</el-button>
				</div>
			</template>
		</el-dialog>
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

.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

// 投诉详情样式
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

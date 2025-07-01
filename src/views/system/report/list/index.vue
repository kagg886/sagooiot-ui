<script setup lang="ts">
import { ref, onMounted, getCurrentInstance, unref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete, View, Edit } from '@element-plus/icons-vue'
import { useLoading } from '/@/utils/loading-util'
import complaints from '/@/api/system/report/complaints'
import feedback_api from '/@/api/system/report/feedback'
import {
	ComplaintQueryParams,
	CreateComplaintRequest,
	ComplaintArea,
	UpdateComplaintRequest,
	Complaint,
	FeedbackCreateParams,
} from '/@/api/system/report/type'
import system from '/@/api/system'
import { useAsyncState, useLocalStorage } from '@vueuse/core'
import ReportDetailDialog from '/@/views/system/report/componments/report-detail-dialog.vue'
import { MessageParamsWithType, MessageProps } from 'element-plus/es/components/message/src/message'

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

const formatReportStatusTagType = (value: Complaint['status']) => {
	let type: MessageProps['type'] | undefined = undefined
	switch (value) {
		case 'completed':
			type = 'success'
			break
		case 'pending':
			type = 'info'
			break
		case 'processing':
			type = undefined
			break
	}
	return type
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

//草稿，若有内容则会patch上去
//添加flag的原因是：useLocalStorage不允许初值为undefined
//flag为undefined证明有草稿，否则无草稿。
type CCRWithDemoFlag = Partial<CreateComplaintRequest> & {
	flag: boolean | undefined
}

const demo = useLocalStorage<CCRWithDemoFlag>('system-report-summary-index-demo-params',{
	flag: false
})

onMounted(()=> {
	if (demo.value.flag !== undefined) {
		addForm.value = {
			...(demo.value as CreateComplaintRequest)
		}
	}
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

const handleDemoAdded = () => {
	demo.value = {
		...addForm.value,
		flag: true
	}
	ElMessage.success('草稿已经保存')
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

		//删除草稿
		demo.value = {
			flag: undefined
		}

		//关闭新增对话框
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

const complaintDetailId = ref<number | undefined>(undefined)
const showDetail = ref(false)
const handleDetail = (row: Complaint) => {
	complaintDetailId.value = row.id
	showDetail.value = true
}

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
				<el-table-column prop="id" label="标识" width="160" align="center"/>
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
						<el-tag :type="formatReportStatusTagType(row.status)">{{ formatReportStatus(row.status) }}</el-tag>
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
		<el-dialog v-model="addDialogVisible" title="新建投诉" width="800px" :close-on-click-modal="false">
			<el-form ref="addFormRef" :model="addForm" :rules="addFormRules" label-width="100px" label-position="left">
				<el-row :gutter="35">
					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12" >
						<el-form-item label="投诉标题" prop="title" required>
							<el-input v-model="addForm.title" placeholder="请输入投诉标题" maxlength="100" show-word-limit />
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉类型" prop="category" required>
							<el-select v-model="addForm.category" placeholder="选择投诉类型" style="width: 100%">
								<el-option v-for="item in report_type" :key="item.value" :label="item.label" :value="item.value" />
							</el-select>
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉来源" prop="source" required>
							<el-select v-model="addForm.source" placeholder="选择投诉来源" style="width: 100%">
								<el-option v-for="item in report_source" :key="item.value" :label="item.label" :value="item.value" />
							</el-select>
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉区域" prop="area" required>
							<el-select v-model="addForm.area" placeholder="选择投诉区域" style="width: 100%">
								<el-option label="A区" value="A区" />
								<el-option label="B区" value="B区" />
							</el-select>
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="投诉人姓名" prop="complainantName" required>
							<el-input v-model="addForm.complainantName" placeholder="请输入投诉人姓名" maxlength="50" />
						</el-form-item>
					</el-col>

					<el-col :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
						<el-form-item label="联系方式" prop="contact">
							<el-input v-model="addForm.contact" placeholder="请输入联系电话或邮箱" maxlength="50" />
						</el-form-item>
					</el-col>
				</el-row>
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
						提交投诉
					</el-button>
					<el-button @click="handleDemoAdded">保存草稿</el-button>
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

		<report-detail-dialog :id="complaintDetailId" v-model:visible="showDetail"/>
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
</style>

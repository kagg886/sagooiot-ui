<script setup lang="ts">
import api from '/@/api/system'
import { onMounted, reactive, ref } from 'vue'
import { Exception } from 'sass'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLoading } from '/@/utils/loading-util'
import downloadFile from '/@/utils/download'

// eslint-disable-next-line no-unused-vars
enum StatusEnum {
	// eslint-disable-next-line no-unused-vars
	SUCCESS = 0,
	// eslint-disable-next-line no-unused-vars
	FAILED = 1,
}

type TaskLogSummary = {
	id: number
	jobName: string
	invokeTarget: string
	cronExpression: string
	startTime: string //开始时间
	endTime?: string //结束时间(仅success/failed拥有)
	createdAt: string //创建时间
	status: StatusEnum
}

type TaskLogDetail = TaskLogSummary & {
	exceptionInfo?: string //失败原因(仅failed拥有)
	jobMessage?: string //结果(仅success拥有)
}

//数据搜索部分开始
const searchParam = reactive<{
	pageNum: number
	pageSize: number

	jobName?: string
	dateRange?: string[]
	status?: StatusEnum
}>({
	pageNum: 1,
	PageSize: 10,
})

const total = ref<number>(0)
const data = ref<Array<TaskLogSummary>>([])

const { loading, doLoading: doListLoad } = useLoading(async () => {
	const res: {
		list: TaskLogSummary[];
		total: number
	} = await api.task_log.getList(searchParam).catch((ex: Exception) => {
		// eslint-disable-next-line no-console
		console.log(ex)
		return {
			list: [],
			total: 0,
		}
	})
	total.value = res.total
	data.value = res.list
})

const reset = () => {
	searchParam.pageNum = 1
	searchParam.pageSize = 10
	searchParam.jobName = undefined
	searchParam.dateRange = undefined
	searchParam.status = undefined
	doListLoad()
}
onMounted(doListLoad)

//数据搜索部分结束

//数据选择删除部分开始

const ids = ref<number[]>([])
const onDeleteItemSelected = (row: TaskLogSummary[]) => {
	ids.value = row.map((item) => item.id)
}

const del = async () => {
	if (ids.value.length === 0) {
		ElMessage.error('请选择要删除的数据')
		return
	}
	const confirm = await ElMessageBox.confirm('您确定要删除所选数据吗？', '提示', {
		confirmButtonText: '确认',
		cancelButtonText: '取消',
		type: 'warning',
	})

	if (confirm != 'confirm') {
		return
	}

	const res = await api.task_log
		.del(ids.value)
		.then(() => true)
		.catch((ex: Exception) => {
			// eslint-disable-next-line no-console
			console.log(ex)
			return false
		})

	if (!res) {
		ElMessage.error('删除失败')
	}

	ElMessage.success('删除成功')
	await doListLoad()
	return
}

const delSingle = async (id: number) => {
	const confirm = await ElMessageBox.confirm('您确定要删除所选数据吗？', '提示', {
		confirmButtonText: '确认',
		cancelButtonText: '取消',
		type: 'warning',
	})

	if (confirm != 'confirm') {
		return
	}
	const res = await api.task_log
		.del([id])
		.then(() => true)
		.catch((ex: Exception) => {
			// eslint-disable-next-line no-console
			console.log(ex)
			return false
		})

	if (!res) {
		ElMessage.error('删除失败')
	}

	ElMessage.success('删除成功')
	await doListLoad()
	return
}

//数据选择删除部分结束

//导出日志部分开始
const { loading: exportLoading, doLoading: doExport } = useLoading(async () => {
	const res = await api.task_log.export(searchParam).catch((ex: Exception) => {
		// eslint-disable-next-line no-console
		console.log(ex)
		return undefined
	})

	if (!res) {
		ElMessage.error('导出失败')
		return
	}

	ElMessage.success('导出成功')
	downloadFile(res)
})

//导出日志部分结束

//查看日志详情部分开始
const detailForm = ref<TaskLogDetail | undefined>(undefined)
const detailDialogOpen = ref(false)
const detailTabsNumber = ref<'0' | '1' | '2'>('0')

const { loading: detailLoading, doLoading: doDetailLoad } = useLoading(async (id: number) => {
	detailForm.value = {id} as TaskLogDetail
	const res = await api.task_log.detail(id).catch((ex: Exception) => {
		// eslint-disable-next-line no-console
		console.log(ex)
		return undefined
	})
	if (!res) {
		ElMessage.error('获取失败')
		return
	}
	detailForm.value = res
	detailDialogOpen.value = true
})
</script>

<template>
	<el-card shadow="nover" class="page">
		<el-form :model="searchParam" inline>
			<el-form-item label="" prop="jobName">
				<el-input style="width: 150px" v-model="searchParam.jobName" placeholder="任务名称"></el-input>
			</el-form-item>
			<el-form-item label="" prop="dateRange">
				<el-date-picker v-model="searchParam.dateRange" style="width: 220px" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始时间" end-placeholder="结束时间"></el-date-picker>
			</el-form-item>
			<el-form-item label="" prop="status">
				<el-select style="width: 125px" v-model="searchParam.status" placeholder="请选择">
					<el-option label="全部" :value="undefined"></el-option>
					<el-option label="成功" :value="StatusEnum.SUCCESS"></el-option>
					<el-option label="失败" :value="StatusEnum.FAILED"></el-option>
				</el-select>
			</el-form-item>
			<el-form-item>
				<el-button type="primary" class="ml10" @click="doListLoad">
					<el-icon>
						<ele-Search />
					</el-icon>
					查询
				</el-button>
				<el-button @click="reset">
					<el-icon>
						<ele-Refresh />
					</el-icon>
					重置
				</el-button>

				<el-button type="info" @click="del" v-auth="'del'">
					<el-icon>
						<ele-Delete />
					</el-icon>
					删除日志
				</el-button>

				<el-button type="primary" @click="doExport" v-loading="exportLoading" v-auth="'download'">
					<el-icon>
						<ele-Download />
					</el-icon>
					导出日志
				</el-button>
			</el-form-item>
		</el-form>

		<el-table :data="data" style="width: 100%" v-loading="loading" @selection-change="onDeleteItemSelected">
			<el-table-column type="selection" width="50" align="center"></el-table-column>
			<el-table-column label="ID" prop="id" width="90" align="center" v-col="'jobId'"></el-table-column>
			<el-table-column label="任务名称" prop="jobName" align="center" v-col="'jobName'"></el-table-column>
			<el-table-column label="功能名称" prop="invokeTarget" align="center" v-col="'invokeTaget'"></el-table-column>
			<el-table-column label="表达式" prop="cronExpression" align="center" v-col="'cronExpression'"></el-table-column>
			<el-table-column label="开始时间" prop="startTime" align="center" v-col="'startTime'"></el-table-column>
			<el-table-column label="结束时间" prop="endTime" align="center" v-col="'endTime'"></el-table-column>
			<el-table-column label="创建时间" prop="createdAt" align="center" v-col="'createdAt'"></el-table-column>
			<el-table-column label="状态" prop="status" align="center" v-col="'status'">
				<template #default="scope">
					<el-tag
						:type="scope.row.status === StatusEnum.SUCCESS ? 'success' : scope.row.status === StatusEnum.FAILED ? 'danger' : 'info'">
						{{
							scope.row.status === StatusEnum.SUCCESS ? '成功' : scope.row.status === StatusEnum.FAILED ? '失败' : '未知'
						}}
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column label="操作" align="center" width="180">
				<template #default="scope">
					<el-button type="text" size="small" @click="doDetailLoad(scope.row.id)" v-loading="detailLoading && detailForm.id === scope.row.id">
						<el-icon>
							<ele-Eye />
						</el-icon>
						查看
					</el-button>
					<el-button type="text" size="small" @click="delSingle(scope.row.id)" v-auth="'del'">删除</el-button>
				</template>
			</el-table-column>
		</el-table>

		<pagination v-show="total > 0" :total="total" v-model:page="searchParam.pageNum"
								v-model:limit="searchParam.pageSize" @pagination="doListLoad" />

		<el-dialog title="日志详情" v-model="detailDialogOpen" width="80%" destroy-on-close>
			<el-tabs v-model="detailTabsNumber" type="border-card">
				<el-tab-pane label="基本信息" name="0">
					<el-form :model="detailForm" label-width="100px">
						<el-form-item label="任务名称" prop="jobName">
							<el-input style="width: 150px" v-model="detailForm.jobName" disabled></el-input>
						</el-form-item>
						<el-form-item label="功能名称" prop="invokeTarget">
							<el-input style="width: 150px" v-model="detailForm.invokeTarget" disabled></el-input>
						</el-form-item>
						<el-form-item label="表达式" prop="cronExpression">
							<el-input style="width: 150px" v-model="detailForm.cronExpression" disabled></el-input>
						</el-form-item>
						<el-form-item label="开始时间" prop="startTime">
							<el-input style="width: 150px" v-model="detailForm.startTime" disabled></el-input>
						</el-form-item>
						<el-form-item label="结束时间" prop="endTime">
							<el-input style="width: 150px" v-model="detailForm.endTime" disabled></el-input>
						</el-form-item>
						<el-form-item label="状态" prop="status">
							<el-tag
								:type="detailForm?.status === StatusEnum.SUCCESS?'success' : detailForm?.status === StatusEnum.FAILED? 'danger' : 'info'">
								{{
									detailForm?.status === StatusEnum.SUCCESS ? '成功' : detailForm?.status === StatusEnum.FAILED ? '失败' : '未知'
								}}
							</el-tag>
						</el-form-item>
					</el-form>
				</el-tab-pane>
				<el-tab-pane label="结果" name="1">
					{{detailForm.jobMessage}}
				</el-tab-pane>
				<el-tab-pane label="失败原因" name="2">
					{{detailForm.exceptionInfo}}
				</el-tab-pane>
			</el-tabs>
		</el-dialog>

	</el-card>
</template>

<style scoped lang="scss"></style>

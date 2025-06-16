<script setup lang="ts">
import api from '/@/api/system'
import { onMounted, reactive, ref } from 'vue'
import { Exception } from 'sass'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLoading } from '/@/utils/loading-util'
import downloadFile from '/@/utils/download'

type TaskLog = {
	id: number
	taskName: string
	functionName: string
	cronExpression: string
	startTime: string //开始时间
	endTime?: string //结束时间(仅success/failed拥有)
	result?: string //结果(仅success拥有)
	status: 'PROCESSING' | 'SUCCESS' | 'FAILED' //状态
	cause?: string //失败原因(仅failed拥有)
}

//数据搜索部分开始
const searchParam = reactive<{
	pageNum: number
	pageSize: number

	taskName?: string
	dateRange?: string[]
	status?: 'PROCESSING' | 'SUCCESS' | 'FAILED'
}>({
	pageNum: 1,
	pageSize: 10,
})

const total = ref<number>(0)
const data = ref<Array<TaskLog>>([])

const { loading, doLoading: doListLoad } = useLoading(async () => {
	const res: { list: TaskLog[]; total: number } = await api.task_log.getList(searchParam).catch((ex: Exception) => {
		// eslint-disable-next-line no-console
		console.log(ex)
		return {
			list: [
				{
					id: 1,
					taskName: 'task1',
					functionName: 'function1',
					cronExpression: '0 0 0 * * ?',
					startTime: '2023-01-01 00:00:00',
					endTime: '2023-01-01 00:00:00',
					result: 'SUCCESS',
					status: 'SUCCESS',
				},
				{
					id: 2,
					taskName: 'task2',
					functionName: 'function2',
					cronExpression: '0 0 0 * *?',
					startTime: '2023-01-01 00:00:00',
					endTime: '2023-01-01 00:00:00',
					status: 'FAILED',
					cause: 'cause2',
				},
				{
					id: 3,
					taskName: 'task3',
					functionName: 'function3',
					cronExpression: '0 0 0 * *?',
					startTime: '2023-01-01 00:00:00',
					status: 'PROCESSING',
				},
			],
			total: 3,
		}
	})
	total.value = res.total
	data.value = res.list
})

const reset = () => {
	searchParam.pageNum = 1
	searchParam.pageSize = 10
	searchParam.taskName = undefined
	searchParam.dateRange = undefined
	searchParam.status = undefined
	doListLoad()
}
onMounted(doListLoad)

//数据搜索部分结束

//数据选择删除部分开始

const ids = ref<number[]>([])
const onDeleteItemSelected = (row: TaskLog[]) => {
	ids.value = row.map((item) => item.id)
}

const del = async () => {
	const confirm = await ElMessageBox.confirm('您确定要删除所选数据吗？', '提示', {
		confirmButtonText: '确认',
		cancelButtonText: '取消',
		type: 'warning',
	})
	if (confirm == 'confirm') {
		const res = await api.task_log
			.del(ids.value)
			.then(() => true)
			.catch((ex: Exception) => {
				// eslint-disable-next-line no-console
				console.log(ex)
				return false
			})
		if (res) {
			ElMessage.success('删除成功')
			await doListLoad()
			return
		}
		ElMessage.error('删除失败')
	}
}

//数据选择删除部分结束


//导出日志部分开始
const { loading: exportLoading, doLoading: doExport } = useLoading(async () => {
	const res = await api.task_log
		.export(searchParam)
		.then(() => true)
		.catch((ex: Exception) => {
			// eslint-disable-next-line no-console
			console.log(ex)
			return false
		})

	ElMessage.success('导出成功')
	downloadFile(res)
})
</script>

<template>
	<el-card shadow="nover" class="page">
		<el-form :model="searchParam" inline>
			<el-form-item label="" prop="taskName">
				<el-input style="width: 150px" v-model="searchParam.taskName" placeholder="请输入任务名称"></el-input>
			</el-form-item>
			<el-form-item label="" prop="dateRange">
				<el-date-picker
					style="width: 220px"
					v-model="searchParam.dateRange"
					type="daterange"
					value-format="yyyy-MM-dd"
					range-separator="至"
					start-placeholder="开始日期"
					end-placeholder="结束日期"
				></el-date-picker>
			</el-form-item>
			<el-form-item label="" prop="status">
				<el-select style="width: 125px" v-model="searchParam.status" placeholder="请选择">
					<el-option label="执行中" value="PROCESSING"></el-option>
					<el-option label="成功" value="SUCCESS"></el-option>
					<el-option label="失败" value="FAILED"></el-option>
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

				<el-button type="primary" @click="doExport" v-loading="exportLoading">
					<el-icon>
						<ele-Download />
					</el-icon>
					导出日志
				</el-button>
			</el-form-item>
		</el-form>

		<el-table :data="data" style="width: 100%" v-loading="loading" @selection-change="onDeleteItemSelected">
			<el-table-column type="selection" width="50" align="center"></el-table-column>
			<el-table-column label="ID" prop="id" width="90" align="center"></el-table-column>
			<el-table-column label="任务名称" prop="taskName" align="center"></el-table-column>
			<el-table-column label="功能名称" prop="functionName" align="center"></el-table-column>
			<el-table-column label="表达式" prop="cronExpression" align="center"></el-table-column>
			<el-table-column label="开始时间" prop="startTime" align="center"></el-table-column>
			<el-table-column label="结束时间" prop="endTime" align="center"></el-table-column>
			<el-table-column label="状态" prop="status" align="center">
				<template #default="scope">
					<el-tag :type="scope.row.status === 'SUCCESS' ? 'success' : scope.row.status === 'FAILED' ? 'danger' : 'info'">
						{{ scope.row.status }}
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column label="结果" prop="result" align="center"></el-table-column>
			<el-table-column label="原因" prop="cause" align="center"></el-table-column>
		</el-table>

		<pagination v-show="total > 0" :total="total" v-model:page="searchParam.pageNum" v-model:limit="searchParam.pageSize" @pagination="doListLoad" />
	</el-card>
</template>

<style scoped lang="scss"></style>

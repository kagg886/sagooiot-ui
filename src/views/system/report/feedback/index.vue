<script setup lang="ts">
import feedback from '/@/api/system/report/feedback'
import { computed, getCurrentInstance, ref, unref } from 'vue'
import { useAsyncState } from '@vueuse/core'
import { FeedbackQueryParams } from '/@/api/system/report/type'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'

const { proxy } = getCurrentInstance() as any

//投诉等级，投诉来源，投诉类型
const { related_level }: {
	[key: string]: Array<{
		label: string
		value: string
	}>
} = proxy.useDict('report_level')

// eslint-disable-next-line no-unused-vars
const formatRelatedLevel = computed<(value: string) => string>(() => {
	const levels = unref(related_level)
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

const queryRef = ref()
const params = ref<FeedbackQueryParams>({
	pageNum: 1,
	pageSize: 10,
	investigatorName: ''
})

const {state, isLoading, execute} = useAsyncState(
	feedback.list(params.value),
	{total: 0, list: []}
)

// 查询
const handleQuery = () => {
	params.value.pageNum = 1
	execute(100)
}

// 重置查询
const resetQuery = () => {
	if (queryRef.value) {
		queryRef.value.resetFields()
	}
	params.value = {
		pageNum: 1,
		pageSize: 10,
	}
	execute(100)
}

// 分页改变
const handlePagination = ({ page, limit }: { page: number; limit: number }) => {
	params.value.pageNum = page
	params.value.pageSize = limit
	execute(100)
}

// 删除操作
const handleDelete = (row: any) => {
	ElMessageBox.confirm(`此操作将永久删除问卷编号："${row.surveyCode}"的反馈，是否继续?`, '提示', {
		confirmButtonText: '确认',
		cancelButtonText: '取消',
		type: 'warning',
	})
		.then(() => {
			feedback.del([row.id]).then(() => {
				ElMessage.success('删除成功')
				execute()
			})
		})
		.catch(() => {})
}
</script>

<template>
	<div class="page">
		<el-card shadow="never">
			<el-form :model="params" ref="queryRef" inline>
				<el-form-item label="" prop="investigatorName">
					<el-input
						v-model="params.investigatorName"
						placeholder="调查者姓名搜索"
						clearable
						style="width: 200px"
						@keyup.enter="handleQuery"
					/>
				</el-form-item>
				<el-form-item>
					<el-button type="primary" :icon="Search" @click="handleQuery">
						查询
					</el-button>
					<el-button @click="resetQuery">
						重置
					</el-button>
				</el-form-item>
			</el-form>

			<el-table
				:data="state.list"
				style="width: 100%"
				v-loading="isLoading"
				stripe
			>
				<el-table-column type="index" label="序号" width="60" align="center" />
				<el-table-column prop="surveyCode" label="问卷编号" width="150" show-overflow-tooltip />
				<el-table-column prop="ticketNo" label="投诉编号" width="120" align="center" />
				<el-table-column prop="investigatorName" label="调查者姓名" width="120" show-overflow-tooltip />
				<el-table-column prop="contactInfo" label="联系信息" width="150" show-overflow-tooltip />
				<el-table-column prop="processingSpeed" label="处理速度" width="120" align="center">
					<template #default="scope">
						{{ formatRelatedLevel(scope.row.processingSpeed) }}
					</template>
				</el-table-column>
				<el-table-column prop="staffAttitude" label="工作人员态度" width="140" align="center">
					<template #default="scope">
						{{ formatRelatedLevel(scope.row.staffAttitude) }}
					</template>
				</el-table-column>
				<el-table-column prop="resolutionEffect" label="解决效果" width="120" align="center">
					<template #default="scope">
						{{ formatRelatedLevel(scope.row.resolutionEffect) }}
					</template>
				</el-table-column>
				<el-table-column prop="otherSuggestions" label="其他建议" min-width="200" show-overflow-tooltip />
				<el-table-column prop="createdAt" label="创建时间" width="180" align="center" />
				<el-table-column label="操作" width="100" align="center" fixed="right">
					<template #default="scope">
						<el-button
							size="small"
							text
							type="danger"
							@click="handleDelete(scope.row)"
							v-auth="'del'"
						>
							删除
						</el-button>
					</template>
				</el-table-column>
			</el-table>

			<pagination
				v-show="state.total > 0"
				:total="state.total"
				v-model:page="params.pageNum"
				v-model:limit="params.pageSize"
				@pagination="handlePagination"
			/>
		</el-card>
	</div>
</template>

<style scoped lang="scss">
.page {
	padding: 20px;
}
</style>

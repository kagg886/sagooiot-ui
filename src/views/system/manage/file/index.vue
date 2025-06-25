<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox, ElTree } from 'element-plus'
import { Search, FolderAdd, Upload, View, Delete, Download } from '@element-plus/icons-vue'
import { useFileDialog } from '@vueuse/core'
import api from '/@/api/system'
import downloadFile from '/@/utils/download'
import { useLoading } from '/@/utils/loading-util'
import Pagination from '/@/components/pagination/index.vue'

type Dictionary = {
	id: number
	name: string
	childrens: Dictionary[]
	fullPath: string
}

type RemoteFile = {
	id: number
	name: string
	title?: string
	remark?: string
	size: number
	updatedAt: string
}

// 响应式数据
const treeRef = ref<InstanceType<typeof ElTree>>()
const filterText = ref('')
const isSearchMode = ref(false)

// 目录树数据
const treeData = ref<Dictionary[]>([])
const treeProps = {
	children: 'childrens',
	label: 'name'
}

// 当前选中的路径
const currentPath = ref('/')

// 文件列表数据
const fileList = reactive({
	data: [] as RemoteFile[],
	total: 0,
	param: {
		path: '/',
		pageNum: 1,
		pageSize: 10
	}
})

// 搜索数据
const searchData = reactive({
	query: '',
	pageNum: 1,
	pageSize: 10
})

const pageNum = computed({
	get() {
		return isSearchMode.value === true ? searchData.pageNum : fileList.param.pageNum
	},
	set(newVal) {
		if (isSearchMode.value) {
			searchData.pageNum = newVal
		} else {
			fileList.param.pageNum = newVal
		}
	}
})

const pageSize = computed({
	get() {
		return isSearchMode.value === true? searchData.pageSize : fileList.param.pageSize
	},
	set(newVal) {
		if (isSearchMode.value) {
			searchData.pageSize = newVal
		} else {
			fileList.param.pageSize = newVal
		}
	}
})

// 对话框状态
const dialogState = reactive({
	fileDetail: false,
	createFolder: false,
	uploadFile: false,
	selectedFile: null as RemoteFile | null
})

// 创建文件夹表单
const folderForm = reactive({
	name: '',
	remark: '',
	path: ''
})

// 上传文件表单
const uploadForm = reactive({
	remark: '',
	title: '',
	path: ''
})

// 文件对话框
const { files, open: openFileDialog, reset: resetFileDialog } = useFileDialog({
	accept: '*/*',
	multiple: false
})

// 格式化文件大小
const formatFileSize = (size: number) => {
	if (size === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(size) / Math.log(k))
	return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取文件显示名称
const getFileName = (file: RemoteFile) => {
	return file.title || file.name
}

// 限制备注显示长度
const limitRemark = (remark: string, maxLength = 30) => {
	if (!remark) return '-'
	return remark.length > maxLength ? remark.substring(0, maxLength) + '...' : remark
}

// 加载目录树
const loadTreeData = async () => {
	try {
		const res = await api.file.tree()
		treeData.value = res.dirs
	} catch (error) {
		ElMessage.error('加载目录树失败')
	}
}

// 加载文件列表
const { loading: fileListLoading, doLoading: doLoadFileList } = useLoading(async () => {
	if (isSearchMode.value) return

	const res = await api.file.list(fileList.param)
	fileList.data = res.list
	fileList.total = res.total
})

const loadFileList = async () => {
	try {
		await doLoadFileList()
	} catch (error) {
		ElMessage.error('加载文件列表失败')
	}
}

// 搜索文件
const { loading: searchLoading, doLoading: doSearchFiles } = useLoading(async () => {
	const res = await api.file.search(searchData)
	fileList.data = res.list
	fileList.total = res.total
})

const searchFiles = async () => {
	if (!searchData.query.trim()) {
		ElMessage.warning('请输入搜索关键词')
		return
	}

	isSearchMode.value = true
	try {
		await doSearchFiles()
	} catch (error) {
		ElMessage.error('搜索文件失败')
	}
}

// 清空搜索
const clearSearch = () => {
	searchData.query = ''
	searchData.pageNum = 1
	isSearchMode.value = false
	loadFileList()
}

// 处理树节点点击
const handleNodeClick = (data: Dictionary) => {
	if (isSearchMode.value) {
		clearSearch()
	}
	currentPath.value = data.name === 'root' ? '/' : data.fullPath
	fileList.param.path = currentPath.value
	fileList.param.pageNum = 1
	loadFileList()
}

// 树过滤方法
const filterNode = (value: string, data: Dictionary) => {
	if (!value) return true
	return data.name.toLowerCase().includes(value.toLowerCase())
}

// 查看文件详情
const viewFileDetail = (file: RemoteFile) => {
	dialogState.selectedFile = file
	dialogState.fileDetail = true
}

// 下载文件
const downloadingFileIds = ref<Set<number>>(new Set())

const startDownload = async (file: RemoteFile) => {
	if (downloadingFileIds.value.has(file.id)) return

	downloadingFileIds.value.add(file.id)
	try {
		const data = await api.file.download(file.id)
		downloadFile(data, file.name)
	} catch (error) {
		ElMessage.error('下载文件失败')
	} finally {
		downloadingFileIds.value.delete(file.id)
	}
}

// 删除文件
const deletingFileIds = ref<Set<number>>(new Set())

const deleteFile = (file: RemoteFile) => {
	if (deletingFileIds.value.has(file.id)) return

	const isDirectory = file.size === 0 // 假设目录大小为0
	ElMessageBox.confirm(
		`确定要删除${isDirectory ? '文件夹' : '文件'} "${getFileName(file)}" 吗？`,
		'确认删除',
		{
			confirmButtonText: '确定',
			cancelButtonText: '取消',
			type: 'warning'
		}
	).then(async () => {
		deletingFileIds.value.add(file.id)
		try {
			await api.file.deleteFile(file.id, isDirectory)
			ElMessage.success('删除成功')
			if (isSearchMode.value) {
				searchFiles()
			} else {
				loadFileList()
			}
		} catch (error) {
			ElMessage.error('删除失败')
		} finally {
			deletingFileIds.value.delete(file.id)
		}
	})
}

// 打开创建文件夹对话框
const openCreateFolderDialog = () => {
	folderForm.name = ''
	folderForm.remark = ''
	folderForm.path = currentPath.value
	dialogState.createFolder = true
}

// 创建文件夹
const { loading: createFolderLoading, doLoading: doCreateFolder } = useLoading(async () => {
	await api.file.createDir(folderForm)
	ElMessage.success('创建文件夹成功')
	dialogState.createFolder = false

	await Promise.all(
		[
			loadTreeData(),
			loadFileList()
		]
	)
})

const createFolder = async () => {
	if (!folderForm.name.trim()) {
		ElMessage.warning('请输入文件夹名称')
		return
	}

	try {
		await doCreateFolder()
	} catch (error) {
		ElMessage.error('创建文件夹失败')
	}
}

// 打开上传文件对话框
const openUploadDialog = () => {
	uploadForm.remark = ''
	uploadForm.title = ''
	uploadForm.path = currentPath.value
	resetFileDialog()
	dialogState.uploadFile = true
}


// 上传文件
const { loading: uploadFileLoading, doLoading: doUploadFile } = useLoading(async () => {
	const file = files.value![0]
	await api.file.upload({
		file: file,
		path: uploadForm.path,
		remark: uploadForm.remark,
		title: uploadForm.title
	})
	ElMessage.success('上传文件成功')
	dialogState.uploadFile = false
	loadFileList()
})

const uploadFile = async () => {
	if (!files.value || files.value.length === 0) {
		ElMessage.warning('请选择要上传的文件')
		return
	}

	try {
		await doUploadFile()
	} catch (error) {
		ElMessage.error('上传文件失败')
	}
}

// 监听过滤文本变化
watch(filterText, (val) => {
	treeRef.value?.filter(val)
})

// 组件挂载时初始化
onMounted(() => {
	loadTreeData()
	loadFileList()
})
</script>

<template>
	<div class="page flex-row gap-4">
		<!-- 左侧目录树 -->
		<el-card shadow="never" style="width: 260px">
			<el-scrollbar>
				<el-input
					:prefix-icon="Search"
					v-model="filterText"
					placeholder="请输入目录名称"
					clearable
					style="width: 100%;"
				/>
				<el-tree
					ref="treeRef"
					class="filter-tree mt-4"
					:data="treeData"
					:props="treeProps"
					default-expand-all
					:filter-node-method="filterNode"
					@node-click="handleNodeClick"
				>
					<template #default="{ node }">
						<div class="custom-tree-node" :title="node.label">
							{{ node.label }}
						</div>
					</template>
				</el-tree>
			</el-scrollbar>
		</el-card>

		<!-- 右侧文件列表 -->
		<el-card shadow="never" class="flex1">
			<!-- 搜索和操作栏 -->
			<el-form inline class="mb-4">
				<el-form-item>
					<el-input
						v-model="searchData.query"
						placeholder="搜索文件..."
						clearable
						style="width: 200px"
						@keyup.enter="searchFiles"
						@clear="clearSearch"
					>
						<template #append>
							<el-button @click="searchFiles" :loading="searchLoading">
								<el-icon><Search /></el-icon>
							</el-button>
						</template>
					</el-input>
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="openCreateFolderDialog">
						<el-icon><FolderAdd /></el-icon>
						创建文件夹
					</el-button>
				</el-form-item>
				<el-form-item>
					<el-button type="success" @click="openUploadDialog">
						<el-icon><Upload /></el-icon>
						上传文件
					</el-button>
				</el-form-item>
			</el-form>

			<!-- 当前路径显示 -->
			<div class="mb-4" v-if="!isSearchMode">
				<span class="current-path">当前位置：{{ currentPath }}</span>
			</div>
			<div class="mb-4" v-else>
				<span class="search-result">搜索结果：{{ searchData.query }}</span>
				<el-button type="text" @click="clearSearch" class="ml-2">返回文件列表</el-button>
			</div>

			<!-- 文件列表表格 -->
			<el-table :data="fileList.data" style="width: 100%" v-loading="fileListLoading || searchLoading">
				<el-table-column type="index" label="序号" width="60" align="center" />
				<el-table-column prop="name" label="文件名" min-width="200" show-overflow-tooltip>
					<template #default="{ row }">
						{{ getFileName(row) }}
					</template>
				</el-table-column>
				<el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip>
					<template #default="{ row }">
						{{ limitRemark(row.remark) }}
					</template>
				</el-table-column>
				<el-table-column prop="size" label="大小" width="100" align="center">
					<template #default="{ row }">
						{{ formatFileSize(row.size) }}
					</template>
				</el-table-column>
				<el-table-column prop="updatedAt" label="更新时间" width="180" align="center" />
				<el-table-column label="操作" width="200" align="center">
					<template #default="{ row }">
						<el-button size="small" text type="primary" @click="viewFileDetail(row)">
							<el-icon><View /></el-icon>
							查看
						</el-button>

						<el-button size="small" text type="info" @click="startDownload(row)" :loading="downloadingFileIds.has(row.id)">
							<el-icon><Download /></el-icon>
							下载
						</el-button>

						<el-button size="small" text type="danger" @click="deleteFile(row)" :loading="deletingFileIds.has(row.id)">
							<el-icon><Delete /></el-icon>
							删除
						</el-button>
					</template>
				</el-table-column>
			</el-table>

<!--			readonly total: NumberConstructor;-->
<!--			readonly pageSize: NumberConstructor;-->
<!--			readonly defaultPageSize: NumberConstructor;-->
<!--			readonly currentPage: NumberConstructor;-->
<!--			readonly defaultCurrentPage: NumberConstructor;-->
<!--			readonly pageCount: NumberConstructor;-->
<!--			readonly pagerCount: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 7, boolean>;-->
<!--			readonly layout: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, string, boolean>;-->
<!--			readonly pageSizes: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => number[]) | (() => number[]) | ((new (...args: any[]) => number[]) | (() => number[]))[], unknown, unknown, () => [10, 20, 30, 40, 50, 100], boolean>;-->
<!--			readonly popperClass: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;-->
<!--			readonly prevText: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;-->
<!--			readonly prevIcon: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, () => import("vue").DefineComponent<{}, {}, {}, import("vue").ComputedOptions, import("vue").MethodOptions, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}>, boolean>;-->
<!--			readonly nextText: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;-->
<!--			readonly nextIcon: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown, () => import("vue").DefineComponent<{}, {}, {}, import("vue").ComputedOptions, import("vue").MethodOptions, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}>, boolean>;-->
<!--			readonly small: BooleanConstructor;-->
<!--			readonly background: BooleanConstructor;-->
<!--			readonly disabled: BooleanConstructor;-->
<!--			readonly hideOnSinglePage: BooleanConstructor;-->
<!--			<pagination v-show="tableData.total > 0" :total="tableData.total" v-model:page="tableData.param.pageNum" v-model:limit="tableData.param.pageSize" @pagination="userList" />-->
			<pagination
				v-show="fileList.total > 0"
				:total="fileList.total"
				v-model:page="pageNum"
				v-model:limit="pageSize"
			/>
			<!--			<el-pagination-->
<!--				:total="fileList.total"-->
<!--				:page-size="fileList.param.pageSize"-->
<!--				:current-page="fileList.param.pageNum"-->
<!--				@current-change="(page: number) => fileList.param.pageNum = page"-->
<!--				@size-change="(size: number) => fileList.param.pageSize = size"-->
<!--			>-->
<!--			</el-pagination>-->

<!--			&lt;!&ndash; 分页 &ndash;&gt;-->
<!--			<pagination-->
<!--				v-show="fileList.total > 0"-->
<!--				:total="fileList.total"-->
<!--				v-model:page="currentFileList.pageNum"-->
<!--				v-model:limit="currentFileList.pageSize"-->
<!--				@pagination="handlePagination"-->
<!--			/>-->
		</el-card>

		<!-- 文件详情对话框 -->
		<el-dialog
			title="文件详情"
			v-model="dialogState.fileDetail"
			width="500px"
		>
			<div v-if="dialogState.selectedFile" class="file-detail">
				<el-descriptions :column="1" border>
					<el-descriptions-item label="文件名">
						{{ dialogState.selectedFile.name }}
					</el-descriptions-item>
					<el-descriptions-item label="标题" v-if="dialogState.selectedFile.title">
						{{ dialogState.selectedFile.title }}
					</el-descriptions-item>
					<el-descriptions-item label="备注" v-if="dialogState.selectedFile.remark">
						{{ dialogState.selectedFile.remark }}
					</el-descriptions-item>
					<el-descriptions-item label="大小">
						{{ formatFileSize(dialogState.selectedFile.size) }}
					</el-descriptions-item>
					<el-descriptions-item label="更新时间">
						{{ dialogState.selectedFile.updatedAt }}
					</el-descriptions-item>
				</el-descriptions>
			</div>
		</el-dialog>

		<!-- 创建文件夹对话框 -->
		<el-dialog
			title="创建文件夹"
			v-model="dialogState.createFolder"
			width="500px"
		>
			<el-form :model="folderForm" label-width="80px">
				<el-form-item label="名称" required>
					<el-input v-model="folderForm.name" placeholder="请输入文件夹名称" />
				</el-form-item>
				<el-form-item label="备注">
					<el-input v-model="folderForm.remark" placeholder="请输入备注" />
				</el-form-item>
				<el-form-item label="父目录">
					<el-input v-model="folderForm.path" readonly />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogState.createFolder = false">取消</el-button>
				<el-button type="primary" @click="createFolder" :loading="createFolderLoading">确定</el-button>
			</template>
		</el-dialog>

		<!-- 上传文件对话框 -->
		<el-dialog
			title="上传文件"
			v-model="dialogState.uploadFile"
			width="500px"
		>
			<el-form :model="uploadForm" label-width="80px">
				<el-form-item label="选择文件" required>
					<div class="upload-area">
						<el-button @click="openFileDialog">
							<el-icon><Upload /></el-icon>
							选择文件
						</el-button>
						<div v-if="files && files.length > 0" class="selected-file">
							<span class="file-name">{{ files[0].name }}</span>
							<span class="file-size">({{ formatFileSize(files[0].size) }})</span>
						</div>
					</div>
				</el-form-item>
				<el-form-item label="标题">
					<el-input v-model="uploadForm.title" placeholder="请输入文件标题" />
				</el-form-item>
				<el-form-item label="备注">
					<el-input v-model="uploadForm.remark" placeholder="请输入备注" />
				</el-form-item>
				<el-form-item label="上传到">
					<el-input v-model="uploadForm.path" readonly />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogState.uploadFile = false">取消</el-button>
				<el-button type="primary" @click="uploadFile" :loading="uploadFileLoading">上传</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<style scoped lang="scss">
.page {
	.flex1 {
		flex: 1;
	}

	.custom-tree-node {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.current-path,
	.search-result {
		font-size: 14px;
		color: #909399;
	}

	.mb-4 {
		margin-bottom: 16px;
	}

	.ml-2 {
		margin-left: 8px;
	}

	.upload-area {
		.selected-file {
			margin-top: 8px;
			padding: 8px;
			background-color: #f5f7fa;
			border-radius: 4px;
			border: 1px solid #e4e7ed;

			.file-name {
				font-weight: 500;
			}

			.file-size {
				color: #909399;
				font-size: 12px;
				margin-left: 8px;
			}
		}
	}

	.file-detail {
		.el-descriptions {
			margin-top: 16px;
		}
	}
}
</style>

<script setup lang="ts">
import api from '/@/api/system/index'
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLoading } from '/@/utils/loading-util'
import { useFileDialog } from '@vueuse/core'

type RemoteFile = {
	id: number //id
	name: string //名字
	createAt: string //创建时间
	updateAt: string //更新时间
	isDir: boolean //是否是文件夹
	size: number //大小
}

type FileTree = Omit<RemoteFile, 'isDir'> & {
	children?: FileTree[] //文件夹的children为[]，文件的children为undefined
	parentPath: string[] //父路径
	loaded?: boolean //标记文件夹内容是否已加载
}

//当 currentPath为空时，表示根目录
//e.g. ['folder1'] 表示 /folder1
//e.g. ['folder1', 'folder2'] 表示 /folder1/folder2
//tips：在设计中，该path不应该代表文件
const currentPath = ref<string[]>([])

//文件树
const fileTree = ref<FileTree[]>([])

// 树组件引用
const treeRef = ref()

//启动时加载根目录文件列表
const { loading, doLoading } = useLoading(async () => {
	const res: RemoteFile[] = await api.file
		.list('/')
		.then((res: { files: RemoteFile[] }) => res.files ?? [])
		.catch((e: Error) => {
			ElMessage.error(e.message)
			return []
		})
	fileTree.value = res.map((item) => {
		const tree: FileTree = {
			...item,
			children: item.isDir ? [] : undefined,
			parentPath: [],
			loaded: false, // 初始未加载子内容
		}
		return tree
	})
})

onMounted(doLoading)

//获取currentPath(一定是folder)对应的那个FileTree对象
//未初始化时，会返回undefined
const currentFile = computed<FileTree | undefined>({
	get: () => {
		if (currentPath.value.length === 0) {
			// 根目录，返回虚拟根
			return {
				id: 0,
				name: '/',
				createAt: '',
				updateAt: '',
				modTime: '',
				size: 0,
				children: fileTree.value,
				parentPath: [],
				loaded: true, // 根目录始终标记为已加载
			}
		}

		//否则按路径一层一层查找
		let currentLevel = fileTree.value
		let node: FileTree | undefined

		for (const segment of currentPath.value) {
			node = currentLevel.find((item) => item.name === segment)
			if (!node || !node.children) return undefined
			currentLevel = node.children
		}

		return node
	},

	set: (newValue) => {
		if (!newValue) return

		let currentLevel = fileTree.value

		//查找到倒数第二层。
		for (let i = 0; i < currentPath.value.length - 1; i++) {
			const segment = currentPath.value[i]
			const node = currentLevel.find((item) => item.name === segment)
			if (!node || !node.children) throw new Error(`file底部不应该有文件，出错的path: /${currentPath.value.slice(0, i).join('/')}`)
			currentLevel = node.children
		}

		const targetName = currentPath.value.at(-1)
		const targetIndex = currentLevel.findIndex((item) => item.name === targetName)

		if (targetIndex !== -1) {
			//trigger change
			currentLevel.splice(targetIndex, 1, newValue)
		}
	},
})

//监听currentPath的变化，拉取currentFile的children
const loadingFetchChildren = ref(false)
watch(currentPath, async (newVal: string[]) => {
	// 检查当前文件夹是否已经加载过内容
	const currentFileValue = currentFile.value
	if (currentFileValue && currentFileValue.loaded) {
		// 如果当前文件夹已经加载过，则不重新加载，但仍然展开节点
		await nextTick(() => {
			if (treeRef.value && currentFileValue && currentFileValue.id) {
				// 使用节点id来展开
				treeRef.value.setCurrentKey(currentFileValue.id)
				const node = treeRef.value.store.nodesMap[currentFileValue.id]
				if (node) {
					node.expand()
				}
			}
		})
		return
	}

	loadingFetchChildren.value = true
	const res: RemoteFile[] | undefined = await api.file
		.list(`/${newVal.join('/')}`)
		.then((res: { files: RemoteFile[] }) => res.files ?? [])
		.catch((e: Error) => {
			ElMessage.error(e.message)
			return undefined
		})

	if (res === undefined) {
		loadingFetchChildren.value = false
		return
	}

	const newChildren: FileTree[] = res.map((item) => {
		const tree: FileTree = {
			...item,
			children: item.isDir ? [] : undefined,
			parentPath: newVal,
			loaded: false, // 新加载的文件夹初始未加载子内容
		}
		return tree
	})

	const children = currentFile.value!.children!
	children.splice(0, children.length, ...newChildren)

	// 标记当前文件夹已加载
	if (currentFile.value) {
		currentFile.value.loaded = true
	}

	loadingFetchChildren.value = false

	// 自动展开节点
	await nextTick(() => {
		if (treeRef.value && currentFile.value && currentFile.value.id) {
			// 使用节点id来展开
			treeRef.value.setCurrentKey(currentFile.value.id)
			const node = treeRef.value.store.nodesMap[currentFile.value.id]
			if (node) {
				node.expand()
			}
		}
	})
})

// 处理文件树节点点击
const handleTreeNodeClick = async (node: FileTree) => {
	if (node.children === undefined) {
		//点击文件，不做任何操作
		return
	}
	currentPath.value = [...node.parentPath, node.name]
}

// 处理面包屑导航点击
const handleBreadcrumbClick = (index: number) => {
	currentPath.value = currentPath.value.slice(0, index + 1)
}

// 删除文件/文件夹
// eslint-disable-next-line no-unused-vars
const handleDelete = async (file: FileTree) => {
	const status = await ElMessageBox.confirm(`确定要删除 ${file.name} 吗？`, '提示', {
		confirmButtonText: '确定',
		cancelButtonText: '取消',
		type: 'warning',
	})
	if (status !== 'confirm') return
	const res = await api.file.delete(file.id, file.children !== undefined).catch((e: Error) => {
		ElMessage.error(e.message)
		return false
	})

	if (!res) {
		return
	}
	ElMessage.success('删除成功')
	//删除成功后，重新拉取currentFile的children
	const nodes = currentFile.value!
	nodes.loaded = undefined
	currentPath.value = [...currentPath.value]
}

// 上传文件
const { files, open } = useFileDialog()

watch(files, async (files: FileList | null) => {
	if (!files) return

	const result = await api.file
		.upload({
			file: files[0],
			path: `/${currentPath.value.join('/')}`,
			remark: '上传的文件',
		})
		.then(() => true)
		.catch((e: Error) => {
			ElMessage.error(e.message)
			return false
		})

	if (!result) {
		return
	}
	ElMessage.success('上传成功')
	//上传成功后，重新拉取currentFile的children
	const nodes = currentFile.value!
	nodes.loaded = undefined
	currentPath.value = [...currentPath.value]
})

// 格式化文件大小
const formatFileSize = (size: number) => {
	if (size === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(size) / Math.log(k))
	return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 创建文件夹
const createDirDialogVisible = ref(false)
const createDirName = ref('')
const remark = ref('')

const createDir = async () => {
	if (!createDirName.value) {
		ElMessage.error('请输入文件夹名称')
		return
	}
	const res = await api.file
		.dir({
			name: createDirName.value,
			path: `/${currentPath.value.join('/')}`,
			remark: remark.value,
		})
		.then(() => true)
		.catch((e: Error) => {
			ElMessage.error(e.message)
			return false
		})
	if (!res) {
		return
	}

	ElMessage.success('创建成功')

	//创建成功后，重新拉取currentFile的children
	const nodes = currentFile.value!
	nodes.loaded = undefined
	currentPath.value = [...currentPath.value]
}
</script>

<template>
	<div class="file-manager-container">
		<el-card shadow="never">
			<!-- 操作按钮区域 -->
			<div class="toolbar">
				<el-button type="primary" @click="open({ multiple: false })">
					<el-icon>
						<ele-Upload />
					</el-icon>
					上传文件
				</el-button>

				<el-button type="primary" @click="() => (createDirDialogVisible = true)">
					<el-icon>
						<ele-FolderAdd />
					</el-icon>
					创建文件夹
				</el-button>
			</div>

			<!-- 主要内容区域 -->
			<div class="content-area">
				<!-- 左侧文件树 -->
				<div class="file-tree-panel">
					<div class="panel-header">
						<h3>文件目录</h3>
					</div>
					<div class="tree-container">
						<el-tree
							:data="fileTree"
							:props="{
								label: 'name',
								children: 'children',
								isLeaf: (data: FileTree) => data.children === undefined
							}"
							node-key="id"
							:expand-on-click-node="false"
							@node-click="handleTreeNodeClick"
							v-loading="loading"
							ref="treeRef"
						>
							<template #default="{ data }">
								<div class="tree-node">
									<el-icon v-if="data.children !== undefined" class="tree-icon">
										<ele-Folder />
									</el-icon>
									<el-icon v-else class="tree-icon">
										<ele-Document />
									</el-icon>
									<span class="tree-label">{{ data.name }}</span>
								</div>
							</template>
						</el-tree>
					</div>
				</div>

				<!-- 右侧文件列表 -->
				<div class="file-list-panel">
					<!-- 面包屑导航 -->
					<div class="breadcrumb-container">
						<el-breadcrumb separator="/">
							<el-breadcrumb-item
								v-for="(path, index) in currentPath"
								:key="index"
								:to="{ path: '' }"
								@click="handleBreadcrumbClick(index)"
								style="cursor: pointer"
							>
								{{ path === '/' ? '根目录' : path }}
							</el-breadcrumb-item>
						</el-breadcrumb>
					</div>

					<!-- 文件列表表格 -->
					<div class="table-container">
						<el-table :data="currentFile?.children || []" style="width: 100%" v-loading="loading" empty-text="当前目录为空">
							<el-table-column label="名称" min-width="200">
								<template #default="scope: { row: FileTree }">
									<div class="file-item">
										<el-icon v-if="scope.row.children !== undefined" class="file-icon">
											<ele-Folder />
										</el-icon>
										<el-icon v-else class="file-icon">
											<ele-Document />
										</el-icon>
										<span class="file-name">{{ scope.row.name }}</span>
									</div>
								</template>
							</el-table-column>

							<el-table-column prop="size" label="大小" width="120" align="right">
								<template #default="scope">
									<span v-if="scope.row.children === undefined">
										{{ formatFileSize(scope.row.size) }}
									</span>
									<span v-else>--</span>
								</template>
							</el-table-column>

							<el-table-column prop="modTime" label="修改时间" width="180" align="center">
								<template #default="scope: { row: FileTree }">
									{{ scope.row.updateAt }}
								</template>
							</el-table-column>

							<el-table-column prop="createdAt" label="创建时间" width="180" align="center">
								<template #default="scope: { row: FileTree }">
									{{ scope.row.createAt }}
								</template>
							</el-table-column>

							<el-table-column label="操作" width="120" align="center" fixed="right">
								<template #default="scope">
									<el-button size="small" text type="danger" @click="handleDelete(scope.row)"> 删除</el-button>
								</template>
							</el-table-column>
						</el-table>
					</div>
				</div>
			</div>
		</el-card>

		<!-- 创建文件夹对话框 -->
		<el-dialog title="创建文件夹" v-model="createDirDialogVisible" width="30%">
			<el-form :model="createDirName" label-width="80px">
				<el-form-item label="文件夹名称">
					<el-input v-model="createDirName" placeholder="请输入文件夹名称" />
				</el-form-item>
				<el-form-item label="备注">
					<el-input v-model="remark" placeholder="请输入备注" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="createDirDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="createDir">创建</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<style scoped lang="scss">
.file-manager-container {
	padding: 20px;

	.toolbar {
		margin-bottom: 20px;
		padding-bottom: 15px;
		border-bottom: 1px solid #ebeef5;
	}

	.content-area {
		display: flex;
		gap: 20px;
		height: calc(100vh - 200px);
	}

	.file-tree-panel {
		width: 300px;
		border: 1px solid #ebeef5;
		border-radius: 4px;
		overflow: hidden;

		.panel-header {
			background-color: #f5f7fa;
			padding: 15px;
			border-bottom: 1px solid #ebeef5;

			h3 {
				margin: 0;
				font-size: 16px;
				color: #303133;
			}
		}

		.tree-container {
			padding: 10px;
			height: calc(100% - 60px);
			overflow: auto;

			.tree-node {
				display: flex;
				align-items: center;
				font-size: 14px;

				.tree-icon {
					margin-right: 8px;
					color: #606266;
				}

				.tree-label {
					color: #303133;
				}
			}
		}
	}

	.file-list-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: 1px solid #ebeef5;
		border-radius: 4px;
		overflow: hidden;

		.breadcrumb-container {
			background-color: #f5f7fa;
			padding: 15px;
			border-bottom: 1px solid #ebeef5;
		}

		.table-container {
			flex: 1;
			padding: 0;
			overflow: auto;

			.file-item {
				display: flex;
				align-items: center;

				.file-icon {
					margin-right: 8px;
					color: #606266;
				}

				.file-name {
					color: #303133;
				}
			}
		}
	}
}

// Element Plus 样式覆盖
:deep(.el-table) {
	.el-table__body-wrapper {
		height: 100%;
	}
}

:deep(.el-tree) {
	background: transparent;

	.el-tree-node__content {
		padding: 8px 0;

		&:hover {
			background-color: #f5f7fa;
		}
	}
}

:deep(.el-breadcrumb__item) {
	.el-breadcrumb__inner {
		&:hover {
			color: #409eff;
		}
	}
}
</style>

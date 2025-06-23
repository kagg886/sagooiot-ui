<script setup lang="ts">
import api from '/@/api/system/index'
import {computed, nextTick, onMounted, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import {useLoading} from "/@/utils/loading-util";

type RemoteFile = {
  name: string, //名字
  createdAt: string, //创建时间
  isDir: boolean, //是否是文件夹
  size: number, //大小
  modTime: string, //修改时间
}

type FileTree = Omit<RemoteFile, 'isDir'> & {
  children?: FileTree[] //文件夹的children为[]，文件的children为undefined
}

//当 currentPath为空时，表示根目录
//e.g. ['folder1'] 表示 /folder1
//e.g. ['folder1', 'folder2'] 表示 /folder1/folder2
//tips：在设计中，该path不应该代表文件
const currentPath = ref<string[]>([])

//文件树
const fileTree = ref<FileTree[]>([])

//启动时加载根目录文件列表
const {loading, doLoading} = useLoading(async () => {
  const res: RemoteFile[] = await api.file
      .list('/')
      .catch((e: Error) => {
        ElMessage.error(e.message)
        return []
      })
  fileTree.value = res.map((item) => {
    const tree: FileTree = {
      ...item,
      children: item.isDir ? [] : undefined
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
        name: '/',
        createdAt: '',
        modTime: '',
        size: 0,
        initialized: true,
        children: fileTree.value,
      }
    }

    //否则按路径一层一层查找
    let currentLevel = fileTree.value
    let node: FileTree | undefined

    for (const segment of currentPath.value) {
      node = currentLevel.find(item => item.name === segment)
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
      const node = currentLevel.find(item => item.name === segment)
      if (!node || !node.children) throw new Error(`file底部不应该有文件，出错的path: /${currentPath.value.slice(0, i).join('/')}`)
      currentLevel = node.children
    }

    const targetName = currentPath.value.at(-1)
    const targetIndex = currentLevel.findIndex(item => item.name === targetName)

    if (targetIndex !== -1) {
      //trigger change
      currentLevel.splice(targetIndex, 1, newValue)
    }
  }
})

//监听currentPath的变化，拉取currentFile的children
const loadingFetchChildren = ref(false)
watch(currentPath, async (newVal: string[]) => {
  loadingFetchChildren.value = true
  const res: RemoteFile[] = await api.file
      .list(`/${newVal.join('/')}`)
      .catch((e: Error) => {
        ElMessage.error(e.message)
        return []
      })

  const newChildren: FileTree[] = res.map((item) => {
    const tree: FileTree = {
      ...item,
      children: item.isDir ? [] : undefined
    }
    return tree
  })

  const children = currentFile.value!.children!
  children.splice(0, children.length, ...newChildren)

  loadingFetchChildren.value = false
})

// 处理文件树节点点击
const handleTreeNodeClick = async (node: FileTree) => {
  if (currentPath.value.at(-1) !== node.name) {
    currentPath.value = [...currentPath.value, node.name]
  }
}

// 处理面包屑导航点击
const handleBreadcrumbClick = (index: number) => {
  currentPath.value = currentPath.value.slice(0, index + 1)
}

// 删除文件/文件夹
// eslint-disable-next-line no-unused-vars
const handleDelete = (file: FileTree) => {
  // TODO: 实现删除功能
  ElMessage.info('删除功能待实现')
}

// 上传文件
const handleUpload = () => {
  // TODO: 实现上传功能
  ElMessage.info('上传功能待实现')
}

// 格式化文件大小
const formatFileSize = (size: number) => {
  if (size === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(size) / Math.log(k))
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时间
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

</script>

<template>
  <div class="file-manager-container">
    <el-card shadow="never">
      <!-- 操作按钮区域 -->
      <div class="toolbar">
        <el-button type="primary" @click="handleUpload">
          <el-icon>
            <ele-Upload/>
          </el-icon>
          上传文件
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
            <el-tree :data="fileTree" :props="{ label: 'name', children: 'children' }" node-key="name"
                     :expand-on-click-node="false" @node-click="handleTreeNodeClick" v-loading="loading">
              <template #default="{ data }">
                <div class="tree-node">
                  <el-icon v-if="data.children !== undefined" class="tree-icon">
                    <ele-Folder/>
                  </el-icon>
                  <el-icon v-else class="tree-icon">
                    <ele-Document/>
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
              <el-breadcrumb-item v-for="(path, index) in currentPath" :key="index" :to="{ path: '' }"
                                  @click="handleBreadcrumbClick(index)" style="cursor: pointer;">
                {{ path === '/' ? '根目录' : path }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>

          <!-- 文件列表表格 -->
          <div class="table-container">
            <el-table :data="currentFile?.children || []" style="width: 100%" v-loading="loading"
                      empty-text="当前目录为空">
              <el-table-column label="名称" min-width="200">
                <template #default="scope">
                  <div class="file-item">
                    <el-icon v-if="scope.row.children !== undefined" class="file-icon">
                      <ele-Folder/>
                    </el-icon>
                    <el-icon v-else class="file-icon">
                      <ele-Document/>
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
                <template #default="scope">
                  {{ formatDateTime(scope.row.modTime) }}
                </template>
              </el-table-column>

              <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
                <template #default="scope">
                  {{ formatDateTime(scope.row.createdAt) }}
                </template>
              </el-table-column>

              <el-table-column label="操作" width="120" align="center" fixed="right">
                <template #default="scope">
                  <el-button size="small" text type="danger" @click="handleDelete(scope.row)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-card>
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

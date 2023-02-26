<template>
  <article>
    <el-button @click="openDialog">打开dialog</el-button>
    <el-button @click="openDirectiveDialog">打开指令拖拽的dialog</el-button>
    <el-button text
               @click="dialogDragVisible = true">Click to open Dialog
    </el-button>
    <el-table :data="tableData"
              style="width: 100%">
      <el-table-column label="Date"
                       width="180">
        <template #default="scope">
          <div style="display: flex; align-items: center">
            <CIcon icon-class="bx:time-five"
                   icon-color="#333" />
            <span style="margin-left: 10px">{{ scope.row.date }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Name"
                       width="180">
        <template #default="scope">
          <el-popover effect="light"
                      trigger="hover"
                      placement="top"
                      width="auto">
            <template #default>
              <div>name: {{ scope.row.name }}</div>
              <div>address: {{ scope.row.address }}</div>
            </template>
            <template #reference>
              <el-tag>{{ scope.row.name }}</el-tag>
            </template>
          </el-popover>
        </template>
      </el-table-column>
      <el-table-column label="Operations">
        <template #default="scope">
          <el-button size="small"
                     @click="handleEdit(scope.$index, scope.row)">Edit</el-button>
          <el-button size="small"
                     type="danger"
                     @click="handleDelete(scope.$index, scope.row)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 使用组件ref控制拖拽 -->
    <el-dialog ref="dialogRef"
               v-model="dialogVisible"
               title="Tips"
               width="30%"
               :before-close="handleClose">
      <span>This is a message</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary"
                     @click="dialogVisible = false">Confirm</el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 使用指令控制拖拽 -->
    <div v-cust-drag-dialog>
      <el-dialog v-model="dialogDirectiveVisible"
                 title="弹框"
                 width="30%"
                 :close-on-click-modal="false">
        <span>使用指令实现拖拽</span>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogDirectiveVisible = false">取消</el-button>
            <el-button type="primary"
                       @click="dialogDirectiveVisible = false">确定</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
    <!-- 官方案例  -->
    <el-dialog v-model="dialogDragVisible"
               title="Tips"
               width="30%"
               draggable>
      <span>It's a draggable Dialog</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogDragVisible = false">Cancel</el-button>
          <el-button type="primary"
                     @click="dialogDragVisible = false">Confirm</el-button>
        </span>
      </template>
    </el-dialog>
  </article>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import dragDialog from '@/hooks/dragDialog' //引入封装的拖拽方法
let dialogRef: any = ref<ElRef>('') // 获取需要拖拽的组件

interface User {
  date: string
  name: string
  address: string
}

// 绑定需要拖拽组件
onMounted(() => {
  dragDialog.bind(dialogRef.value.dialogRef) //绑定该拖拽方法
})

const dialogDragVisible = ref<ElRef>(false)
const dialogVisible = ref<ElRef>(false)
const dialogDirectiveVisible = ref<ElRef>(false)

const openDialog = () => {
  console.log('open dailog.')
  dialogVisible.value = true
}
const openDirectiveDialog = () => {
  dialogDirectiveVisible.value = true
}
const handleClose = (done: () => void) => {
  ElMessageBox.confirm('Are you sure to close this dialog?')
    .then(() => {
      done()
    })
    .catch(() => {
      // catch error
    })
}

const handleEdit = (index: number, row: User) => {
  console.log(index, row)
}
const handleDelete = (index: number, row: User) => {
  console.log(index, row)
}

const tableData: User[] = [
  {
    date: '2016-05-03',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles'
  },
  {
    date: '2016-05-02',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles'
  },
  {
    date: '2016-05-04',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles'
  },
  {
    date: '2016-05-01',
    name: 'Tom',
    address: 'No. 189, Grove St, Los Angeles'
  }
]
</script>

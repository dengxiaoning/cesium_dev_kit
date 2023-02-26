<template>
  <!-- 流程模板内容 -->
  <el-row class="proce-content">
    <el-col :span="24"
            class="proce-tem">
      <!-- 打印每一个流程卡片 -->
      <div v-for="(item,index) in calculationProce"
           :key="index">
        <article :class="index%2===0?'orient-right':'orient-left'">
          <section :class="cItem.type==='arrow'?index%2===0?'horizontal-arrow  right':
                    'horizontal-arrow  left':'proce-card'"
                   v-for="(cItem,cIndex) in item.children"
                   :key="index+'_'+cIndex">
            <el-card class="proc-card"
                     shadow="hover"
                     v-if="cItem.type!=='arrow'">
              <div class="proc-ctrl"><i class="el-icon-edit edit"
                   @click="editNodeData(cItem)"></i><i class="el-icon-delete del"
                   @click="delNodeById(cItem.id,cItem.nodeName)"></i></div>
              <span class="card-title">{{cItem.nodeName}}</span>
              <div class="exe">执行人</div>
              <el-tag class="tag"
                      v-if="cItem.handleGroupInfo.handleUsername">{{cItem.handleGroupInfo.handleUsername}}</el-tag>
              <el-tag class="tag"
                      v-if="cItem.handleGroupInfo.implementId">{{convertImpl(cItem.handleGroupInfo)}}</el-tag>
              <el-tag class="tag"
                      v-if="cItem.handleGroupInfo.groupId">{{convertGroup(cItem.handleGroupInfo)}}</el-tag>
              <div class="send">抄送人</div>
              <el-tag class="tag"
                      v-if="cItem.copyGroupInfo.handleUsername">{{cItem.copyGroupInfo.handleUsername}}</el-tag>
              <el-tag class="tag"
                      v-if="cItem.copyGroupInfo.implementId">{{convertImpl(cItem.copyGroupInfo)}}</el-tag>
              <el-tag class="tag"
                      v-if="cItem.copyGroupInfo.groupId">{{convertGroup(cItem.copyGroupInfo)}}</el-tag>
              <div class="proce-status"><span class="name">任务状态：</span><span class="status">{{cItem.taskName}}</span></div>
            </el-card>
            <span class="arrow"
                  v-if="cItem.type==='arrow'"></span>
          </section>
        </article>
        <article v-if="index<calculationProce.length-1">
          <section :class="index%2===0?'vertical-arrow right':'vertical-arrow left'">
            <span></span>
          </section>
        </article>
      </div>
      <!-- print card end -->
    </el-col>
  </el-row>
</template>
<script lang="ts">
import { defineComponent, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
export default defineComponent({
  setup() {
    const orgProceArr = reactive([
      {
        id: 67,
        nodeName: '流程001',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '0',
        timeRestrict: 2,
        handleStatus: '1',
        taskName: '未整改',
        eventStatus: '0',
        handleStatusCode: 'handel_event',
        eventStatusCode: 'handel_task',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '0',
        isFinal: null,
        sort: 0,
        handleGroupId: 175,
        copyGroupId: 176,
        handleGroupInfo: {
          id: 175,
          handleId: '113',
          handleUsername: 'test123',
          implementId: '',
          groupType: null,
          groupId: '',
          implementUserName: '',
          groupName: '',
          sign: null
        },
        handleClassification: '0',
        handleCont: '上级审核',
        handleContCode: 'handle_state',
        copyGroupInfo: {
          id: 176,
          handleId: '',
          handleUsername: '',
          implementId: '',
          groupType: 0,
          groupId: '3',
          implementUserName: '',
          groupName: '产品分析',
          sign: null
        }
      },
      {
        id: 68,
        nodeName: '流程002',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '0',
        timeRestrict: 2,
        handleStatus: '0',
        taskName: '审核通过',
        eventStatus: '0',
        handleStatusCode: 'examine_event',
        eventStatusCode: 'examine_task',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '1',
        isFinal: null,
        sort: 1,
        handleGroupId: 177,
        copyGroupId: 178,
        handleGroupInfo: {
          id: 177,
          handleId: '',
          handleUsername: '',
          implementId: '',
          groupType: 1,
          groupId: '103',
          implementUserName: '',
          groupName: '开发人员',
          sign: null
        },
        handleClassification: '1',
        handleCont: '下级处理',
        handleContCode: 'examine',
        copyGroupInfo: {
          id: 178,
          handleId: '',
          handleUsername: '',
          implementId: '',
          groupType: 0,
          groupId: '1',
          implementUserName: '',
          groupName: '产品分析',
          sign: null
        }
      },
      {
        id: 69,
        nodeName: '流程003',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '0',
        timeRestrict: 2,
        handleStatus: '1',
        taskName: '通过',
        eventStatus: '0',
        handleStatusCode: 'review_event',
        eventStatusCode: 'check_task',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '2',
        isFinal: null,
        sort: 2,
        handleGroupId: 179,
        copyGroupId: 180,
        handleGroupInfo: {
          id: 179,
          handleId: '107',
          handleUsername: '处理人员',
          implementId: '',
          groupType: null,
          groupId: '',
          implementUserName: '',
          groupName: '',
          sign: null
        },
        handleClassification: '1',
        handleCont: '已解决',
        handleContCode: 'review_state',
        copyGroupInfo: {
          id: 180,
          handleId: '100',
          handleUsername: '办事员',
          implementId: '',
          groupType: null,
          groupId: '',
          implementUserName: '',
          groupName: '',
          sign: null
        }
      },
      {
        id: 70,
        nodeName: '流程004',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '0',
        timeRestrict: 2,
        handleStatus: '2',
        taskName: '待复查',
        eventStatus: '0',
        handleStatusCode: 'check_event',
        eventStatusCode: 'review_task',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '3',
        isFinal: null,
        sort: 3,
        handleGroupId: 181,
        copyGroupId: 182,
        handleGroupInfo: {
          id: 181,
          handleId: '',
          handleUsername: '',
          implementId: '1',
          groupType: null,
          groupId: '',
          implementUserName: '本级',
          groupName: '',
          sign: null
        },
        handleClassification: '1',
        handleCont: '驳回',
        handleContCode: 'check_state',
        copyGroupInfo: {
          id: 182,
          handleId: '',
          handleUsername: '',
          implementId: '',
          groupType: 1,
          groupId: '105',
          implementUserName: '',
          groupName: 'test123',
          sign: null
        }
      },
      {
        id: 71,
        nodeName: '流程005',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '',
        timeRestrict: null,
        handleStatus: '1',
        taskName: '审核不通过',
        eventStatus: '0',
        handleStatusCode: 'examine_event',
        eventStatusCode: 'examine_task',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '1',
        isFinal: null,
        sort: 4,
        handleGroupId: 183,
        copyGroupId: 184,
        handleGroupInfo: {
          id: 183,
          handleId: '',
          handleUsername: '',
          implementId: '',
          groupType: 1,
          groupId: '103',
          implementUserName: '',
          groupName: '开发人员',
          sign: null
        },
        handleClassification: '1',
        handleCont: '下级处理',
        handleContCode: 'examine',
        copyGroupInfo: {
          id: 184,
          handleId: '',
          handleUsername: '',
          implementId: '0',
          groupType: 0,
          groupId: '2',
          implementUserName: '上级办事员',
          groupName: '美工设计',
          sign: null
        }
      },
      {
        id: 72,
        nodeName: '流程007',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '',
        timeRestrict: null,
        handleStatus: '1',
        taskName: '审核不通过',
        eventStatus: '0',
        handleStatusCode: 'examine_event',
        eventStatusCode: 'examine_task',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '1',
        isFinal: null,
        sort: 5,
        handleGroupId: 185,
        copyGroupId: 186,
        handleGroupInfo: {
          id: 185,
          handleId: '107',
          handleUsername: '处理人员',
          implementId: '',
          groupType: null,
          groupId: '',
          implementUserName: '',
          groupName: '',
          sign: null
        },
        handleClassification: '1',
        handleCont: '下级处理',
        handleContCode: 'examine',
        copyGroupInfo: {
          id: 186,
          handleId: '101',
          handleUsername: 'axianlu',
          implementId: '',
          groupType: null,
          groupId: '',
          implementUserName: '',
          groupName: '',
          sign: null
        }
      },
      {
        id: 73,
        nodeName: '流程008',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '',
        timeRestrict: null,
        handleStatus: '0',
        taskName: '审核通过',
        eventStatus: '0',
        handleStatusCode: 'examine_event',
        eventStatusCode: 'examine_task',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '1',
        isFinal: null,
        sort: 6,
        handleGroupId: 187,
        copyGroupId: 188,
        handleGroupInfo: {
          id: 187,
          handleId: '',
          handleUsername: '',
          implementId: '1',
          groupType: 0,
          groupId: '3',
          implementUserName: '本级',
          groupName: '产品分析',
          sign: null
        },
        handleClassification: '0',
        handleCont: '上级复查',
        handleContCode: 'examine',
        copyGroupInfo: {
          id: 188,
          handleId: '107',
          handleUsername: '处理人员',
          implementId: '',
          groupType: null,
          groupId: '',
          implementUserName: '',
          groupName: '',
          sign: null
        }
      },
      {
        id: 74,
        nodeName: '流程009',
        processId: 76,
        processingFlow: '',
        returnProcess: null,
        timeType: '',
        timeRestrict: null,
        handleStatus: '0',
        taskName: '待处理',
        eventStatus: '3',
        handleStatusCode: 'handel_task',
        eventStatusCode: 'handel_event',
        isNode: null,
        nodePaName: '',
        nodePid: null,
        operationType: '0',
        isFinal: null,
        sort: null,
        handleGroupId: 189,
        copyGroupId: 190,
        handleGroupInfo: {
          id: 189,
          handleId: '107',
          handleUsername: '处理人员',
          implementId: '',
          groupType: null,
          groupId: '',
          implementUserName: '',
          groupName: '',
          sign: null
        },
        handleClassification: '2',
        handleCont: '已解决',
        handleContCode: 'handle_state',
        copyGroupInfo: {
          id: 190,
          handleId: '',
          handleUsername: '',
          implementId: '2',
          groupType: null,
          groupId: '',
          implementUserName: '下级办事员',
          groupName: '',
          sign: null
        }
      }
    ])
    const calculationProce = computed(() => {
      let orgArr = orgProceArr
      let resProceArr = []
      // 循环原有的数组
      for (let i = 0; i < Math.ceil(orgArr.length / 3); i++) {
        // 组装子节点
        var childNode = []
        if (orgArr.length > i * 3) {
          childNode.push(orgArr[i * 3])
          // 如果还有下一个节点，就要加一个箭头数据
          if (orgArr.length > i * 3 + 1) {
            childNode.push({
              name: '流程标识',
              type: 'arrow'
            })
            childNode.push(orgArr[i * 3 + 1])
            if (orgArr.length > i * 3 + 2) {
              childNode.push({
                name: '流程标识',
                type: 'arrow'
              })
              childNode.push(orgArr[i * 3 + 2])
            }
          }
        }
        if (childNode.length > 0) {
          // 判断是否反转节点元素，在第二行时需要从右向左显示
          resProceArr.push({
            id: i,
            children: i % 2 !== 0 ? childNode.reverse() : childNode
          })
        }
      }
      return resProceArr
    })
    const convertImpl = (handleData: any) => {
      return '处理人的：' + handleData.implementUserName
    }
    const convertGroup = (handleData: any) => {
      if (handleData.groupType === 0) {
        return '部门：' + handleData.groupName
      } else {
        return '角色：' + handleData.groupName
      }
    }
    const editNodeData = (nodeItem: any) => {
      console.log(nodeItem)
    }
    /**
     * 根据id 删除一条数据
     */
    const delNodeById = (id: Number, nodeName: String) => {
      ElMessageBox.confirm(
        '是否确认删除编号为【' + nodeName + '】的数据项?',
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
        .then(() => {
          let delIndex = orgProceArr.findIndex((e: any) => e.id === id)
          delIndex > -1 ? orgProceArr.splice(delIndex, 1) : ''
          ElMessage({
            type: 'success',
            message: '删除成功'
          })
        })
        .catch(function () {
          ElMessage({
            type: 'success',
            message: '删除取消'
          })
        })
    }
    return {
      calculationProce,
      convertImpl,
      convertGroup,
      editNodeData,
      delNodeById
    }
  }
})
</script>
<style lang="scss" scoped>
.proce-content {
  height: calc(100vh - 160px);
  border-radius: 4px;
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 10px #e6ebf5;
  border: 2px solid #e6ebf5;
  background-color: #ffffff;
  .proce-tem {
    height: 100%;
    overflow-y: auto;
    article {
      display: flex;
      &.orient-left {
        justify-content: flex-end;
      }
      &.orient-right {
        justify-content: flex-start;
      }
      section {
        height: 192px;
        display: flex;
        justify-content: center;
        align-items: center;
        .proc-card {
          .proc-ctrl {
            float: right;
            cursor: pointer;
            .edit {
              color: #50abe4;
            }
            .del {
              margin-left: 12px;
              color: #ff0000;
            }
          }
          .card-title {
            font-size: 14px;
            font-weight: bolder;
          }
          .exe {
            margin: 4px 0px;
            font-size: 12px;
          }
          .send {
            margin: 4px 0px;
            font-size: 12px;
          }
          .tag {
            margin-left: 4px;
            margin-top: 2px;
          }
          .proce-status {
            margin-top: 6px;
            font-size: 12px;
            text-align: right;
            .name {
              color: #808080;
            }
            .status {
              color: #42b983;
            }
          }
        }

        :deep {
          .el-card {
            width: 98%;
            height: 96%;
            overflow-y: auto;
          }
        }
        &.proce-card {
          width: 30%;
          flex-basis: 30%;
        }
        &.horizontal-arrow {
          margin: 0px 10px;
          span.arrow {
            width: 80px;
            height: 20px;
            position: relative;
            background: #50abe4;
            // transform: rotate(90deg);
          }
        }
        &.horizontal-arrow.right {
          span.arrow {
            &:after {
              content: '';
              display: block;
              border-top: 20px solid transparent;
              border-bottom: 20px solid transparent;
              border-left: 30px solid #50abe4;
              position: absolute;
              right: 0px;
              top: -10px;
              z-index: 10;
              background: #fff;
            }
          }
        }
        &.horizontal-arrow.left {
          span.arrow {
            &::before {
              content: '';
              display: block;
              border-top: 20px solid transparent;
              border-bottom: 20px solid transparent;
              border-right: 30px solid #50abe4;
              position: absolute;
              left: 0px;
              top: -10px;
              z-index: 10;
              background: #fff;
            }
          }
        }
        &.vertical-arrow {
          width: 100%;
          height: 60px;
          span {
            width: 20px;
            height: 98%;
            position: relative;
            background: #50abe4;
            &::before {
              content: '';
              display: block;
              border-top: 30px solid #50abe4;
              border-right: 20px solid transparent;
              border-left: 20px solid transparent;
              position: absolute;
              left: -10px;
              bottom: 0px;
              z-index: 10;
              background: #fff;
            }
          }
        }
        &.vertical-arrow.right {
          justify-content: flex-end;
          span {
            margin-right: 20px;
          }
        }
        &.vertical-arrow.left {
          justify-content: flex-start;
          span {
            margin-left: 20px;
          }
        }
      }
    }
  }
  .proce-ctl {
    height: 100%;
    border-left: 1px solid #e6ebf5;
  }
}
</style>

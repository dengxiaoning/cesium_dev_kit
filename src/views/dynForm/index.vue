<template>
  <div class="app-container">
    <section class="dyn-form">
      <dynamic-create-form ref="dynaSonFormDom"
                           :dyna-form-data="dynaFormData"
                           :model="dynaform"
                           :rules="dynaFormRules"
                           label-width="130px">
        <template v-slot:quillslotname>
          <quill-edit :get-quill-dom="getQuillDom"
                      v-model:content="quillcontentData"
                      contentType="html"
                      defaultHeight="400px"
                      @textChange="contentchange"
                      :upload-img-fn="uploadImgFn" />
        </template>
        <template #areaChooseslot>
          <area-code @areaChoose="areaChooseItem"
                     v-model="defaultAreaCode"
                     :area-leave="1" />
        </template>
        <template #projectCodeSlot>
          <div class="icon-container">
            <CIcon icon-class="ep:edit"
                   icon-color="#333"
                   cust-class="proj-add-iconfont" />
          </div>
        </template>
        <template #remindLimitTime>
          <el-form-item>
            <el-checkbox label="知会时限"
                         v-model="dynaform.remindLimit"></el-checkbox>
            <el-checkbox label="notifHour"
                         v-model="dynaform.remindHourChose"><br /></el-checkbox>
            <el-input v-model="dynaform.remindHourNum"
                      class="adjuest-width-sixty"></el-input>
            <span>小时后</span>
          </el-form-item>
        </template>
        <template #footer>
          <el-form-item class="cust-flooter">
            <el-button type="primary"
                       @click="onSubmit">保存模板</el-button>
            <el-button>取消</el-button>
          </el-form-item>
        </template>
        <template #uploadAttachmentSlot>
          <upload-file @uploadFileCtrl="uploadFileCtrl"
                       :file-data-list="fileDataList" />
        </template>
        <!-- 保留字段slot begin-->
        <template v-for="(item,index) in keepFieldSlotArr"
                  v-slot:[item.slotNameStr]
                  :key="index">
          <div class="icon-container">
            <CIcon icon-class="el:remove-circle"
                   icon-color="#333"
                   cust-class="keep-field-iconfont"
                   @click="delKeepField(item)" />
          </div>
        </template>
        <!--保留字段slot end  -->
      </dynamic-create-form>
    </section>
    <section class="customer-field">
      <h3 style="margin-bottom:6px;">自定义字段</h3>
      <el-form ref="customerForm"
               :inline="true"
               :model="formInline"
               :rules="customerRules"
               class="demo-form-inline">
        <el-form-item label="自定义字段"
                      size="mini"
                      prop="propertyname">
          <el-select v-model="formInline.propertyname"
                     placeholder="选择自定义字段">
            <el-option v-for="(item,index) in keepFieldArr"
                       :label="item.label"
                       :value="item.value"
                       :disabled="item.disabled"
                       :key="index"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="字段名称"
                      size="mini"
                      prop="showname">
          <el-input placeholder="输入字段名称"
                    v-model="formInline.showname"></el-input>
        </el-form-item>
        <el-form-item label="输入方式"
                      size="mini"
                      prop="inputway">
          <el-select v-model="formInline.inputway"
                     @change="inputTypeChange"
                     placeholder="选择输入方式">
            <el-option label="input框输入"
                       value="input"></el-option>
            <el-option label="下拉(单选)输入"
                       value="select"></el-option>
            <el-option label="下拉(多选)输入"
                       value="multiSelect"></el-option>
            <el-option label="单选框输入"
                       value="radio"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="是否必填"
                      size="mini"
                      prop="ismust">
          <el-select v-model="formInline.ismust"
                     placeholder="选择是否必填">
            <el-option label="是"
                       value="1"></el-option>
            <el-option label="否"
                       value="0"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div>
        <el-button type="primary"
                   @click="confirmAddCustField">添加</el-button>
      </div>
    </section>

    <!-- 新建弹窗 -->
    <el-dialog v-model="dialogVisible"
               title="新增选项列表"
               width="380px"
               destroy-on-close>
      <el-form ref="addOptionsForm"
               :model="dynamicValidateForm"
               label-width="120px"
               class="demo-dynamic">
        <el-form-item prop="defaultOption"
                      label="选项名称"
                      :rules="[
        {
          required: true,
          message: '请输入内容',
          trigger: 'blur',
        },
      ]">
          <el-input v-model="dynamicValidateForm.defaultOption"></el-input>
        </el-form-item>
        <el-form-item v-for="(domain, index) in dynamicValidateForm.domains"
                      :key="domain.key"
                      :label="'选项名称' + index+1"
                      :prop="'domains.' + index + '.value'"
                      :rules="{
        required: true,
        message: '选项名称不能为空',
        trigger: 'blur',
      }">
          <el-input v-model="domain.value"
                    style="width:76%"></el-input>
          <el-button @click.prevent="removeDomain(domain)"
                     type="danger"
                     icon="el-icon-delete"
                     style="float:right"></el-button>
        </el-form-item>
        <el-form-item>
          <el-button @click="addDomain"
                     type="primary"
                     icon="el-icon-plus"
                     size="mini"></el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button type="primary"
                     @click="confirmAddOptions">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, reactive, ref, unref, nextTick } from 'vue'
// More info see https://github.com/element-plus/element-plus/blob/dev/docs/examples/form/utils.ts
// import { resetForm, submitForm } from './utils'
import type { ElForm } from 'element-plus'
import SubPart from '@/utils/dynamicForm/subPart'
import { Utils } from '@/utils'
import { uploadAvatar } from '@/api/systemMang'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
const PATH_URL: string = import.meta.env.VITE_GLOB_API_URL as string
interface JsonKeyVal {
  [key: string]: any
}
interface DomainItem {
  key: number
  value: string
}
export default defineComponent({
  setup() {
    onMounted(() => {
      initKeepArr()
      getProkeepFiled()
    })
    const dialogVisible = ref(false)
    const keepFieldArr: JsonKeyVal = reactive([])
    const addOptionsForm = ref<InstanceType<typeof ElForm>>()
    const customerForm = ref<InstanceType<typeof ElForm>>()
    const keepFieldSlotArr = ref<JsonKeyVal>([])
    // 新增字段form 数据
    const formInline = reactive({
      showname: '',
      propertyname: '',
      newpropertyname: '',
      inputway: '',
      ismust: ''
    })

    const initKeepArr = () => {
      let num = 1
      while (num < 7) {
        const joinKey = `field${num}`
        keepFieldSlotArr.value.push({
          slotNameStr: joinKey + 'CodeSlot',
          modelValueName: joinKey,
          labelName: '',
          type: ''
        })
        num++
      }
    }

    /**
     * 获取对应：dynaform（动态form v-model数据)，
     * groupCheckboxArr（checkbox 数组），
     * contentTemplate（动态创建form-item的json内容）
     */
    const { dynaform, dynaFormData, groupCheckboxArr, contentTemplate } =
      SubPart()
    // 上传文件的list 数据
    const fileDataList: any = []

    // 动态form document
    const dynaSonFormDom = ref()
    // 默认选中的数据，【注意】这个元素个数和层级相关，如areaLeave:2,那么应该有两个元素
    const defaultAreaCode: any = []
    // 富文本对象
    let quillEditDom: any = ''
    // 富文本默认数据
    const quillcontentData = ''
    //  valid form on dynamic form
    const dynaFormRules: any = reactive({
      projectName: [
        { required: true, trigger: 'blur', message: '项目名不能为空' }
      ],
      projCode: [
        { required: true, trigger: 'blur', message: '项目编号不能为空' }
      ],
      projType: [
        { required: true, trigger: 'change', message: '项目类型不能为空' }
      ],
      areaCode: [
        { required: true, trigger: 'change', message: '行政区划不能为空' }
      ]
    })

    // 自定义直段form验证
    const customerRules = {
      propertyname: [
        { required: true, trigger: 'change', message: '请选择自定义字段' }
      ],
      showname: [
        { required: true, trigger: 'blur', message: '字段名称不能为空' }
      ],
      inputway: [
        { required: true, trigger: 'change', message: '请选择输入方式' }
      ],
      ismust: [
        { required: true, trigger: 'change', message: '请选择输入是否必填' }
      ]
    }
    /**
     * 加载保留字段
     */
    const getProkeepFiled = () => {
      // 模拟接口调用
      const protectField = [
        'field1',
        'field2',
        'field3',
        'field4',
        'field5',
        'field6'
      ]
      protectField.forEach((e: any) => {
        keepFieldArr.push({
          label: e,
          value: e,
          disabled: false
        })
      })
    }

    const dynamicValidateForm = reactive<{
      domains: DomainItem[]
      defaultOption: string
    }>({
      domains: [],
      defaultOption: ''
    })

    const removeDomain = (item: DomainItem) => {
      const index = dynamicValidateForm.domains.indexOf(item)
      if (index !== -1) {
        dynamicValidateForm.domains.splice(index, 1)
      }
    }

    /**
     * 选项组件新增
     */
    const addDomain = () => {
      dynamicValidateForm.domains.push({
        key: Date.now(),
        value: ''
      })
    }

    /**
     * 自定义选项 确定新增
     */
    const confirmAddOptions = async () => {
      // 校验addOptionsForm
      const form = unref(addOptionsForm)
      if (!form) {
        return
      }
      try {
        await form.validate((valid: boolean) => {
          if (valid) {
            // 关闭新增对话框
            dialogVisible.value = false
          }
        })
      } catch (err) {
        console.log(err)
      }
    }

    const inputTypeChange = (e: any) => {
      if (e !== 'input') {
        dialogVisible.value = true
      }
    }

    /**
     * 确定新增自定义字段
     * 1、判断inputway如果不是input需要执行2
     * 2、获取对应的dynamicValidateForm数据，在1成立后判断是否为空
     * 3、封装成对应的json数据，添加到模板中
     * 4、根据选中的自定义字段，禁用keepFieldArr中对应的item（不允许二次选择）
     */
    const confirmAddCustField = async () => {
      // 校验addOptionsForm
      const form = unref(customerForm)
      if (!form) {
        return
      }
      try {
        await form.validate((valid: boolean) => {
          if (valid) {
            if (checkAddDataValid()) {
              assemblyDynJson()
            }
          }
        })
      } catch (err) {
        console.log(err)
      }
    }

    const inputTypeConst: {
      [key: string]: { [key: string]: string | boolean }
    } = {
      input: { type: 'el-input' },
      select: { type: 'el-select', custClass: 'adjuest-width-hundred' },
      multiSelect: {
        type: 'el-select',
        selectMultiple: true,
        custClass: 'adjuest-width-hundred'
      },
      radio: { type: 'el-radio-group' }
    }

    // 组织一个动态form-item的json
    const assemblyDynJson = () => {
      const custOptions = []
      if (dynamicValidateForm.defaultOption) {
        custOptions.push({
          value: dynamicValidateForm.defaultOption,
          label: dynamicValidateForm.defaultOption
        })
        dynamicValidateForm.domains.forEach((e) => {
          custOptions.push({
            value: e.value,
            label: e.value
          })
        })
      }
      const { showname, propertyname, newpropertyname, inputway, ismust } =
        formInline
      // 我们为每一个保留字段新增一个flag来实现后期的maintain操作
      const keepExtraProp = {
        slotName: propertyname + 'CodeSlot',
        colSpan: '',
        extraSlot: true,
        custClass: 'adjues-proj-code-width' // 自定义一个class
      }
      const obtainJson = {
        ...inputTypeConst[inputway],
        labelName: showname,
        modelValueName: propertyname,
        overElLabel: true,
        options: custOptions,
        ...keepExtraProp
      }
      try {
        addTag(obtainJson)
      } catch (error) {
        console.log(error)
      }
    }

    const checkAddDataValid = () => {
      let valid = true
      if (formInline.inputway !== 'input') {
        if (!dynamicValidateForm.defaultOption) {
          valid = false
          ElMessage.error('请为输入类型添加选项')
        }
      }
      return valid
    }

    // form 提交事件
    const onSubmit = async () => {
      var resss = quillEditDom.getHTML()

      const dnyformValid = unref(dynaSonFormDom)

      if (!dnyformValid) {
        return
      }
      try {
        await dnyformValid.$refs.dynaFormDom.validate((valid: boolean) => {
          if (valid) {
            console.log(
              'submit!',
              resss,
              Utils.parseTime(dynaform.dateline, '{y}-{m}-{d}'),
              unref(dynaform),
              unref(groupCheckboxArr)
            )
          }
        })
      } catch (err) {
        console.log(err)
      }
    }

    // 富文本编辑事件
    const contentchange = (res: any) => {
      console.log(res)
    }

    // 获取富文本dom对象
    const getQuillDom = (quill: any) => {
      quillEditDom = quill
    }

    // 富文本上传一个imageInstance
    const uploadImgFn = (imageInstance: File, cb: Function) => {
      const loading = ElLoading.service()
      // 创建formData
      let formData = new FormData()
      let fileExtension = imageInstance.name.split('.').pop()
      formData.append('fileObj', imageInstance)
      formData.append('fileSuffix', fileExtension + '')
      // 然后我调用上传把文件上传到服务器，在把所得到的img url 返回给quill
      uploadAvatar(formData)
        .then((response: any) => {
          if (response.code === 200) {
            const imguri = PATH_URL + response.address
            cb(imguri)
          } else {
            cb(null)
          }
          loading.close()
        })
        .catch((err: any) => {
          cb(null)
          console.log(err)
          loading.close()
        })
    }
    // 获取选中的行政区划代码
    const areaChooseItem = (res: any) => {
      dynaform['areaCode'] = res.areaCode.join(',')

      console.log(
        'receive area from children com:',
        res,
        ' dynaform-areaCode: ',
        dynaform['areaCode']
      )
    }

    // 新增操作
    const addTag = (createJson: any) => {
      const formItemSub = dynaFormData.formItem
      // 在formdata中增加对于的v-model字段
      dynaform[createJson.modelValueName] =
        formInline.inputway === 'multiSelect' ? [] : ''
      // 在对于的role 数组中新增校验规则
      // 判断是否需要必填
      if (formInline.ismust === '1') {
        dynaFormRules[createJson.modelValueName] = [
          {
            required: true,
            trigger: createJson.type === 'input' ? 'blur' : 'change',
            message: createJson.labelName + '不能为空'
          }
        ]
      }
      // 在dynaFormData数组中倒数2的位置增加一个新的组件
      const lastSub: any = formItemSub[formItemSub.length - 4]

      if (lastSub.children.length < 2) {
        // 在row 中新增一个col子节点
        const colObj = Utils.objectDeepMerge(contentTemplate, {
          type: 'el-col'
        })
        // 只需要修改个别的值，其它使用默认

        // 创建一个子组件对象
        const radioObj = Utils.objectDeepMerge(contentTemplate, createJson) // 只需要修改个别的值，其它使用默认

        // 修改其children
        colObj.children.push(radioObj)
        // 再append 到主数据上去
        lastSub.children.push(colObj)
      } else {
        // 创建行对象
        const rowObj = Utils.objectDeepMerge(contentTemplate, {
          type: 'el-row'
        })
        // 创建一个col
        const colObj2 = Utils.objectDeepMerge(contentTemplate, {
          type: 'el-col',
          colSpan: 12
        })

        // 创建一个组件对象
        const compsObj = Utils.objectDeepMerge(contentTemplate, createJson)

        rowObj['children'].push(colObj2)
        colObj2.children.push(compsObj)
        formItemSub.splice(formItemSub.length - 3, 0, rowObj)
      }
      let resetKeepfield: JsonKeyVal = unref(keepFieldSlotArr)
      // 更新保留字段slot数组,用于删除时提示
      resetKeepfield.forEach((e: JsonKeyVal) => {
        if (e.modelValueName === createJson.modelValueName) {
          e.labelName = createJson.labelName
          e.type = createJson.type
        }
      })
      resetFormAfterAddField()
    }

    // 保留字段新增后重置，form中内容
    const resetFormAfterAddField = () => {
      dynamicValidateForm.domains = []
      dynamicValidateForm.defaultOption = ''
      // 禁用已经选择的保留字段
      keepFieldArr.forEach((item: any) => {
        if (item.value === formInline.propertyname) {
          item.disabled = true
        }
      })
      const customerFormREST = unref(customerForm)
      customerFormREST.resetFields()
    }

    // 文件上传callback
    const uploadFileCtrl = (fileList: Array<any>) => {
      console.log(fileList)
    }

    /**
     * 将el-row中的children向前移动
     */
    const recursionMoveDynFormItem = (
      parentNode: any,
      chilNode: any,
      preIndex: number,
      findModelType: string
    ) => {
      chilNode.forEach((item: any, index: number) => {
        const modelType = item.type
        if (modelType === findModelType && item.children.length < 2) {
          // 找到该数据
          if (!parentNode) {
            if (item.children <= 0) {
              // 当 children 为空时
              chilNode.splice(index, 1)
            } else if (chilNode.length - 1 > index) {
              if (!chilNode[index + 1]) {
                // 如果他的children 为空，那么就该删除了
                // delete chilNode[index]
                chilNode.splice(index, 1) // 将children中的undefined移除
              } else if (chilNode[index + 1]['type'] === findModelType) {
                if (chilNode[index + 1]['children'][0]) {
                  item.children.push(chilNode[index + 1]['children'][0])
                  chilNode[index + 1]['children'].splice(0, 1)
                } else {
                  // delete chilNode[index + 1]
                  chilNode.splice(index + 1, 1)
                }
              }
            }
          }
          // if it is el-row
          else if (parentNode.length - 1 > preIndex) {
            if (parentNode[preIndex + 1]['type'] === findModelType) {
              if (parentNode[preIndex + 1]['children'][0]) {
                item.children.push(parentNode[preIndex + 1]['children'][0])
                parentNode[preIndex + 1]['children'].splice(0, 1)
              } else {
                // delete parentNode[preIndex + 1]
                parentNode.splice(preIndex + 1, 1)
              }
            }
          } else if (parentNode.length <= 1) {
            parentNode.splice(preIndex, 1)
          }
        } else if (item.children && item.children.length > 0) {
          recursionMoveDynFormItem(
            chilNode,
            item.children,
            index,
            findModelType
          )
        }
      })
    }

    // 根据modelValueName递归删除formItem
    const recursionDelDynFormItem = (
      parentNode: any,
      chilNode: any,
      preIndex: Number,
      findModelStr: string
    ) => {
      chilNode.forEach((item: any, index: Number) => {
        const modelkey = item.modelValueName
        if (findModelStr === modelkey) {
          parentNode.splice(preIndex, 1)
        } else if (item.children && item.children.length > 0) {
          recursionDelDynFormItem(chilNode, item.children, index, findModelStr)
        }
      })
    }
    /**
     * 保留字段组件删除操作
     */
    const delKeepField = (item: JsonKeyVal) => {
      ElMessageBox.confirm(
        '确定删除【' + item.labelName || '该组件' + '】组件?',
        '系统提示',
        {
          confirmButtonText: 'OK',
          cancelButtonText: 'Cancel',
          type: 'warning'
        }
      )
        .then(() => {
          const dynFormItem = dynaFormData.formItem
          recursionDelDynFormItem('', dynFormItem, 0, item.modelValueName)
          recursionMoveDynFormItem('', dynFormItem, -1, 'el-row')
          // nextTick(() => {
          //   recursionMoveDynFormItem('', dynFormItem, -1, 'el-row')
          // })

          // 同时解除保留字段禁用
          keepFieldArr.forEach((kItem: JsonKeyVal) => {
            if (kItem.value === item.modelValueName) {
              kItem.disabled = false
            }
          })
        })
        .catch((e: any) => {
          console.log(e)
          ElMessage({
            type: 'info',
            message: 'Delete canceled'
          })
        })
    }
    return {
      formInline,
      dialogVisible,
      dynamicValidateForm,
      addOptionsForm,
      keepFieldArr,
      addDomain,
      removeDomain,
      confirmAddOptions,
      inputTypeChange,
      onSubmit,
      quillcontentData,
      contentchange,
      getQuillDom,
      uploadImgFn,
      areaChooseItem,
      defaultAreaCode,
      fileDataList,
      dynaFormData,
      dynaform,
      groupCheckboxArr,
      dynaFormRules,
      dynaSonFormDom,
      uploadFileCtrl,
      customerRules,
      customerForm,
      confirmAddCustField,
      delKeepField,
      keepFieldSlotArr
    }
  }
})
</script>

<style lang="scss" scoped>
.app-container {
  .dyn-form {
    form {
      padding: 20px;
      background-color: #fff;
    }
    :deep(.adjues-proj-code-width) {
      width: 93%;
    }

    :deep(.adjuest-width-hundred) {
      width: 100%;
    }
    .adjuest-width-sixty {
      margin-right: 4px;
      margin-left: 4px;
      width: 40px;
    }
    .icon-container {
      display: inline-block;
      width: 4%;
      height: 100%;
      margin-left: 4px;
      cursor: pointer;
    }
    .keep-field-iconfont {
      &:hover {
        color: red !important;
      }
    }
    :deep(.el-row) {
      margin-bottom: 18px;
    }
    .cust-flooter {
      margin-top: 18px;
      text-align: center;
    }
  }
  .customer-field {
    padding: 20px;
  }
}
</style>
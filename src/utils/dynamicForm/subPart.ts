import {
  reactive,
  ref
} from 'vue'
import type {FormItemFormat,JsonObj} from './templateInterface'


export default function () {
  /**
   * checkbox v-model映射数组
   */
  const groupCheckboxArr = ref([])
  /**
   * form 表单v-model映射的data
   */
  const dynaform:JsonObj = reactive({
    projectName: '',
    projType: '',
    projCode: '',
    bussionPerson: '',
    dateline: '2021-12-22',
    finishDate: '2021-12-29',
    delivery: false,
    notifPerson: '',
    remindLimit: false,
    remindHourChose: false,
    remindHourNum: '',
    indestry: '',
    areaCode:''
  })


  /**
   * 动态创建的form-item 的json object内容模板
   */
  const contentTemplate:FormItemFormat = {
    labelName: '', // label name
    modelValueName: '', // 组件的v-model 绑定的name
    type: '', // 组件类型
    slotName: '', // 具名slot 的name
    colSpan: 12, // col 占用列数
    noElItem: false, // 直接使用slot， 外层不使用el-form-iten
    extraSlot: false, // 在el-form-item中已经添加组件（input or select）的基础上再附加一个slot
    custClass: '', // 在组件上增加一个自定义的class style
    overElLabel: false, // 是否重写el label
    selectMultiple: false, // select multi
    options: [], //  select and radio or checkbox  的options
    children: []
  }
  /**
   * 创建form-item 的原始json 
   */
  const dynaFormData = reactive({
    modelName: dynaform,
    modelNameCheckbox: groupCheckboxArr,
    formItem: [{
        labelName: '项目名称',
        modelValueName: 'projectName',
        type: 'el-input',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        slotName: '',
        children: []
      },
      {
        labelName: '',
        modelValueName: '',
        type: 'el-row',
        slotName: '',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        children: [{
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [
            
            {
              labelName: '项目类型',
              modelValueName: 'projType',
              type: 'el-select',
              slotName: '',
              colSpan: '',
              extraSlot: false, // 需要附加一个slot
              custClass: 'adjuest-width-hundred', // 自定义一个class
              selectMultiple: true,
              options: [{
                  label: '内部项目',
                  value: '1'
                },
                {
                  label: '转包项目',
                  value: '2'
                }
              ]
            }]
        },
        {
          labelName: '',
          modelValueName: '',
          type: 'el-col',
          slotName: '',
          colSpan: 12,
          noElItem: false,
          extraSlot: false,
          custClass: '',
          children: [{
            labelName: '项目编号',
            modelValueName: 'projCode',
            type: 'el-input',
            slotName: 'projectCodeSlot',
            colSpan: '',
            extraSlot: true,
            custClass: 'adjues-proj-code-width' // 自定义一个class
          }]
        }
        ]
      },
      {
        labelName: '',
        modelValueName: '',
        type: 'el-row',
        slotName: '',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        children: [{
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '行政区划',
              modelValueName: 'areaCode',
              type: 'slot',
              slotName: 'areaChooseslot',
              colSpan: '',
              noElItem: false,
              extraSlot: false,
              custClass: ''
            }]
          },
          {
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '行业',
              modelValueName: 'bussionPerson',
              type: 'el-select',
              slotName: '',
              colSpan: '',
              noElItem: false,
              extraSlot: false,
              overElLabel: true,
              custClass: 'adjuest-width-hundred',
              options: [{
                  label: '张三',
                  value: '1'
                },
                {
                  label: '李四',
                  value: '2'
                }
              ]
            }]
          }
        ]
      },
      {
        labelName: '',
        modelValueName: '',
        type: 'el-row',
        slotName: '',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        children: [{
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '客户对象',
              modelValueName: 'clientObj',
              type: 'el-input',
              slotName: '',
              colSpan: '',
              noElItem: false,
              extraSlot: false,
              overElLabel: true,
              custClass: ''
            }]
          },
          {
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '合同金额',
              modelValueName: 'contectTotal',
              type: 'el-input',
              slotName: '',
              colSpan: '',
              noElItem: false,
              extraSlot: false,
              overElLabel: true,
              custClass: 'adjuest-width-hundred',
              options: []
            }]
          }
        ]
      },
      {
        labelName: '',
        modelValueName: '',
        type: 'el-row',
        slotName: '',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        children: [{
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '投标日期',
              modelValueName: 'dateline',
              type: 'el-date-picker',
              slotName: '',
              colSpan: '',
              overElLabel: true,
              extraSlot: false, // 需要附加一个slot
              custClass: 'adjuest-width-hundred' // 自定义一个class
            }]
          },
          {
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '合同签订日期',
              modelValueName: 'finishDate',
              type: 'el-date-picker',
              slotName: '',
              colSpan: '',
              noElItem: false,
              extraSlot: false,
              overElLabel: true,
              custClass: 'adjuest-width-hundred'
            }]
          }
        ]
      },
      {
        labelName: '',
        modelValueName: '',
        type: 'el-row',
        slotName: '',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        children: [{
          labelName: '',
          modelValueName: '',
          type: 'el-col',
          slotName: '',
          colSpan: 12,
          noElItem: false,
          extraSlot: false,
          custClass: '',
          children: [{
            labelName: '项目管理人',
            modelValueName: 'proMange',
            type: 'el-select',
            slotName: '',
            colSpan: '',
            overElLabel: true,
            extraSlot: false, // 需要附加一个slot
            noElItem: false,
            custClass: 'adjuest-width-hundred', // 自定义一个class
            options: [{
                label: '制造',
                value: '1'
              },
              {
                label: '水利',
                value: '2'
              }
            ]
          }]
        },{
          labelName: '',
          modelValueName: '',
          type: 'el-col',
          slotName: '',
          colSpan: 12,
          noElItem: false,
          extraSlot: false,
          custClass: '',
          children: [{
            labelName: '商务人员',
            modelValueName: 'bussionMan',
            type: 'el-select',
            slotName: '',
            colSpan: '',
            overElLabel: true,
            extraSlot: false, // 需要附加一个slot
            noElItem: false,
            custClass: 'adjuest-width-hundred', // 自定义一个class
            options: [{
                label: '张三',
                value: '1'
              },
              {
                label: '李四',
                value: '2'
              }
            ]
          }]
        }]
      },
      {
        labelName: '',
        modelValueName: '',
        type: 'el-row',
        slotName: '',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        children: [{
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 6,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '知会相关人员',
              modelValueName: 'notifPerson',
              type: 'el-switch',
              slotName: '',
              colSpan: '',
              extraSlot: false, // 需要附加一个slot
              custClass: ' ' // 自定义一个class
            }]
          },
          {
            labelName: '',
            modelValueName: '',
            type: 'el-col',
            slotName: '',
            colSpan: 12,
            noElItem: false,
            extraSlot: false,
            custClass: '',
            children: [{
              labelName: '时限',
              modelValueName: 'bussionPerson',
              type: 'slot',
              slotName: 'remindLimitTime',
              colSpan: '',
              noElItem: true,
              extraSlot: false,
              custClass: ''
            }]
          }
        ]
      },
      {
        labelName: '投标内容简述',
        modelValueName: 'quillslotname',
        type: 'slot',
        slotName: 'quillslotname',
        colSpan: '',
        noElItem: false,
        extraSlot: false,
        custClass: '',
        overElLabel: true,
        children: []
      },
      {
        labelName: '上传招标书',
        modelValueName: 'uploadAttach',
        type: 'slot',
        slotName: 'uploadAttachmentSlot',
        colSpan: '',
        extraSlot: false, // 需要附加一个slot
        noElItem: false,
        custClass: ' ', // 自定义一个class
        options: []
      },
      {
        labelName: '页脚',
        modelValueName: 'formfooter',
        type: 'slot',
        slotName: 'footer',
        colSpan: '',
        noElItem: true, // 不需要el-form-item
        extraSlot: false, // 需要附加一个slot
        custClass: '', // 自定义一个class
        children: []
      }
    ]
  })

  return {
    dynaform,
    dynaFormData,
    groupCheckboxArr,
    contentTemplate
  }
}
import {defineComponent,PropType } from 'vue'
import type {FormItemFormat,PropsFormat,FormdataFormat} from '@/utils/dynamicForm/templateInterface'


const DynamicForm = defineComponent({
  name: 'AreaCodeCom',
  props: {
    dynaFormData: {
      type: Object as PropType <FormdataFormat>,
      default: {}
   }
  },
  setup(props: PropsFormat, { slots, attrs, expose }) {

    const combCom =(fItem:Array<FormItemFormat>) => {
      const formItem = []
    
      for (let i = 0; i < fItem.length; i++){
        const subItem = fItem[i];
          const modelFormObj = props.dynaFormData.modelName
          const { slotName,modelValueName, overElLabel, selectMultiple } = subItem;
          const itemChildren = subItem['children'];

          const custLabelSlots = {
            label: () => overElLabel?<div style="display:inline-block;"><span style="margin-right:4px;">{subItem['labelName']}</span>
              <el-checkbox label={modelValueName} style="margin-right:-8px;"><br /></el-checkbox></div> :
              <span style="margin-right:4px;">{subItem['labelName']}</span>
          };
          if (subItem['type'] === 'el-input') {
            formItem.push(<el-form-item v-slots={custLabelSlots} prop={modelValueName}>
              <el-input v-model={modelFormObj[modelValueName]} class={subItem['custClass']}></el-input>
                {/* @ts-ignore */}
              {subItem['extraSlot']?slots[slotName]():''}
            </el-form-item>)
          } else if (subItem['type'] === 'slot') {
            if (subItem['noElItem']) {
              formItem.push(<div style="margin-bottom:18px;"> 
              {/* @ts-ignore */}
              {slots[slotName]()}</div>
            )
            } else {
                formItem.push(<el-form-item v-slots={custLabelSlots} prop={modelValueName}> 
                {/* @ts-ignore */}
                {slots[slotName]()}</el-form-item>
              )
            }
          } else if (subItem['type'] === 'el-row') {
            formItem.push(<el-row>
              {itemChildren&&itemChildren.length>0?combCom(itemChildren):''}
            </el-row>)
          } else if (subItem['type'] === 'el-col') {
            formItem.push(<el-col span={subItem['colSpan']}>
                {itemChildren&&itemChildren.length>0?combCom(itemChildren):''}
            </el-col>)
          } else if (subItem['type'] === 'el-select') {
              const selectOptions = subItem['options']
            
              const optionsArr:any = []
              selectOptions.forEach((item, index) => {
                optionsArr.push( <el-option
                key={index}
                label={item.label}
                value={item.value}></el-option>)
              })

            formItem.push(<el-form-item v-slots={custLabelSlots} prop={modelValueName}> 
              <el-select v-model={modelFormObj[modelValueName]} class={subItem['custClass']} multiple={selectMultiple}>
            {...optionsArr}
              </el-select>
                  {/* @ts-ignore */}
                  {subItem['extraSlot']?slots[slotName]():''}
            </el-form-item>)
          } else if (subItem['type'] === 'el-switch') {
            formItem.push(<el-form-item v-slots={custLabelSlots} prop={modelValueName}> 
              <el-switch v-model={modelFormObj[modelValueName]}></el-switch>
            </el-form-item>)
          } else if (subItem['type'] === 'el-date-picker') {
            formItem.push(<el-form-item v-slots={custLabelSlots} prop={modelValueName} > 
              <el-date-picker v-model={modelFormObj[modelValueName]} type="date" class={subItem['custClass']}>
             </el-date-picker>
            </el-form-item>)
          } else if (subItem['type'] === 'el-radio-group') {
            const selectOptions = subItem['options']
            
              const optionsArr:any = []
              selectOptions.forEach((item, index) => {
                optionsArr.push(<el-radio
                key={index}
                label={item.value}
               >{item.label}</el-radio>)
              })
            formItem.push(<el-form-item v-slots={custLabelSlots} prop={modelValueName}> 
               <el-radio-group v-model={modelFormObj[modelValueName]}>
               {...optionsArr}
              </el-radio-group>
                  {/* @ts-ignore */}
                  {subItem['extraSlot']?slots[slotName]():''}
            </el-form-item>)
          }
      }

      return formItem
    }

    return () => <el-form {...attrs} ref="dynaFormDom">
      <el-checkbox-group v-model={props.dynaFormData.modelNameCheckbox} >
        {combCom(props.dynaFormData.formItem)}
      </el-checkbox-group>
    </el-form>
  },
})

export default DynamicForm
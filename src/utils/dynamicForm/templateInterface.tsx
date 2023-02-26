export interface Options{
  label: String,
  value:String
}
export interface FormItemFormat{
  labelName:string,  // label name
  modelValueName:string, // 组件的v-model 绑定的name
  type:string, // 组件类型
  slotName:string, // 具名slot 的name
  colSpan: Number, // col 占用列数
  noElItem: Boolean, // 直接使用slot， 外层不使用el-form-iten
  extraSlot: Boolean, // 在el-form-item中已经添加组件（input or select）的基础上再附加一个slot
  custClass: String, // 在组件上增加一个自定义的class style
  overElLabel: Boolean, // 是否重写el label
  selectMultiple:Boolean, // select multi
  options:Array<Options>, //  select and radio or checkbox  的options
  children:Array<FormItemFormat>
}
export interface FormdataFormat{
  modelName: any,
  modelNameCheckbox:any,
formItem:Array<FormItemFormat>
}
export interface PropsFormat{
  dynaFormData:FormdataFormat
}

export interface JsonObj{
  [key:string]:any
}
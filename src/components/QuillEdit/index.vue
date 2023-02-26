<template>
  <QuillEditor ref="quillDom"
               :options="custOptions"
               :style="{'height':defaultHeight}"
               v-bind="$attrs" />
</template>
<script  lang="ts">
import { defineComponent, onMounted, ref, unref } from 'vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { ElMessage } from 'element-plus'

interface Props {
  resetOptions: Object
  defaultHeight: string
  getQuillDom: Function
  uploadImgFn: Function
}
// 工具栏配置
const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'], // 加粗 斜体 下划线 删除线 -----['bold', 'italic', 'underline', 'strike']
  ['blockquote', 'code-block'], // 引用  代码块-----['blockquote', 'code-block']
  [{ header: 1 }, { header: 2 }], // 1、2 级标题-----[{ header: 1 }, { header: 2 }]
  [{ list: 'ordered' }, { list: 'bullet' }], // 有序、无序列表-----[{ list: 'ordered' }, { list: 'bullet' }]
  [{ script: 'sub' }, { script: 'super' }], // 上标/下标-----[{ script: 'sub' }, { script: 'super' }]
  [{ indent: '-1' }, { indent: '+1' }], // 缩进-----[{ indent: '-1' }, { indent: '+1' }]
  [{ direction: 'rtl' }], // 文本方向-----[{'direction': 'rtl'}]
  [{ size: ['small', false, 'large', 'huge'] }], // 字体大小-----[{ size: ['small', false, 'large', 'huge'] }]
  [{ header: [1, 2, 3, 4, 5, 6, false] }], // 标题-----[{ header: [1, 2, 3, 4, 5, 6, false] }]
  [{ color: [] }, { background: [] }], // 字体颜色、字体背景颜色-----[{ color: [] }, { background: [] }]
  [{ font: [] }], // 字体种类-----[{ font: [] }]
  [{ align: [] }], // 对齐方式-----[{ align: [] }]
  ['clean'], // 清除文本格式-----['clean']
  ['link', 'image'] // 链接、图片、视频-----['link', 'image', 'video']
]

export default defineComponent({
  components: {
    QuillEditor
  },
  props: {
    resetOptions: {
      type: Object,
      default: {}
    },
    defaultHeight: {
      type: String,
      default: '200px'
    },
    // 获取quill dom的function
    getQuillDom: {
      type: Function,
      default: null
    },
    // 上传图片的function
    uploadImgFn: {
      type: Function,
      default: null
    }
  },
  setup(props: Props) {
    const quillDom = ref()
    onMounted(() => {
      if (props.getQuillDom) {
        props.getQuillDom(unref(quillDom))
      }
    })

    // 重写image上传事件
    const overrideHandlers = {
      image: function image() {
        var self = this as any
        if (props.uploadImgFn) {
          // 对image 进行处理
          var fileInput = self.container.querySelector(
            'input.ql-image[type=file]'
          )
          if (fileInput === null) {
            fileInput = document.createElement('input')
            fileInput.setAttribute('type', 'file')

            fileInput.classList.add('ql-image')
            // 监听选择文件
            fileInput.addEventListener('change', function () {
              if (checkImgType(fileInput.files[0])) {
                // 调用接口进行图片上传(使用传入的fn参数)
                props.uploadImgFn(fileInput.files[0], function (imguri: any) {
                  if (imguri) {
                    let length = self.quill.getSelection(true).index
                    //这里很重要，你图片上传成功后，img的src需要在这里添加，res.path就是你服务器返回的图片链接。
                    self.quill.insertEmbed(length, 'image', imguri)
                    self.quill.setSelection(length + 1)
                  }
                  fileInput.value = ''
                })
              } else {
                ElMessage.error('只能上传图片！')
              }
            })
            self.container.appendChild(fileInput)
          }
          fileInput.click()
        }
      }
    }
    // Please reference https://vueup.github.io/vue-quill/guide/options.html#option-attributes
    const custOptions = Object.assign(
      {},
      {
        debug: false, // 'error', 'warn', 'log', or 'info' | boolean(true,false)
        modules: {
          toolbar: {
            container: toolbarOptions,
            handlers: overrideHandlers // 事件重写 Please reference https://www.cnblogs.com/shuihanxiao/p/11081035.html
          }
        },
        placeholder: '请录入数据...',
        theme: 'snow'
      },
      props.resetOptions
    )
    return {
      custOptions,
      quillDom
    }
  }
})
function checkImgType(file: File) {
  if (/\.(jpg|jpeg|png|GIF|JPG|PNG)$/.test(file.name)) {
    return true
  } else {
    return false
  }
}
</script>
<style>
.editor {
  line-height: normal !important;
  height: 500px;
}
.ql-snow .ql-tooltip[data-mode='link']::before {
  content: '请输入链接地址:';
}
.ql-snow .ql-tooltip.ql-editing a.ql-action::after {
  border-right: 0px;
  content: '保存';
  padding-right: 0px;
}

.ql-snow .ql-tooltip[data-mode='video']::before {
  content: '请输入视频地址:';
}

.ql-snow .ql-picker.ql-size .ql-picker-label::before,
.ql-snow .ql-picker.ql-size .ql-picker-item::before {
  content: '14px';
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value='small']::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value='small']::before {
  content: '10px';
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value='large']::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value='large']::before {
  content: '18px';
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value='huge']::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value='huge']::before {
  content: '32px';
}

.ql-snow .ql-picker.ql-header .ql-picker-label::before,
.ql-snow .ql-picker.ql-header .ql-picker-item::before {
  content: '文本';
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value='1']::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value='1']::before {
  content: '标题1';
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value='2']::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value='2']::before {
  content: '标题2';
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value='3']::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value='3']::before {
  content: '标题3';
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value='4']::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value='4']::before {
  content: '标题4';
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value='5']::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value='5']::before {
  content: '标题5';
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value='6']::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value='6']::before {
  content: '标题6';
}

.ql-snow .ql-picker.ql-font .ql-picker-label::before,
.ql-snow .ql-picker.ql-font .ql-picker-item::before {
  content: '标准字体';
}
.ql-snow .ql-picker.ql-font .ql-picker-label[data-value='serif']::before,
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value='serif']::before {
  content: '衬线字体';
}
.ql-snow .ql-picker.ql-font .ql-picker-label[data-value='monospace']::before,
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value='monospace']::before {
  content: '等宽字体';
}
</style>
<template>
  <el-upload ref="upload-com"
             class="upload-demo"
             action=""
             :multiple="false"
             :auto-upload="false"
             :before-upload="handleBeforeUpload"
             :on-remove="handleOnRemove"
             :on-change="handleOnchange"
             :file-list="fileListCache">
    <template #trigger>
      <el-button size="small"
                 type="primary">选择文件</el-button>
    </template>
    <el-button style="margin-left: 10px"
               size="small"
               type="success"
               @click="submitUpload">上传</el-button>
    <template #tip>
      <div class="el-upload__tip">
        文件不能大于10M
      </div>
    </template>
  </el-upload>
</template>
<script >
import { defineComponent, ref } from 'vue'
// import { ElMessage } from 'element-plus'
export default defineComponent({
  props: {
    fileDataList: {
      type: Array,
      default: () => []
    },
    sameFileReplace: {
      type: Boolean,
      default: true
    }
  },
  emits: ['uploadFileCtrl'],
  setup (props, { emit }) {
    const fileListCache = ref(props.fileDataList)
    const submitUpload = () => {
      if (fileListCache.value.length > 0) {
        emit('uploadFileCtrl', fileListCache.value)
      } else {
        ElMessage.error('请选择需要上传的文件')
      }
    }
    const handleOnchange = (file, fileList) => {
      //这表示是添加行为
      if (file.status === 'ready') {
        let myFile = file.raw;

        // const type = myFile.type.toLowerCase();
        // const isXML = type === 'text/xml' || type === 'application/xml';
        // const isZip = type === 'application/zip' || type === 'application/x-zip-compressed';
        // if (!(isXML || isZip)) {
        //   fileList.pop();
        //   ElMessage.error('上传的文件格式不正确')
        //   // 无论是不是增加新文件都更新长度信息
        //   return;
        // }

        // 文件大小控制
        let fileSizeByte = myFile.size;
        fileSizeByte = Math.round(fileSizeByte / 1024 * 100) / 100;

        if (fileSizeByte > 10 * 1024) {
          fileList.pop();
          ElMessage.error('文件不能大于10M')

          // 无论是不是增加新文件都更新长度信息
          return;
        }

        const fileIndex = getFileIndex(file, fileList.slice(0, fileList.length - 1));

        if (fileIndex >= 0) {
          if (props.sameFileReplace) {
            fileList[fileIndex] = file;
            fileList.pop();
            cacheFileList(fileList)
            ElMessage.error(`${myFile.name}文件重复，已覆盖该文件`);
          } else {
            fileList.pop();
            cacheFileList(fileList)
            ElMessage.error(`${myFile.name}文件重复，未覆盖该文件`);
          }
        } else {
          cacheFileList(fileList)
        }

      }
    }
    // remove file handler
    const handleOnRemove = (file, fileList) => {
      cacheFileList(fileList)
    }
    const cacheFileList = (fileList) => {
      fileListCache.value = fileList
    }

    // 获取已存在的文件的下标
    const getFileIndex = (file, fileList) => {
      return fileList.findIndex(item => {
        if (item.hasOwnProperty('raw')) {
          return item.raw.type === file.raw.type
            && item.raw.name === file.raw.name
            && item.raw.size === file.raw.size
        } else {
          return item.name === file.raw.name
        }

      })
    }
    const handleBeforeUpload = (file) => {
      console.log(file)
    }
    return {
      handleOnchange,
      handleBeforeUpload,
      submitUpload,
      fileListCache,
      handleOnRemove
    }
  },
})
</script>

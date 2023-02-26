<template>
  <elui-china-area-dht @change="onChange"
                       class="elui-com"
                       :leave="areaLeave"
                       :isall="areaIsall"></elui-china-area-dht>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { EluiChinaAreaDht } from 'elui-china-area-dht'

const chinaData = new EluiChinaAreaDht.ChinaArea().chinaAreaflat
export default defineComponent({
  props: {
    areaLeave: {
      // 显示的层级
      type: Number,
      default: 3
    },
    areaIsall: {
      // 是否在选项中显示'全部'选项
      type: Boolean,
      default: false
    }
  },
  emits: ['areaChoose'],
  components: {
    EluiChinaAreaDht
  },
  setup(props: any, { emit }: any) {
    function onChange(e: any) {
      const chooseNum = e.length
      const areaCode = []
      let areaLabel = ''
      // 将选中的数据返回
      for (let i = 0; i < chooseNum; i++) {
        areaCode.push(e[i])
        if (i === chooseNum - 1) {
          areaLabel = chinaData[e[i]]['label']
        }
      }
      emit('areaChoose', {
        areaCode,
        areaLabel,
        chooseJson: chinaData[e[chooseNum - 1]]
      })
    }

    return {
      onChange
    }
  }
})
</script>
<style lang="scss" >
.elui-com {
  width: 100%;
}
.el-cascader-menu__list {
  height: 500px !important;
}
</style>
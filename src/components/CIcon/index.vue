<template>
  <Icon :icon="iconClass"
        :class="custClassOnIcon"
        :height="inconHeight"
        :width="iconWidth"
        :color="iconColor" />
</template>

<script lang="ts">
// reference https://iconify.design/
import { Icon } from '@iconify/vue'
import { defineComponent, computed } from 'vue'

interface Props {
  iconClass: string
  iconWidth: string
  inconHeight: string
  custClass: string
}

export default defineComponent({
  name: 'SvgIcon',
  props: {
    iconClass: {
      type: String,
      required: true
    },
    iconWidth: {
      type: String,
      default: '1em'
    },
    inconHeight: {
      type: String,
      default: '1em'
    },
    iconColor: {
      type: String,
      default: '#fff'
    },
    custClass: {
      type: String,
      default: () => ''
    }
  },
  components: {
    Icon
  },
  setup(props: Props) {
    const custClassOnIcon = computed((): string => {
      if (props.custClass) {
        return 'iconfont ' + props.custClass
      } else {
        return 'iconfont'
      }
    })
    return { custClassOnIcon }
  }
})
</script>
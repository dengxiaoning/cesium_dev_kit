/*
 * @Author: dex
 * @Date: 2021-06-21 13:31:28
 * @LastEditTime: 2021-06-21 13:51:14
 * @LastEditors: Please set LastEditors
 * @Description: 获取鼠标点击的屏幕坐标
 * @FilePath: \Vue3-ElementPlus-Vite2\src\hooks\useMousePosition.ts
 */
import {ref, onMounted, onBeforeUnmount} from 'vue'

export default function useMousePosition () {
    const x = ref(-1)
    const y = ref(-1)
    const handler = (event: MouseEvent)=>{
        x.value = event.pageX
        y.value = event.pageY
    }
    onMounted(()=>{
        window.addEventListener('click', handler)
    })

    onBeforeUnmount(()=>{
        window.removeEventListener('click', handler)
    })

    return {
        x,
        y
    }
}

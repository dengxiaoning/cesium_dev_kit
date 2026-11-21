<template>
  <div class="demo-code-entry">
    <!-- 右下角入口 -->
    <button v-if="available && !open" class="dcp-fab" type="button" title="查看示例源码" @click="toggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <span class="dcp-fab-dot"></span>
    </button>

    <transition name="dcp-slide">
      <section v-if="open" class="dcp-panel" :style="{ width: width + 'px' }">
        <!-- 左侧拖拽改宽 -->
        <div class="dcp-resizer" title="拖动调整宽度" @mousedown.prevent="startResize"></div>

        <header class="dcp-header">
          <div class="dcp-head-main">
            <svg class="dcp-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <polyline points="14 3 14 8 20 8" />
            </svg>
            <div class="dcp-file-info">
              <!-- 文件目录：逐段面包屑 -->
              <div class="dcp-path">
                <template v-for="(seg, i) in segments" :key="i">
                  <span v-if="i > 0" class="dcp-sep">/</span>
                  <span class="dcp-seg" :class="{ 'is-file': i === segments.length - 1 }">{{ seg }}</span>
                </template>
              </div>
              <div class="dcp-meta">
                <span>{{ language }}</span>
                <i class="dcp-meta-dot"></i>
                <span>{{ lineCount }} 行</span>
              </div>
            </div>
          </div>

          <div class="dcp-actions">
            <button class="dcp-copy" type="button" :class="{ 'is-ok': copyState === 'ok', 'is-fail': copyState === 'fail' }" :title="copyState === 'ok' ? '已复制到剪贴板' : copyState === 'fail' ? '复制失败，请手动选中复制' : '复制全部代码'" @click="copyCode">
              <svg v-if="copyState === 'ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <svg v-else-if="copyState === 'fail'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16.5" x2="12" y2="16.5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{{ copyState === 'ok' ? '已复制' : copyState === 'fail' ? '复制失败' : '复制' }}</span>
            </button>
            <button class="dcp-close" type="button" title="关闭 (Esc)" @click="open = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <div ref="scroller" class="dcp-body">
          <div v-if="loading" class="dcp-state">正在读取源码…</div>
          <div v-else-if="error" class="dcp-state is-error">{{ error }}</div>
          <div v-else class="dcp-code">
            <div v-for="(line, i) in lines" :key="i" class="dcp-row">
              <span class="dcp-gutter">{{ i + 1 }}</span>
              <span class="dcp-text" v-html="line || '&nbsp;'"></span>
            </div>
          </div>
        </div>
      </section>
    </transition>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'store/index'
import { indexMenus, resolveDemoSource } from './source'
import { guessLanguage, highlightLines } from './highlight'

const MIN_WIDTH = 360
const MAX_WIDTH = 1100

export default defineComponent({
  name: 'DemoCodePanel',
  setup() {
    const route = useRoute()
    const store = useStore()

    const open = ref(false)
    const loading = ref(false)
    const error = ref('')
    const copyState = ref<'idle' | 'ok' | 'fail'>('idle')
    const code = ref('')
    const lines = ref<string[]>([])
    /** 已加载的源码路径，避免重复解析高亮 */
    const loadedPath = ref('')
    const scroller = ref<HTMLElement | null>(null)

    // 菜单里带 component 字段，是最可靠的「路由 → 源码文件」映射来源
    watch(
      () => (store.state as any).permission.routeList,
      (list) => indexMenus((list || []) as any[]),
      { immediate: true }
    )

    const source = computed(() => resolveDemoSource(route.name, route.path))
    const available = computed(() => !!source.value)
    const segments = computed(() => (source.value ? source.value.segments : []))
    const language = computed(() =>
      guessLanguage(source.value ? source.value.path : '')
    )
    const lineCount = computed(() => lines.value.length)

    let copyTimer: ReturnType<typeof setTimeout> | null = null

    const clampWidth = (value: number) => {
      const max = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, window.innerWidth - 120)
      )
      return Math.round(Math.min(Math.max(value, MIN_WIDTH), max))
    }

    const width = ref(
      clampWidth(Math.min(Math.max(440, window.innerWidth * 0.44), 900))
    )

    const toTop = () => {
      if (scroller.value) scroller.value.scrollTop = 0
    }

    async function loadSource() {
      const info = source.value
      if (!info) {
        lines.value = []
        code.value = ''
        return
      }
      if (loadedPath.value === info.path && lines.value.length) {
        toTop()
        return
      }
      loading.value = true
      error.value = ''
      try {
        const text = await info.load()
        if (!text.trim()) throw new Error('资源为空')
        code.value = text
        lines.value = highlightLines(text)
        loadedPath.value = info.path
      } catch (e) {
        lines.value = []
        code.value = ''
        error.value = '源码读取失败，请刷新后重试'
      } finally {
        loading.value = false
      }
      toTop()
    }

    async function toggle() {
      if (!available.value) return
      open.value = !open.value
      if (open.value) await loadSource()
    }

    async function copyCode() {
      if (!code.value) return
      let ok = false
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(code.value)
          ok = true
        }
      } catch (e) {
        ok = false
      }
      if (!ok) {
        // 非 https / 旧浏览器兜底
        const area = document.createElement('textarea')
        area.value = code.value
        area.setAttribute('readonly', '')
        area.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0'
        document.body.appendChild(area)
        area.select()
        try {
          ok = document.execCommand('copy')
        } catch (e) {
          ok = false
        }
        document.body.removeChild(area)
      }
      copyState.value = ok ? 'ok' : 'fail'
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => (copyState.value = 'idle'), ok ? 1800 : 2600)
    }

    // 拖拽左边缘改宽度
    let stopResize: (() => void) | null = null
    function startResize(e: MouseEvent) {
      const startX = e.clientX
      const startWidth = width.value
      const onMove = (ev: MouseEvent) => {
        width.value = clampWidth(startWidth + (startX - ev.clientX))
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        stopResize = null
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      stopResize = onUp
    }

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open.value) open.value = false
    }

    const onResize = () => {
      width.value = clampWidth(width.value)
    }

    // 换页面就收起，避免面板停在别的示例上
    watch(
      () => route.path,
      () => {
        open.value = false
        copyState.value = 'idle'
      }
    )

    onMounted(() => {
      window.addEventListener('keydown', onKeydown)
      window.addEventListener('resize', onResize)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('resize', onResize)
      if (stopResize) stopResize()
      if (copyTimer) clearTimeout(copyTimer)
    })

    return {
      open,
      loading,
      error,
      copyState,
      lines,
      segments,
      language,
      lineCount,
      width,
      scroller,
      available,
      toggle,
      copyCode,
      startResize
    }
  }
})
</script>

<style lang="scss" scoped>
$dcp-bg: #1e1e1e;
$dcp-head: #252526;
$dcp-line: rgba(255, 255, 255, 0.07);
$dcp-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
  'Liberation Mono', 'Courier New', monospace;

/* 右下角入口图标 */
.dcp-fab {
  position: fixed;
  right: 26px;
  bottom: 94px;
  z-index: 3000;
  width: 46px;
  height: 46px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(23, 63, 148, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;

  svg {
    width: 21px;
    height: 21px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(23, 63, 148, 0.48);
  }

  &:active {
    transform: translateY(0) scale(0.97);
  }

  /* 右上角小圆点，暗示这里有东西可看 */
  .dcp-fab-dot {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7ee787;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.9);
  }
}

/* 右侧展开面板：与窗口等高 */
.dcp-panel {
  position: fixed;
  top: 80px;
  right: 0;
  bottom: 0;
  height: 92%;
  display: flex;
  flex-direction: column;
  min-width: 360px;
  max-width: calc(100vw - 120px);
  background: $dcp-bg;
  border-left: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: -22px 0 56px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.dcp-resizer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 2;

  &:hover {
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.55), transparent);
  }
}

/* 顶部：文件目录 + 操作 */
.dcp-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 0 12px 0 16px;
  background: $dcp-head;
  border-bottom: 1px solid $dcp-line;
}

.dcp-head-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dcp-file-icon {
  flex: none;
  width: 18px;
  height: 18px;
  color: #7aa2f7;
}

.dcp-file-info {
  min-width: 0;
}

.dcp-path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-family: $dcp-mono;
  font-size: 12.5px;
  line-height: 1.5;
  color: #8b949e;
  overflow: hidden;
}

.dcp-seg {
  white-space: nowrap;
}

.dcp-seg.is-file {
  color: #e6edf3;
  font-weight: 600;
}

.dcp-sep {
  margin: 0 4px;
  color: #4d5560;
}

.dcp-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 11px;
  color: #6e7681;
  letter-spacing: 0.2px;
}

.dcp-meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #4d5560;
}

.dcp-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.dcp-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.04);
  color: #c9d1d9;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.16s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: rgba(59, 130, 246, 0.18);
    border-color: rgba(59, 130, 246, 0.5);
    color: #fff;
  }

  &.is-ok {
    background: rgba(46, 160, 67, 0.18);
    border-color: rgba(46, 160, 67, 0.55);
    color: #7ee787;
  }

  &.is-fail {
    background: rgba(248, 81, 73, 0.16);
    border-color: rgba(248, 81, 73, 0.5);
    color: #ff7b72;
  }
}

.dcp-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #9aa4af;
  cursor: pointer;
  transition: all 0.16s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
}

/* 代码区 */
.dcp-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: $dcp-bg;

  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: #3a3f46;
    border-radius: 6px;
    border: 2px solid $dcp-bg;

    &:hover {
      background: #4b525b;
    }
  }

  &::-webkit-scrollbar-corner {
    background: $dcp-bg;
  }
}

.dcp-state {
  padding: 28px 20px;
  font-size: 13px;
  color: #8b949e;

  &.is-error {
    color: #f0883e;
  }
}

.dcp-code {
  width: max-content;
  min-width: 100%;
  padding: 10px 0 24px;
  font-family: $dcp-mono;
  font-size: 12.5px;
  line-height: 1.72;
  tab-size: 2;
}

.dcp-row {
  display: flex;
  align-items: flex-start;
  white-space: pre;

  &:hover {
    background: rgba(255, 255, 255, 0.045);
  }
}

.dcp-gutter {
  position: sticky;
  left: 0;
  z-index: 1;
  flex: none;
  width: 54px;
  padding-right: 14px;
  text-align: right;
  color: #4f5863;
  background: $dcp-bg;
  user-select: none;
}

.dcp-row:hover .dcp-gutter {
  color: #8b949e;
  background: #23262a;
}

.dcp-text {
  padding-right: 24px;
  color: #d4d4d4;
}

/* v-html 内容不带 scope 属性，靠 :deep 上色 */
.dcp-text :deep(.tk-kw) {
  color: #569cd6;
}
.dcp-text :deep(.tk-ctrl) {
  color: #c586c0;
}
.dcp-text :deep(.tk-str) {
  color: #ce9178;
}
.dcp-text :deep(.tk-num) {
  color: #b5cea8;
}
.dcp-text :deep(.tk-com) {
  color: #6a9955;
  font-style: italic;
}
.dcp-text :deep(.tk-fn) {
  color: #dcdcaa;
}
.dcp-text :deep(.tk-cls) {
  color: #4ec9b0;
}
.dcp-text :deep(.tk-var) {
  color: #9cdcfe;
}
.dcp-text :deep(.tk-tag) {
  color: #569cd6;
}

/* 窄屏：铺满可用宽度，隐藏拖拽条 */
@media (max-width: 560px) {
  .dcp-panel {
    min-width: 0;
    max-width: 100vw;
  }

  .dcp-resizer {
    display: none;
  }

  .dcp-path {
    font-size: 11.5px;
  }
}

/* 展开动画：只做小幅位移，避免主线程卡顿时整个面板停在屏幕外 */
.dcp-slide-enter-active,
.dcp-slide-leave-active {
  transition: transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 0.22s ease;
}

.dcp-slide-enter-from,
.dcp-slide-leave-to {
  transform: translateX(28px);
  opacity: 0.2;
}
</style>

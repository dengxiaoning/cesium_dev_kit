/**
 * 框架无关的「绘制工具条」Web Component。
 *
 * 用法：
 * ```html
 * <cesium-draw-toolbar modes="point,polyline,polygon,rectangle,circle"></cesium-draw-toolbar>
 * <script type="module">
 *   import { defineDrawToolbar, bindDrawToolbar } from 'cesium_dev_kit/web-components'
 *   defineDrawToolbar()
 *   bindDrawToolbar(document.querySelector('cesium-draw-toolbar'), {
 *     point: () => draw.drawPointGraphics(),
 *     polyline: () => draw.drawLineGraphics(),
 *     cancel: () => draw.cancelDraw?.()
 *   })
 * </script>
 * ```
 *
 * 选中某个模式时派发 `cesium-draw` 事件，detail 为 `{ mode }`（取消时为 `null`）。
 *
 * SSR 安全：模块顶层不直接访问 `HTMLElement` / `customElements`，在 Node 中 import 不会报错。
 */

/** 支持的绘制模式 */
export type DrawMode = 'point' | 'polyline' | 'polygon' | 'rectangle' | 'circle' | 'wall'

/** 默认展示的模式 */
export const DEFAULT_DRAW_MODES: DrawMode[] = ['point', 'polyline', 'polygon', 'rectangle', 'circle']

/** 全部合法模式 */
const ALL_DRAW_MODES: DrawMode[] = ['point', 'polyline', 'polygon', 'rectangle', 'circle', 'wall']

/** 模式 -> 中文标签 */
export const DRAW_MODE_LABELS: Record<DrawMode, string> = {
  point: '点',
  polyline: '线',
  polygon: '面',
  rectangle: '矩形',
  circle: '圆',
  wall: '墙'
}

/** 解析 `modes` 属性（逗号分隔或数组），非法项忽略；为空时回退默认值 */
export function normalizeModes(input?: string | string[] | null): DrawMode[] {
  if (!input) return DEFAULT_DRAW_MODES.slice()
  const list = Array.isArray(input) ? input : String(input).split(',')
  const result: DrawMode[] = []
  for (const raw of list) {
    const mode = String(raw).trim() as DrawMode
    if (ALL_DRAW_MODES.includes(mode) && !result.includes(mode)) result.push(mode)
  }
  return result.length ? result : DEFAULT_DRAW_MODES.slice()
}

/** 解析当前激活模式；不在允许列表里返回 null */
export function resolveActiveMode(
  modes: DrawMode[],
  value?: string | null
): DrawMode | null {
  if (!value) return null
  const mode = value.trim() as DrawMode
  return modes.includes(mode) ? mode : null
}

/** `cesium-draw` 事件的 detail */
export interface DrawToolbarDetail {
  mode: DrawMode | null
}

/** 便捷绑定：把模式映射到业务回调 */
export type DrawToolbarHandlers = Partial<Record<DrawMode, () => void>> & {
  cancel?: () => void
}

// SSR 安全：Node 里没有 HTMLElement，用空类占位（不会真的实例化）
const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement)

const TOOLBAR_CSS = `
:host { display: inline-block; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.toolbar {
  display: inline-flex;
  gap: 6px;
  padding: 6px;
  border-radius: 10px;
  background: rgba(20, 24, 32, 0.82);
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
}
.btn {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #e8eefc;
  font-size: 13px;
  line-height: 1;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}
.btn:hover { background: rgba(255, 255, 255, 0.14); }
.btn:active { transform: translateY(1px); }
.btn.active {
  background: #2f7bff;
  border-color: #2f7bff;
  color: #fff;
  box-shadow: 0 0 0 2px rgba(47, 123, 255, 0.35);
}
.btn.clear { color: #ffb4b4; border-color: rgba(255, 120, 120, 0.35); }
.btn.clear:hover { background: rgba(255, 120, 120, 0.18); }
:host([disabled]) .toolbar { opacity: 0.5; pointer-events: none; }
`

export class DrawToolbarElement extends HTMLElementBase {
  static get observedAttributes(): string[] {
    return ['modes', 'value', 'disabled']
  }

  constructor() {
    super()
    if (typeof this.attachShadow === 'function' && !this.shadowRoot) {
      this.attachShadow({ mode: 'open' })
    }
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.shadowRoot) this.render()
  }

  get modes(): DrawMode[] {
    return normalizeModes(this.getAttribute('modes'))
  }

  set modes(value: DrawMode[]) {
    this.setAttribute('modes', (value || []).join(','))
  }

  get value(): DrawMode | null {
    return resolveActiveMode(this.modes, this.getAttribute('value'))
  }

  set value(value: DrawMode | null) {
    if (value) this.setAttribute('value', value)
    else this.removeAttribute('value')
  }

  /** 供外部直接触发某个模式（等同点击按钮） */
  select(mode: DrawMode | null): void {
    this.value = mode
    this.dispatchEvent(
      new CustomEvent<DrawToolbarDetail>('cesium-draw', {
        detail: { mode },
        bubbles: true,
        composed: true
      })
    )
  }

  private render(): void {
    const shadow = this.shadowRoot
    if (!shadow) return
    const modes = this.modes
    const active = this.value

    shadow.innerHTML = ''

    const style = document.createElement('style')
    style.textContent = TOOLBAR_CSS
    shadow.appendChild(style)

    const wrap = document.createElement('div')
    wrap.className = 'toolbar'

    for (const mode of modes) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = mode === active ? 'btn active' : 'btn'
      button.dataset.mode = mode
      button.textContent = DRAW_MODE_LABELS[mode] ?? mode
      button.addEventListener('click', () => this.select(mode))
      wrap.appendChild(button)
    }

    const clearButton = document.createElement('button')
    clearButton.type = 'button'
    clearButton.className = 'btn clear'
    clearButton.textContent = '取消'
    clearButton.addEventListener('click', () => this.select(null))
    wrap.appendChild(clearButton)

    shadow.appendChild(wrap)
  }
}

/** 注册自定义元素（重复调用安全） */
export function defineDrawToolbar(tagName = 'cesium-draw-toolbar'): void {
  if (typeof customElements === 'undefined') return
  if (!customElements.get(tagName)) {
    customElements.define(tagName, DrawToolbarElement)
  }
}

/**
 * 把工具条事件绑定到一组回调，返回解绑函数。
 *
 * @example
 * const off = bindDrawToolbar(el, {
 *   point: () => draw.drawPointGraphics(),
 *   cancel: () => draw.cancelDraw?.()
 * })
 */
export function bindDrawToolbar(
  element: DrawToolbarElement,
  handlers: DrawToolbarHandlers
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<DrawToolbarDetail>).detail
    if (!detail) return
    if (detail.mode === null) handlers.cancel?.()
    else handlers[detail.mode]?.()
  }
  element.addEventListener('cesium-draw', listener)
  return () => element.removeEventListener('cesium-draw', listener)
}

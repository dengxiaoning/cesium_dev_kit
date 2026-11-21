/**
 * 示例源码定位
 *
 * 示例页面有 70 个，逐个手动维护源码映射表必然会漏。这里用 `import.meta.glob`
 * 把 `src/views/example/**` 下的所有 `.vue` 以「原始文本」收录（非 eager，
 * 点开面板时才真正加载对应文件，不会拖慢首屏），再按菜单里的 `component`
 * 字段把「当前路由」映射到具体文件。
 */

interface MenuNode {
  name?: string
  path?: string
  component?: string
  children?: MenuNode[]
}

/**
 * 路径 → 源码；key 形如 `/src/views/example/graphics/floatingCone.vue`
 *
 * 注意：Vite 2 对 `{ as: 'raw' }` 的 glob 会直接内联成字符串（不是懒加载函数），
 * 所以下面按「字符串 / 函数」两种形态都兼容，换成新版 Vite 也不用改。
 */
const demoModules = import.meta.glob<string>('/src/views/example/**/*.vue', {
  as: 'raw'
}) as unknown as Record<string, string | (() => Promise<unknown>)>

/** 已加载过的源码，避免来回切路由重复解析 */
const cache = new Map<string, string>()

/** 组件名 → 源码路径（由菜单构建） */
const componentIndex = new Map<string, string>()

export interface DemoSourceInfo {
  /** 展示用的相对路径，如 src/views/example/graphics/floatingCone.vue */
  path: string
  /** 文件名，如 floatingCone.vue */
  file: string
  /** 路径分段，用于顶部面包屑 */
  segments: string[]
  /** 懒加载源码 */
  load: () => Promise<string>
}

/** 把菜单树摊平成 name → component */
export function indexMenus(list: any[]): void {
  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      if (node.name && node.component && typeof node.component === 'string') {
        componentIndex.set(String(node.name), node.component)
      }
      if (Array.isArray(node.children)) walk(node.children)
    }
  }
  componentIndex.clear()
  walk(list || [])
}

/** 当前路由 → 源码文件 */
function findKey(routeName: string, routePath: string): string | null {
  // 1. 菜单里的 component 字段最准：example/graphics/floatingCone → /src/views/example/...
  const component = componentIndex.get(routeName)
  if (component) {
    const key = `/src/views/${component.replace(/^\/+/, '')}.vue`
    if (demoModules[key]) return key
  }
  // 2. 路径直推：/terrain/terrainEdit → /src/views/example/terrain/terrainEdit.vue
  const pure = (routePath || '').split('?')[0].replace(/\/+$/, '')
  if (pure) {
    const guess = `/src/views/example${pure}.vue`
    if (demoModules[guess]) return guess
  }
  // 3. 退而求其次：按文件名匹配路由名
  if (routeName) {
    const suffix = `/${routeName}.vue`
    for (const key of Object.keys(demoModules)) {
      if (key.endsWith(suffix)) return key
    }
  }
  return null
}

/**
 * 解析当前页面是否有对应的示例源码
 *
 * @param routeName - 当前路由 name
 * @param routePath - 当前路由 path
 * @returns 命中返回源码信息，非示例页面返回 null
 */
export function resolveDemoSource(
  routeName: unknown,
  routePath: string
): DemoSourceInfo | null {
  const name = routeName == null ? '' : String(routeName)
  const key = findKey(name, routePath)
  if (!key) return null
  const entry = demoModules[key]
  if (entry == null) return null
  const relative = key.replace(/^\//, '')
  const segments = relative.split('/')
  return {
    path: relative,
    file: segments[segments.length - 1],
    segments,
    load: async () => {
      const hit = cache.get(relative)
      if (hit != null) return hit
      const raw = typeof entry === 'function' ? await entry() : entry
      const text = typeof raw === 'string' ? raw : String((raw as any)?.default ?? '')
      cache.set(relative, text)
      return text
    }
  }
}

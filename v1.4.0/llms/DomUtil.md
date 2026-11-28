# DomUtil

> DomUtil API

- 分类：DOM 与提示
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/DomUtil.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### addDomClass(el: Element, name: string): void

添加 class

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | 目标元素 |
| `name` | `string` | class 名称（多个 class 用空格分隔） |

### createDom(tagName: string, className?: string, container?: Element | null): HTMLElement

创建dom元素

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `tagName` | `string` | 标签名 |
| `className?` | `string` | class 名称 |
| `container?` | `Element \| null` | 父容器 |

**返回**：创建的 dom 元素

### createDomSvg(width: string | number, height: string | number, path: string, container?: Element | null): SVGElement

创建 svg 元素

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `width` | `string \| number` | 宽 |
| `height` | `string \| number` | 高 |
| `path` | `string` | path 的 d 属性 |
| `container?` | `Element \| null` | 父容器 |

**返回**：svg 元素

### createUUID(prefix?: string): string

生成 uuid

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `prefix?` | `string` | 前缀，默认 "D" |

**返回**：uuid 字符串

### emptyDom(el: Element): void

清空 element 的所有子节点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | 目标元素 |

### getClass(el: Element): string

获取元素 class（老版本浏览器的降级实现，按需调用）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | - |

### getDomClass(el: Element): string

获取元素 class

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | 目标元素 |

**返回**：class 字符串

### hasClass(el: Element, name: string): boolean

判断元素是否含有某个 class（老版本浏览器的降级实现，按需调用）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | - |
| `name` | `string` | - |

### removeDom(el: Element): void

删除 element

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | 目标元素 |

### removeDomClass(el: Element, name: string): void

删除 class

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | 目标元素 |
| `name` | `string` | class 名称 |

### setClass(el: Element, name: string): void

设置元素 class（老版本浏览器的降级实现，按需调用）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element` | - |
| `name` | `string` | - |

### setDomClass(el: Element | SVGElement, name: string): void

设置 class

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `el` | `Element \| SVGElement` | 目标元素（支持 SVG 元素） |
| `name` | `string` | class 名称 |

### splitWords(str: string): string[]

按空白字符拆分字符串（老版本浏览器的降级实现，按需调用）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `str` | `string` | - |

### trim(str: string): string

去除字符串首尾空白（老版本浏览器的降级实现，按需调用）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `str` | `string` | - |

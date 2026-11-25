# cesium-dev-kit-mcp

让 AI 助手（Claude Desktop / Cursor / Copilot / 任意 MCP 客户端）能查询 [cesium_dev_kit](https://github.com/dengxiaoning/cesium_dev_kit) 的 API、类文档与在线示例。

## 安装与运行

```bash
npx cesium-dev-kit-mcp
```

数据来源（按优先级）：

1. 环境变量 `CESIUM_DEV_KIT_API_INDEX`（URL 或本地文件路径）；
2. 内置快照 `assets/api-index.json`（发布时由 `prepublishOnly` 下载）；
3. 线上 `https://dengxiaoning.github.io/cesium_dev_kit/api-index.json`。

## 提供的工具

| 工具 | 说明 |
| --- | --- |
| `search` | 按关键词搜索类 / 方法 / 示例（如「雷达扫描」「画多边形」「createPolygonGraphics」） |
| `get_class_doc` | 获取某个类的完整文档：方法签名、参数表、返回值、`@example` 示例 |
| `get_example` | 获取某个在线示例的源码 / 示例页 / 在线 Demo 链接 |
| `get_quickstart` | 安装命令 + 最小可运行示例 |

## 接入 Claude Desktop

在 `claude_desktop_config.json` 里加：

```json
{
  "mcpServers": {
    "cesium_dev_kit": {
      "command": "npx",
      "args": ["-y", "cesium-dev-kit-mcp"]
    }
  }
}
```

## 开发

```bash
cd mcp
npm install
node src/index.mjs          # 直接跑（stdio）
CESIUM_DEV_KIT_API_INDEX=/path/to/api-index.json node src/index.mjs
```

`api-index.json` 由主仓库的 `npm run docs:all` 生成（`docs/api-index.json`）。

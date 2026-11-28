# docs-archive

API 文档的历史版本快照，供文档站顶部的版本切换器使用。

- 目录结构：`v<版本号>/`，每个目录是一份完整的 TypeDoc 产物（含 `/en/` 英文站，不含 `demo/`）。
- 写入方：`.github/workflows/release.yml` —— 打 `v*` tag 发布时自动构建并提交 `v<版本>/`。
- 读取方：`.github/workflows/docs.yml` —— 每次发布站点时 checkout 本分支，把 `v*/`
  合进 `docs/`；随后 `scripts/gen-site-extras.mjs` 扫描目录生成 `versions.json`，
  切换器（`scripts/docs-custom.js`）据此列出所有版本。
- 手工补历史版本：在对应 tag 的 worktree 里 `npm ci && npm run docs:typedoc && npm run
  docs:typedoc:en && npm run docs:extras`，把 `docs/`（去掉 `demo/` 与 `versions.json`）
  拷成 `v<版本>/` 后提交即可。

本分支只存文档产物，不参与库的构建与发布。

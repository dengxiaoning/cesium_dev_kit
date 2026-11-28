# Changesets

这个目录用来记录「还没发版的改动」。每次有面向使用者的变更（新增 / 修复 / 破坏性调整）就在这里放一个
Markdown 文件，说明改了什么、该升哪一位版本号；发版时它们会被合并进 `CHANGELOG.md` 并自动升版本。

## 什么时候写

| 改动类型 | 是否要写 | 版本位 |
| --- | --- | --- |
| 新增类 / 方法 / 配置项（向后兼容） | 要 | `minor` |
| 修 bug、修文档里的错误示例 | 要 | `patch` |
| 改默认行为、改 API 签名、删 API、抬高 Cesium 最低版本 | 要 | `major` |
| 只改 demo、注释、CI、依赖升级、格式化 | 不用 | — |

完整判定标准和发版流程见仓库根目录的 [`RELEASING.md`](../RELEASING.md)。

## 怎么用

```bash
# 平时：每完成一个用户可感知的改动
npm run changeset           # 交互式：选版本位 → 写一句人话摘要，生成 .changeset/<随机名>.md
git add . && git commit -m "feat: xxx" && git push

# 攒了 2~3 条之后（或到两周窗口）
npm run release:version    # 发版前：合并所有 changeset，升版本号 + 写 CHANGELOG，并删掉这些文件
git diff                   # 看一眼
git add -A 
git commit -am "chore(release): v1.3.0"
git tag v1.3.0
git push --follow-tags

```

`release:version` 之后照常提交、打 tag、推送，`release.yml` 会负责 npm 发布与 GitHub Release。

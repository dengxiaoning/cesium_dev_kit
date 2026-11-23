# 发版说明

> 一句话规则：**用户能感知的改动才发版，`patch` 只收修复，发版前先攒批。**

## 为什么要有这份文档

npm 上的现状（截至 2026-11）：

- 91 个版本只用了 **63 个发布日**，40% 的相邻版本间隔不足 1 天，最多的一天发了 5 个
- 其中 1.0.x 一条线吃掉 64 个版本
- `CHANGELOG.md` 里只留得住最近 4 个版本的记录，其余 87 个版本没有说明

后果不是"下载量被切碎"，而是**使用者没法用版本号做决策**：`^1.0.0` 的用户装到 1.0.64 里任何一个都合法，
但没人知道 1.0.23 和 1.0.24 差在哪；遇到 bug 时也无法判断自己是不是踩在老问题上，只能一路升到最新赌一把。

版本号是给用户读的契约，不是发布动作的流水号。

## 版本位怎么定

| 版本位 | 含义 | 本项目里的具体例子 |
| --- | --- | --- |
| `patch` | 只修 bug：签名、默认值、渲染结果都不变 | 笔刷圈外地形被误改、落笔点偏离指针（1.2.1） |
| `minor` | 新增能力或新增可选参数，旧代码不改也能跑 | `TerrainEdit` 模块、`exportData()/importData()`（1.2.0） |
| `major` | 旧代码不改就跑不起来，或行为变了 | 把 `any` 换成精确类型；删除 / 改名 API；抬高最低 Cesium 版本 |

判断口诀：**用户升级后不改一行代码能跑吗？**

- 能，且行为完全一致 → `patch`
- 能，但多了新东西 → `minor`
- 不能，或者行为变了 → `major`

几个容易判错的：

- **"修 bug 但改了默认值"算 `minor`**。比如「程序化岩土材质改为默认开启」，用户看到的画面变了，
  摘要里要写明"想保留旧效果调用 `setCutSurfaceEnabled(false)`"。
- **只改 demo / 注释 / CI / 依赖升级 / 格式化 → 不发版**，也不需要写 changeset。
- **抬高 `cesium` 最低版本 → `major`**，一定有人被卡在旧 Cesium 上升不上去。
- **内部重写但对外行为一致 → `minor`**；如果顺手改了 API 语义（比如 `maxDelta` 从"单次强度"变成
  "台阶落差"），那一次就应该按 `major` 处理，或者在 `minor` 里显式写"行为变更 + 迁移方式"。

## 发版节奏：攒批，不追单个提交

- **常规窗口**：每两周一次（周一发），或攒够 3 条 changeset 就先发 —— 先到先发，别为了凑批次拖延修复。
- **紧急修复**：随时发 `patch`，但顺手把已经攒着的改动一起发，别让同一周出现 3 个 patch。
- **同一个问题只发一次**：修完先在示例页 / 本地跑通再发，避免"发一个补一个"的连锁。
- **不想动 `latest`**：走预发布通道（见下），让愿意尝鲜的人先试。

一次 patch 发布只要 5 分钟，但每次发布都会切碎一次用户的升级决策。两周攒一批，用户拿到的是一个
"有内容的版本"，而不是 20 个"不知道改了什么"的号。

## 日常改动：写 changeset

```bash
npm run changeset
# ? Which packages would you like to include?      → cesium_dev_kit（只有一个）
# ? What kind of change is this for cesium_dev_kit? → patch / minor / major
# ? Please enter a summary for this change          → 一句人话，写给使用者看
```

生成的文件长这样（可以手改，也可以直接手写，文件名随意）：

```md
---
"cesium_dev_kit": minor
---

`TerrainEdit` 支持导出 / 载入编辑结果，便于保存与二次编辑。
```

摘要直接进 `CHANGELOG.md` 和 GitHub Release，所以写"用户能感知到什么变化"，别写"重构了 xxx"。

`release:version` 会把 changesets 生成的 `### Patch Changes` 这类英文标题换成
`### 修复（Fixed）` / `### 新增 / 变更（Added / Changed）` / `### 破坏性变更（Breaking）`，
和 1.2.1 及之前的手写条目保持一致。

提 PR 时带上这个文件；只有代码没有 changeset 的 PR（纯文档 / CI 除外）应当在 review 时打回。

## 发版：四步

```bash
# 1. 合并所有 changeset：升版本号 + 写 CHANGELOG + 删掉 .changeset/*.md
#    （顺带把 changesets 生成的英文小节标题换成中文，脚本见 scripts/changelog-zh.mjs）
npm run release:version

# 2. 检查 diff：版本号对不对、CHANGELOG 条目是不是说人话
git diff
#    顺手把本期的代表截图 / GIF 换到 README 预览区（可选，但推荐）

# 3. 提交并打 tag —— tag 必须等于 package.json 的版本
git commit -am "chore(release): v1.3.0"
git tag v1.3.0
git push --follow-tags

# 4. 等 CI：npm publish → 建 GitHub Release（正文取自 CHANGELOG 对应小节）
#    完成后到 npm 包页确认 latest 已指向新版本
```

CI 在发布前会做两条硬校验，任一不满足直接失败：

- `v*` tag 必须等于 `package.json` 的 `version`
- `CHANGELOG.md` 必须存在该版本的小节

这样就不会再出现"tag 打了、版本号没跟上"或"发了版但没有变更记录"。

## 预发布 / 灰度

不想让所有人立刻吃到，用 `next` 通道（不移动 `latest`）：

```bash
npm run release:version                                    # 正常升版本，比如 1.3.0
npm version prerelease --preid=next --no-git-tag-version    # 1.3.0 → 1.3.0-next.0
npm publish --tag next
```

用户用 `npm i cesium_dev_kit@next` 试用；稳定后发正式版，再 `npm dist-tag add cesium_dev_kit@1.3.0 latest`。

需要连续出几个 beta 时，可以走 changesets 的 pre 模式：
`npx changeset pre enter next` → 若干次 `npm run release:version` → `npx changeset pre exit`。

## 发错了怎么办

- **版本号发错**（发完发现漏了文件）：不要复用同一个号。把 `package.json` 改到下一个 `patch` 号重发，
  旧号用 `npm deprecate` 标注。
- **某个版本有严重问题**：
  ```bash
  npm deprecate "cesium_dev_kit@1.3.0" "该版本存在 xxx 问题，请升级到 1.3.1 或回退到 1.2.1"
  ```
  然后尽快发修复版。`deprecate` 只影响安装时的警告，不会删除已经下载的代码。
- **不要 unpublish**：npm 只允许在发布 72 小时内、且无人依赖时删除；删掉会让锁定了该版本的工程直接装不上。

## 存量清理（一次性，需手动执行）

npm 上还挂着 64 个 1.0.x、25 个 1.1.x 版本，多数没有 CHANGELOG、没有类型声明。可以把过老的版本标为废弃，
让用户 `npm install` 时看到一句明确提示：

```bash
# 直接执行（对 npm 上的包立刻生效）
npm deprecate "cesium_dev_kit@<1.1.0" "1.0.x 已停止维护：缺少地形编辑、类型声明与近期修复，请升级到 ^1.2.1"

# 如果标错了，用空字符串撤销
npm deprecate "cesium_dev_kit@<1.1.0" ""
```

这一步属于对外声明，不是纯技术操作 —— 它会出现在别人的安装日志里。愿不愿意做，取决于你对老用户的判断；
但**至少不要再往上叠新的无记录版本**。

## 和 CI 的关系

- 推 `main`：只重建文档站（`docs.yml`），不发布
- 打 `v*` tag：测试 → 构建 → `npm publish` → 建 GitHub Release

也就是说"合并代码"和"发版"彻底解耦，攒批不会阻塞任何人。

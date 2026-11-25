import { describe, it } from 'vitest'

/**
 * 把旧的「顶层断言脚本」迁移到 Vitest 的桥接入口。
 *
 * 历史测试（tests/*.legacy.ts）沿用 node:assert + 顶层断言，没有 describe/it，
 * 直接交给 Vitest 会被判成「No test suite found」。这里用动态 import 把它们
 * 各自包进一个 it()：一个文件失败只挂一个用例，互不牵连。
 *
 * 新增测试请直接写 `tests/xxx.test.ts`，用 describe / it / expect。
 */
const legacySuites = [
  'plotUtil',
  'math2d',
  'dispose',
  'scope',
  'plot',
  'defaultStatic',
  'api',
  'pathRoaming',
  'roaming',
  'terrainGrid',
  'terrainData',
  'terrainTexture',
  'threeFusion'
] as const

describe('legacy assertion scripts', () => {
  for (const name of legacySuites) {
    it(name, async () => {
      await import(`./${name}.legacy.ts`)
    })
  }
})

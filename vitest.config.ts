import { defineConfig } from 'vitest/config'

/**
 * 单元测试配置（Vitest）。
 *
 * 测试为纯 Node（不依赖浏览器 DOM），因此 environment 用 node。
 * 现有 tests/*.test.ts 沿用 node:assert + 顶层断言，无需改写即可运行；
 * 后续新增用例推荐使用 describe / it / expect。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // 旧断言脚本里有个别用例会做大量几何/地形计算，耗时可达数十秒
    testTimeout: 120000,
    hookTimeout: 120000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/utils/cesiumPluginsExtends/**/*.ts'],
      exclude: [
        'src/utils/cesiumPluginsExtends/**/glsl/**',
        'src/utils/cesiumPluginsExtends/api/**', // 由 scripts/gen-api-stubs.mjs 生成的声明桩
        'src/utils/cesiumPluginsExtends/**/*.d.ts',
        'src/utils/cesiumPluginsExtends/indexOld.ts'
      ]
    }
  }
})

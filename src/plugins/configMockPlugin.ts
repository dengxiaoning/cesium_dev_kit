/**
 * Mock plugin for development and production.
 * https://github.com/anncwb/vite-plugin-mock
 */
import type { Plugin } from 'vite'
import { viteMockServe } from 'vite-plugin-mock'

export function configMockPlugin(
  useMock: boolean = true,
  isBuild: boolean,
): Plugin | null {
  const viteMockServePlugin: Plugin | null = useMock
    ? viteMockServe({
        ignore: /^\_/,
        mockPath: 'mock',
        localEnabled: !isBuild,
        prodEnabled: isBuild,
        injectCode: `
      import { setupProdMockServer } from '../mock/_createProductionServer';

      setupProdMockServer();
      `
      })
    : null
  return viteMockServePlugin
}

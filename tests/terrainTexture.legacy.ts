import assert from 'node:assert'
import { slopeDrapeOffset } from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainTexture'

/** 允许的浮点误差 */
const EPS = 1e-9

function close(actual: number, expected: number, message: string) {
  assert.ok(Math.abs(actual - expected) < EPS, `${message}: 期望 ${expected}，实际 ${actual}`)
}

/* ---------- 竖直立面：交给程序化岩土，不再做弧长展开 ---------- */

// 东侧坑壁：法线指向坑内（西），下挖 100m
const verticalCut = slopeDrapeOffset(-100, -1, 0, 0)
close(verticalCut.east, 0, '竖直坑壁应淡出弧长展开，交给岩土材质')
close(verticalCut.north, 0, '东西向坑壁不应有南北补偿')

// 东侧土堆：法线指向坡外（东），抬升 100m
const verticalFill = slopeDrapeOffset(100, 1, 0, 0)
close(verticalFill.east, 0, '竖直土堆应淡出弧长展开')

/* ---------- 45° 坡：完整补偿量 = L - R ---------- */

const SQRT1_2 = Math.SQRT1_2
const diagonal = slopeDrapeOffset(-100, -SQRT1_2, 0, SQRT1_2)
// L = 100 / sin45 ≈ 141.421356；R = 100 * cos45 / sin45 = 100
// 补偿 = L - R ≈ 41.421356，方向朝坑内（西）
close(diagonal.east, -41.42135623730951, '45° 坡补偿量应等于弧长减水平投影')

// 把水平投影与补偿相加，应恰好等于弧长
const planar45 = (-100 * SQRT1_2) / SQRT1_2
close(planar45 + diagonal.east, -Math.SQRT2 * 100, '45° 坡总 UV 位移应等于弧长')

/* ---------- 陡壁过渡：越接近垂直，补偿量越小 ---------- */

const sin60 = Math.sin(Math.PI / 3)
const cos60 = Math.cos(Math.PI / 3)
const sixty = slopeDrapeOffset(-100, -sin60, 0, cos60)
assert.ok(Math.abs(sixty.east) < Math.abs(diagonal.east) * 0.5, '60° 坡的补偿量应明显小于 45°')
assert.ok(Math.abs(sixty.east) > 0, '60° 坡仍应保留少量补偿')

const nearVertical = slopeDrapeOffset(-100, -0.95, 0, Math.sqrt(1 - 0.95 * 0.95))
close(nearVertical.east, 0, '近垂直立面（约 72°）应完全淡出')

/* ---------- 平台 / 近平地：补偿量趋于 0 ---------- */

const flat = slopeDrapeOffset(-100, 0, 0, 1)
close(flat.east, 0, '平台不应有 UV 补偿')
close(flat.north, 0, '平台不应有 UV 补偿')

const almostFlat = slopeDrapeOffset(-100, -0.01, 0, Math.sqrt(1 - 0.0001))
assert.ok(Math.abs(almostFlat.east) < 1, `近平地补偿量应很小，实际 ${almostFlat.east}`)

/* ---------- 南北向坡面：补偿落在北向分量上 ---------- */

const northFacing = slopeDrapeOffset(-100, 0, -SQRT1_2, SQRT1_2)
close(northFacing.east, 0, '南北向坡面不应有东西补偿')
close(northFacing.north, -41.42135623730951, '45° 南北向坡面补偿应落在南北分量上')

console.log('✓ terrainTexture 全部测试通过')

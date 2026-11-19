/**
 * defaultValue 函数的类型定义
 */
export interface DefaultValueFunction {
  /**
   * Returns the first parameter if not undefined, otherwise the second parameter.
   * Useful for setting a default value for a parameter.
   *
   * @param a - 首选值
   * @param b - 备选值（当 a 为 undefined/null 时返回）
   * @returns 第一个非 undefined/null 的参数，否则返回第二个参数
   *
   * @example
   * param = defaultValue(param, 'default');
   */
  <T>(a: T | undefined | null, b: T): T
  /**
   * A frozen empty object that can be used as the default value for options passed as
   * an object literal.
   */
  EMPTY_OBJECT: Readonly<Record<string, never>>
}

const defaultValue = Object.assign(
  <T>(a: T | undefined | null, b: T): T => {
    if (a !== undefined && a !== null) {
      return a
    }
    return b
  },
  { EMPTY_OBJECT: Object.freeze({}) }
) as DefaultValueFunction

export default defaultValue

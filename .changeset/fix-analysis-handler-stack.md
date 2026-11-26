---
"cesium_dev_kit": patch
---

修复交互式分析的鼠标事件会层层叠加：

`bindHandleEvent` 每次调用都会新建一个 `ScreenSpaceEventHandler`，且只在模块销毁时才清理，从不销毁上一次绑定的。因此重复点击同一个分析按钮（或连续启动两个交互式分析）后，一层 handler 叠一层——一次左键会同时触发多个回调，画出来的观察点 / 视域成倍冒出，像套娃一样。

- `bindHandleEvent` 现在会把创建的 handler 返回给调用方（纯增量，原有忽略返回值的用法不受影响）。
- `Analysis` 内部新增 `bindAnalysisEvent()`，重复绑定前先销毁上一层；`createVisualFieldAnalysis()`（可视域）与 `createMultiViewshedAnalysis()`（多观察点视域）已改用它，同一实例上始终只保留最后一层监听。

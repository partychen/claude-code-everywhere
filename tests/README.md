# 测试套件

使用 **Node.js 内置测试运行器** (18+)，零依赖、跨平台 (Windows/macOS/Linux)。

## 运行测试

```bash
npm test                # 运行所有测试
npm run test:watch      # 监听模式
npm run test:command    # 命令解析测试
npm run test:path       # 路径验证测试
```

## 测试统计

| 测试文件 | 套件 | 用例 | 状态 |
|---------|-----|-----|------|
| command-parser.test.mjs | 7 | 29 | ✅ |
| path-validator.test.mjs | 8 | 32 | ✅ |
| **总计** | **15** | **61** | **✅** |

执行时间: ~58ms

## 测试覆盖

**命令解析**: 基础解析、引号处理、特殊字符、边界情况
**路径验证**: 路径展开/规范化/比较、安全检测、跨平台兼容

## 示例

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('功能模块', () => {
  it('应该正常工作', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

## 注意事项

- 测试依赖 `dist/` 编译文件，运行前自动执行 `tsc`
- 需要 Node.js 18.0.0+
- 所有测试必须通过才能推送代码

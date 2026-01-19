/**
 * PathValidator 路径验证器测试
 * 使用 Node.js 内置 test runner
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { platform } from 'os';
import { PathValidator } from '../dist/utils/path.js';

console.log(`\n当前平台: ${platform()}\n`);

// ============================================
// 测试 1: PathValidator - 基础验证
// ============================================
describe('PathValidator - 基础路径验证', () => {
  const rootDir = platform() === 'win32' ? 'C:\\projects' : '/home/projects';
  const validator = new PathValidator(rootDir);

  it('应该接受有效的相对路径', () => {
    const result = validator.validate('blog');
    assert.ok(result.valid);
    assert.ok(result.normalizedPath);
    assert.ok(result.normalizedPath.includes('blog'));
  });

  it('应该接受嵌套相对路径', () => {
    const result = validator.validate('projects/web/app');
    assert.ok(result.valid);
    assert.ok(result.normalizedPath);
  });

  it('应该拒绝空路径', () => {
    const result = validator.validate('');
    assert.ok(!result.valid);
    assert.ok(result.error);
    assert.ok(result.error.includes('不能为空'));
  });

  it('应该拒绝空白路径', () => {
    const result = validator.validate('   ');
    assert.ok(!result.valid);
  });
});

// ============================================
// 测试 2: PathValidator - 绝对路径检测
// ============================================
describe('PathValidator - 绝对路径检测（跨平台）', () => {
  const rootDir = platform() === 'win32' ? 'C:\\projects' : '/home/projects';
  const validator = new PathValidator(rootDir);

  it('应该拒绝 Unix 绝对路径', () => {
    const result = validator.validate('/usr/local/bin');
    assert.ok(!result.valid);
    assert.ok(result.error.includes('相对路径'));
  });

  it('应该拒绝 ~ 开头的路径', () => {
    const result = validator.validate('~/projects');
    assert.ok(!result.valid);
  });

  if (platform() === 'win32') {
    it('[Windows] 应该拒绝盘符路径', () => {
      const result = validator.validate('C:\\Users\\test');
      assert.ok(!result.valid);
    });

    it('[Windows] 应该拒绝 UNC 路径', () => {
      const result = validator.validate('\\\\network\\share');
      assert.ok(!result.valid);
    });
  }
});

// ============================================
// 测试 3: PathValidator - 安全性检测
// ============================================
describe('PathValidator - 安全性检测', () => {
  const rootDir = platform() === 'win32' ? 'C:\\projects' : '/home/projects';
  const validator = new PathValidator(rootDir);

  it('应该拒绝路径遍历攻击 (..)', () => {
    const result = validator.validate('../../../etc/passwd');
    assert.ok(!result.valid);
    assert.ok(result.error.includes('不安全'));
  });

  it('应该拒绝路径中包含 ..', () => {
    const result = validator.validate('blog/../../../etc');
    assert.ok(!result.valid);
  });

  const specialChars = [
    { char: '<', path: 'blog<test' },
    { char: '>', path: 'blog>test' },
    { char: '|', path: 'blog|test' },
    { char: '"', path: 'blog"test' },
    { char: '?', path: 'blog?test' },
    { char: '*', path: 'blog*test' },
  ];

  specialChars.forEach(({ char, path }) => {
    it(`应该拒绝包含特殊字符 ${char}`, () => {
      const result = validator.validate(path);
      assert.ok(!result.valid);
    });
  });

  it('应该拒绝 null 字节注入', () => {
    const result = validator.validate('blog\x00malicious');
    assert.ok(!result.valid);
  });
});

// ============================================
// 测试 4: PathValidator - 边界情况
// ============================================
describe('PathValidator - 边界情况', () => {
  const rootDir = platform() === 'win32' ? 'C:\\projects' : '/home/projects';
  const validator = new PathValidator(rootDir);

  it('应该处理单字符路径', () => {
    const result = validator.validate('a');
    assert.ok(result.valid);
  });

  it('应该处理包含中文的路径', () => {
    const result = validator.validate('博客项目');
    assert.ok(result.valid);
    assert.ok(result.normalizedPath.includes('博客项目'));
  });

  it('应该处理包含空格的路径', () => {
    const result = validator.validate('my projects');
    assert.ok(result.valid);
  });

  it('应该处理包含短横线的路径', () => {
    const result = validator.validate('my-blog-project');
    assert.ok(result.valid);
  });

  it('应该处理包含下划线的路径', () => {
    const result = validator.validate('my_blog_project');
    assert.ok(result.valid);
  });

  it('应该处理包含数字的路径', () => {
    const result = validator.validate('project123');
    assert.ok(result.valid);
  });

  it('应该处理多层嵌套路径', () => {
    const result = validator.validate('a/b/c/d/e/f');
    assert.ok(result.valid);
  });
});

// ============================================
// 测试 5: PathValidator - 路径遍历防护
// ============================================
describe('PathValidator - 路径遍历防护', () => {
  const rootDir = platform() === 'win32' ? 'C:\\projects' : '/home/projects';
  const validator = new PathValidator(rootDir);

  it('确保规范化路径在根目录内', () => {
    const result = validator.validate('blog');
    assert.ok(result.valid);
    assert.ok(result.normalizedPath);
    const normalizedRoot = rootDir.toLowerCase().replace(/\\/g, '/');
    const normalizedPath = result.normalizedPath.toLowerCase().replace(/\\/g, '/');
    assert.ok(normalizedPath.startsWith(normalizedRoot));
  });

  it('多次遍历也应该被阻止', () => {
    const result = validator.validate('a/../../..');
    assert.ok(!result.valid);
  });
});

// ============================================
// 测试 6: PathValidator - getAllowedRootDir
// ============================================
describe('PathValidator - 辅助方法', () => {
  const rootDir = platform() === 'win32' ? 'C:\\projects' : '/home/projects';
  const validator = new PathValidator(rootDir);

  it('应该返回配置的根目录', () => {
    const result = validator.getAllowedRootDir();
    assert.ok(result);
    assert.ok(result.includes('projects'));
  });
});

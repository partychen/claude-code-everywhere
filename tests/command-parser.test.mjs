/**
 * 命令解析测试
 * 使用 Node.js 内置 test runner
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// 模拟 CommandHandler 的 parseCommand 方法
function parseCommand(content) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

describe('命令解析 - 基础解析', () => {
  it('应该解析简单命令', () => {
    const result = parseCommand('/dir list');
    assert.deepStrictEqual(result, ['/dir', 'list']);
  });

  it('应该解析带参数的命令', () => {
    const result = parseCommand('/dir add blog /path/to/blog');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', '/path/to/blog']);
  });

  it('应该解析多个参数', () => {
    const result = parseCommand('/dir add blog path --preview --default');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--preview', '--default']);
  });
});

describe('命令解析 - 引号处理', () => {
  it('应该处理双引号参数', () => {
    const result = parseCommand('/dir add blog path --description "My Blog"');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--description', 'My Blog']);
  });

  it('应该处理单引号参数', () => {
    const result = parseCommand("/dir add blog path --description 'My Blog'");
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--description', 'My Blog']);
  });

  it('应该处理引号内的空格', () => {
    const result = parseCommand('/dir add blog path --description "A very long description"');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--description', 'A very long description']);
  });

  it('应该处理引号内的特殊字符', () => {
    const result = parseCommand('/dir add blog path --start-cmd "npm run dev"');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--start-cmd', 'npm run dev']);
  });

  it('应该处理多个引号参数', () => {
    const result = parseCommand('/dir add blog path --description "My Blog" --start-cmd "npm start"');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--description', 'My Blog', '--start-cmd', 'npm start']);
  });
});

describe('命令解析 - 边界情况', () => {
  it('应该处理多余的空格', () => {
    const result = parseCommand('/dir   list   ');
    assert.deepStrictEqual(result, ['/dir', 'list']);
  });

  it('应该处理连续空格', () => {
    const result = parseCommand('/dir    add    blog    path');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path']);
  });

  it('应该处理空命令', () => {
    const result = parseCommand('');
    assert.deepStrictEqual(result, []);
  });

  it('应该处理只有空格的命令', () => {
    const result = parseCommand('   ');
    assert.deepStrictEqual(result, []);
  });

  it('应该处理单个命令', () => {
    const result = parseCommand('/help');
    assert.deepStrictEqual(result, ['/help']);
  });
});

describe('命令解析 - 引号边界情况', () => {
  it('应该处理空引号', () => {
    const result = parseCommand('/dir add blog path --description ""');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--description']);
  });

  it('应该处理未闭合的引号', () => {
    const result = parseCommand('/dir add blog "path');
    assert.strictEqual(result.length, 4);
  });

  it('应该处理引号与非引号混合', () => {
    const result = parseCommand('/dir add blog path --description "My" blog');
    assert.deepStrictEqual(result, ['/dir', 'add', 'blog', 'path', '--description', 'My', 'blog']);
  });
});

describe('命令解析 - 真实命令示例', () => {
  it('示例: 添加工作目录（完整参数）', () => {
    const result = parseCommand('/dir add blog /Users/me/blog --description "个人博客" --preview --start-cmd "npm run dev" --port 3000 --default');
    assert.strictEqual(result[0], '/dir');
    assert.strictEqual(result[1], 'add');
    assert.strictEqual(result[2], 'blog');
    assert.ok(result.includes('--preview'));
    assert.ok(result.includes('--default'));
    assert.ok(result.includes('个人博客'));
    assert.ok(result.includes('npm run dev'));
  });

  it('示例: 更新目录配置', () => {
    const result = parseCommand('/dir update blog --description "新描述" --preview on');
    assert.deepStrictEqual(result, ['/dir', 'update', 'blog', '--description', '新描述', '--preview', 'on']);
  });

  it('示例: 删除目录', () => {
    const result = parseCommand('/dir remove blog');
    assert.deepStrictEqual(result, ['/dir', 'remove', 'blog']);
  });

  it('示例: 查看状态', () => {
    const result = parseCommand('/preview status blog');
    assert.deepStrictEqual(result, ['/preview', 'status', 'blog']);
  });

  it('示例: 停止所有预览', () => {
    const result = parseCommand('/preview stop-all');
    assert.deepStrictEqual(result, ['/preview', 'stop-all']);
  });
});

describe('命令解析 - 特殊字符处理', () => {
  it('应该处理路径中的反斜杠', () => {
    const result = parseCommand('/dir add blog C:\\Users\\test\\blog');
    assert.ok(result.includes('C:\\Users\\test\\blog'));
  });

  it('应该处理命令中的短横线', () => {
    const result = parseCommand('/dir add my-blog-project path');
    assert.ok(result.includes('my-blog-project'));
  });

  it('应该处理命令中的下划线', () => {
    const result = parseCommand('/dir add my_blog_project path');
    assert.ok(result.includes('my_blog_project'));
  });

  it('应该处理中文字符', () => {
    const result = parseCommand('/dir add 博客 路径');
    assert.ok(result.includes('博客'));
    assert.ok(result.includes('路径'));
  });

  it('应该处理引号内的中文', () => {
    const result = parseCommand('/dir add blog path --description "我的个人博客项目"');
    assert.ok(result.includes('我的个人博客项目'));
  });
});

describe('命令解析 - 选项参数解析', () => {
  it('应该识别布尔选项', () => {
    const result = parseCommand('/dir add blog path --preview --default');
    assert.ok(result.includes('--preview'));
    assert.ok(result.includes('--default'));
  });

  it('应该识别键值对选项', () => {
    const result = parseCommand('/dir add blog path --port 3000');
    const portIndex = result.indexOf('--port');
    assert.ok(portIndex >= 0);
    assert.strictEqual(result[portIndex + 1], '3000');
  });

  it('应该识别字符串值选项', () => {
    const result = parseCommand('/dir update blog --preview on');
    const previewIndex = result.indexOf('--preview');
    assert.ok(previewIndex >= 0);
    assert.strictEqual(result[previewIndex + 1], 'on');
  });
});

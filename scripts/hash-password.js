#!/usr/bin/env node
import { createHash, randomBytes } from 'crypto';
import { stdin, stdout } from 'process';
import readline from 'readline';

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

console.log('='.repeat(60));
console.log('Claude Code Everywhere - 密码哈希生成工具');
console.log('='.repeat(60));
console.log('');

rl.question('请输入管理员密码: ', (password) => {
  if (!password) {
    console.log('错误: 密码不能为空');
    rl.close();
    return;
  }

  const hash = createHash('sha256').update(password).digest('hex');

  console.log('');
  console.log('✅ SHA-256 密码哈希:');
  console.log(hash);
  console.log('');
  console.log('请将此哈希值添加到 .env 文件:');
  console.log(`WEB_ADMIN_PASSWORD_HASH=${hash}`);
  console.log('');

  rl.question('是否生成 JWT 签名密钥？(y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      const jwtSecret = randomBytes(32).toString('hex');
      console.log('');
      console.log('✅ JWT 签名密钥:');
      console.log(jwtSecret);
      console.log('');
      console.log('请将此密钥添加到 .env 文件:');
      console.log(`WEB_JWT_SECRET=${jwtSecret}`);
      console.log('');
      console.log('⚠️  注意: 请妥善保管这些密钥，不要提交到版本控制系统！');
      console.log('');
    }
    rl.close();
  });
});

import { DWClient, TOPIC_ROBOT } from 'dingtalk-stream';
import { loadConfig } from './config.js';
import { AppState } from './state.js';
import { MessageHandler } from './handlers/message-handler.js';

async function main() {
  // 加载配置
  const config = loadConfig();

  // 初始化状态
  const state = new AppState();

  // 初始化消息处理器
  const messageHandler = new MessageHandler(config, state);

  // 打印启动信息
  console.log('🚀 启动钉钉 Stream 机器人...');
  console.log(`   默认工作目录: ${config.claude.defaultWorkingDir}`);
  console.log('   消息格式: [dir:/path] [new] 任务内容');
  console.log('   - [dir:/path] 指定工作目录');
  console.log('   - [new] 开启新会话（默认继续上次会话）');
  if (config.deploy.autoDeployDirs.length > 0) {
    console.log(`   📦 自动部署已启用，目录: ${config.deploy.autoDeployDirs.join(', ')}`);
  }
  console.log('');

  // 创建钉钉客户端
  const client = new DWClient({
    clientId: config.dingtalk.clientId,
    clientSecret: config.dingtalk.clientSecret,
  });

  // 注册消息处理器
  client.registerCallbackListener(TOPIC_ROBOT, async (event) => {
    const response = await messageHandler.handle(event);
    client.socketCallBackResponse(event.headers.messageId, response);
  });

  // 连接到钉钉
  await client.connect();
  console.log('✅ 已连接到钉钉，等待消息...');
}

// 启动应用
main().catch((error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

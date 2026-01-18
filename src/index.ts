import { DWClient, TOPIC_ROBOT } from 'dingtalk-stream';
import { loadConfig } from './config.js';
import { AppState } from './state.js';
import { MessageHandler } from './handlers/message-handler.js';
import { DatabaseService } from './services/database.js';
import { WorkingDirectoryRepository } from './repositories/working-directory.js';
import { PreviewRepository } from './repositories/preview.js';
import { PreviewService } from './services/preview.js';

async function main() {
  // 加载配置
  const config = loadConfig();

  // 初始化数据库
  console.log('📦 初始化数据库...');
  const dbService = new DatabaseService(config.db.path);
  const workingDirRepo = new WorkingDirectoryRepository(dbService.getDb());
  const previewRepo = new PreviewRepository(dbService.getDb());

  // 初始化预览服务
  const previewService = new PreviewService(previewRepo);

  // 初始化状态
  const state = new AppState();

  // 初始化消息处理器（传入数据库仓库、预览服务和安全配置）
  const messageHandler = new MessageHandler(
    state,
    workingDirRepo,
    previewService,
    config.security.allowedRootDir
  );

  // 打印启动信息
  console.log('🚀 启动钉钉 Stream 机器人...');
  console.log(`   数据库路径: ${config.db.path}`);
  if (config.security.allowedRootDir) {
    console.log(`   🔒 安全限制：工作目录仅允许在 ${config.security.allowedRootDir} 下`);
  }
  console.log('   消息格式: [dir:/path|alias] [new] 任务内容');
  console.log('   - [dir:/path] 指定完整路径');
  console.log('   - [dir:alias] 使用配置的别名');
  console.log('   - [new] 开启新会话（默认继续上次会话）');
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

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n👋 正在关闭...');
    console.log('🛑 停止所有预览服务...');
    await previewService.stopAll();
    dbService.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n👋 正在关闭...');
    console.log('🛑 停止所有预览服务...');
    await previewService.stopAll();
    dbService.close();
    process.exit(0);
  });
}

// 启动应用
main().catch((error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

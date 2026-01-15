/**
 * 获取格式化的时间戳
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 日志工具类
 */
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[${getTimestamp()}]`, message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[${getTimestamp()}]`, message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`[${getTimestamp()}]`, message, ...args);
  },
};

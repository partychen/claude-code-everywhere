import 'dotenv/config';

export interface Config {
  dingtalk: {
    clientId: string;
    clientSecret: string;
  };
  claude: {
    defaultWorkingDir: string;
  };
  deploy: {
    autoDeployDirs: string[];
  };
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  return {
    dingtalk: {
      clientId: getEnvOrThrow('DINGTALK_CLIENT_ID'),
      clientSecret: getEnvOrThrow('DINGTALK_CLIENT_SECRET'),
    },
    claude: {
      defaultWorkingDir: getEnvOrDefault('CLAUDE_WORKING_DIR', process.cwd()),
    },
    deploy: {
      autoDeployDirs: process.env.AUTO_DEPLOY_DIRS?.split(',').map(d => d.trim()) || [],
    },
  };
}

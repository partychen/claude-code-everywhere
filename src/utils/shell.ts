import { spawn } from 'child_process';

export interface ShellCommand {
  command: string;
  args?: string[];
  cwd?: string;
  input?: string;
  logOutput?: boolean;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * 获取跨平台的 shell 配置
 */
function getShellConfig(command: string): { shell: string; args: string[] } {
  if (process.platform === 'win32') {
    return {
      shell: 'cmd.exe',
      args: ['/c', command],
    };
  } else {
    return {
      shell: '/bin/zsh',
      args: ['-lc', command],
    };
  }
}

/**
 * 执行 shell 命令
 */
export async function executeCommand(options: ShellCommand): Promise<ShellResult> {
  const { command, cwd, input, logOutput = false } = options;

  return new Promise((resolve, reject) => {
    const { shell, args } = getShellConfig(command);

    const child = spawn(shell, args, { cwd });

    let stdout = '';
    let stderr = '';

    // 如果有输入，通过 stdin 传递
    if (input && child.stdin) {
      child.stdin.write(input + '\n');
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      if (logOutput) {
        console.log(output.trim());
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      if (logOutput) {
        console.error(output.trim());
      }
    });

    child.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0,
      });
    });

    child.on('error', reject);
  });
}

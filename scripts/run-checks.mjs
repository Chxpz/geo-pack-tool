import { spawnSync } from 'node:child_process';

const taskMap = {
  lint: ['run', 'lint'],
  typecheck: ['run', 'typecheck'],
  build: ['run', 'build'],
};

const requestedTasks = process.argv.slice(2);
const tasks = requestedTasks.length > 0 ? requestedTasks : ['lint', 'typecheck'];

for (const task of tasks) {
  const args = taskMap[task];

  if (!args) {
    console.error(`Unknown task "${task}". Expected one of: ${Object.keys(taskMap).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n==> npm ${args.join(' ')}`);

  const result = spawnSync('npm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

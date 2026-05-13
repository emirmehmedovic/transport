module.exports = {
  apps: [
    {
      name: "transport-app",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      time: true,
    },
    {
      name: "transport-cron",
      script: "npm",
      args: "run cron:start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      time: true,
    },
  ],
};

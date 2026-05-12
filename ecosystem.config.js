module.exports = {
  apps: [
    {
      name: "transport-app",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 2,
      exec_mode: "cluster",
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

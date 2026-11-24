const port = process.env.PORT || "3000";
const appName = process.env.PM2_APP_NAME || "aktifkoding";

module.exports = {
  apps: [
    {
      name: appName,
      cwd: __dirname,
      script: "./node_modules/next/dist/bin/next",
      args: `start -p ${port}`,
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      windowsHide: true,
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};

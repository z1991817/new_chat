module.exports = {
  apps: [
    {
      name: "artimg-pro",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};

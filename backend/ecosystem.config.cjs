module.exports = {
  apps: [
    {
      name: "mern-backend",

      script: "server.js",
      cwd: __dirname,

      // 🔥 Performance
      instances: "max",          // use all CPU cores
      exec_mode: "cluster",     // enable cluster mode

      // 🔁 Reliability
      autorestart: true,
      watch: false,             // NEVER true in production
      max_memory_restart: "300M", // restart if memory exceeds limit

      // ⏱ Restart strategy
      restart_delay: 5000,      // wait 5s before restart
      max_restarts: 10,
      min_uptime: "10s",

      // 🌍 Environment
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },

      // 📊 Logging
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,

      // ⚡ Advanced Node flags
      node_args: "--max-old-space-size=256",

      // 🧠 Kill timeout (graceful shutdown)
      kill_timeout: 5000
    }
  ]
};
module.exports = {
  apps: [
    {
      name: "backend",
      script: "server.js",
      cwd: "./backend",
      watch: false,
      env: { NODE_ENV: "production" },
      error_file: "./error.log",
      out_file: "./out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
{
      name: "frontend",
      script: "npm",
      args: ["start"],  // Just use npm start for development
      cwd: "./frontend",
      watch: false,
      env: { NODE_ENV: "production" },
      error_file: "./error.log",
      out_file: "./out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};

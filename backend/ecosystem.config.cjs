module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

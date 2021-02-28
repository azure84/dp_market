const env = process.env.NODE_ENV || 'development';
const envs = {
  development: {
    port: 3000,
    model: {
      host: 'localhost',
      database: 'db_test',
      username: 'root',
      password: '',
    },
  },
  test: {
  },
  production: {
  },
};

module.exports = envs[env];

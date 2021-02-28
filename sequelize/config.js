const config = require('./../src/config');

module.exports = {
  development: {
    username: config.model.username,
    password: config.model.password,
    database: config.model.database,
    host: config.model.host,
    dialect: 'mysql',
  },
};

const Sequelize = require('sequelize');
const config = require('config');
const glob = require('glob');
const path = require('path');
const cls = require('continuation-local-storage');

const namespace = cls.createNamespace('dblab');
const db = {};
const { Op } = Sequelize;

Sequelize.useCLS(namespace);

const operatorsAliases = {
  $eq: Op.eq,
  $ne: Op.ne,
  $gte: Op.gte,
  $gt: Op.gt,
  $lte: Op.lte,
  $lt: Op.lt,
  $not: Op.not,
  $in: Op.in,
  $notIn: Op.notIn,
  $is: Op.is,
  $like: Op.like,
  $notLike: Op.notLike,
  $iLike: Op.iLike,
  $notILike: Op.notILike,
  $regexp: Op.regexp,
  $notRegexp: Op.notRegexp,
  $iRegexp: Op.iRegexp,
  $notIRegexp: Op.notIRegexp,
  $between: Op.between,
  $notBetween: Op.notBetween,
  $overlap: Op.overlap,
  $contains: Op.contains,
  $contained: Op.contained,
  $adjacent: Op.adjacent,
  $strictLeft: Op.strictLeft,
  $strictRight: Op.strictRight,
  $noExtendRight: Op.noExtendRight,
  $noExtendLeft: Op.noExtendLeft,
  $and: Op.and,
  $or: Op.or,
  $any: Op.any,
  $all: Op.all,
  $values: Op.values,
  $col: Op.col
};

const sequelize = new Sequelize(
  config.model.database,
  config.model.username,
  config.model.password,
  {
    host: config.model.host,
    dialect: 'mysql',
    operatorsAliases,
    define: {
      charset: 'utf8',
      collate: 'utf8_general_ci',
      dialectOptions: {
        timeout: 6000000,
      },
    },
  },
);

const files = glob.sync(`${__dirname}/**/*.js`);
files
  .filter((file) => {
    const filename = file.split('/').pop();
    return (file.indexOf('.') !== 0) && (filename !== 'index.js');
  })
  .forEach((file) => {
    const model = sequelize.import(file);
    db[model.name] = model;
  });

Object.keys(db)
  .forEach((modelName) => {
    if ('associate' in db[modelName]) {
      db[modelName].associate(db);
    }
  });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

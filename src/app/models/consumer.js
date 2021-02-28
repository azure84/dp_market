const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const Consumer = sequelize.define('Consumer', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      lowercase: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
      field: 'email',
    },
    password: {
      type: DataTypes.STRING(88),
      allowNull: false,
      field: 'password',
    },
    salt: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: '',
      field: 'salt',
    },
    epsilon: {
      type: DataTypes.DECIMAL(2, 1),
      field: 'epsilon',
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      field: 'price',
      allowNull: false,
    },
    point: {
      type: DataTypes.DECIMAL(12, 2),
      field: 'point',
      allowNull: false,
      defaultValue: 0,
      vlaidate: {
        min: 0,
      },
    },
    credit: {
      type: DataTypes.DECIMAL(12, 2),
      field: 'credit',
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'consumer',
    timestamps: false,
    getterMethods: {
      is_consumer() {
        return true;
      },
      is_provider() {
        return false;
      },
    },
  });

  Consumer.associate = (models) => {
    Consumer.hasMany(models.Transaction, {
      foreignKey: {
        name: 'cid',
        field: 'cid',
      },
    });
    Consumer.hasMany(models.Question, {
      foreignKey: {
        name: 'cid',
        field: 'cid',
      },
    });
    Consumer.hasMany(models.PointLog, {
      foreignKey: {
        name: 'tid',
        field: 'tid',
      },
      constraints: false,
    });
  };

  Consumer.prototype.hashPassword = async function(password) {
    const md5sum = crypto.createHash('md5');
    md5sum.update(password);
    const digestedPassword = md5sum.digest('hex');
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(digestedPassword, this.salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) { return reject(err); }
        resolve(derivedKey.toString('base64'));
      });
    });
  };

  Consumer.prototype.validPassword = async function validPassword(password) {
    const hashPassword = await this.hashPassword(password);
    return this.password === hashPassword;
  };

  Consumer.beforeCreate(async (consumer) => {
    const cryptedConsumer = consumer;
    cryptedConsumer.salt = crypto.randomBytes(16).toString('base64');
    cryptedConsumer.password = await cryptedConsumer.hashPassword(consumer.password);
  });

  Consumer.beforeUpdate(async (consumer) => {
    const cryptedConsumer = consumer;
    if (cryptedConsumer.previous('password') !== cryptedConsumer.password) {
      cryptedConsumer.password = await cryptedConsumer.hashPassword(cryptedConsumer.password);
    }
  });

  return Consumer;
};

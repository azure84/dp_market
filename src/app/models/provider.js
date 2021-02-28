const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const Provider = sequelize.define('Provider', {
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
      allowNull: false,
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
      validate: {
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
    tableName: 'provider',
    timestamps: false,
    getterMethods: {
      is_consumer() {
        return false;
      },
      is_provider() {
        return true;
      },
    },
  });

  Provider.associate = (models) => {
    Provider.hasMany(models.Transaction, {
      foreignKey: {
        name: 'pid',
        field: 'pid',
      },
    });
    Provider.hasMany(models.PointLog, {
      foreignKey: {
        name: 'tid',
        field: 'tid',
      },
      constraints: false,
    })
  }

  Provider.prototype.hashPassword = async function(password) {
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

  Provider.prototype.validPassword = async function validPassword(password) {
    const hashPassword = await this.hashPassword(password);
    return this.password === hashPassword;
  };

  Provider.beforeCreate(async (provider) => {
    const cryptedProvider = provider;
    cryptedProvider.salt = crypto.randomBytes(16).toString('base64');
    cryptedProvider.password = await cryptedProvider.hashPassword(provider.password);
  });

  Provider.beforeUpdate(async (provider) => {
    const cryptedProvider = provider;
    if (cryptedProvider.previous('password') !== cryptedProvider.password) {
      cryptedProvider.password = await cryptedProvider.hashPassword(cryptedProvider.password);
    }
  });

  return Provider;
};

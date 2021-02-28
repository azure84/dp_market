module.exports = (sequelize, DataTypes) => {
  const PointLog = sequelize.define('PointLog', {
    point_change: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('consumer', 'provider'),
      allowNull: false,
    },
    tid: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    tableName: 'point_log',
    timestamps: true,
    underscored: true,
  });

  PointLog.prototype.getItem = function () {
    return this['get' + this.get('type').substr(0, 1).toUpperCase() + this.get('type').substr(1)]();
  };

  PointLog.associate = (models) => {
    PointLog.belongsTo(models.Consumer, {
      foreignKey: {
        name: 'tid',
        field: 'tid',
      },
      constraints: false,
      scope: {
        type: 'consumer',
      },
    });
    PointLog.belongsTo(models.Provider, {
      foreignKey: {
        name: 'tid',
        field: 'tid',
      },
      constraints: false,
      scope: {
        type: 'provider,'
      },
    })
  }

  return PointLog;
};

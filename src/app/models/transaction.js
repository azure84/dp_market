module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    negotiation_price: {
      type: DataTypes.DECIMAL(12, 2),
      field: 'negotiation_price',
    },
    negotiation_epsilon: {
      type: DataTypes.DECIMAL(12, 2),
      field: 'negotiation_epsilon',
    },
    c_approval_flag: {
        type: DataTypes.ENUM('yet', 'deny', 'approve'),
        defaultValue: 'yet',
        allowNull: false,
      field: 'c_approval_flag',
    },
    p_approval_flag: {
        type: DataTypes.ENUM('yet', 'deny', 'approve'),
        defaultValue: 'yet',
        allowNull: false,
      field: 'p_approval_flag',
    },
    c_point_change: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'c_point_change',
    },
    c_credit_change: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'c_credit_change',
    },
    p_point_change: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'p_point_change',
    },
    p_credit_change: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'p_credit_change',
    },
    p_response: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0.0,
      field: 'p_response',
    },
    p_rappor: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'p_rappor',
    },
    p_epsilon: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
      defaultValue: 0.0,
      field: 'p_epsilon',
    },
    p_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'p_price'
    },
    original_p_response: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false,
    },
  }, {
    tableName: 'transaction',
    timestamps: false,
  });
  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Question, {
      foreignKey: {
        name: 'qid',
        field: 'qid'
      },
    });
    Transaction.belongsTo(models.Provider, {
      foreignKey: {
        name: 'pid',
        field: 'pid',
      },
    });

    Transaction.belongsTo(models.Consumer, {
      foreignKey: {
        name: 'cid',
        field: 'cid',
      }
    });
  }
  return Transaction;
};

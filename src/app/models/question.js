const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('integer', 'select'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false,
    },
    epsilon: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: '',
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: '',
      allowNull: false,
    },
    expired_at: {
      type: DataTypes.DATE,
      field: 'expired_at',
      allowNull: false,
    },
    manual_close: {
      type: DataTypes.BOOLEAN,
      field: 'manual_close',
      defaultValue: false,
      allowNull: false,
    },
  }, {
    tableName: 'question',
    timestamps: false,
    getterMethods: {
      is_finish() {
        return this.expired_at < moment.now() || this.manual_close
      },
      numericMin() {
        return this.QuestionNumericExtra && this.QuestionNumericExtra.min;
      },
      numericMax() {
        return this.QuestionNumericExtra && this.QuestionNumericExtra.max;
      }
    }
  });

  Question.associate = (models) => {
    Question.hasMany(models.QuestionOption, {
      foreignKey: {
        name: 'qid',
        field: 'qid',
      },
    });
    Question.hasMany(models.Transaction, {
      foreignKey: {
        name: 'qid',
        field: 'qid',
      },
    });
    Question.belongsTo(models.Consumer, {
      foreignKey: {
        name: 'cid',
        field: 'cid',
      },
    });
    Question.hasOne(models.QuestionNumericExtra, {
      foreignKey: {
        name: 'qid',
        field: 'qid',
      },
    });
  };

  Question.prototype.countReplies = async function() {
    const db = require('app/models');
    const count = await db.Transaction.count({
      where: {
          qid: this.id,
          p_approval_flag: 'approve',
          c_approval_flag: 'approve'
      }
    })
    return count;
  }
  return Question;
};

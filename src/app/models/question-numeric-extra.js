module.exports = (sequelize, DataTypes) => {
  const QuestionNumericExtra = sequelize.define('QuestionNumericExtra', {
    min: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    max: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'question_numeric_extra',
    timestamps: false,
  });

  QuestionNumericExtra.associate = (models) => {
    QuestionNumericExtra.belongsTo(models.Question, {
      foreignKey: {
        name: 'qid',
        field: 'qid',
      },
    });
  }

  return QuestionNumericExtra;
};

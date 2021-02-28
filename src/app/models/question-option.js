module.exports = (sequelize, DataTypes) => {
  const QuestionOption = sequelize.define('QuestionOption', {
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'question_option',
    timestamps: false,
  });

  QuestionOption.associate = (models) => {
    QuestionOption.belongsTo(models.Question, {
      foreignKey: {
        name: 'qid',
        field: 'qid',
      },
    })
  };
  return QuestionOption;
};
'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn('question', 'epsilon', {
            type: Sequelize.DECIMAL(2, 1),
            defaultVaule: ''
        }).then(() => {
            return queryInterface.addColumn('question', 'price', {
                type: Sequelize.DECIMAL(12, 2),
                defaultVaule: ''
            })
        })
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.removeColumn('question', 'epsilon').then(() => {
          return queryInterface.removeColumn('question', 'price')
      })
  }
};

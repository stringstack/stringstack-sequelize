'use strict';

module.exports = {
  up: ( sequelize, Sequelize ) => {

    let queryInterface = sequelize.getQueryInterface();

    return queryInterface
      .createTable(
        'testTwo',
        {
          id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          createdAt: {
            type: Sequelize.DataTypes.DATE
          },
          updatedAt: {
            type: Sequelize.DataTypes.DATE
          },
          name: { type: Sequelize.DataTypes.STRING },
          description: { type: Sequelize.DataTypes.TEXT },
          value: { type: Sequelize.DataTypes.BIGINT }
        }
      )
      .then( () => {

        queryInterface.addIndex( 'testTwo', {
          name: 'value',
          fields: [ 'value', 'name' ]
        } );

      } );

  },

  down: ( sequelize ) => {

    let queryInterface = sequelize.getQueryInterface();

    return queryInterface.dropTable( 'testTwo' );

  }
};

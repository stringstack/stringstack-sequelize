module.exports = function ( Sequelize ) {

  return {
    schema: {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      createdAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        type: Sequelize.DATE
      },
      name: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      value: { type: Sequelize.BIGINT }
    },
    options: {
      indexes: [
        {
          name: 'value',
          fields: [ 'value', 'name' ]
        }
      ]
    }
  };

};
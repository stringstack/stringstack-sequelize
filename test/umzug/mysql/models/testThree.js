'use strict';

// this file should not get loaded because it does not end in .model.js
module.exports = function ( Sequelize ) {

  return {
    schema: {
      name: Sequelize.STRING,
      description: Sequelize.TEXT,
      value: Sequelize.BIGINT
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
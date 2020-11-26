'use strict';

describe( 'stringstack', function () {
  describe( 'sequelize', function () {

    require( './eslint.test.js' );

    describe( 'general', function () {
      require( './general.test.js' );
    } );

    describe( 'mysql', function () {
      require( './setup.mysql.test.js' );
      require( './query.mysql.test.js' );
    } );

  } );
} );

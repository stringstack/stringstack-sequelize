describe( 'stringstack', function () {
  describe( 'sequelize', function () {

    describe( 'general', function () {
      require( './general.test.js' );
    } );

    describe( 'mysql', function () {
      require( './setup.mysql.test.js' );
      require( './query.mysql.test.js' );
    } );

  } );
} );

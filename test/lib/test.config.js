'use strict';

class SetupTestConfigComponent {

  constructor( deps ) {

    this._nconf = deps.get( 'config' );

    this._nconf.defaults( {
      stringstack: {
        sequelize: SetupTestConfigComponent.defaultConfig
      }
    } );

  }

  init( done ) {
    done();
  }

  dinit( done ) {
    done();
  }

}

SetupTestConfigComponent.restoreDefaultConfig = function () {

  SetupTestConfigComponent.defaultConfig = {
    models: [],
    connections: {
      test: {
        username: 'root',
        password: 'test-password',
        options: {
          host: 'localhost',
          port: 13306
        }
      }
    }
  };

};

SetupTestConfigComponent.restoreDefaultConfig();

module.exports = SetupTestConfigComponent;

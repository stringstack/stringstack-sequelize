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
    connections: {
      'mysql_5.6': {
        database: 'stringstack_sequelize_test',
        username: 'root',
        password: 'test-password',
        options: {
          dialect: 'mysql',
          host: 'localhost',
          port: 13306
        },
        setupDir: null,
        applyMigrations: false
      },
      'mysql_5.7': {
        database: 'stringstack_sequelize_test',
        username: 'root',
        password: 'test-password',
        options: {
          dialect: 'mysql',
          host: 'localhost',
          port: 13306
        },
        setupDir: null,
        applyMigrations: false
      },
      'mysql_8.0': {
        database: 'stringstack_sequelize_test',
        username: 'root',
        password: 'test-password',
        options: {
          dialect: 'mysql',
          host: 'localhost',
          port: 13306
        },
        setupDir: null,
        applyMigrations: false
      }
    }
  };

};

SetupTestConfigComponent.restoreDefaultConfig();

module.exports = SetupTestConfigComponent;

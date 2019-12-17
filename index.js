'use strict';

const __ = require( 'doublescore' );
const async = require( 'async' );
const fs = require( 'fs' );
const Path = require( 'path' );
const Sequelize = require( 'sequelize' );
const Umzug = require( 'umzug' );

let defaultConfig = {
  connections: {}
};

let defaultConnectionConfig = {
  database: 'mysql',
  username: '',
  password: '',
  options: {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    // operatorsAliases: false, // default value in sequelize is true, which is also deprecated now... silly I know.
    logging: false // another weird default that needs to be overridden
  },
  setupDir: null,
  applyMigrations: false
};

class SequelizeComponent {

  constructor( deps ) {

    this._nconf = deps.get( 'config' );

    this._connectionModelsInitialized = {};
    this._config = null;
    this._connectionPool = {};

  }

  init( done ) {

    if ( this._config ) {
      return done( new Error( 'already initialized' ) );
    }

    this._config = __( defaultConfig ).mixin( this._nconf.get( 'stringstack:sequelize' ) );

    this._initAllConnections( done );

  }

  dinit( done ) {

    if ( !this._config ) {
      return done( new Error( 'already d-initialized' ) );
    }

    this._config = null;

    async.series( [
      ( done ) => {
        async.eachOfSeries( this._connectionPool, ( sequelize, name, done ) => {

          sequelize.close()
            .then( () => {
              done();
            } )
            .catch( done );

        }, done );
      },
      ( done ) => {
        Object.keys( this._connectionPool ).forEach( ( name ) => {
          delete this._connectionPool[name];
        } );
        done();
      }
    ], done );

  }

  getConnection( connectionName, done ) {

    if ( !this._config ) {
      return done( new Error( 'not initialized' ) );
    }

    if ( this._connectionPool.hasOwnProperty( connectionName ) ) {
      return done( null, this._connectionPool[connectionName] );
    }

    if ( !this._config.connections.hasOwnProperty( connectionName ) ) {
      return done( new Error( 'connection identifier not found' ) );
    }

    let config = __( defaultConnectionConfig ).mixin( this._config.connections[connectionName] );

    let { database, username, password, options } = config;

    let sequelize = new Sequelize( database || null, username || null, password || null, options || {} );

    async.waterfall( [
      ( done ) => {

        sequelize
          .authenticate()
          .then( () => {
            done();
          } )
          .catch( done );

      },
      ( done ) => {

        this._connectionPool[connectionName] = sequelize;
        done( null, sequelize );

      }
    ], done );

  }

  _initAllConnections( done ) {

    async.eachOfSeries( this._config.connections, ( connectionConfig, connectionName, done ) => {
      this._initConnection( connectionName, connectionConfig, done );
    }, done );

  }

  _initConnection( connectionName, connectionConfig, done ) {

    if ( this._connectionModelsInitialized[connectionName] ) {
      return done();
    }
    this._connectionModelsInitialized[connectionName] = true;

    connectionConfig = this._normalizeConnectionConfig( connectionConfig );

    if ( typeof connectionConfig.setupDir !== 'string' || connectionConfig.setupDir.trim().length < 1 ) {
      return done();
    }

    let setupDir = connectionConfig.setupDir.trim();
    if ( setupDir.match( /^\./ ) ) {
      setupDir = Path.join( process.cwd(), setupDir );
    }
    setupDir = Path.normalize( setupDir );

    async.waterfall( [
      ( done ) => {
        this.getConnection( connectionName, done );
      },
      ( sequelize, done ) => {

        if ( connectionConfig.applyMigrations ) {
          this._initMigrations( setupDir, sequelize, done );
        } else {
          setImmediate( done, null, sequelize );
        }

      },
      ( sequelize, done ) => {
        this._initModels( setupDir, sequelize, done );
      }
    ], done );

  }

  _initMigrations( setupDir, sequelize, done ) {

    let umzug = new Umzug( {
      storage: 'sequelize',
      storageOptions: {
        sequelize: sequelize,
        tableName: 'SequelizeMeta'
      },
      migrations: {
        path: Path.join( setupDir, 'migrations' ),
        params: [ sequelize, Sequelize ]
      },
      logging: function () {
        // TODO hook this to logging harness
      }
    } );

    umzug.up()
      .then( () => {
        setImmediate( done, null, sequelize );
      } )
      .catch( done );

  }

  _initModels( setupDir, sequelize, done ) {

    let modelsDir = Path.join( setupDir, 'models' );

    async.waterfall( [
      ( done ) => {
        fs.readdir( modelsDir, done );
      },
      ( files, done ) => {

        files = files
          .filter( ( file ) => {
            return typeof file === 'string' && file.match( /^[a-zA-Z][a-zA-Z0-9]*\.model\.js$/ );
          } )
          .map( ( file ) => {

            let parts = file.split( '.' );

            return {
              path: Path.join( modelsDir, file ),
              modelName: parts[0]
            };

          } );

        try {

          files.forEach( ( file ) => {

            let loader = require( file.path );
            let model = loader( Sequelize );

            if ( !model.schema ) {
              throw new Error( 'schema field required' );
            }

            sequelize.define( file.modelName, model.schema, model.options || {} );

          } );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], done );

  }

  _normalizeConnectionConfig( connectionConfig ) {

    return __( defaultConnectionConfig ).mixin( connectionConfig );

  }


}

module.exports = SequelizeComponent;

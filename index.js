'use strict';

const __ = require( 'doublescore' );
const async = require( 'async' );
const fs = require( 'fs' );
const Path = require( 'path' );
const Sequelize = require( 'sequelize' );
const Umzug = require( 'umzug' );
const wkx = require('wkx')

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

function hasOwn( obj, field ) {
  return Object.prototype.hasOwnProperty.call( obj, field );
}

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


    Sequelize.GEOMETRY.prototype._stringify = function _stringify(value, options) {
      return `ST_GeomFromText(${options.escape(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
    }
    Sequelize.GEOMETRY.prototype._bindParam = function _bindParam(value, options) {
      return `ST_GeomFromText(${options.bindParam(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
    }
    Sequelize.GEOGRAPHY.prototype._stringify = function _stringify(value, options) {
      return `ST_GeomFromText(${options.escape(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
    }
    Sequelize.GEOGRAPHY.prototype._bindParam = function _bindParam(value, options) {
      return `ST_GeomFromText(${options.bindParam(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
    }

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

  _getSetupDir( connectionConfig ) {

    if ( typeof connectionConfig.setupDir !== 'string' ) {
      throw new Error( 'setupDir must be a string' );
    }

    let setupDir = connectionConfig.setupDir.trim();
    if ( setupDir.match( /^\./ ) ) {
      setupDir = Path.join( process.cwd(), setupDir );
    }

    return Path.normalize( setupDir );

  }

  getConnection( connectionName, done = null ) {

    if ( typeof done !== 'function' ) {

      done = ( e, connection ) => {

        return new Promise( ( resolve, reject ) => {
          if ( e ) {
            return reject( e );
          }

          resolve( connection );
        } );

      };

    }

    if ( !this._config ) {
      return done( new Error( 'not initialized' ) );
    }

    if ( hasOwn( this._connectionPool, connectionName ) ) {
      return done( null, this._connectionPool[connectionName] );
    }

    if ( !hasOwn( this._config.connections, connectionName ) ) {
      return done( new Error( 'connection identifier not found' ) );
    }

    let config = __( defaultConnectionConfig ).mixin( this._config.connections[connectionName] );

    let { database, username, password, options } = config;

    let sequelize = new Sequelize( database || null, username || null, password || null, options || {} );

    return sequelize
      .authenticate()
      .then( () => {

        this._connectionPool[connectionName] = sequelize;

        return done( null, sequelize );

      } )
      .catch( done );

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

    const setupDir = this._getSetupDir( connectionConfig );

    async.waterfall( [
      async () => {

        const sequelize = await this.getConnection( connectionName );

        if ( connectionConfig.applyMigrations ) {
          await this._initMigrations( setupDir, sequelize );
        }

        return sequelize;

      },
      ( sequelize, done ) => {
        this._initModels( setupDir, sequelize, done );
      }
    ], done );

  }

  applyMigrations( connectionName, done = null ) {

    if ( typeof done !== 'function' ) {

      done = e => {

        return new Promise( ( resolve, reject ) => {
          if ( e ) {
            return reject( e );
          }

          resolve();
        } );

      };

    }

    if ( !this._config ) {
      return done( new Error( 'not initialized' ) );
    }

    if ( !this._config.connections ) {
      return done( new Error( 'config missing connections' ) );
    }

    if ( !this._config.connections[connectionName] ) {
      return done( new Error( 'config missing connection for ' + connectionName ) );
    }

    return this._applyMigration( connectionName, this._config.connections[connectionName] )
      .then( () => {
        done();
      } )
      .catch( done );

  }

  async _applyMigration( connectionName, connectionConfig ) {

    // don't apply this migration if it already happened at init
    if ( connectionConfig.applyMigrations ) {
      throw new Error( 'can not manually apply migrations if applyMigrations: true in config' );
    }

    const sequelize = await this.getConnection( connectionName );

    const setupDir = this._getSetupDir( connectionConfig );

    await this._initMigrations( setupDir, sequelize );

  }

  _initMigrations( setupDir, sequelize ) {

    if ( typeof setupDir !== 'string' ) {
      throw new Error( 'setupDir must be a string' );
    }

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

    return umzug.up();

  }

  _initModels( setupDir, sequelize, done ) {

    if ( typeof setupDir !== 'string' ) {
      return done( new Error( 'setupDir must be a string' ) );
    }

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

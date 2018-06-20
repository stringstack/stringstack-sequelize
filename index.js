'use strict';

const __ = require( 'doublescore' );
const async = require( 'async' );
const Sequelize = require( 'sequelize' );

let defaultConfig = {
  models: [],
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
    operatorsAliases: false, // default value in sequelize is true, which is also deprecated now... silly I know.
    logging: false // another weird default override
  }
};

let defaultModelConfig = {
  dir: null,
  connection: null,
  password: null,
  region: null,
  database: null,
  schema: null,
  warehouse: null,
  role: null
};

class SequelizeComponent {

  constructor( deps ) {

    this._nconf = deps.get( 'config' );

    this._config = null;

    this._connectionPool = {};

  }

  init( done ) {

    this._config = __( defaultConfig ).mixin( this._nconf.get( 'stringstack:sequelize' ) );

    done();

  }

  dinit( done ) {

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
          delete this._connectionPool[ name ];
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
      return done( null, this._connectionPool[ connectionName ] );
    }

    if ( !this._config.connections.hasOwnProperty( connectionName ) ) {
      return done( new Error( 'connection identifier not found' ) );
    }

    let config = __( defaultConnectionConfig ).mixin( this._config.connections[ connectionName ] );

    let { database, username, password, ...remaining } = config;
    let options = remaining.options || {};

    let sequelize = new Sequelize( database || null, username || null, password || null, options || {} );

    async.waterfall( [
      ( done ) => {

        // console.log( 'DEBUG 100' );
        sequelize
          .authenticate()
          .then( () => {
            done();
          } )
          .catch( done );

      },
      ( done ) => {

        // console.log( 'DEBUG 101' );
        this._connectionPool[ connectionName ] = sequelize;
        done( null, sequelize );

      }
    ], done );

  }


}

module.exports = SequelizeComponent;

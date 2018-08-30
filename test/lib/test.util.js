'use strict';

const assert = require( 'assert' );
const async = require( 'async' );
const SetupTestConfigComponent = require( './test.config' );
const StringStackCore = require( '@stringstack/core' );
const docker = require( './docker.util' );
const Sequelize = require( 'sequelize' );

let dockerDependencies = [
  {
    dialect: 'mysql',
    name: 'stringstack-sequelize-test-mysql',
    image: 'mysql:5.7.22',
    ports: {
      '3306/tcp': '13306'
    },
    envs: {
      MYSQL_ROOT_PASSWORD: 'test-password'
    }
  }
];

module.exports = {
  dockerStart: function ( dialect, done ) {

    async.series( [
      ( done ) => {
        // clean-up any straggling containers, possibly left over from previous failed tests
        docker.batchRemove( dockerDependencies, done );
      },
      ( done ) => {
        docker.batchCreate( dockerDependencies.filter( ( dep ) => {
          return !!dep && dep.dialect === dialect;
        } ), done );
      },
      ( done ) => {

        let ready = false;

        SetupTestConfigComponent.restoreDefaultConfig();

        if ( !SetupTestConfigComponent.defaultConfig.connections.hasOwnProperty( dialect ) ) {
          return done( new Error( 'connection does not exist' ) );
        }

        let { database, username, password, options } = SetupTestConfigComponent.defaultConfig.connections[ dialect ];

        options.operatorsAliases = false;
        options.logging = false;

        // query against the DB until it is live
        async.until( () => ready, ( done ) => {

          let sequelize = new Sequelize( null, username || null, password || null, options || {} );

          async.series( [
            ( done ) => {

              sequelize
                .query( 'CREATE DATABASE ' + database + ';' )
                .then( () => {
                  ready = true;
                  done();
                } )
                .catch( () => {
                  setTimeout( done, 1000 );
                } );

            },
            ( done ) => {

              sequelize.close()
                .then( () => {
                  done();
                } )
                .catch( done );

            }
          ], done );

        }, done );

      }
    ], done );

  },
  dockerStop: function ( done ) {

    async.series( [
      ( done ) => {
        docker.batchRemove( dockerDependencies, done );
      }
    ], done );

  },
  getComponentNative: function ( app, targetPath ) {
    // lets you pull a component from the stack, do not use this pattern of accessing _loader outside of testing
    return app._loader.get( 'app', targetPath );
  },
  generateQueryTest: function ( check, done ) {

    let app = null;
    let postDinit = false;
    let component = null;

    async.series( [
      ( done ) => {

        try {

          let core = new StringStackCore();

          const App = core.createApp( {
            rootComponents: [
              './test/lib/test.config',
              './index'
            ]
          } );

          app = new App( 'test' );

          component = this.getComponentNative( app, './index' );

          assert( component, 'component should be available' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {

        try {

          // do not use the pattern of accessing _config externally outside of testing
          assert.strictEqual( component._config, null, 'component config should be null' );
          assert( Object.keys( component._connectionPool ).length < 1, 'connectionPool should be empty before init' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {
        try {
          app.init( done );
        } catch ( e ) {
          return done( e );
        }
      },
      ( done ) => {

        try {

          assert( Object.keys( component._connectionModelsInitialized ).length > 0, 'models should be initialized' );
          assert( !!component._config, 'component config should not be null' );
          assert( Object.keys( component._connectionPool ).length > 0,
            'connectionPool should not be empty immediately after init' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {

        try {
          check( component, done );
        } catch ( e ) {
          return done( e );
        }

      },
      ( done ) => {

        try {

          assert( Object.keys( component._connectionPool ).length > 0,
            'connectionPool should be non-empty after getting a connection' );

        } catch ( e ) {
          return done( e );
        }

        done();

      },
      ( done ) => {

        postDinit = true;

        try {
          app.dinit( done );
        } catch ( e ) {
          return done( e );
        }
      },
      ( done ) => {

        try {

          assert.strictEqual( component._config, null, 'component config should be null' );
          assert( Object.keys( component._connectionPool ).length < 1, 'connectionPool should be empty after dinit' );

        } catch ( e ) {
          return done( e );
        }

        done();

      }
    ], ( e ) => {

      if ( e ) {

        if ( postDinit ) {
          done( e );
        } else {
          app.dinit( () => {
            done( e );
          } );
        }

      }

      done();

    } );
  }
};

'use strict';

const assert = require( 'assert' );
const async = require( 'async' );
const SetupTestConfigComponent = require( './lib/test.config' );
const StringStackCore = require( '@stringstack/core' );
const docker = require( './lib/docker.util' );
const Sequelize = require( 'sequelize' );

let dockerDependencies = [
  {
    name: 'stringstack-sequelize-test-mysql',
    image: 'mysql:5.7.22',
    ports: {
      "3306/tcp": "13306"
    },
    envs: {
      MYSQL_ROOT_PASSWORD: 'test-password'
    }
  }
];

// lets you pull a component from the stack, do not use this pattern of accessing _loader outside of testing
let getComponentNative = function ( app, targetPath ) {
  return app._loader.get( 'app', targetPath );
};

let generateQueryTest = function ( check, done ) {

  let app = null;
  let component = null;

  SetupTestConfigComponent.restoreDefaultConfig();

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

        component = getComponentNative( app, './index' );

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

        assert( !!component._config, 'component config should not be null' );
        assert( Object.keys( component._connectionPool ).length < 1,
          'connectionPool should be empty immediately after init' );

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
  ], done );

};

describe( 'stringstack', function () {
  describe( 'sequelize', function () {
    describe( 'mysql', function () {

      before( function ( done ) {

        this.timeout( 60000 );

        async.series( [
          ( done ) => {
            // clean-up any straggling containers, possibly left over from previous failed tests
            docker.batchRemove( dockerDependencies, done );
          },
          ( done ) => {
            docker.batchCreate( dockerDependencies, done );
          },
          ( done ) => {

            let ready = false;

            SetupTestConfigComponent.restoreDefaultConfig();
            let { database, username, password, ...remaining } = SetupTestConfigComponent.defaultConfig.connections.test;
            let options = remaining.options || {};

            options.dialect = 'mysql';
            options.operatorsAliases = false;
            options.logging = false;

            // query against the DB until it is live
            async.until( () => ready, ( done ) => {

              let sequelize = new Sequelize( database || null, username || null, password || null, options || {} );

              async.series( [
                ( done ) => {

                  sequelize
                    .authenticate()
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

      } );

      after( function ( done ) {

        this.timeout( 10000 );

        async.series( [
          ( done ) => {
            docker.batchRemove( dockerDependencies, done );
          }
        ], done );

      } );

      it( 'should show databases', function ( done ) {

        this.timeout( 1000 );

        generateQueryTest( function ( component, done ) {

          async.waterfall( [
            ( done ) => {
              component.getConnection( 'test', done );
            },
            ( sequelize, done ) => {

              sequelize
                .query( 'show databases;', {
                  raw: true,
                  type: sequelize.QueryTypes.SELECT
                } )
                .then( ( result ) => {

                  try {

                    assert( Array.isArray( result ), 'result should be an array' );
                    assert( result.length > 0, 'result should be non-empty' );

                  } catch ( e ) {
                    return done( e );
                  }

                  done();
                } )
                .catch( done );

            }
          ], done );

        }, done );

      } );


    } );
  } );
} );
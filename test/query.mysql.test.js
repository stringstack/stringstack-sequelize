'use strict';

const assert = require( 'assert' );
const async = require( 'async' );
const testConfig = require( './lib/test.config' );
const testUtils = require( './lib/test.util' );

describe( 'query', function () {

  [
    'mysql_5.7',
    'mysql_8.0'
  ].forEach( ( connectionName ) => {

    describe( connectionName, function () {
      before( function ( done ) {

        this.timeout( 60000 );

        testUtils.dockerStart( connectionName, done );

      } );

      after( function ( done ) {

        this.timeout( 10000 );

        testUtils.dockerStop( done );

      } );

      it( 'should issue a query and get results', function ( done ) {

        this.timeout( 1000 );

        testConfig.restoreDefaultConfig();
        testConfig.defaultConfig.connections[connectionName].setupDir = './test/umzug/mysql';
        testConfig.defaultConfig.connections[connectionName].applyMigrations = true;

        testUtils.generateQueryTest( function ( component, done ) {

          async.waterfall( [
            ( done ) => {
              component.getConnection( connectionName, done );
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
                    assert.strictEqual( result.length, 5, 'result should have 5 entries' );
                    assert.deepStrictEqual( result, [
                      { Database: 'information_schema' },
                      { Database: 'mysql' },
                      { Database: 'performance_schema' },
                      { Database: 'stringstack_sequelize_test' },
                      { Database: 'sys' }
                    ], 'result did not match expected result' );

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
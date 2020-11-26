'use strict';

const assert = require( 'assert' );
const async = require( 'async' );
const testConfig = require( './lib/test.config' );
const testUtils = require( './lib/test.util' );

describe( 'setup', function () {

  [
    'mysql_5.6',
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

      it( 'should apply migrations by config', function ( done ) {

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
                .query( 'SELECT * FROM stringstack_sequelize_test.SequelizeMeta;', {
                  raw: true,
                  type: sequelize.QueryTypes.SELECT
                } )
                .then( ( result ) => {

                  try {

                    assert( Array.isArray( result ), 'result should be an array' );
                    assert.strictEqual( result.length, 2, 'result have 2 entries' );
                    assert.deepStrictEqual( result, [
                      { name: '20180620225346-TICKET-001.js' },
                      { name: '20180622225506-TICKET-002.js' }
                    ], 'result did not match expected result' );

                  } catch ( e ) {
                    return done( e );
                  }

                  done( null, sequelize );
                } )
                .catch( done );

            },
            ( sequelize, done ) => {

              sequelize
                .query( 'show tables;', {
                  raw: true,
                  type: sequelize.QueryTypes.SELECT
                } )
                .then( ( result ) => {

                  try {

                    assert( Array.isArray( result ), 'result should be an array' );
                    assert.strictEqual( result.length, 3, 'result should have 3 entries' );
                    assert.deepStrictEqual( result, [
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'SequelizeMeta' },
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'testOne' },
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'testTwo' }
                    ], 'result did not match expected result' );


                  } catch ( e ) {
                    return done( e );
                  }

                  done( null, sequelize );
                } )
                .catch( done );

            }
          ], done );

        }, done );

      } );

      it( 'should apply migrations manually with callback', function ( done ) {

        this.timeout( 1000 );

        testConfig.restoreDefaultConfig();
        testConfig.defaultConfig.connections[connectionName].setupDir = './test/umzug/mysql';
        testConfig.defaultConfig.connections[connectionName].applyMigrations = false;

        testUtils.generateQueryTest( function ( component, done ) {

          async.waterfall( [
            ( done ) => {
              component.applyMigrations( connectionName, done );
            },
            ( done ) => {
              component.getConnection( connectionName, done );
            },
            ( sequelize, done ) => {

              sequelize
                .query( 'SELECT * FROM stringstack_sequelize_test.SequelizeMeta;', {
                  raw: true,
                  type: sequelize.QueryTypes.SELECT
                } )
                .then( ( result ) => {

                  try {

                    assert( Array.isArray( result ), 'result should be an array' );
                    assert.strictEqual( result.length, 2, 'result have 2 entries' );
                    assert.deepStrictEqual( result, [
                      { name: '20180620225346-TICKET-001.js' },
                      { name: '20180622225506-TICKET-002.js' }
                    ], 'result did not match expected result' );

                  } catch ( e ) {
                    return done( e );
                  }

                  done( null, sequelize );
                } )
                .catch( done );

            },
            ( sequelize, done ) => {

              sequelize
                .query( 'show tables;', {
                  raw: true,
                  type: sequelize.QueryTypes.SELECT
                } )
                .then( ( result ) => {

                  try {

                    assert( Array.isArray( result ), 'result should be an array' );
                    assert.strictEqual( result.length, 3, 'result should have 3 entries' );
                    assert.deepStrictEqual( result, [
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'SequelizeMeta' },
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'testOne' },
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'testTwo' }
                    ], 'result did not match expected result' );


                  } catch ( e ) {
                    return done( e );
                  }

                  done( null, sequelize );
                } )
                .catch( done );

            }
          ], done );

        }, done );

      } );

      it( 'should apply migrations manually with promise', function ( done ) {

        this.timeout( 1000 );

        testConfig.restoreDefaultConfig();
        testConfig.defaultConfig.connections[connectionName].setupDir = './test/umzug/mysql';
        testConfig.defaultConfig.connections[connectionName].applyMigrations = false;

        testUtils.generateQueryTest( function ( component, done ) {

          async.waterfall( [
            async () => {
              await component.applyMigrations( connectionName );
            },
            async () => {
              return component.getConnection( connectionName );
            },
            ( sequelize, done ) => {

              sequelize
                .query( 'SELECT * FROM stringstack_sequelize_test.SequelizeMeta;', {
                  raw: true,
                  type: sequelize.QueryTypes.SELECT
                } )
                .then( ( result ) => {

                  try {

                    assert( Array.isArray( result ), 'result should be an array' );
                    assert.strictEqual( result.length, 2, 'result have 2 entries' );
                    assert.deepStrictEqual( result, [
                      { name: '20180620225346-TICKET-001.js' },
                      { name: '20180622225506-TICKET-002.js' }
                    ], 'result did not match expected result' );

                  } catch ( e ) {
                    return done( e );
                  }

                  done( null, sequelize );
                } )
                .catch( done );

            },
            ( sequelize, done ) => {

              sequelize
                .query( 'show tables;', {
                  raw: true,
                  type: sequelize.QueryTypes.SELECT
                } )
                .then( ( result ) => {

                  try {

                    assert( Array.isArray( result ), 'result should be an array' );
                    assert.strictEqual( result.length, 3, 'result should have 3 entries' );
                    assert.deepStrictEqual( result, [
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'SequelizeMeta' },
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'testOne' },
                      // eslint-disable-next-line camelcase
                      { Tables_in_stringstack_sequelize_test: 'testTwo' }
                    ], 'result did not match expected result' );


                  } catch ( e ) {
                    return done( e );
                  }

                  done( null, sequelize );
                } )
                .catch( done );

            }
          ], done );

        }, done );

      } );


      it( 'should load models', function ( done ) {

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

              try {

                assert( !!sequelize.models.testOne, 'should have a testOne model' );
                assert( !!sequelize.models.testTwo, 'should have a testTwo model' );
                assert( !sequelize.models.testThree, 'should not have a testThree model' );

              } catch ( e ) {
                return done( e );
              }

              done();

            }
          ], done );

        }, done );

      } );

    } );

  } );


} );

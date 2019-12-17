'use strict';

const async = require( 'async' );
const Docker = require( 'dockerode' );
const mkdirp = require( 'mkdirp' );
const waitOn = require( 'wait-on' );

let docker = new Docker( { socketPath: '/var/run/docker.sock' } );

module.exports = {
  batchCreate: function ( dockerDependencies, done ) {

    async.eachSeries( dockerDependencies, ( dependency, done ) => {

      dependency = dependency.options;

      async.series( [
        ( done ) => {
          this.create( dependency, done );
        },
        ( done ) => {

          if ( dependency.ports ) {

            // wait for all exposed/mapped ports to open
            let resources = [];

            Object.keys( dependency.ports ).forEach( ( key ) => {
              resources.push( 'tcp:127.0.0.1:' + dependency.ports[key] );
            } );

            waitOn( {
              resources: resources,
              interval: 50,
              timeout: 5000
            }, done );

          } else {
            done();
          }

        }
      ], done );

    }, done );

  },
  batchRemove: function ( dockerDependencies, done ) {

    async.eachSeries( dockerDependencies, ( dependency, done ) => {
      dependency = dependency.options;

      this.remove( dependency.name, done );
    }, done );

  },
  create: function ( params, done ) {

    let name = params.name;
    let image = params.image;
    let ports = params.ports;
    let binds = params.binds;
    let envs = params.envs || {};

    if ( ports ) {

      let temp = {};

      Object.keys( ports ).forEach( function ( key ) {
        temp[key] = [
          {
            HostIp: '127.0.0.1',
            HostPort: ports[key]
          }
        ];
      } );

      ports = temp;

    } else {
      ports = null;
    }

    async.waterfall( [
      ( done ) => {
        docker.pull( image, null, done, null );
      },
      ( stream, done ) => {
        docker.modem.followProgress( stream, done );
      },
      ( status, done ) => {

        let imageRef = {
          Image: image,
          name: name
        };

        if ( ports ) {
          imageRef.PortBindings = ports;
        }

        envs = envs || {};

        let envKeys = Object.keys( envs );

        if ( envKeys.length > 0 ) {

          imageRef.Env = [];

          envKeys.forEach( ( key ) => {
            imageRef.Env.push( key + '=' + envs[key] );
          } );

        }

        docker.createContainer( imageRef, done );
      },
      ( container, done ) => {

        if ( !container ) {
          return done( new Error( 'could not start ' + name + '(' + image + ')' ) );
        }

        container.start( ( err ) => {

          if ( err ) {
            return done( err );
          }

          done( null, container );

        } );

      }
    ], done );

  },
  remove: function ( name, done ) {

    async.waterfall( [
      function ( done ) {
        docker.listContainers( { all: true }, done );
      },
      function ( containers, done ) {

        let containerLookup = {};

        containers.forEach( function ( container ) {

          if ( container && Array.isArray( container.Names ) && container.Names.length > 0 ) {
            containerLookup[container.Names[0].replace( /^\//, '' )] = container;
          }

        } );

        done( null, containerLookup );

      },
      function ( containerLookup, done ) {

        if ( !containerLookup.hasOwnProperty( name ) ) {
          return done();
        }

        let containerContext = containerLookup[name];
        let container = docker.getContainer( containerLookup[name].Id );

        async.series( [
          function ( done ) {

            if ( containerContext.State !== 'running' ) {
              return done();
            }

            // console.log( 'container stop', containerLookup[ name ].Id );
            container.stop( done );
          },
          function ( done ) {
            // console.log( 'container remove', containerLookup[ name ].Id );
            container.remove( done );
          }
        ], done );

      }
    ], done );

  }
};

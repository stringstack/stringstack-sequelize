# StringStack Sequelize

StringStack/sequelize is a component container for SequelizeJS that allows you to easily include the library in your 
StringStack application.

# Installation

```bash
npm install @stringstack/sequelize --save
```

This will also install SequelizeJS for you. See the version log at the end of this document to see which version of 
SequelizeJS is provided with each version of StringStack/sequelize. 

You will need to install the driver for the dialect you wish to use. According to SequalizeJS documentation, install one
of these drivers. Note, you can create multiple connections with StringStack/sequelize, each with a different dialect. 
If you need to use multiple dialects install all the drivers you need.

```bash
$ npm install --save pg pg-hstore // PostgreSQL
$ npm install --save mysql2 // MySQL
$ npm install --save sqlite3 // SQLite
$ npm install --save tedious // MSSQL
```

# Configuration

StringStack/sequelize looks for configuration in the nconf container provided by StringStack/core. Store the 
configuration in nconf at the path ```stringstack:sequelize```.

```json
{
  "connections": {
    "example": {
      "database": "string",
      "username": "string",
      "password": "string",
      "options": {
        "host": "string",
        "port": 3306,
        "dialect": "string"
      },
      "setupDir": null,
      "applyMigrations": false
    }
  }
}
```

The configuration allows you to have multiple named connections. Each connection is named by the field name in the 
connections object in config. In the above schema the one connection defined is named 'example'. The configuration is
almost entirely passed directly to SequelizeJS.

Make sure that you pass ```options.dialect``` for each connection, and make sure you installed the correct drivers for
that dialect according to the installation instructions in this document.

If the above config was stored in a variable named ```this._config```, then Sequelize is initialized like this.

```javascript
let connectionConfig = this._config.connections.example;
let sequelize = new Sequelize( connectionConfig.database || null, connectionConfig.username || null, connectionConfig.password || null, connectionConfig.options || {} );
```

For more information about options and dialect specific config, see
[http://docs.sequelizejs.com/class/lib/sequelize.js](http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor)


## applyMigrations field

If this field is true, you must define a migrations directory inside the directory passed to setupDir. Migrations are
applied from ```Path.join(setupDir, 'migrations')``` directory. Each migration file must conform to the migration
framework prescribed by sequelize-cli and Umzug. Details on the specifics below in the documentation on the setupDir
field.

If you have applyMigrations set to TRUE, migrations will run before models are applied. Once your model is available it
can assume all migrations have been run and the DB matches the model file. Thus, you should always update your model
file to match any migrations you add. 

## setupDir field

This is a path to a directory that contains all models and migrations for the connection. The directory MUST
contain at least one sub directory called models. It MUST also contain a migrations directory if you set applyMigrations
to TRUE.

Path resolution for setupDir works like this. 

* If your setupDir path starts with . or .., then the path will be prefixed with process.cwd() and normalized. (For all
code examples below, if you see ```setupDir```, it is the normalized version of your path with CWD already prefixed.)
* If your setupDir path starts with /, then it will resolve the path from your root filesystem.

### Models in setupDir

Each model gets its own file of the form ```<modelName>.model.js```. modelName MUST be alphanumeric and camel-case. It
MUST begin with a letter, a-z or A-Z. It may contain any additional number of characters a-z, A-Z or 0-9, up to 255
characters. This name will be passed directly to SQL and will be the name of your table. 

Each model file MUST look like this.

```javascript
module.exports = function ( Sequelize ) {

  return {
    schema: {
    },
    options: {
    }
  };

};
```

Sequelize will be the ```Sequelize``` class. The options field is optional, but the schema field is required.

The function exported by the model file will be passed to the instance of Sequelize connection in this manner.

```javascript
let loader = require( pathToTheModelFile );
let model = loader( Sequelize );

sequelize.define( modelNamePulledFromFileName, model.schema, model.options || {} );
```

You will be able to access each model like this.

```javascript
async.waterfall([
  (done) => {
    this._sequelize.getConnection( 'example', done );
  },
  (sequelize, done) => {
    sequelize.models.modelName.findAll(/*...*/, done);
    // OR
    sequelize.modelName.findAll(/*...*/, done);
    // where modelName is the file name before .model.js.
  }
]);
```
### Migrations in setupDir

You may also manage your schema migrations with StringStack/sequelize. StringStack/sequelize comes packaged with Umzug,
which is the migration tool developed by SequelizeJS team and uses very similar patterns to sequelize-cli tool. The 
order in which migrations are applied is up to the order of the Umzug tool. The structure of each migration file is
based on the migration skeleton described here:

http://docs.sequelizejs.com/manual/tutorial/migrations.html#migration-skeleton

One variation from the skeleton described in native Sequelize are the parameters passed to up() and down(). In 
StringStack/sequelize we initialize Umzug like this.

```javascript
let umzug = new Umzug( {
  storage: 'sequelize',
  storageOptions: {
    sequelize: sequelize,
    tableName: 'SequelizeMeta'
  },
  migrations: {
    path: Path.join( setupDir, 'migrations' ),
    params: [ sequelize, Sequelize ]
  }
} );

return umzug.up();
```

Here ```sequelize``` is an instance of the ```Sequelize``` class, initialized for this connection, and ```setupDir``` is a 
normalized path to your setupDir. 

If applyMigrations is TRUE, the Umzug library will run the above code, applying all migrations in the migrations 
directory in your setupDir. Umzug will maintain the migration state of your database in the SequelizeMeta table in your
database. So, don't modify this table unless you want to break your migration state.

If you want to learn more about Umzug, do so here. https://www.npmjs.com/package/umzug

A migration file that creates a table and adds an index might look like this.

```javascript
'use strict';

module.exports = {
  up: ( sequelize, Sequelize ) => {
 
    let queryInterface = sequelize.getQueryInterface();
 
    return queryInterface
      .createTable(
        'testTable',
        {
          id: {
            type: Sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          createdAt: {
            type: Sequelize.DataTypes.DATE
          },
          updatedAt: {
            type: Sequelize.DataTypes.DATE
          },
          name: { type: Sequelize.DataTypes.STRING },
          description: { type: Sequelize.DataTypes.TEXT },
          value: { type: Sequelize.DataTypes.BIGINT }
        }
      )
      .then( () => {
 
        queryInterface.addIndex( 'testOne', {
          name: 'value',
          fields: [ 'value', 'name' ]
        } );
 
      } );
 
  },

  down: ( sequelize, Sequelize ) => {

    let queryInterface = sequelize.getQueryInterface();

    return queryInterface.dropTable( 'testOne' );

  }
};

```

Notice we return the Promise of the queries. Also, SequalizeJS includes BluebirdJS, an excellent promise library. If you
want to perform a complex migration you can ```const Bluebird = require( 'bluebird' );``` at the top of the file and
leverage that library.

Finally, migration file names. Umzug will order migrations by the corresponding filename. Make sure your files order
how you want the migrations to apply. One particular time to care about this is after merging branches in your 
version control system (hopefully its Git). If two branches modify schema, the order of those migrations may not matter
on their own, but do matter with each other. Take care after merging branches that have each added migrations. Make
sure the order of migrations still makes sense.

Double finally, never delete a migration once it has been deploid/applied. Deleting a migration prevents roll-backs, and
prevents new environments from deploying from scratch.  

# Models vs Migrations

You may have noticed something. In our configuration example we define the same table twice. We define it in the model,
and we define it in the migration. Does this mean that creating a model does not actually create the corresponding
table in SQL? Yes, that is correct.

This is how sequelize works. Unlike popular no-SQL solutions, like Mongoose for MongoDB, SQL tends to like very 
structured ways of rolling out schema changes. You could get super fancy, and create an initial migration that pulls
in your config from your model dynamically, but this leads to problematic situations. For example, what if your model
changes later and then a new engineer tries to setup their development environment? This would happen:

* The new engineer would have a blank database, with no migrations.
* StringStack/sequelize will apply all migrations.
* The first migration, which dynamically pulls in the model file would pull in the model file. 
* However, the model file no longer looks like it did on day 1 of this model. It looks like it should after all 
migrations are applied. 
* It creates the table with the current schema, not the schema that existed before all migrations were created over the
life of the code base.
* Now StringStack/sequelize applies all the migrations to the model.
* Maybe it would still be OK, maybe not. My guess is problems.

The conclusion is just copy and paste your schema for new models. After one schema change that initial migration to 
create the table and your current model file will no longer be the same.

# Testing

You should do test driven development. Why? http://lmgtfy.com/?q=why+do+test+driven+development

Run tests like this.

```bash
npm test
```

# Version Log

This is a log of which version of SequelizeJS is provided by each version of StringStack/snowflake.

## SequelizeJS

@stringstack/sequelize@0.0.1 => sequalize@4.37.10

## Umzug

@stringstack/sequelize@0.0.1 => umzug@2.0.1

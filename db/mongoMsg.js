var Mongo = require('mongodb'),
    MongoClient = Mongo.MongoClient,
    mongoUrl = require('./constants').mongoUrl;

module.exports = {
    
    ObjectID : function (id){

        var oid = new ObjectId(id)

        return oid;

    },

    msg: function(calli) {
        // Use connect method to connect to the Server

        console.log('mongoUrl', mongoUrl)
        MongoClient.connect(mongoUrl, function(err, db) {
            if (err) throw err;

            calli({ db: db, err: err, warns: [] }); //insert method

        }); //mongo connect

    },

    updatemany: function(table, filter, set, calli) {

        return function(msg) {

            var collection = msg.db.collection(table);

            collection.updateMany(filter, { $set: set }, function(err, r) {

                msg.result = r;

                msg.err = err;

                calli(msg)

            });

        }

    },//updatemany

    sertobj: function(table, obj, calli) {

        return function(msg) {

            // Get the documents collection
            var collection = msg.db.collection(table);

            collection.save(obj, function(err, result) {

                msg.result = result;

                msg.err = err;

                calli(msg);

                //msg.db.close();
            });

        }

    }, //sertobj

    sertMany: function(table, obj, calli) {

        return function(msg) {

            // Get the documents collection
            var collection = msg.db.collection(table);

            collection.insert(obj, function(err, result) {

                msg.result = result;

                msg.err = err;

                calli(msg);

            });

        }

    }, //sertMany

    getby: function(table, terms, ops, calli) {

        return function(msg) {

            msg.db.collection(table).find(terms).toArray(function(err, docs) {

                msg.docs = docs;

                msg.err = err;

                calli(msg);

            });


        }

    }, //getby

    removeby: function(table, terms, ops, calli) {

        return function(msg) {

            msg.db.collection(table).removeMany(terms, function(err, docs) {

                msg.docs = docs;

                msg.err = err;

                calli(msg);

            });


        }

    }, //removeby

    getbySort: function(table, terms, ops, sort, calli) {

            return function(msg) {

                msg.db.collection(table).find(terms).sort(sort).toArray(function(err, docs) {

                    msg.docs = docs;

                    msg.err = err;

                    calli(msg);

                });

            }

        } //getbySort
};
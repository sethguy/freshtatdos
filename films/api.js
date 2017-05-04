const express = require('express'),
    request = require('request'),
    router = express.Router(),
    sqlite3 = require('sqlite3').verbose(),
    async = require('async'),
    MongoMsgApi = require("../db/mongoMsg"),
    ObjectId = require('mongodb').ObjectID,
    mongoMsg = MongoMsgApi.msg,
    sertobj = MongoMsgApi.sertobj,
    sertMany = MongoMsgApi.sertMany,
    getby = MongoMsgApi.getby,
    getbySort = MongoMsgApi.getbySort,
    db = new sqlite3.Database('./db/database.db');

const GA_THIRD_PARTY_API_URL_BASE = "http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films="

router.get('/:id', function(req, response, next) {

    var params = req.params;

    mongoMsg(getby("films", { id: parseInt(params.id) }, {}, function(msg) {

        response.status(200).json(msg.docs);

    }))

})

router.get('/:id/recommendations', function(req, response, next) {

    try {

        var query = req.query;

        var params = req.params;

        var limit = query.limit || 10

        var offset = query.offset || 0

        var onlyNumbers =/^\d+$/

        if (!onlyNumbers.test(params.id) ) {

            return response.status(422).json({
                message:"InValid id ::  "+params.id
            });


        }

        if ( !onlyNumbers.test(limit) ||  !onlyNumbers.test(offset)  ) {

            return response.status(422).json({
                message:"InValid query params ::  "+params.id,
                queryParams:query
            });


        }

        async.waterfall(
            [
                function(done) {

                    var asyncMsg = {

                    };

                    mongoMsg(getby("films", { id: parseInt(params.id) }, {}, function(msg) {


                        if (!msg.docs || msg.docs.length == 0 || msg.err) {

                            return done(new Error(msg.err || " no film with that id"));

                        } else {

                            asyncMsg.getFilmByIdResponse = msg.docs[0]

                            return done(null, asyncMsg);

                        }

                    }))

                },
                function(asyncMsg, done) {
                    // Options for the request.

                    var film = asyncMsg.getFilmByIdResponse

                    milli_date = film.milli_date;

                    mongoMsg(getby("films", {
                        genre_id: film.genre_id,
                        milli_date: { $gt: milli_date - 473354280000 },
                        milli_date: { $lt: milli_date + 473354280000 }
                    }, {}, function(msg) {

                        if (!msg.docs || msg.docs.length == 0 || msg.err) {

                            return done(new Error(msg.err || " no good recommendations found"));

                        } else {

                            asyncMsg.getFilmByGenre_idResponse = msg.docs

                            return done(null, asyncMsg);

                        }


                    }))

                },
                function(asyncMsg, done) {

                    mongoMsg(getby("genres", {
                        id: asyncMsg.getFilmByIdResponse.genre_id,
                    }, {}, function(msg) {

                        if (!msg.docs || msg.docs.length == 0 || msg.err) {

                            return done(new Error(msg.err || " no good recommendations found"));

                        } else {

                            asyncMsg.getGenre = msg.docs[0]

                            return done(null, asyncMsg);

                        }


                    }))


                },
                function(asyncMsg, done) {
                    // Options for the request.

                    var getReviewsUrl = GA_THIRD_PARTY_API_URL_BASE

                        .concat(

                        asyncMsg.getFilmByGenre_idResponse.map((film) => film.id).toString()

                    )

                    request(getReviewsUrl, function(error, getReviewsResponse, getReviewsResponseBody) {

                            asyncMsg.getReviews = JSON.parse(getReviewsResponseBody);

                            done(null, asyncMsg)

                        }) // get me

                },
                function(asyncMsg, done) {

                    var reviewSets = asyncMsg.getReviews;

                    var atLeast5Reviews = reviewSets.filter((reviewSet) => reviewSet.reviews.length >= 5);

                    var averageAtleast4 = atLeast5Reviews.filter((reviewSet) => {

                        var reviews = reviewSet.reviews;

                        var setSum = reviews.map((r) => r.rating).reduce((prev, curr) => prev + curr)

                        var avg = (setSum / reviews.length)

                        return avg > 4

                    })

                    var averageAtleast4IdList = averageAtleast4.map((reviewSet) => reviewSet.film_id);

                    asyncMsg.doneSet = asyncMsg.getFilmByGenre_idResponse

                        .filter((film) => (averageAtleast4IdList.indexOf(film.id) > -1)).map((film) => {

                        var ratingSet = averageAtleast4.filter((set) => (set.film_id == film.id))[0]

                        var setSum = ratingSet.reviews.map((r) => r.rating).reduce((prev, curr) => prev + curr)

                        var avg = setSum / ratingSet.reviews.length

                        return {

                            "id": film.id,
                            "title": film.title,
                            "releaseDate": film.release_date,
                            "genre": asyncMsg.getGenre.name,
                            "averageRating": avg.toFixed(2),
                            "reviews": ratingSet.reviews.length

                        }

                    })

                    return done(null, asyncMsg);

                }
            ],
            function(err, asyncMsg) {
                // Handle any errors from the requests.
                if (err) {
                    console.error('An error occurred while contacting the server.');
                    console.log(err);
                    return;
                }

                var recommendations = asyncMsg.doneSet.filter((film, i) => {

                    return (i >= offset) && (i < (offset + limit))

                })

                response.status(200).json({
                    "recommendations": recommendations,
                    "meta": {
                        "limit": (limit),
                        "offset": (offset)
                    }
                });

            }
        )

    } catch (err) {
        return response.status(404).json({ error: err.message });
    }

});

router.get('/migrate/1', function(req, response, next) {

    var query = req.query;

    var params = req.params;

    async.waterfall(
        [
            function(done) {

                var asyncMsg = {

                };

                db.all("SELECT * from films", function(err, rows) {

                    var films = rows.map((film) => {

                        film.milli_date = new Date(film.release_date).getTime()

                        return film

                    })

                    mongoMsg(sertMany("films", films, function(msg) {

                        if (msg.err) {

                            return done(new Error(msg.err));

                        } else {

                            asyncMsg.films = msg.result

                            return done(null, asyncMsg);

                        }

                    }))

                });
            },
            function(asyncMsg, done) {


                db.all("SELECT * from genres", function(err, rows) {


                    mongoMsg(sertMany("genres", rows, function(msg) {

                        if (msg.err) {

                            return done(new Error(msg.err));

                        } else {

                            asyncMsg.genres = msg.result

                            return done(null, asyncMsg);

                        }

                    }))

                });

            },
            function(asyncMsg, done) {


                db.all("SELECT * from artists", function(err, rows) {


                    mongoMsg(sertMany("artists", rows, function(msg) {

                        if (msg.err) {

                            return done(new Error(msg.err));

                        } else {

                            asyncMsg.artists = msg.result

                            return done(null, asyncMsg);

                        }

                    }))

                });

            },
            function(asyncMsg, done) {

                db.all("SELECT * from artist_films", function(err, rows) {


                    mongoMsg(sertMany("artist_films", rows, function(msg) {

                        if (msg.err) {

                            return done(new Error(msg.err));

                        } else {

                            asyncMsg.artist_films = msg.result

                            return done(null, asyncMsg);

                        }

                    }))

                });

            }

        ],
        function(err, asyncMsg) {
            // Handle any errors from the requests.
            if (err) {
                console.error('An error occurred while contacting the server.');
                console.log(err);
                return;
            }

            response.status(200).json(asyncMsg);

        }
    )

})

module.exports = router

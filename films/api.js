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

router.get('/sert/all', function(req, response, next) {

    var query = req.query;

    var params = req.params;

    db.all("SELECT * from films", function(err, rows) {

        console.log(query, "   ", rows.map((film) => { film.release_date = new Date(film.release_date) }))

        mongoMsg(sertMany("films", rows.map((film) => {

            film.release_date = new Date(film.release_date).getTime()

            return film

        }), function(msg) {

            response.status(200).json(msg.result);

        }))

    });

})

router.get('/:id/recommendations', function(req, response, next) {

    try {

        var query = req.query;

        var params = req.params;

        console.log(query, "   ", params)

        var thirdPartyUrl = GA_THIRD_PARTY_API_URL_BASE.concat(params.id)

        //rows contain values while errors, well you can figure out.

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

                    release_date = film.release_date;

                    mongoMsg(getby("films", {
                        genre_id: film.genre_id,
                        release_date: { $gt: release_date - 473354280000 },
                        release_date: { $lt: release_date + 473354280000 }
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
                    // Options for the request.

                    var getReviewsUrl = GA_THIRD_PARTY_API_URL_BASE

                        .concat(

                        asyncMsg.getFilmByGenre_idResponse.map((film) => film.id).toString()

                    )

                    request(getReviewsUrl, function(error, getReviewsResponse, getReviewsResponseBody) {

                            console.log("getReviewsUrl", getReviewsResponseBody)

                            asyncMsg.getReviews = JSON.parse(getReviewsResponseBody);

                            done(null, asyncMsg)

                        }) // get me

                },
                function(asyncMsg, done) {

                    var reviewSets = asyncMsg.getReviews;

                    var atLeast5Reviews = reviewSets.filter((reviewSet) => reviewSet.reviews.length >= 5);

                    var averageAtleast4 = atLeast5Reviews.filter((reviewSet) => {

                        var reviews = reviewSet.reviews;

                        console.log(reviews.map((r) => r.rating))

                        var setSum = reviews.map((r) => r.rating).reduce((prev, curr) => prev + curr)

                        console.log("sum", setSum)

                        var avg = (setSum / reviews.length)

                        console.log("avg", avg)

                        return avg > 4

                    })

                    var averageAtleast4IdList = averageAtleast4.map((reviewSet) => reviewSet.film_id)

                    asyncMsg.doneSet = asyncMsg.getFilmByGenre_idResponse

                        .filter((film) => (averageAtleast4IdList.indexOf(film.id) > -1)).map((film) => {

                        var ratingSet = averageAtleast4.filter((set) => (set.film_id == film.id))[0]
        
                        var setSum = ratingSet.reviews.map((r) => r.rating).reduce((prev, curr) => prev + curr)

                        var avg = setSum / ratingSet.reviews.length

                        return {

                            "id": film.id,
                            "title": film.title,
                            "releaseDate": new Date(film.release_date).toLocaleString(),
                            "genre": film.genre_id,
                            "averageRating": avg,
                            "reviews": ratingSet.length

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

                response.status(200).json({
                    "recommendations": asyncMsg.doneSet,
                    "meta": {
                        "limit": (params.limit || 10),
                        "offset": (params.offset || 0)
                    }
                });

            }
        )

    } catch (err) {
        return response.status(404).json({ error: err.message });
    }

});



module.exports = router

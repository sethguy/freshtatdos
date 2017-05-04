var sertfilms =  function(req, response, next) {

    var query = req.query;

    var params = req.params;

    console.log(query, "   ", params)


    db.all("SELECT * from films", function(err, rows) {

        mongoMsg(sertMany("films", rows.map((film)=>{film.release_date = new Date(film.release_date) }), function(msg) {

                response.status(200).json(msg.result);

        }))

    });

}
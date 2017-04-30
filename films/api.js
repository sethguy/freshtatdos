const express = require('express'),
    router = express.Router();

router.get('/:id/recommendations', function(request, response, next) {

    try {

        var query = request.query;

        var params = request.params;


        console.log(query, "   ", params)


      return response.status(200).json({

            query: query,
            params: params

        });


    } catch (err) {
        return response.status(404).json({ error: err.message });
    }

});




module.exports = router

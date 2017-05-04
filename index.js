const sqlite = require('sqlite'),
    Sequelize = require('sequelize'),
    request = require('request'),
    express = require('express'),
    films = require('./films/api'),

    app = express();

const { PORT = 3000, NODE_ENV = 'development', DB_PATH = './db/database.db' } = process.env;

// START SERVER
Promise.resolve()
    .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
    .catch((err) => {
        if (NODE_ENV === 'development') console.error(err.stack);
    });




// ROUTES
app.use('/films', films)



// Middleware to catch any 404s
app.use(function(request, response, next) {

    return response.status(404).json(

        {

            message: 'The endpoint ' + request.originalUrl + ' does not exist.'

        }
    )
});



module.exports = app;

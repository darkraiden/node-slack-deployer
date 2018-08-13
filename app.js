const express = require('express');
const basicAuth = require('express-basic-auth');
const winston = require('winston');
const expressWinston = require('express-winston');
const bodyParser = require('body-parser');
const routes = require('./routes/index');
const errorHandlers = require('./handlers/errorHandlers');
require('dotenv').config();

const app = express();

// Takes the raw requests and turns them into usable properties on req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure express to use winston logger
app.use(
    expressWinston.logger({
        transports: [
            new winston.transports.Console({
                json: false,
                colorize: true
            })
        ],
        msg: 'HTTP {{req.method}} {{req.url}}',
        expressFormat: true,
        colorize: false,
        ignoreRoute: (req, res) => {
            return false;
        }
    })
);

// Configure basic auth if password is set
if (process.env.SLACK_AUTH_PASSWORD) {
    app.use(
        basicAuth({
            users: {
                slack: process.env.SLACK_AUTH_PASSWORD
            },
            unauthorizedResponse: getUnauthorizedResponse
        })
    );
}

function getUnauthorizedResponse(req) {
    return req.auth
        ? `Credentials ${req.auth.user}:${req.auth.password} rejected`
        : 'No credentials provided';
}

app.use('/', routes);

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

if (process.env.ENV === 'development' || process.env.ENV === 'local') {
    /* Development Error Handler - Prints stack trace */
    app.use(errorHandlers.developmentErrors);
}

// production error handler
app.use(errorHandlers.productionErrors);

module.exports = app;

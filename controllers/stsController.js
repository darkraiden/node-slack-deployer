const awsHandler = require('../handlers/aws');
const AWS = awsHandler.awsConfig;
const promisify = require('es6-promisify');
const slackHandler = require('../handlers/slack');

// STS parameters
const params = {
    DurationSeconds: 3600,
    RoleArn: String,
    RoleSessionName: String
};

exports.assumeRole = async (req, res, next) => {
    params.RoleSessionName = res.locals.product.env;
    params.RoleArn = awsHandler.awsRoles[res.locals.product.env];

    // If the environment received doesn't exist, throw an error
    if (!params.RoleArn) {
        res.json(
            slackHandler.payloadToSlack(
                'failure',
                'Slack Deploy',
                400,
                `${params.RoleSessionName} is not a valid environment`
            )
        );
        return;
    }

    res.locals.awsRole = await awsHandler.stsAssumeRole(params);

    next();
};

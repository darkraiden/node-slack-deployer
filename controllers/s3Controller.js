const awsHandler = require('../handlers/aws');
const AWS = awsHandler.awsConfig;
const promisify = require('es6-promisify');

exports.generateBucketPath = (req, res, next) => {
    if (!req.params.service || !req.query.branch) {
        res.status(400);
        res.json({
            statusCode: 400,
            text: 'Invalid data passed'
        });
        return;
    }

    res.locals.bucketPath = awsHandler.generateBucketPath({
        service: req.params.service,
        branch: req.query.branch,
        hash: req.query.hash
    });

    next();
};

exports.getObjects = async (req, res) => {
    const bucketPath = res.locals.bucketPath;

    const data = await awsHandler.s3GetObjects(bucketPath);

    //Order data from newest to oldest
    if (data.length > 1) {
        data.sort((a, b) => {
            return new Date(b.LastModified) - new Date(a.LastModified);
        });
    }

    res.json(data);
};

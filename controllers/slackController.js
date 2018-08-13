const awsHandler = require('../handlers/aws');
const slackHandler = require('../handlers/slack');
const utilsHandler = require('../handlers/utils');
const s3Controller = require('./s3Controller');

// Check if the artifact token passedd matches the env vars one
exports.checkArtifactToken = token => {
    return token === process.env.SLACK_ARTIFACT_TOKEN;
};

//Check if the deployment token passedd matches the env vars one
exports.checkDeploymentToken = token => {
    return token === process.env.SLACK_DEPLOYMENT_TOKEN;
};

// Parse Slack request body
exports.parseBody = (req, res, next) => {
    if (!this.checkArtifactToken(req.body.token)) {
        res.json(
            slackHandler.payloadToSlack(
                'failure',
                'Code Artifacts',
                401,
                'Access Denied'
            )
        );
        return;
    }

    /***
     ** Split body text to create an array of parameters where:
     ** [0] = service,
     ** [1] = branch,
     ** [2] = hash
     ***/
    const params = req.body.text.split(' ');

    //Params length must have at least 2 elements
    if (params.length < 2) {
        res.json(
            slackHandler.payloadToSlack(
                'failure',
                'Code Artifacts',
                400,
                'Invalid number of arguments\nUsage: `/artifact [service-name] [branch]`'
            )
        );
        return;
    }

    res.locals.bucketPath = awsHandler.generateBucketPath({
        service: params[0],
        branch: params[1],
        hash: params[2]
    });

    res.locals.params = params;

    next();
};

exports.getDeployments = async (req, res) => {
    const data = await awsHandler.s3GetObjects(res.locals.bucketPath);
    let max = 5;
    let arr = [];

    // Check if data is empty
    if (data.length < 1) {
        res.json(
            slackHandler.payloadToSlack(
                'warning',
                'Code Artifacts',
                404,
                'Elements not found'
            )
        );
        return;
    }

    // Check length of the object and returns max 5 items
    if (data.length < 5) {
        max = data.length;
    }
    for (let i = 0; i < max; i++) {
        arr.push(utilsHandler.getHash(data[i].Key));
    }

    res.json(
        slackHandler.payloadToSlack(
            'success',
            'Code Artifacts',
            'Artifacts List:',
            slackHandler.generateHashesText(arr, res.locals.params[0])
        )
    );
};

//Check Slack Channel ID
exports.isDeploymentChannel = channelId => {
    return channelId === process.env.SLACK_DEPLOYMENTS_CHANNEL_ID;
};

exports.checkDeploymentRequirements = (req, res, next) => {
    if (!this.checkDeploymentToken(req.body.token)) {
        console.error('Error: Invalid Deployment token');
        res.json(
            slackHandler.payloadToSlack(
                'failure',
                'Slack Deploy',
                401,
                'Access Denied'
            )
        );
        return;
    }

    if (
        req.body.text.split(' ').length !== 4 &&
        req.body.text.split(' ')[1] !== 'production'
    ) {
        console.error('Error: Invalid number of arguments');
        res.json(
            slackHandler.payloadToSlack(
                'failure',
                'Slack Deploy',
                400,
                'Invalid number of arguments\nUsage: `/deploy [service-name] [environment] [branch] [commit-ID]`'
            )
        );
        return;
    }

    if (!this.isDeploymentChannel(req.body.channel_id)) {
        console.log('Invalid Slack channel');
        res.json(
            slackHandler.payloadToSlack(
                'failure',
                'Slack Deploy',
                401,
                "Oooops! It looks like you can't run this command from this channel!"
            )
        );
        return;
    }

    if (req.body.text.split(' ').length === 2) {
        // Store product name and branch in product object
        res.locals.product = {
            service: req.body.text.split(' ')[0].toLowerCase(),
            env: req.body.text.split(' ')[1].toLowerCase(),
            description: 'Deploying via Slack'
        };
    } else {
        // Store body information in product object
        res.locals.product = {
            service: req.body.text.split(' ')[0].toLowerCase(),
            env: req.body.text.split(' ')[1].toLowerCase(),
            branch: req.body.text.split(' ')[2],
            hash: req.body.text.split(' ')[3],
            description: 'Deploying via Slack'
        };

        // Only master branch allowed to production
        if (
            res.locals.product.env === 'production' &&
            res.locals.product.branch !== 'master'
        ) {
            console.error(
                'Error: Only master branch can be deployed to production'
            );
            res.json(
                slackHandler.payloadToSlack(
                    'failure',
                    'Slack Deploy',
                    401,
                    'Only master branch can be deployed to production'
                )
            );
            return;
        }
    }

    next();
};

exports.deploy = async (req, res) => {
    let product = res.locals.product;

    // Get AWSRole
    const awsRole = res.locals.awsRole;

    // Check if we're dealing with production deployments
    if (Object.keys(product).length === 3) {
        product.branch = 'master';
        const s3Element = await awsHandler.s3GetFirstElement(product);

        product.hash = slackHandler.extractHash(s3Element);
    }

    // Generate Bucket Path
    const bucketPath = awsHandler.generateBucketPath(product);

    const isS3Element = await awsHandler.s3GetSingleObject(bucketPath);

    if (!isS3Element) {
        res.json(
            slackHandler.payloadToSlack(
                'warning',
                'Slack Deploy',
                404,
                'Element not found'
            )
        );
        return;
    }

    const deployment = await awsHandler.codedeployDeploy(
        awsRole,
        product,
        bucketPath
    );

    res.json(
        slackHandler.payloadToSlack(
            'success',
            'Slack Deploy',
            "Here's your deployment ID:",
            deployment.deploymentId
        )
    );
};

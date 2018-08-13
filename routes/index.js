const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const s3Controller = require('../controllers/s3Controller');
const stsController = require('../controllers/stsController');
const slackController = require('../controllers/slackController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/', mainController.main);

// S3 routes
router.get(
    '/s3/:service',
    s3Controller.generateBucketPath,
    catchErrors(s3Controller.getObjects)
);

// Slack routes
router.post(
    '/slack/get-deployments',
    slackController.parseBody,
    catchErrors(slackController.getDeployments)
);

router.post(
    '/slack/deploy',
    slackController.checkDeploymentRequirements,
    catchErrors(stsController.assumeRole),
    catchErrors(slackController.deploy)
);

module.exports = router;

# Node Slack Deployer

NodeJS app used to trigger Codedeploy Deployments and fetch Artifact names from S3.

This app works with a **very specific configuration** so do make sure you are working with a similar stack.

## Overview

This is what the flow looks like:

1. The CI tool packages everything in a compressed file (`.zip`, `.tar`, etc) using the Git Commit Hash as file name;
2. pushes the artifact to an S3 bucket using this folder structure: `prefix/project_name/branch/hashID.extension`;
3. the `staging` and `production` environments live in separate AWS accounts and the only way to interact with them is by assuming `STS` roles.

_If you have any question regarding this configuration, please feel free to get in touch with me and I'll be more than happy to give you further details_

## Routes

### GET

-   `/` - Returns "OK" (used for health checks);
-   `/s3/:service?branch=branchName&hash=commitHash` - returns a JSON paylod of found artifacts in S3;

### POST

All these POST receive a request with a `Content-type` header set as `application/x-www-form-urlencoded`.

-   `/slack/get-deployments` - Sends back a max of 5 artifacts;
-   `/slack/deploy` - Triggers a codedeploy deployment

#### Example of Slack request body

Say we want to trigger a deployment by hitting `/slack/deploy`, we expect to receive a body like the one below:

```
token=gIkuvaNzQIHg97ATvDxqgjtO
team_id=T0001
team_domain=example
enterprise_id=E0001
enterprise_name=Globular%20Construct%20Inc
channel_id=C2147483705
channel_name=test
user_id=U2147483697
user_name=Davide
command=/deploy
text=web&20staging&20master&20da39a3ee5e6b4b0d3255bfef95601890afd80709
response_url=https://hooks.slack.com/commands/1234/5678
trigger_id=13345224609.738474920.8088930838d88f008e0
```

`text` gets split into an array:

```js
const product = {
    service: req.body.split(' ')[0].toLowerCase(),
    env: req.body.split(' ')[1].toLowerCase(),
    branch: req.body.split(' ')[2],
    hash: req.body.split(' ')[3],
    description: 'Deploying via Slack'
};
```

Then we assume the role to switch AWS account:

```js
exports.assumeRole = async (req, res, next) => {
    params.RoleSessionName = res.locals.product.env;
    params.RoleArn = awsHandler.awsRoles[res.locals.product.env];

    res.locals.awsRole = await awsHandler.stsAssumeRole(params);

    next();
};
```

And, once we have everything in place, we are ready to trigger codedeploy:

```js
const deploymentId = await awsHandler.codedeployDeploy(
    awsRole,
    product,
    bucketPath
);
```

## Environment Variables

Here's a list of the environment variables used by the application:

| Name                         | Default Value | Required | Description                                                                                         |
| :--------------------------: | :-----------: | :------: | :-------------------------------------------------------------------------------------------------: |
| PORT                         | `9000`        | N        | The port the application will listen to                                                             |
| AWS_REGION                   | ``            | Y        | The region your application stack is running on                                                     |
| AWS_ACCESS_KEY_ID            | ``            | Y        | The AWS Access Key ID                                                                               |
| AWS_SECRET_ACCESS_KEY        | ``            | Y        | The AWS Secret Access Key                                                                           |
| AWS_CODEDEPLOY_BUNDLE_TYPE   | ``            | Y        | The CodeDeploy bundle type. Accepted values: `tgz`, `tar`, `zip`                                    |
| AWS_STAGING_ROLE             | ``            | Y        | The Staging environment IAM role                                                                    |
| AWS_PRODUCTION_ROLE          | ``            | Y        | The Production environment IAM role                                                                 |
| S3_BUCKET_NAME               | ``            | Y        | The name of the S3 bucket where the artifacts are stored                                            |
| S3_BUCKET_PREFIX             | ``            | Y        | The name of the top level folder of the S3 bucket                                                   |
| S3_ARTIFACTS_EXTENSION       | ``            | Y        | The artifact bundles extension. Accepted values: `tgz`, `tar`, `zip`                                |
| SLACK_ARTIFACT_TOKEN         | ``            | Y        | The Artifacts command token used by Slack to authenticate                                           |
| SLACK_DEPLOYMENTS_TOKEN      | ``            | Y        | The Deployments command token used by Slack to authenticate                                         |
| SLACK_DEPLOYMENTS_CHANNEL_ID | ``            | Y        | For security reason, deployments can be triggered from a specific channel only and its ID goes here |
| SLACK_AUTH_PASSWORD          | ``            | N        | If defined, a basic auth will be applied to the application having `slack` as username              |
| RAVEN_DSN                    | ``            | N        | The app comes with a Sentry SDK. If you have an account, add the App DSN here                       |
| GITHUB_USER                  | ``            | N        | The Github user used to link the Commits list to their Github URL                                   |


## Local Development

The project comes with a docker configuration that lives in `deploy/local/Dockerfile`.

```bash
$ docker-compose up
```

Here's some examples of how you can curl some endpoints:

```bash
$ curl -d "token=12345&param1=value1&param2=value2&text=web master" -X POST http://localhost:3000/slack/get-deployments
$ curl -d "token=12345&param1=value1&param2=value2&text=web staging master commitHash" -X POST http://localhost:3000/slack/deploy
```

**NOTE**: Make sure you create a `.env` file based on the `.env.example` one and fill it up with some valid values.

## To Do's

- [ ] Re-write tests using an API mock library
- [ ] Modify the code to use a single AWS account too

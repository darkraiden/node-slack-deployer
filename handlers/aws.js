const AWS = require('aws-sdk');
const promisify = require('es6-promisify');

// Initialise AWS setting region, access key ID and secret access key
AWS.config = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

const S3 = new AWS.S3();
const STS = new AWS.STS();

exports.awsConfig = AWS;

// Get bucket parameters from env vars
exports.bucketParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: process.env.S3_BUCKET_PREFIX
};

// Generates the bucket path with a Prefix + service name + branch name + commit id (the latter only if exists)
exports.generateBucketPath = params => {
    let bucketPath = `${this.bucketParams.Prefix}/${params.service}/${
        params.branch
    }`;

    if (params.hash && params.hash.length !== 0) {
        bucketPath += `/${params.hash}.${process.env.S3_ARTIFACTS_EXTENSION}`;
    }

    return bucketPath;
};

exports.s3GetObjects = async bucketPath => {
    const listObjects = promisify(S3.listObjects, S3);
    const data = await listObjects({
        Bucket: this.bucketParams.Bucket,
        Prefix: bucketPath
    });

    //Order data from newest to oldest
    if (data.Contents.length > 1) {
        data.Contents.sort((a, b) => {
            return new Date(b.LastModified) - new Date(a.LastModified);
        });
    }

    return data.Contents;
};

exports.s3GetSingleObject = async bucketPath => {
    const object = await this.s3GetObjects(bucketPath);
    if (object.length < 1) {
        return false;
    }
    return true;
};

exports.s3GetFirstElement = async product => {
    const bucketPath = this.generateBucketPath(product);

    const data = await this.s3GetObjects(bucketPath);

    return data[0];
};

exports.stsAssumeRole = async params => {
    const assumeRole = promisify(STS.assumeRole, STS);
    return await assumeRole(params);
};

// AWS roles per environment
exports.awsRoles = {
    staging: process.env.AWS_STAGING_ROLE,
    production: process.env.AWS_PRODUCTION_ROLE
};

// Initialise codedeploy object
exports.codedeployInit = params => {
    return new AWS.CodeDeploy({
        accessKeyId: params.Credentials.AccessKeyId,
        secretAccessKey: params.Credentials.SecretAccessKey,
        sessionToken: params.Credentials.SessionToken
    });
};

// Deploy using codedeploy
exports.codedeployDeploy = async (awsRole, product, bucketPath) => {
    const CodeDeploy = this.codedeployInit(awsRole);

    const params = {
        applicationName: product.service,
        deploymentGroupName: product.service,
        description: product.description,
        revision: {
            revisionType: 'S3',
            s3Location: {
                bucket: this.bucketParams.Bucket,
                bundleType: process.env.AWS_CODEDEPLOY_BUNDLE_TYPE,
                key: bucketPath
            }
        }
    };

    const codedeploy = promisify(CodeDeploy.createDeployment, CodeDeploy);

    return await codedeploy(params);
};

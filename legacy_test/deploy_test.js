//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// Describe POST /slack/deploy
describe('/POST slack/deploy', () => {
    const slackPayload = {
        token: String,
        text: String,
        channel_id: String
    };

    it('it should return 401 if a wrong Token is passed', done => {
        slackPayload.token = '24920';

        chai
            .request(app)
            .post('/slack/deploy')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Slack Deploy'
                );
                expect(res.body.attachments[0].title).to.equal(401);
                expect(res.body.attachments[0].text).to.equal('Access Denied');
                done();
            });
    });

    it('it should return 400 if number of args is not 4', done => {
        slackPayload.token = '12345';
        slackPayload.text = 'product staging';

        chai
            .request(app)
            .post('/slack/deploy')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Slack Deploy'
                );
                expect(res.body.attachments[0].title).to.equal(400);
                expect(res.body.attachments[0].text).to.equal(
                    'Invalid number of arguments\nUsage: `/deploy [service-name] [environment] [branch] [commit-ID]`'
                );
                done();
            });
    });

    it('it should return 401 if passed wrong channel ID', done => {
        slackPayload.text = 'arg1 arg2 arg3 arg4';
        slackPayload.channel_id = 'C82914';

        chai
            .request(app)
            .post('/slack/deploy')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Slack Deploy'
                );
                expect(res.body.attachments[0].title).to.equal(401);
                expect(res.body.attachments[0].text).to.equal(
                    "Oooops! It looks like you can't run this command from this channel!"
                );
                done();
            });
    });

    it('it should return a warning if old syntax is passed in', done => {
        slackPayload.text = 'staging web master 248214hj214k21482914k4h';
        slackPayload.channel_id = 'C22J72K9B';

        chai
            .request(app)
            .post('/slack/deploy')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Slack Deploy'
                );
                expect(res.body.attachments[0].title).to.equal(
                    'Deprecation Warning'
                );
                expect(res.body.attachments[0].text).to.equal(
                    'Oooops! This syntax has been deprecated\nNew Usage: `/deploy [service-name] [environment] [branch] [commit-ID]`'
                );
                done();
            });
    });

    it('it should return 401 trying to deploy a non-master branch to production', done => {
        slackPayload.text =
            'web production feature-branch 248214hj214k21482914k4h';

        chai
            .request(app)
            .post('/slack/deploy')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Slack Deploy'
                );
                expect(res.body.attachments[0].title).to.equal(401);
                expect(res.body.attachments[0].text).to.equal(
                    'Only master branch can be deployed to production'
                );
                done();
            });
    });
});

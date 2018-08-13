//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// Describe POST /slack/get-deployments
describe('/POST slack/get-deployments', () => {
    const slackPayload = {
        token: '12345',
        text: 'web master'
    };

    it('it should return a list of hashes', done => {
        chai.request(app)
            .post('/slack/get-deployments')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.statusCode).to.equal(200);
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Code Artifacts'
                );
                expect(res.body.attachments[0].title).to.equal(
                    'Artifacts List:'
                );
                expect(res.body.attachments[0].text).not.to.empty;
                done();
            });
    });

    it('it should return 404 if element is not found', done => {
        slackPayload.text = 'dummyService dummyBranch';

        chai.request(app)
            .post('/slack/get-deployments')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Code Artifacts'
                );
                expect(res.body.attachments[0].title).to.equal(404);
                expect(res.body.attachments[0].text).to.equal(
                    'Elements not found'
                );
                done();
            });
    });

    it('it should deny aess because wrong token', done => {
        slackPayload.token = 'wrongToken';

        chai.request(app)
            .post('/slack/get-deployments')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .send(slackPayload)
            .end((err, res) => {
                expect(res.body).to.be.a('object');
                expect(res.body.attachments[0].fallback).to.equal(
                    'Code Artifacts'
                );
                expect(res.body.attachments[0].title).to.equal(401);
                expect(res.body.attachments[0].text).to.equal('Access Denied');
                done();
            });
    });
});

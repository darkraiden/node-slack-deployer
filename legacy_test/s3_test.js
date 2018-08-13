//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// Describe GET /s3/service?branch=branchName
describe('/GET S3 Objects', () => {
    const service = {
        name: 'web',
        branch: 'master'
    };

    it('It should GET a non empty Array', done => {
        chai
            .request(app)
            .get(`/s3/${service.name}?branch=${service.branch}`)
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .end((err, res) => {
                expect(res.statusCode).to.equal(200);
                expect(res.body).to.be.a('array');
                expect(res.body.length).to.not.eql(0);
                done();
            });
    });

    it('It should GET an empty Array', done => {
        chai
            .request(app)
            .get('/s3/dummy?branch=dummyBranch')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .end((err, res) => {
                expect(res.statusCode).to.equal(200);
                expect(res.body).to.be.a('array');
                expect(res.body.length).to.eql(0);
                done();
            });
    });

    it('It should GET a 400 status code if no branch is passed', done => {
        chai
            .request(app)
            .get('/s3/dummy')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .end((err, res) => {
                expect(res.statusCode).to.equal(400);
                expect(res.body).to.be.a('object');
                expect(res.body.text).to.equal('Invalid data passed');
                done();
            });
    });
});

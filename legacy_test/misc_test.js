//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');

const should = chai.should();
const expect = chai.expect;

chai.use(chaiHttp);

// Describe GET /
describe('/GET main', () => {
    it("it should GET 'OK'", done => {
        chai
            .request(app)
            .get('/')
            .auth('slack', process.env.SLACK_AUTH_PASSWORD)
            .end((err, res) => {
                expect(res.statusCode).to.equal(200);
                expect(res.body).to.be.a('object');
                expect(res.body.text).to.exist;
                expect(res.body.text).to.equal('OK');
                done();
            });
    });
});

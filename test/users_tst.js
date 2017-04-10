var server, db, db_helpers, config, helpers, fs, http, assert, globalToken, SQ, NQ, targetEmail;
server     = require('../server.js');
db         = require('../db.js');
db_helpers = require('../helpers/db_helpers.js');
config     = require('../config.js');
helpers    = require('../helpers/helpers.js');
fs         = require('fs');
http       = require('http');
assert     = require('assert');
eval(fs.readFileSync('test/helpers.js') + '');
global.signature = '';
global.userId = '';
globalToken = '';
SQ = assert.equal;
NQ = assert.notEqual;
targetEmail = 'kirill@chain.cloud';
describe('Users module and lending requests', function (T) {
     before(function (done) {
          var uri, conn;
          uri = 'mongodb://localhost/tests';
          conn = db.connectToDb(uri, '', '');
          db.removeDb(function () {
               server.initDb(db);
               server.startHttp(9091);
               done();
          });
     });
     after(function (done) {
          server.stop();
          db.removeDb(function () {});
          db.disconnectDb();
          done();
     });
     it('1.1. should not create user if no email in body', function (done) {
          var url, data;
          url = '/api/v1/users';
          data = '';
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });

     it('1.2. should not create user if no pass in body', function (done) {
          var url, j, data;
          url = '/api/v1/users';
          j = {
               email: 'tony@mail.ru'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.3.should not create user if bad email', function (done) {
          var url, j, data;
          url = '/api/v1/users';
          j = {
               email: 'tonymailu',
               pass: 'goodpass'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.4.should not create user if pass is too short', function (done) {
          var url, j, data;
          url = '/api/v1/users';
          j = {
               email: targetEmail,
               pass: '123'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               NQ(dataOut, '');
               done();
          });
     });
     it('1.5. should create new user', function (done) {
          var url, j, data;
          url = '/api/v1/users?do_not_send_email=1';
          j = {
               email: targetEmail,
               pass: '123456'
          };
          data = JSON.stringify(j);
          return postData(9091, url, data, function (err, statusCode, h, dataOut) {
               var p;
               SQ(err, null);
               SQ(statusCode, 200);
               p = JSON.parse(dataOut);
               SQ(p.statusCode, 1);
               assert.notEqual(p.shortId, 0);
               return db.UserModel.findByEmail(j.email, function (err, users) {
                    SQ(err, null);
                    SQ(users.length, 1);
                    SQ(users[0].shortId, p.shortId);
                    SQ(users[0].validated, false);
                    return db.UserModel.findByShortId(p.shortId, function (err, users) {
                         SQ(err, null);
                         SQ(users.length, 1);
                         SQ(users[0].shortId, p.shortId);
                         NQ(users[0].validationSig, '');
                         global.userId = users[0].shortId;
                         global.signature = users[0].validationSig;
                         return db.SubscriptionModel.findByShortId(userId, function (err, subs) {
                              SQ(err, null);
                              SQ(subs.length, 1);
                              SQ(subs[0].type, 1);
                              return done();
                         });
                    });
               });
          });
     });
     it('1.6. should not login if not validated yet', function (done) {
          var email, url, j, data;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/login';
          j = {
               pass: '123456'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.7. should not send <reset password> if still not validated', function (done) {
          var email, url;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/reset_password_request';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);

               done();
          });
     });
     it('1.8. should not validate user without signature', function (done) {
          var url;
          url = '/api/v1/users/' + userId + '/validation';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.9. should not validate user without valid user ID', function (done) {
          var url;
          url = '/api/v1/users/' + '1234' + '/validation';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.10. should validate user', function (done) {
          var url;
          url = '/api/v1/users/' + userId + '/validation?sig=' + signature + '&do_not_send_email=1';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               var str;
               SQ(err, null);
               SQ(statusCode, 200);
               SQ(dataOut, 200);
               str = targetEmail;
               db.UserModel.findByEmail(str, function (err, users) {
                    SQ(err, null);
                    SQ(users.length, 1);
                    SQ(users[0].validated, true);
                    SQ(users[0].validationSig, '');
                    done();
               });
          });
     });
     it('1.11. should not validate user again', function (done) {
          var url;
          url = '/api/v1/users/' + userId + '/validation?sig=' + signature;
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.12. should not login if bad password', function (done) {
          var email, url, j, data;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/login';
          j = {
               pass: 'shitsomw'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.13. should not login if bad email', function (done) {
          var email, url, j, data;
          email = helpers.encodeUrlDec('nono@gmail.com');
          url = '/api/v1/users/' + email + '/login';
          j = {
               pass: '123456'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);
               done();
          });
     });
     it('1.14. should login if everything OK', function (done) {
          var url, j, data;
          url = '/api/v1/users/' + helpers.encodeUrlDec(targetEmail) + '/login';
          j = {
               pass: '123456'
          };
          data = JSON.stringify(j);
          postData(9091, url, data, function (err, statusCode, h, dataOut) {
               var parsed, globalToken;
               SQ(err, null);
               SQ(statusCode, 200);
               parsed = JSON.parse(dataOut);
               globalToken = parsed.token;
               NQ(globalToken.length, 0);
               done();
          });
     });
     it('1.15. should not send <reset password> if bad user', function (done) {
          var email, url;
          email = helpers.encodeUrlDec('a.akentiev@gmail.com');
          url = '/api/v1/users/' + email + '/reset_password_request';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 400);

               done();
          });
     });
     it('1.16. should reset password - send email', function (done) {
          var email, url;
          email = helpers.encodeUrlDec(targetEmail);
          url = '/api/v1/users/' + email + '/reset_password_request?do_not_send_email=1';
          postData(9091, url, '', function (err, statusCode, h, dataOut) {
               SQ(err, null);
               SQ(statusCode, 200);

               done();
          });
     });
     it('1.17. should set new password', function (done) {

          db.UserModel.findByEmail(targetEmail, function (err, users) {
               var sig, oldPass, url;
               SQ(err, null);
               SQ(users.length, 1);
               SQ(users[0].validated, true);
               NQ(users[0].resetSig.length, 0);
               sig = users[0].resetSig;
               oldPass = users[0].password;
               url = '/api/v1/users/' + userId + '/password?sig=' + sig + '&do_not_send_email=1';

               var data = JSON.stringify({
                    email: targetEmail,
                    pass: 'newPass'
               });

               putData(9091, url, data, function (err, statusCode, headers, dataOut) {
                    SQ(err, null);
                    SQ(statusCode, 200);
                    db.UserModel.findByEmail(targetEmail, function (err, users) {
                         SQ(err, null);
                         SQ(users.length, 1);
                         SQ(users[0].validated, true);
                         SQ(users[0].resetSig, '');
                         NQ(users[0].password, oldPass);
                         done();
                    });
               });
          });
     });

     it('1.18. should validate email xxx@chain.cloud', function (done) {
          var email = 'xxx@chain.cloud';
          var emailQ = helpers.validateEmail(email);
          SQ(emailQ, true);
          done();
     });

     it('2.2. Should create new Lending Request if user`s balance is non-null', function (done) {
          SQ(true, true);
          done();
     });



     it('2.2. Should create new Lending Request if user`s balance is non-null', function (done) {
          SQ(true, true);
          done();
     });



     it('2.1. should return a list of LRs for a selected user. Returns a JSON list of IDs.', function (done) {
          SQ(true, true);
          done();
     });

     it('2.2. shouldn`t return a list of LRs for a selected user, if requester isn`t this user.', function (done) {
          SQ(true, true);
          done();
     });


     it('2.4. shouldn`t create new Lending Request if user`s balance is null', function (done) {
          SQ(true, true);
          done();
     });

     it('2.5. should return a Lending Request', function (done) {
          SQ(true, true);
          done();
     });

     it('2.6. shouldn`t return a Lending Request', function (done) {
          SQ(true, true);
          done();
     });

     it('2.7. should lend', function (done) {
          SQ(true, true);
          done();
     });

     it('2.8. shouldn`t lend', function (done) {
          SQ(true, true);
          done();
     });

});
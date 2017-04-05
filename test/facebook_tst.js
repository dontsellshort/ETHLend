var server = require('../server.js');
var db = require('../db.js');
var db_helpers = require('../helpers/db_helpers.js');
var config = require('../config.js');
var helpers = require('../helpers/helpers.js');

var fs = require('fs');
var http = require('http');
var assert = require('assert');

eval(fs.readFileSync('test/helpers.js')+'');

var signature = '';
var userId = '';
var globalToken = '';

describe('Facebook login module',function(){
     // TODO: get these token+ID first 
     // for any Facebook user...

     // see frontend_sample/facebook_login.html 
     var token = 'CAAFtW31mkDMBAGMGN7gSQWHVZA8ALd68ASxLUhUkz7ZBkL2fApjpJTAdYHAWOdYJPGecLShQQYF3R7R2Fzyyi5bWkQr6tTVdCc4ywVGTsMcbZA1vKuhpnuZBAvhVoPYCugVP1EdXw4dFEU6ff047Kd789cYpEL0D95d4SZADnJhqdgbUZBpAZBtMw8OtJS9304a3JGJEfVyvcivRHFsGoHG';
     var id = '422785187931682';

     before(function(done){
          var uri  = 'mongodb://localhost/tests';

          var conn = db.connectToDb(uri,'','');
          db.removeDb(function(){
               server.initDb(db);

               server.startHttp(9091);
               done();   // ok
          });
     });

     after(function(done){
          server.stop();
          db.removeDb(function(){});
          db.disconnectDb();
          done();
     });

     it('should not login if no token provided', function(done){
          var url = '/facebook_login/v1';

          var j = {
               user_id: id
          };
          var data = JSON.stringify(j);

          postData(9091,url,data,function(err,statusCode,h,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,404);

               done();
          });
     })

     it('should not login if no facebook ID provided', function(done){
          var url = '/facebook_login/v1';

          var j = {
               token: token,
          };
          var data = JSON.stringify(j);

          postData(9091,url,data,function(err,statusCode,h,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,404);

               done();
          });
     })

     it('should not login if bad token', function(done){
          var url = '/facebook_login/v1';

          var j = {
               token: '4234234234234',
               user_id: id
          };
          var data = JSON.stringify(j);

          postData(9091,url,data,function(err,statusCode,h,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,401);

               done();
          });
     })

     it('should not login if bad user_id', function(done){
          var url = '/facebook_login/v1';

          var j = {
               token: token,
               user_id: '12313' 
          };
          var data = JSON.stringify(j);

          postData(9091,url,data,function(err,statusCode,h,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,401);

               // check DB
               done();
          });
     })

     it('should create new user when logging in first time', function(done){
          var url = '/facebook_login/v1';

          var j = {
               token: token,
               user_id: id
          };
          var data = JSON.stringify(j);

          postData(9091,url,data,function(err,statusCode,h,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               // check DB
               db.UserModel.find({},function(err,users){
                    assert.equal(err,null);
                    assert.equal(users.length,1);
                    assert.equal(users[0].facebookID,id);
                    assert.equal(users[0].validated,true);

                    // should get these from Facebook profile
                    assert.notEqual(users[0].name,'');
                    assert.notEqual(users[0].lastName,'');

                    done();
               });
          });
     })

     it('should login with already created user', function(done){
          var url = '/facebook_login/v1';

          var j = {
               token: token,
               user_id: id
          };
          var data = JSON.stringify(j);

          postData(9091,url,data,function(err,statusCode,h,dataOut){
               assert.equal(err,null);
               assert.equal(statusCode,200);

               db.UserModel.find({},function(err,users){
                    assert.equal(err,null);
                    assert.equal(users.length,1);
                    assert.equal(users[0].facebookID,id);
                    assert.equal(users[0].validated,true);

                    done();
               });
          });
     })
});

var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');

var assert = require('assert');

var generatePassword = require('password-generator');
var Facebook = require('facebook-node-sdk');

app.post('/facebook_login/v1', function (request, res, next) {
     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.token)==='undefined'){
          winston.error('No token');
          return next();
     }
     if(typeof(request.body.user_id)==='undefined'){
          winston.error('No user id');
          return next();
     }

     var token   = request.body.token;
     var user_id = request.body.user_id;
    
     winston.info('Trying to check login through facebook for user: ' + user_id);
     var facebook = new Facebook(
          {    
               appID: config.get('facebookLogin:appID'),
               secret: config.get('facebookLogin:appSecret')
          }
     );
     // this is User token...
     facebook.setAccessToken(token);

     facebook.api('/me', {fields: 'email,first_name,last_name'}, function(err, data) {
          if(err){
               winston.error('Can not login with facebook: ' + err);
               return res.send(401, 'Wrong user or password');
          }

          if(!data.email){
               winston.error('Can not get email from facebook!');
               return res.send(401, 'Wrong user or password');
          }

          if(!data.id){
               winston.error('Can not get ID from facebook!');
               return res.send(401, 'Wrong user or password');
          }

          if(data.id!==user_id){
               winston.error('Different user ID!');
               return res.send(401, 'Wrong user or password');
          }

          winston.info('Facebook login finished with data: ' + data.email);

          var name = data.first_name || '';
          var lastName = data.last_name || '';

          fbContinueLogin(name,lastName,user_id,data.email,res,next);
     });
});

function fbContinueLogin(name,lastName,user_id,user_email,res){
     // 1 - check if this user is already registered in our DB
     db.UserModel.findByFacebookID(user_id,function(err,users){
          if(err){
               winston.error('Can not find user in DB with fb ID: ' + user_id);
               return next();
          }

          if(users && users.length){
               // 2 - already exits
               winston.info('Facebook user logged in: ' + users[0].shortI);
               returnJwt(users[0],res);
          }else{
               // 3 - create new
               var pass = generatePassword(12, false);      // generate random password
               var needValidation = false;

               db_helpers.createNewUser(name,lastName,user_email,pass,user_id,needValidation,
                    function(err,user)
               {
                    if(err || typeof(user)==='undefined'){
                         winston.error('Can not create new user: ' + err);
                         return next();
                    }

                    winston.info('New user created: ' + user.shortId);
                    returnJwt(user,res);
               });
          }
     });
}

var helpers = require('./helpers/helpers.js');
var db_helpers = require('./helpers/db_helpers.js');
var mail_send = require('./helpers/mail_send.js');

var assert = require('assert');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var textParser = bodyParser.text();


// Create new user
//
// Body params: {email: '', pass: ''}
// Returns {shortId: '123456789'} or 404
app.post('/api/v1/users',  function(request, res, next) {
     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.email)==='undefined'){
          winston.error('No email');
          return res.status(400).json('No email');
     }
     if(typeof(request.body.pass)==='undefined'){
          winston.error('No pass');
          return res.status(400).json('No pass');
     }

     var email = request.body.email;
     var pass = request.body.pass;

     // 0 - validate email
     if(!helpers.validateEmail(email)){
          winston.error('Bad email');
         return res.status(400).json('Bad email');
     }

     if(!helpers.validatePass(pass)){
          winston.error('Bad pass');
         return res.status(400).json('Bad pass');
     }

     var dontSend = false;
     if(typeof(request.query.do_not_send_email)!=='undefined'){
          dontSend = true;
     }

     // 1 - check if already exists
     db_helpers.findUserByEmail(email,function(err,user){
          if(err){
               winston.error('Error: ' + err);
              return res.status(400).json('Error: ' + err);
          }

          if(typeof(user)!=='undefined' && user!==null){
               // already exists
               winston.info('User ' + email + ' already exists');
              return res.status(400).json('User ' + email + ' already exists');
          }

          // 2 - create user + subscription
          var name = request.body.name || '';           // could be empty
          var lastName = request.body.last_name || '';  // could be empty

          var needValidation = true;
          db_helpers.createNewUser(name,lastName,email,pass,undefined,needValidation,function(err,user){
               if(err || typeof(user)==='undefined'){
                    winston.error('Can not create new user: ' + err);
                    return res.status(400).json('Can not create new user: ' + err);
               }

                    // 4 - send validation e-mail
                    var validationSig = user.validationSig;
                    var validationLink = config.get('mail:validation_link') 
                         + '?sig=' + validationSig 
                         + '&id=' + user.shortId;

                    var dontSend = false;
                    if(typeof(request.query.do_not_send_email)!=='undefined'){
                        dontSend = true;
                    }

                    mail_send.sendUserValidation(user.email, validationLink,dontSend, function(err){
                         if(err){
                              winston.error('Can not save user to DB: ' + err);
                              return res.status(400).json('Can not save user to DB: ' + err);
                         }

                         createUserContinue(user,res);
                    });

          });
     });

});

function createUserContinue(user,res){
     var out = {
          statusCode: 1,
          shortId: user.shortId
     };

     res.json(out);
}

// Validate user (email)
//
// Params: shortId
// Params: signature
//
// Returns: redirection to 'OK' or 'BAD' pages
app.post('/api/v1/users/:shortId/validation',  function(request, res, next){
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
         return res.status(400).json('No shortId');
     }
     if(typeof(request.query.sig)==='undefined'){
          winston.error('No signature');
         return res.status(400).json('No signature');
     }

     // 1 - get user
     var shortId = request.params.shortId;
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId');
          return res.status(400).json('Bad shortId');
     }

     db.UserModel.findByShortId(shortId, function(err,users){
          if(err){
               winston.error('Error: ' + err);
              return res.status(400).json('Error: ' + err);
          }

          if(!users || !users.length){
               winston.error('No such user: ' + shortId);
               return res.status(400).json('No such user: ' + shortId);
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];

          if(user.validated){
               winston.error('Already validated: ' + shortId);
               return res.status(400).json('Already validated: ' + shortId);
          }

          // 3 - validate
          if(request.query.sig!==user.validationSig){
               winston.error('Can not validate user: ' + shortId);
               return res.status(400).json('Can not validate user: ' + shortId);
          }

          // 4 - save
          user.validationSig = '';
          user.validated = true;
          user.modified = Date.now();

          user.save(function(err){
               if(err){
                    winston.error('Can not save user: ' + shortId);
                    return res.status(400).json('Can not save user: ' + shortId);
               }

               // send 'registration complete' e-mail
                var dontSend = false;
                if(typeof(request.query.do_not_send_email)!=='undefined'){
                    dontSend = true;
                }
               
               mail_send.sendRegComplete(user.email,dontSend, function(err){
                    if(err){
                         winston.error('Can not send reg complete e-mail: ' + err);
                         return res.status(400).json('Can not send reg complete e-mail: ' + err);
                    }

                    // 5 - return
                    res.json(200);
               });
          });
     });
});

// Send e-mail with 'reset your password' text.
// this method always returns 'OK' to cheat attacker. 
app.post('/api/v1/users/:email/reset_password_request',  function(request, res, next){
     winston.info('Reset password request');
     if(typeof(request.params.email)==='undefined'){
          winston.error('No email');
         return res.status(400).json('No email');
     }

     // 1 - get user
     var email = request.params.email;
     if(!helpers.validateEmail(email)){
          winston.error('Bad email');
          return res.status(400).json('Bad email');
     }

     winston.info('Reset password email is: ' + email);
     db.UserModel.findByEmail(email,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return res.status(400).json('Error: ' + err);
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + email);
               return res.status(400).json('No such user: ' + email);
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];

          if(!user.validated){
               winston.error('Not validated: ' + email);
               return res.status(400).json('Not validated: ' + email);
          }

          // 3 - generate new signature
          user.modified = Date.now();
          user.resetSig = helpers.generateResetSig(user.email,user.pass);
          user.save(function(err){
               if(err){
                    winston.error('Can not generate validation sig: ' + email);
                    return res.status(400).json('Can not generate validation sig: ' + email);
               }

               // 4 - send e-mail 
               var resetLink = config.get('mail:reset_link') 
                    + '?sig=' + user.resetSig
                    + '&id=' + user.shortId;
                
                var dontSend = false;
                if(typeof(request.query.do_not_send_email)!=='undefined'){
                    dontSend = true;
                }

               mail_send.sendResetPassword(user.email,resetLink,dontSend,function(err){
                    if(err){
                         winston.error('Can not save user to DB: ' + err);
                         return res.status(400).json('Can not save user to DB: ' + err);
                    }

                    // OK
                    return res.send(200);
               });
          });
     });
});

// Create new password (after reset was requested)
app.put('/api/v1/users/:shortId/password',  function(request, res, next){
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return res.status(400).json('No shortId');
     }

     if(typeof(request.query.sig)==='undefined'){
          winston.error('No signature');
          return res.status(400).json('No signature');
     }

     // new password is here...
     if(typeof(request.body.pass)==='undefined'){
          winston.error('No password');
          return res.status(400).json('No password');
     }

     // validate everything
     var shortId = request.params.shortId;
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId');
          return res.status(400).json('Bad shortId');
     }

     if(!helpers.validatePass(request.body.pass)){
          winston.error('Bad pass');
          return res.status(400).json('Bad pass');
     }

     db.UserModel.findByShortId(shortId,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return res.status(400).json('Error: ' + err);
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + shortId);
               return res.status(400).json('No such user: ' + shortId);
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];
          if(!user.validated){
               winston.error('Not validated: ' + shortId);
               return res.status(400).json('Not validated: ' + shortId);
          }

          if(typeof(user.resetSig)==='undefined' || !user.resetSig.length){
               winston.error('No signature: ' + shortId);
               return res.status(400).json('No signature: ' + shortId);
          }

          // 3 - validate
          if(request.query.sig!==user.resetSig){
               winston.error('Can not validate user: ' + shortId);
               return res.status(400).json('Can not validate user: ' + shortId);
          }

          // 4 - set new password
          user.modified = Date.now();
          user.resetSig = '';

          bcrypt.hash(request.body.pass, config.get('auth:salt'), function(err, hash) {
               user.password = hash;
               if(err){
                    winston.error('Can not gen hash: ' + err);
                    return res.status(400).json('Can not gen hash: ' + err);
               }

               user.save(function(err){
                    if(err){
                         winston.error('Can not save user');
                         return res.status(400).json('Can not save user');
                    }

                    // 5 - send 'password has been changed' email
                    var dontSend = false;
                    if(typeof(request.query.do_not_send_email)!=='undefined'){
                        dontSend = true;
                    }
                    
                    mail_send.sendPassChanged(user.email, dontSend,function(err){
                         if(err){
                              winston.error('Can not send email to user: ' + err);
                              return res.status(400).json('Can not send email to user: ' + err);
                              // eat this error
                              //return next();
                         }

                        db.UserModel.findByEmail(user.email, function(err,users){
                            if(err){
                                winston.error('Error: ' + err);
                                return res.status(400).json('Error: ' + err);
                            }

                            if(typeof(users)==='undefined' || !users.length){
                                winston.error('No such user: ' + email);
                                return res.status(400).json('No such user: ' + email);
                            }

                            // 2 - check if already validated
                            assert.equal(users.length<=1,true);
                            var user = users[0];

                            // 4 - if OK -> give jwt
                            returnJwt(user, res);
                        });
                    });
               });
          });
     });
});

// Login
//
// Body params: { password: ''}
// Returns: 401 or good JSON web token
app.post('/api/v1/users/:email/login', function (request, res, next) {
     winston.info('AUTH call');

     if(typeof(request.params.email)==='undefined'){
          winston.error('No email');
         return res.status(400).json('No email');
     }
     if(typeof(request.body)==='undefined' || request.body===null){
          return next();
     } 
     if(typeof(request.body.pass)==='undefined'){
          winston.error('No pass');
         return res.status(400).json('No pass');
     }

     var email = helpers.decodeUrlEnc(request.params.email);
     var pass = request.body.pass;

     // 0 - validate email
     if(!helpers.validateEmail(email)){
          winston.error('Bad email');
         return res.status(400).json('Bad email');
     }

     // 1 - find user
     winston.info('Login: ' + email);

     db.UserModel.findByEmail(email,function(err,users){
          if(err){
               winston.error('Error: ' + err);
              return res.status(400).json('Error: ' + err);
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + email);
              return res.status(400).json('No such user: ' + email);
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];

          if(!user.validated){
               winston.error('Still not validated: ' + email);
               return res.status(400).json('Still not validated: ' + email);
          }

          // 3 - compare password
          //console.log('-->LOGIN PASS: ' + pass);
          //console.log('-->USER SALT: ' + user.salt);

          bcrypt.hash(pass, config.get('auth:salt'), function(err, hash) {
               if(err){
                    winston.error('Can not hash password for check: ' + email);
                   return res.status(400).json('Bad password result for: ' + email);
               }
                    
               if(user.password!==hash){
                    winston.error('Bad password result for: ' + email);
                   return res.status(400).json('Bad password result for: ' + email);
               }

               // 4 - if OK -> give jwt
               returnJwt(user,res);
          });
     });
});

function returnJwt(user,res){
     var profile = {
          id: user.shortId,
          email: user.email 
     };

     // We are sending the profile inside the token
     var token = jwt.sign(profile, secret, 
          { expiresInMinutes: config.get('auth:expires_minutes') });

     winston.info('User logged in: ' + user.shortId);
     console.log('-->User logged in: ' + user.shortId);

     res.json({ token: token, shortId: user.shortId });
}
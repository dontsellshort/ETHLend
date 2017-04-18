var db      = require('../db.js');
var config  = require('../config.js');
var helpers = require('./helpers.js');
var winston = require('winston');
var assert  = require('assert');
var bcrypt  = require('bcrypt');

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
function getRandom(min, max) {
     return Math.floor(Math.random() * (max - min) + min);
}

function findUserByEmail(email,cb){
     db.UserModel.findByEmail(email,function(err,users){
          winston.info('FOUND users: ' + users.length);

          if(err){
               winston.error('No users in DB by orderId: ' + err);
               return cb(err);
          }

          if(typeof(users)==='undefined' || (users.length!=1)){
               assert.equal(users.length<=1,true);

               winston.info('No user in DB for orderId: ' + email);
               return cb(null,null);
          }

          cb(null,users[0]);
     });
}

function generateNewUserId(cb){
     // loop until unique ID is found 
     var id = getRandom(1, 999999999);

     db.UserModel.findByShortId(id,function(err,orders){
          if(orders.length==0){
               return cb(id);
          }

          // continue - recurse
          generateNewUserId(cb);
     });
}

function getUser(currentUser,shortId,cb){
     if(!helpers.validateShortId(shortId)){
          winston.error('Bad shortId');
          return cb(null,null);
     }

     if(currentUser.id!==shortId){
          winston.error('DATA for DIFFERENT ID is asked. HACKER DETECTED!!! ' + 
               currentUser.id + ' -> ' + shortId);

          return cb(null,null);
     }

     db.UserModel.findByShortId(shortId,function(err,users){
          if(err){
               winston.error('Error: ' + err);
               return cb(err,null);
          }

          if(typeof(users)==='undefined' || !users.length){
               winston.error('No such user: ' + shortId);
               return cb(null,null);
          }

          // 2 - check if already validated
          assert.equal(users.length<=1,true);
          var user = users[0];
          if(!user.validated){
               winston.error('User not validated: ' + shortId);
               return cb(null,null);
          }

          return cb(null,user);
     });
}

function createNewUser(name,lastName,email,pass,facebookID,needValidation,cb){
     var user = new db.UserModel; 
     user.email = email;

     // hash, salt
     bcrypt.hash(pass, config.get('auth:salt'), function(err, hash) {
          if(err){
               winston.error('Can not gen hash: ' + err);
               return cb(err);
          }
          user.password = hash;
          user.created =  Date.now();
          user.modified = Date.now();
          user.validated = !needValidation;
          user.validationSig = helpers.generateValidationSig(user.email,user.pass);
          user.comment = '';
          user.facebookID = facebookID;
          user.name = name;
          user.lastName = lastName;
          generateNewUserId(function(id){
               user.shortId = id;

               // 3 - return
               user.save(function(err){
                    if(err){
                         winston.error('Can not save user to DB: ' + err);
                         return cb(err);
                    }

                    winston.info('User created: ' + user.shortId);

                    var sub = new db.SubscriptionModel;
                    sub.userShortId = id;
                    sub.type = 1;       // free
                    sub.created = sub.modified = user.created;

                    // TODO: configure...
                    // add 30 days 
                    sub.expires.setDate(sub.created.getDate() + 30);

                    sub.save(function(err){
                         if(err){
                              winston.error('Can not save sub to DB: ' + err);
                              return cb(err);
                         }

                         return cb(null,user);
                    });
               });
          });
     });
}

function createLendingRequest(data, cb){
     var lendingRequest = new db.LendingRequestModel;
     lendingRequest.current_state = 0;            
     lendingRequest.date_created  = Date.now();            

     lendingRequest.borrower_id   = data.borrower_id;    
     lendingRequest.borrower_account_address = data.borrower_account_address;

     lendingRequest.save(function(err,lendingRequest){
          if(err){
               winston.error('Can not save lending request to DB: ' + err);
               return cb(err);
          }    
          return cb(null,lendingRequest);
     })
}

function setDataForLendingRequest(data,cb){
     var setObj = {};

     setObj.eth_count                = data.eth_count;
     setObj.token_amount             = data.token_amount;
     setObj.token_name               = data.token_name;
     setObj.token_smartcontract      = data.token_smartcontract;
     setObj.token_infolink           = data.token_infolink;
     //setObj.borrower_account_address = data.borrower_account_address;
     setObj.days_to_lend             = data.days_to_lend;
     setObj.date_modified            = Date.now();  
     setObj.days_left                = data.days_to_lend;       

     setObj.current_state            = 1;                 

     db.LendingRequestModel.findByIdAndUpdate(data.lrId, {$set: setObj}, {new: true}, function (err, lr) {
          if(err){
               winston.error('Can`t update LR: '+err);
               return cb(err,null)
          }
          return cb(null,null)
     });
}



function getAllLRforUser(user, cb){
     db.LendingRequestModel.find({borrower_id: user.shortId},function(err,allLR){
          if(err){
               winston.error('Can`t find LR`s for user: ' + err);
               return cb(err);
          };
          var out = [];
          for (var i in allLR){
               out.push(allLR[i]._id)         
          };   
          cb(null, out)
     })
}

/////////////////////////////////////////////
exports.findUserByEmail = findUserByEmail;
exports.generateNewUserId = generateNewUserId;
exports.getUser = getUser;
exports.getAllLRforUser = getAllLRforUser;
exports.createNewUser = createNewUser;
exports.createLendingRequest = createLendingRequest;
exports.setDataForLendingRequest = setDataForLendingRequest;

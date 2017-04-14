var mongoose = require('mongoose');
var winston  = require('winston');
var async    = require('async');
var config   = require('./config');

var Schema = mongoose.Schema;

//////
var User = new Schema({ // user can log in using this one too
     shortId:                  {type: String, required:  true},
     email:                    {type: String, required:  true},
     password:                 {type: String, required:  true},
     validated:                {type: Boolean, required: true},
     balance:                  {type: Number,  required: true, default: 0},

     //optional
     ethAddress:               {type: String, required:  false},
     validationSig:            {type: String, required:  false},
     facebookID:               {type: String, required:  false},
     resetSig:                 {type: String, required:  false},
     created:                  {type: Date,  required:   true, default: Date.now},
     modified:                 {type: Date,  required:   true, default: Date.now},

     comment:                  {type: String, required:  false}
});

User.statics.findByEmail = function(e,cb){
     this.find({ email: e}, cb);
}

User.statics.findByShortId = function(id,cb){
     this.find({ shortId: id }, cb);
}

User.statics.findByFacebookID = function(id,cb){
     this.find({facebookID: id}, cb);
}
//––––––––––––––––––––––––––––––––––––––––––––

var LendingRequest = new Schema({
     current_state:            {type: Number, required: true},

     smartcontract_address:    {type: String, required: false},

     eth_count:                {type: Number, required: false},
     token_amount:             {type: Number, required: false},
     token_name:               {type: String, required: false},
     token_smartcontract:      {type: String, required: false},
     token_infolink:           {type: String, required: false},
     borrower_account_address: {type: String, required: false},
     lender_account_address:   {type: String, required: false},

     borrower_id:              {type: String, required: true},
     lender_id:                {type: String, required: false},
     waiting_for_loan_from:    {type: Date, default:    Date.now(), required: false},
     date_created:             {type: Date, default:    Date.now(), required: true},
     date_modified:            {type: Date, default:    Date.now(), required: true},

     days_to_lend:             {type: Number, required: false},
     days_left:                {type: Number, required: false}
});

var Token = new Schema({
     token:       {type: String, required:true},
     expire_date: {type: Date, required:true}
})

var Subscription = new Schema({
     userShortId: {type: String, required:true},

     // 1-"free"
     // 2-"premium" 
     type:{ type: Number, required: true},

     created: { type: Date, default: Date.now, required:true},
     expires: { type: Date, default: Date.now, required:true},

     modified: { type: Date, default: Date.now, required:false }
});

Subscription.statics.findByShortId = function(usi,cb){
     this.find({ userShortId: usi}, cb);
}

/// \brief Call this one and keep returned object
function connectToDbCallback(uri,user,pass,cb){
     var options = {
          db: { native_parser: true },
          server: { poolSize: 5 },
          //replset: { rs_name: 'myReplicaSetName' },
          user: user,  // can be empty 
          pass: pass,  // can be empty 
     };

     options.server.socketOptions = { keepAlive: 1 };
     //options.replset.socketOptions = { keepAlive: 1 };

     mongoose.connect(uri,options);
     var db = mongoose.connection;

     db.on('error', function (err) {
          cb(err);
     });

     db.once('open', function callback () {
          cb(null,db);
     });

     db.on('disconnected', function () {
          winston.info('DB disconnected');
     });
}

// Simple wrapper for convinience...
function connectToDb(uri,user,pass){
     // We are under tests - so setup behaviour
     if(uri.indexOf('test')!==-1){

     }

     return connectToDbCallback(uri,user,pass,function(err,cb){
          if(!err){
               winston.info("Connected to DB!");
          }else{
               winston.error('DB connection error:', err.message);
          }
     });
}

function blockLogging(){
     winston.remove(winston.transports.Console);
}

/// \brief Call this one when connection is no more needed
function disconnectDb(){
     mongoose.disconnect();
}

function removeDb(cb){
     mongoose.connection.once('connected', () => {
         mongoose.connection.db.dropDatabase();
         cb();
     });
}

// Exports:
var TokenModel        = mongoose.model('Token', Token);
var UserModel         = mongoose.model('User', User);
var SubscriptionModel = mongoose.model('Subscription', Subscription);
var LendingRequestModel = mongoose.model('LendingRequest', LendingRequest);


module.exports.TokenModel        = TokenModel;
module.exports.UserModel         = UserModel;
module.exports.SubscriptionModel = SubscriptionModel;
module.exports.LendingRequestModel = LendingRequestModel;

module.exports.blockLogging        = blockLogging;
module.exports.connectToDb         = connectToDb;
module.exports.connectToDbCallback = connectToDbCallback;
module.exports.disconnectDb        = disconnectDb;

module.exports.removeDb = removeDb;

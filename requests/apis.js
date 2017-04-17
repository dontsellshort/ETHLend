var contract_helpers = require('./helpers/contract_helpers.js');

app.get('/api/v1/info',function(request,res,next){
     var enabled = (typeof(process.env.ETH_NODE)!=='undefined');

     var out = {
          eth_is_enabled: enabled,
          eth_node: process.env.ETH_NODE,

          eth_main_address: contract_helpers.getMainAddress(), 
          eth_main_address_link: contract_helpers.getMainAddressLink(),

          eth_main_account: contract_helpers.getMainAccount(),
          eth_main_account_link: contract_helpers.getMainAccountLink(),

          eth_balance_wei: contract_helpers.getBalance(contract_helpers.getMainAccount())
     };

     return res.json(out);
});

app.get('/api/v1/auth/users/:shortId', function (request, res, next) { // 1.6. Get user data
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('No shortId');
          return res.status(400).json('No shortId');
     }

     var shortId = request.params.shortId;
     db_helpers.getUser(request.user, shortId, function (err, user) {
          if (err) {
               winston.error('can`t get user: '+err)
               return res.status(400).json('wrong user');
          };

		var balanceFeeAddress = contract_helpers.getMainAddress();
		var balanceFeeAmountInWei = contract_helpers.getFeeAmount();

          res.json({
               email:     user.email,
               balance:   user.balance,
			ethAddress:            user.ethAddress||'',
			balanceFeeAddress:     balanceFeeAddress,
			balanceFeeAmountInWei: balanceFeeAmountInWei
          });
     });
});

app.put('/api/v1/auth/users/:shortId', function (request, res, next) { // 1.8. Update data
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('No shortId');
          return res.status(400).json('No shortId');
     }
     var shortId = request.params.shortId;

     db_helpers.getUser(request.user, shortId, function (err, user) {
          if (err) {
               winston.error('can`t get user: '+err)
               return res.status(400).json('wrong user');
          }
		if (typeof(request.body.ethAddress)=='undefined'){
			winston.error('No ethAddress');
			return res.status(400).json('No ethAddress');
		}

		var setObj = {
			ethAddress: request.body.ethAddress
		}

		db.UserModel.findByIdAndUpdate(user._id, {$set: setObj}, {new: true}, function (err, user) {
               if (err) {
				winston.error('Can`t update EthAddress: '+err);
                    return res.status(400).json('Can`t update EthAddress');
			}
               res.send(200);
          });
     });
});

app.get('/api/v1/auth/lrs', function (request, res, next) { //2.1. Get a list of Lending Requests for all users 
     var user = request.user;
     if (typeof (user.id) === 'undefined') {
          winston.error('Not a user');
          return res.status(400).json('Not a user');
     }
     var userId = user.id;

     var allLR = [];
     db.LendingRequestModel.find({}, function(err, all){
          if (err) {
               return res.status(400).json('Can`t find LR`s');
          }               
          for (it in all){
               allLR.push( all[it]._id )
          }
          res.json({ids:allLR})
     });
});

app.post('/api/v1/auth/lrs', function (request, res, next) { //2.2. Create new Lending Request 
     var user = request.user;
     if (typeof (user.id) === 'undefined') {
          winston.error('Not a user');
          return res.status(400).json('Not a user');
     }
     var userId = user.id;
     db_helpers.getUser(user, userId, function (err, user) {
          if (err) {
               return res.status(400).json('wrong user');
          }

          var data = {
               borrower_id: user.shortId
          }

          db_helpers.createLendingRequest(data, function (err, lr) {
               if (err) {
                    winston.error('Can`t createLendingRequest: ' + err);
                    return res.status(400).json('can`t createLendingRequest');
               }
               return res.json({id:lr._id})
          })
     });
});

app.put('/api/v1/auth/lrs/:id', function (request, res, next) { //2.3. Set data for Lending Request 
     var user = request.user;
     if (typeof (user.id) === 'undefined') {
          winston.error('Not a user');
          return res.status(400).json('Not a user');
     }
     var userId = user.id;
     if (typeof (request.params.id) === 'undefined') {
          winston.error('Undefined id');
          return res.status(400).json('No id');
     }  
     var id = request.params.id;

     db_helpers.getUser(request.user, userId, function (err, user) {
          if (err) {
               return res.status(400).json('wrong user');
          }

          var data  = request.body;
          data.lrId = id;

          db.LendingRequestModel.findById(id,function(err,lr){
               if (err) {
                    winston.error('Can`t Lend: ' + err);
                    return res.status(400).json('can`t lend');
               }  

               if(userId !== lr.borrower_id){
                    winston.error('Tried to update someone else`s LR: '+userId);
                    return res.status(400).json('It`s not your LR');
               }   

               db_helpers.setDataForLendingRequest(data, function (err, lr) {
                    if (err) {
                         winston.error('Can`t setDataForLendingRequest: ' + err);
                         return res.status(400).json('can`t setDataForLendingRequest');
                    }
                    return res.json(200)
               })
          });
     });
});

app.get('/api/v1/auth/lrs/:id', function (request, res, next) { //2.4. Get a Lending Request 
     var user = request.user;
     if (typeof (user.id) === 'undefined') {
          winston.error('Not a user');
          return res.status(400).json('Not a user');
     }
     var userId = user.id;

     if (typeof (request.params.id) === 'undefined') {
          winston.error('Undefined id');
          return res.status(400).json('No id');
     }
     var id = request.params.id;
     
     db_helpers.getUser(user, userId, function (err, user) {
          if (err) {
               return res.status(400).json('wrong user: '+err);
          }
          db.LendingRequestModel.findById(id, function (err, lr) {
               if (err) {
                    winston.error('Can`t get LR');
                    return res.status(400).json('can`t get LR');
               }

               var minutes_left = 0;
               var now = new Date;
               var minutesDiff = (now.getTime() - lr.waiting_for_loan_from.getTime())%60000;
               if (minutesDiff >= config.get('lending_requests_params:timeout')){
                    minutes_left = 0;
               } else {
                    minutes_left = config.get('lending_requests_params:timeout') - minutesDiff; 
               }

               var out = {
                    eth_count:                lr.eth_count,
                    token_amount:             lr.token_amount,
                    token_name:               lr.token_name,
                    token_smartcontract:      lr.token_smartcontract,
                    token_infolink:           lr.token_infolink,
                    borrower_account_address: lr.borrower_account_address,
                    lender_account_address:   lr.lender_account_address,
                    borrower_id:              lr.borrower_id,
                    days_to_lend:             lr.days_to_lend,
                    current_state:            lr.current_state,
                    lender_id:                lr.lender_id,
                    date_created:             lr.date_created,
                    waiting_for_loan_from:    lr.waiting_for_loan_from,
                    date_modified:            lr.date_modified,
                    days_left:                lr.days_left,
                    address_to_send:          lr.address_to_send,
                    eth_count:                lr.eth_count,
                    smart_contract_address:   (lr.smartcontract_address || ''),
                    minutes_left:             minutes_left,
                    address_to_send:          (lr.smartcontract_address || ''),
                    eth_count:                lr.eth_count,
                    id:                       id
               };

               res.json(out);
          })
     });
});

app.post('/api/v1/auth/lrs/:id/lend', function (request, res, next) { //2.5. Lend
     var user = request.user;
     if (typeof (user.id) === 'undefined') {
          winston.error('Not a user');
          return res.status(400).json('Not a user');
     }
     var userId = user.id;
     if (typeof (request.params.id) === 'undefined') {
          winston.error('Undefined id');
          return res.status(400).json('No id');
     }

     var id = request.params.id;

     db_helpers.getUser(user, userId, function (err, user) {
          if (err) {
               return res.status(400);
          }

          var setObj = {
               date_modified: Date.now(),
			waiting_for_loan_from: Date.now(),
               lender_id: userId,
               lender_account_address: '',
			current_state: 4
          };

          db.LendingRequestModel.findById(id,function(err,lr){
               if (err) {
                    winston.error('Can`t Lend: ' + err);
                    return res.status(400).json('can`t lend');
               }  
               if(userId===lr.borrower_id){
                    winston.error('Tried to lend his own borrow: '+userId);
                    return res.status(400).json('You can`t lend your own borrow');
               }   

               db.LendingRequestModel.findByIdAndUpdate(id, {$set: setObj}, {new: true}, function (err, lr) {
                    if (err) {
                         winston.error('Can`t Lend: ' + err);
                         return res.status(400).json('can`t lend');
                    }

                    var responseObj = {
                         address_to_send: "",
                         eth_count: 120, //TODO: ????
                         minutes_left: 1440, // 1 day left until this LR moves back to 'waiting for lender' state
                         id:  id
                    };
                    
                    res.json(responseObj);
               });
          });
     });
});

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
		var balanceFeeAddress = (process.env.BALANCE_FEE_ADDRESS || config.get('eth_params:balanceFeeAddress'));
		var balanceFeeAmountInWei = (process.env.BALANCE_FEE_AMOUNT_IN_WEI || config.get('eth_params:balanceFeeAmountInWei'));
          res.json({
               email:     user.email,
               balance:   user.balance,
			ethAddress:            user.ethAddress||'',
			balanceFeeAddress:     balanceFeeAddress,
			balanceFeeAmountInWei: balanceFeeAmountInWei
          });
     });
});

app.post('/api/v1/auth/users/:shortId/balance', function (request, res, next) { // 1.7. Update user balance
     console.log('method /balance called')
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

          db_helpers.changeBalanceBy(shortId, 1, function (err, lr, usr) {
               if (err) {
                    return res.status(400).json('can`t increase balance');
               };
               res.send(200);
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

app.get('/api/v1/auth/users/:shortId/lrs', function (request, res, next) { //2.1. Get a list of Lending Requests for user 
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('Undefined shortId');
          return res.status(400).json('No shortId');
     }

     var shortId = request.params.shortId;

     db_helpers.getUser(request.user, shortId, function (err, user) { 
          if (err) {
               return res.status(400).json('Wrong user');
          }

          db_helpers.getAllLRforUser(user, function (err, allLR) {
               if (err) {
                    winston.error('Can`t return all LR`s');
                    return res.status(400).json('Can`t return all LR`s');
               }
               res.json({ids:allLR});
          })
     });
});

app.post('/api/v1/auth/users/:shortId/lrs', function (request, res, next) { //2.2. Create new Lending Request 
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('undefined shortId');
          return res.status(400).json('No shortId');
     };
     var shortId = request.params.shortId;
     db_helpers.getUser(request.user, shortId, function (err, user) {
          if (err) {
               return res.status(400).json('wrong user');
          }

          var data = request.body;

          db_helpers.createLendingRequest(data, function (err, lr,user) {
               if (err) {
                    winston.error('Can`t createLendingRequest: ' + err);
                    return res.status(400).json('can`t createLendingRequest');
               };
               return res.json({id:lr._id})
          })
     });
});

app.get('/api/v1/auth/users/:shortId/lrs/:id', function (request, res, next) { //2.3. Get a Lending Request 
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('Undefined shortId');
          return res.status(400).json('No id');
     };
     if (typeof (request.params.id) === 'undefined') {
          winston.error('Undefined id');
          return res.status(400).json('No id');
     };
     var userId = request.params.shortId;
     var lrId = request.params.id;
     
     db_helpers.getUser(request.user, userId, function (err, user) {
          if (err) {
               return res.status(400);
          };
          db.LendingRequestModel.findById(lrId, function (err, lr) {
               if (err) {
                    winston.error('Can`t get LR');
                    return res.status(400).json('can`t get LR');
               }
				var minutes_left = 0;
				var now = new Date;
				var minutesDiff = (now.getTime() - lr.date_moved_to_state_4.getTime())%60000;
				if (minutesDiff >= config.get('lending_requests_params:timeout')){
					minutes_left = 0;
				} else {
					minutes_left = config.get('lending_requests_params:timeout') - minutesDiff; 
				}

// minutes_left = (config.get(‘param’) - (now - lr.dateMovedToState4));
// if(minutes_left<=0){
// address_to_send - куда послать деньги Lender'у (равно адресу token_smartcontract)
// eth_count - сколько денег нужно послать Lender'у
// (равно eth_count, если деньги еще не получены)
  	
			
               var out = {
                    current_state:            lr.current_state,
                    eth_count:                lr.eth_count,
                    token_amount:             lr.token_amount,
                    token_name:               lr.token_name,
                    token_smartcontract:      lr.token_smartcontract,
                    token_infolink:           lr.token_infolink,
                    borrower_account_address: lr.borrower_account_address,
                    lender_account_address:   lr.lender_account_address,
                    borrower_id:              lr.borrower_id,
                    lender_id:                lr.lender_id,
                    date_created:             lr.date_created,
				date_moved_to_state_4:    lr.date_moved_to_state_4,
                    date_modified:            lr.date_modified,
                    days_to_lend:             lr.days_to_lend,
                    days_left:                lr.days_left,
                    address_to_send:          lr.address_to_send,
                    eth_count:                lr.eth_count,

                    minutes_left:             minutes_left,
				address_to_send:          lr.token_smartcontract,
                    eth_count:                lr.eth_count
               };
               res.json(out);
          })
     });
});

app.post('/api/v1/auth/users/:shortId/lrs/:id/lend', function (request, res, next) { //2.4. Lend
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('Undefined shortId');
          return res.status(400).json('No id');
     };
     if (typeof (request.params.id) === 'undefined') {
          winston.error('Undefined id');
          return res.status(400).json('No id');
     };
     var userId = request.params.shortId;
     var lrId = request.params.id;
     db_helpers.getUser(request.user, userId, function (err, user) {
          if (err) {
               return res.status(400);
          };

          var setObj = {
               date_modified: Date.now(),
			date_moved_to_state_4: Date.now(),
               lender_id: userId,
               lender_account_address: '',
			current_state: 4
          };

          db.LendingRequestModel.findByIdAndUpdate(lrId, {$set: setObj}, {new: true}, function (err, lr) {
               if (err) {
                    winston.error('Can`t Lend: ' + err);
                    return res.status(400).json('can`t lend');
               };

               var responseObj = {
                    address_to_send: "",
                    eth_count: 120, //TODO: ????
                    minutes_left: 1440 // 1 day left until this LR moves back to 'waiting for lender' state
               }
               res.json(responseObj)        
          })
     })
})
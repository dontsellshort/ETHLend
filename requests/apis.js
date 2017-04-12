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

          res.json({
               email:     user.email,
               balance:   user.balance,
			ethAddress:            user.ethAddress,
			balanceFeeAddress:     user.balanceFeeAddress,
			balanceFeeAmountInWei: user.balanceFeeAmountInWei
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

     db_helpers.getUser(request.user, shortId, function (err, user) { //TODO: what`s req.user ????
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
                    date_modified:            lr.date_modified,
                    days_to_lend:             lr.days_to_lend,
                    days_left:                lr.days_left,
                    address_to_send:          lr.address_to_send,
                    eth_count:                lr.eth_count,
                    minutes_left:             lr.minutes_left
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
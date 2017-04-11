app.get('/api/v1/auth/users/:shortId', function (request, res, next) {
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('No shortId');
          return res.status(400).json('No shortId');
     }

     var shortId = request.params.shortId;
     db_helpers.getUser(req.user, shortId, function (err, user) { //TODO: what`s req.user ????
          if (err) {
               return res.status(400).json('wrong user');
          };
          res.json({
               email: user.email,
               balance: user.balance
          });

     });
});

app.post('/api/v1/auth/users/:shortId/balance', function (request, res, next) {
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('No shortId');
          return res.status(400).json('No shortId');
     }
     var shortId = request.params.shortId;

     db_helpers.getUser(req.user, shortId, function (err, user) { //TODO: what`s req.user ????
          if (err) {
               return res.status(400).json('wrong user');
          }

          db_helpers.changeBalanceBy(shortId, 1, function (err, user) {
               if (err) {
                    return res.status(400).json('can`t increase balance');
               };
               res.send(200);
          });
     });
});

app.get('auth/users/:shortId/lrs', function (request, res, next) { //2.1. Get a list of Lending Requests for user 
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('Undefined shortId');
          return res.status(400).json('No shortId');
     };
     var shortId = request.params.shortId;

     db_helpers.getUser(req.user, shortId, function (err, user) { //TODO: what`s req.user ????
          if (err) {
               return res.status(400);
          }

          db_helpers.getAllLRforUser(user, function (err, allLR) {
               if (err) {
                    winston.error('can`t return all LR`s');
                    return res.status(400).json('Can`t return all LR`s');
               }
               res.json(allLR);
          })
     });
});

app.post('auth/users/:shortId/lrs', function (request, res, next) { //2.2. Create new Lending Request 
     if (typeof (request.params.shortId) === 'undefined') {
          winston.error('undefined shortId');
          return res.status(400).json('No shortId');
     };
     var shortId = request.params.shortId;

     db_helpers.getUser(req.user, shortId, function (err, user) { //TODO: what`s req.user ????
          if (err) {
               return res.status(400);
          }

          var data = request.body;

          db_helpers.createLendingRequest(data, function (err, user, lr) {
               if (err) {
                    winston.error('Can`t createLendingRequest: ' + err);
                    return res.status(400).json('can`t createLendingRequest');
               };
               return res.json(lr._id)
          })
     });
});

app.get('auth/users/:shortId/lrs/:id', function (request, res, next) { //2.3. Get a Lending Request 
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

          db.LendingRequestModel.find({_id: lrId}, function (err, lr) {
               if (err) {
                    winston.error('Can`t get LR');
                    return res.status(400).json('can`t get LR');
               };
               res.json(lr);
          })
     });
});

app.post('auth/users/:shortId/lrs/:id/lend', function (request, res, next) { //2.4. Lend
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
               lender_account_address: '0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e' //TODO: ????
          };

          db.LendingRequestModel.findByIdAndUpdate(lrId, {$set: setObj}, {new: true}, function (err, lr) {
               if (err) {
                    winston.error('Can`t Lend: ' + err);
                    return res.status(400).json('can`t lend');
               };

               var responseObj = {
                    "address_to_send": "0xbd997cd2513c5f031b889d968de071eeafe07130", //TODO: ????
                    "eth_count": 120, //TODO: ????
                    "minutes_left": 1440 // 1 day left until this LR moves back to 'waiting for lender' state
               }
               res.json(responseObj)        
          })
     })
})
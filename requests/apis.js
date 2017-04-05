
// AUTH Get user by short ID
// 
// Params: shortId
// Returns full user tuple
app.get('/api/v1/auth/users/:shortId',function(request, res, next) {
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return next();
     }

     var shortId = request.params.shortId;
     // req.user contains data from JWT (this route is only available for auth users)
     // getUser will compare id with shortId and deny any "HACKER" calls )))
     db_helpers.getUser(req.user,shortId,function(err,user){
          if(err){
               // err message is already printed to winston
               return next(); // 404 with no error
          }

          // TODO: add here your logics

     });
});


// AUTH Get user by short ID
// 
// Params: shortId
// Returns full user tuple
app.post('/api/v1/auth/users/{shortId}/balance',function(request, res, next) {

});

app.get('/api/v1/auth/users/{shortId}/lrs',function(request, res, next) {

});

app.post('/api/v1/auth/users/{shortId}/lrs',function(request, res, next) {

});

app.get('/api/v1/auth/users/{shortId}/lrs/{id}',function(request, res, next) {

});

app.post('/api/v1/auth/users/{shortId}/lrs/{id}/lend',function(request, res, next) {

});





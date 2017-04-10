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
          if(err){  // err message is already printed to winston
               return next(); // 404 with no error
          };
          res.json({ email:req.user.email, balance:req.user.balance });

     });
});

// AUTH Get user by short ID
// 
// Params: shortId
// Returns full user tuple

app.post('/api/v1/auth/users/:shortId/balance',function(request, res, next) {
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return next();
     }
     var shortId = request.params.shortId;
     // req.user contains data from JWT (this route is only available for auth users)
     // getUser will compare id with shortId and deny any "HACKER" calls )))
     db_helpers.getUser(req.user,shortId,function(err,user){
          if(err){  // err message is already printed to winston
               return next(); // 404 with no error
          };
          res.json({ email:req.user.email, balance:req.user.balance });

     });

});

app.get('auth/users/:shortId/lrs', function(request,res,next){ //2.1. Get a list of Lending Requests for user 
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId'); return next()
    }; 
});

app.post('auth/users/:shortId/lrs', function(request,res,next){//2.2. Create new Lending Request 
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId'); return next()
    };
    
});

app.get('auth/users/:shortId/lrs/:id', function(request,res,next){//2.3. Get a Lending Request 
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId'); return next()
    }; 
    if (typeof(request.params.id)==='undefined'){
        winston.error('undefined id'); return next()
    };   
    var shortId = request.params.shortId;
    var id      = request.params.id;
    db_helpers.getUser(request.user, shortId, function(err, user){
        if (err){ return next()};
        // .........
    });  

});

app.post('auth/users/:shortId/lrs/:id/lend', function(request,res,next){//2.4. Lend
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId'); return next()
    };
    if (typeof(request.params.id)==='undefined'){
        winston.error('undefined id'); return next()
    };  

    var shortId = request.params.shortId;
    var id      = request.params.id;
    db_helpers.getUser(request.user, shortId, function(err, user){
        if (err){ return next()};
        // .........
    });        
});


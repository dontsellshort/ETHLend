
app.get('/api/v1/auth/users/:shortId',function(request, res, next) {
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return res.status(400).json('No shortId');
     }

     var shortId = request.params.shortId;
     db_helpers.getUser(req.user,shortId,function(err,user){
          if(err){ 
              return res.status(400).json('No shortId'); 
          };
          res.json({ email:user.email, balance:user.balance });

     });
});

app.post('/api/v1/auth/users/:shortId/balance',function(request, res, next) {
     if(typeof(request.params.shortId)==='undefined'){
          winston.error('No shortId');
          return res.status(400).json('No shortId');
     }
     var shortId = request.params.shortId;
     db_helpers.getUser(req.user,shortId,function(err,user){
          if(err){ 
               return res.status(400).json('can`t get user');
          };
          res.json({ email:user.email, balance:user.balance });

     });

});

app.get('auth/users/:shortId/lrs', function(request,res,next){ //2.1. Get a list of Lending Requests for user 
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId'); 
        return res.status(400).json('No shortId');
    }; 
});

app.post('auth/users/:shortId/lrs', function(request,res,next){//2.2. Create new Lending Request 
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId'); 
        return res.status(400).json('No shortId');
    };
    
});

app.get('auth/users/:shortId/lrs/:id', function(request,res,next){//2.3. Get a Lending Request 
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId'); 
        return res.status(400).json('No id');
    }; 
    if (typeof(request.params.id)==='undefined'){
        winston.error('undefined id');
        return res.status(400).json('No id');
    };   
    var shortId = request.params.shortId;
    var id      = request.params.id;
    db_helpers.getUser(request.user, shortId, function(err, user){
        if (err){ 
            return res.status(400).json('Can`t get user');
        };
        // .........
    });  

});

app.post('auth/users/:shortId/lrs/:id/lend', function(request,res,next){//2.4. Lend
    if (typeof(request.params.shortId)==='undefined'){
        winston.error('undefined shortId');
        return res.status(400).json('No shortId');
    };
    if (typeof(request.params.id)==='undefined'){
        winston.error('undefined id');
        return res.status(400).json('No id');
    };  

    var shortId = request.params.shortId;
    var id      = request.params.id;
    db_helpers.getUser(request.user, shortId, function(err, user){
        if (err){ 
            return res.status(400).json('Can`t get user');
        // .........
    });        
});


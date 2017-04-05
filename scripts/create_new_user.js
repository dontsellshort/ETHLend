var http = require('http');
var https = require('https');

function postDataReal(port,url,post_data,authToken,cb){
     var len = Buffer.byteLength(post_data, 'utf8');

     var opts = {
          host: 'ethlend-backend.herokuapp.com',
          port: port,
          path: url,
          method: 'POST',
          headers: {
               'Content-Type': 'application/json',
               'Content-Length': len
          }
     };

     if(authToken!==''){
          opts.headers['Authorization'] = 'Bearer ' + authToken;
     }

     var req = https.request(opts, function (res) {
          var dataOut = '';
          res.on('data', function (chunk) {
               dataOut += chunk;
          });

          res.on('end', function () {
               cb(null,res.statusCode,res.headers,dataOut);
          });
     });

     req.write(post_data);
     req.end();
}


var url = '/users/v1/?do_not_send_email=1';
var j = {
     email: 'anthony.akentiev@gmail.com',
     pass: '123456'
};
var data = JSON.stringify(j);

// 1 - create
postDataReal(443,url,data,'',function(err,statusCode,h,dataOut){
     var p = JSON.parse(dataOut);

     console.log('Ready...')
     console.log(p);
});

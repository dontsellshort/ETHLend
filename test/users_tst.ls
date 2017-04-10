require!{
	\../server.js 		      :server     
	\../db.js 				  :db         
	\../helpers/db_helpers.js :db_helpers 
	\../config.js 		      :config     
	\../helpers/helpers.js    :helpers    
	\fs 				      :fs         
	\http 				      :http       
	\assert 				  :assert  }



eval fs.readFileSync('test/helpers.js') + ''
global.signature = ''
global.userId    = ''
globalToken      = ''
SQ               = assert.equal
NQ               = assert.notEqual
target-email = 'xxx@chain.cloud'

describe 'Users module', (T)!->
	before (done) !->
		uri = 'mongodb://localhost/tests'
		conn = db.connectToDb(uri, '', '')
		db.removeDb !->
			server.initDb db
			server.startHttp 9091
			done()
			# ok
	after (done) !->
		server.stop()
		db.removeDb !->
		db.disconnectDb()
		done()
	it '1.1. should not create user if no email in body', (done) !->
		url  = '/api/v1/users'
		data = ''
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			done()
	it '1.2. should not create user if no pass in body', (done) !->
		url = '/api/v1/users'
		j = email: 'tony@mail.ru'
		data = JSON.stringify(j)
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			done()
	it '1.3.should not create user if bad email', (done) !->
		url = '/api/v1/users'
		j = 
			email: 'tonymailu'
			pass: 'goodpass'
		data = JSON.stringify(j)
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			done()
	it '1.4.should not create user if pass is too short', (done) !->
		url = '/api/v1/users'
		j = 
			email: target-email
			pass: '123'
		data = JSON.stringify(j)
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			NQ dataOut, ''
			done()
	it '1.5. should create new user', (done) ->
		url = '/api/v1/users?do_not_send_email=1'
		j = do
			email: target-email
			pass: '123456'
		data = JSON.stringify(j)
		# 1 - create
		postData 9091, url, data, (err, statusCode, h, dataOut) ->
			SQ err, null
			SQ statusCode, 200
			p = JSON.parse(dataOut)
			SQ p.statusCode, 1
			assert.notEqual p.shortId, 0
			# 2 - check that user is in DB now
			db.UserModel.findByEmail j.email, (err, users) ->
				SQ err, null
				SQ users.length, 1
				SQ users[0].shortId, p.shortId
				SQ users[0].validated, false
				db.UserModel.findByShortId p.shortId, (err, users) ->
					SQ err, null
					SQ users.length, 1
					SQ users[0].shortId, p.shortId
					NQ users[0].validationSig, ''
					global.userId    = users[0].shortId
					global.signature = users[0].validationSig
					db.SubscriptionModel.findByShortId userId, (err, subs) ->
						SQ err, null
						SQ subs.length, 1
						SQ subs[0].type, 1
						# "free"
						done()


	it '1.6. should not login if not validated yet', (done) !->
		email = helpers.encodeUrlDec(target-email)
		url   = '/api/v1/users/' + email + '/login'
		j     = pass: '123456'
		data  = JSON.stringify(j)
		#console.log('-!->D: ');
		#console.log(data);
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 401
			done()
	it '1.7. should not send <reset password> if still not validated', (done) !->
		email = helpers.encodeUrlDec(target-email)
		url   = '/api/v1/users/' + email + '/reset_password_request'
		postData 9091, url, '', (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 200
			# But still OK!
			SQ dataOut, 'OK'
			done()
	it '1.8. should not validate user without signature', (done) !->
		url = '/api/v1/users/' + userId + '/validation'
		postData 9091, url, '', (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			done()
	it '1.9. should not validate user without valid user ID', (done) !->
		url = '/api/v1/users/' + '1234' + '/validation'
		postData 9091, url, '', (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			done()
	it '1.10. should validate user', (done) !->
		url = '/api/v1/users/' + userId + '/validation?sig=' + signature
		postData 9091, url, '', (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 200
			SQ dataOut, 'OK'
			str = target-email
			db.UserModel.findByEmail str, (err, users) !->
				SQ err, null
				SQ users.length, 1
				SQ users[0].validated, true
				SQ users[0].validationSig, ''
				done()

	it '1.11. should not validate user again', (done) !->
		url = '/api/v1/users/' + userId + '/validation?sig=' + signature
		postData 9091, url, '', (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			done()
	it '1.12. should not login if bad password', (done) !->
		email = helpers.encodeUrlDec(target-email)
		url   = '/api/v1/users/' + email + '/login'
		j     = pass: 'shitsomw'
		data  = JSON.stringify(j)
		#console.log('-!->D: ');
		#console.log(data);
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 401
			done()
	it '1.13. should not login if bad email', (done) !->
		email = helpers.encodeUrlDec('nono@gmail.com')
		url   = '/api/v1/users/' + email + '/login'
		j     = pass: '123456'
		data  = JSON.stringify(j)
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 404
			done()
	it '1.14. should login if everything OK', (done) !->
		
		url   = '/api/v1/users/' + helpers.encodeUrlDec(target-email) + '/login'
		j     = pass: '123456'
		data  = JSON.stringify(j)
		postData 9091, url, data, (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 200
			parsed = JSON.parse(dataOut)
			globalToken = parsed.token
			NQ globalToken.length, 0
			done()

	it '1.15. should not send <reset password> if bad user', (done) !->
		email = helpers.encodeUrlDec('a.akentiev@gmail.com')
		url = '/api/v1/users/' + email + '/reset_password_request'
		postData 9091, url, '', (err, statusCode, h, dataOut) !->
			SQ err, null
			SQ statusCode, 200
			SQ dataOut, 'OK'
			done()

	# WARNING: this code sends real e-mails! )))
	it '1.16. should reset password - send email', (done) !->
		email = helpers.encodeUrlDec(target-email)
		url   = '/api/v1/users/' + email + '/reset_password_request?do_not_send_email=1'

		postData 9091, url, '', (err, statusCode, h, dataOut) !->
			# if you see '[Error: Authentication required, invalid details provided]'
			# error here !-> you need to set real e-mail account details to 'config.json'
			SQ err, null
			SQ statusCode, 200
			SQ dataOut, 'OK'
			done()

	it '1.17. should set new password', (done) !->
		email = target-email
		db.UserModel.findByEmail email, (err, users) !->
			SQ err, null
			SQ users.length, 1
			SQ users[0].validated, true
			NQ users[0].resetSig.length, 0
			sig     = users[0].resetSig
			oldPass = users[0].password
			url     = '/api/v1/users/' + userId + '/password?sig=' + sig + '&new_val=' + 'new_Pass'
			putData 9091, url, '', (err, statusCode, headers, dataOut) !->
				SQ err, null
				SQ statusCode, 200
				db.UserModel.findByEmail email, (err, users) !->
					SQ err, null
					SQ users.length, 1
					SQ users[0].validated, true
					SQ users[0].resetSig, ''
					NQ users[0].password, oldPass
					done()

				
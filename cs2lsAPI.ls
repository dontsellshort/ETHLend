 require! {
		\./helpers/helpers.js    :helpers     
		\./helpers/db_helpers.js :db_helpers
		\./helpers/mail_send.js  :mail_send 
		\assert                  :assert        
		\jsonwebtoken            :jwt             
		\bcrypt                  :bcrypt } 
# Create new user
#
# Body params: {email: "", pass: ""}
# Returns {shortId: "123456789"} or 404

createUserContinue = (user, res)!->
	statusCode:1, shortId:user.shortId 
	|> JSON.stringify 
	|> res.send

returnJwt = (user, res)!->
	sId     = user.shortId
	profile = id: sId, email: user.email # We are sending the profile inside the token
	token   = jwt.sign(profile, secret, expiresInMinutes: config.get("auth:expires_minutes"))
	winston.info "User logged in: #sId"
	console.log  "-->User logged in: #sId"
	res.json token:token, shortId:sId


app.post "/api/v1/users", (Q, res, next) ->
	if typeof Q.body == "undefined" or Q.body == null; return next!
	if undefQ Q.body.email => WERR "No email"; return next!
	if undefQ Q.body.pass => WERR "No pass"; return next!
	email = Q.body.email
	pass = Q.body.pass  # 0 - validate email
	if !helpers.validateEmail(email) => WERR "Bad email"; return next!
	if !helpers.validatePass(pass) => WERR "Bad pass"; return next!
	sendEmail = true
	if typeof Q.query.do_not_send_email != "undefined"
		sendEmail = false  # 1 - check if already exists
	db_helpers.findUserByEmail email, (err, user) ->
		if err => WERR "Error: " + err; return next!
		if typeof user != "undefined" and user != null  # already exists
			winston.info "User " + email + " already exists"
			return res.send("Already exists")  # 2 - create user + subscription
		name = Q.body.name or ""  # could be empty
		lastName = Q.body.last_name or ""  # could be empty
		needValidation = true
		db_helpers.createNewUser name, lastName, email, pass, undefined, needValidation, (err, user) ->
			if err or typeof user == "undefined" => WERR "Can not create new user: " + err; return next!
			if sendEmail  # 4 - send validation e-mail
				validationSig = user.validationSig
				validationLink = config.get("mail:validation_link") + "?sig=" + validationSig + "&id=" + user.shortId
				mail_send.sendUserValidation user.email, validationLink, (err) ->
					if err => WERR "Can not save user to DB: " + err; return next!
					createUserContinue user, res
					return
			else
				createUserContinue user, res
			return
		return
	return
# Validate user (email)
#
# Params: shortId
# Params: signature
#
# Returns: redirection to "OK" or "BAD" pages
# app.post "/api/v1/users/:shortId/validation", (Q, res, next) ->
# 	if undefQ Q.params.shortId => WERR "No shortId"; return next!
# 	if undefQ Q.query.sig => WERR "No signature"; return next!  # 1 - get user
# 	shortId = Q.params.shortId
# 	if !helpers.validateShortId(shortId) => WERR "Bad shortId"; return next!
# 	db.UserModel.findByShortId shortId, (err, users) ->
# 		if err => WERR "Error: " + err; return next!
# 		if typeof users == "undefined" or !users.length => WERR "No such user: " + shortId; return next!  # 2 - check if already validated
# 		assert.equal users.length <= 1, true
# 		user = users[0]
# 		if user.validated => WERR "Already validated: " + shortId; return next!  # 3 - validate
# 		if Q.query.sig != user.validationSig => WERR "Can not validate user: " + shortId; return next!  # 4 - save
# 		user.validationSig = ""
# 		user.validated = true
# 		user.modified = Date.now()
# 		user.save (err) ->
# 			if err => WERR "Can not save user: " + shortId; return res.send \OK  # send "registration complete" e-mail
# 			mail_send.sendRegComplete user.email, (err) ->
# 				if err => WERR "Can not send reg complete e-mail: " + err; return res.send \OK  # 5 - return
# 				res.send "OK"
# 				return
# 			return
# 		return
# 	return
# Send e-mail with "reset your password" text.
# this method always returns "OK" to cheat attacker. 
# app.post "/api/v1/users/:email/reset_password_request", (Q, res, next) ->
# 	winston.info "Reset password Q"
# 	if undefQ Q.params.email => WERR "No email"; return res.send \OK  # 1 - get user
# 	email = Q.params.email
# 	if !helpers.validateEmail(email) => WERR "Bad email"; return res.send \OK
# 	winston.info "Reset password email is: " + email
# 	db.UserModel.findByEmail email, (err, users) ->
# 		if err => WERR "Error: " + err; return res.send \OK
# 		if typeof users == "undefined" or !users.length => WERR "No such user: " + email; return res.send \OK  # 2 - check if already validated
# 		assert.equal users.length <= 1, true
# 		user = users[0]
# 		if !user.validated => WERR "Not validated: " + email; return res.send \OK  # 3 - generate new signature
# 		user.modified = Date.now()
# 		user.resetSig = helpers.generateResetSig(user.email, user.pass)
# 		user.save (err) ->
# 			if err => WERR "Can not generate validation sig: " + email; return res.send \OK  # 4 - send e-mail 
# 			resetLink = config.get("mail:reset_link") + "?sig=" + user.resetSig + "&id=" + user.shortId
# 			mail_send.sendResetPassword user.email, resetLink, (err) ->
# 				if err => WERR "Can not save user to DB: " + err; return next!  # OK
# 				res.send "OK"
# 			return
# 		return
# 	return
# Create new password (after reset was Qed)
# app.put "/api/v1/users/:shortId/password", (Q, res, next) ->
# 	if undefQ Q.params.shortId => WERR "No shortId"; return next!
# 	if undefQ Q.query.sig => WERR "No signature"; return next!  # new password is here...
# 	if undefQ Q.query.new_val => WERR "No password"; return next!  # validate everything
# 	shortId = Q.params.shortId
# 	if !helpers.validateShortId(shortId) => WERR "Bad shortId"; return next!
# 	if !helpers.validatePass(Q.query.new_val) => WERR "Bad pass"; return next!
# 	db.UserModel.findByShortId shortId, (err, users) ->
# 		if err => WERR "Error: " + err; return next!
# 		if typeof users == "undefined" or !users.length => WERR "No such user: " + shortId; return next!  # 2 - check if already validated
# 		assert.equal users.length <= 1, true
# 		user = users[0]
# 		if !user.validated => WERR "Not validated: " + shortId; return next!
# 		if typeof user.resetSig == "undefined" or !user.resetSig.length => WERR "No signature: " + shortId; return next!  # 3 - validate
# 		if Q.query.sig != user.resetSig => WERR "Can not validate user: " + shortId; return next!  # 4 - set new password
# 		user.modified = Date.now()
# 		user.resetSig = ""
# 		bcrypt.hash Q.query.new_val, config.get("auth:salt"), (err, hash) ->
# 			user.password = hash
# 			if err => WERR "Can not gen hash: " + err; return next!
# 			user.save (err) ->
# 				if err => WERR "Can not save user"; return next!  # 5 - send "password has been changed" email
# 				mail_send.sendPassChanged user.email, (err) ->
# 					if err => WERR "Can not send email to user: " + err  # eat this error  #return next();
# 					res.send "OK"
# 					return
# 				return
# 			return
# 		return
# 	return
# Login
#
# Body params: { password: ""}
# Returns: 401 or good JSON web token
# app.post "/api/v1/users/:email/login", (Q, res, next) ->
# 	winston.info "AUTH call"
# 	if undefQ Q.params.email => WERR "No email"; return next!
# 	if typeof Q.body == "undefined" or Q.body == null; return next!
# 	if undefQ Q.body.pass => WERR "No pass"; return next!
# 	email = helpers.decodeUrlEnc(Q.params.email)
# 	pass = Q.body.pass  # 0 - validate email
# 	if !helpers.validateEmail(email) => WERR "Bad email"; return next!  # 1 - find user
# 	winston.info "Login: " + email
# 	db.UserModel.findByEmail email, (err, users) ->
# 		if err => WERR "Error: " + err; return next!
# 		if typeof users == "undefined" or !users.length => WERR "No such user: " + email; return next!  # 2 - check if already validated
# 		assert.equal users.length <= 1, true
# 		user = users[0]
# 		if !user.validated => WERR "Still not validated: " + email
# 			return res.send(401, "Wrong user or password")  # 3 - compare password  #console.log("-->LOGIN PASS: " + pass);  #console.log("-->USER SALT: " + user.salt);
# 		bcrypt.hash pass, config.get("auth:salt"), (err, hash) ->
# 			if err => WERR "Can not hash password for check: " + email
# 				return res.send(401, "Wrong user or password")
# 			if user.password != hash => WERR "Bad password result for: " + email
# 				return res.send(401, "Wrong user or password")  # 4 - if OK -> give jwt
# 			returnJwt user, res
# 			return
# 		return
# 	return

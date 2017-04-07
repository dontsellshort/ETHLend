 require! {
		\./helpers/helpers.js    :helpers     
		\./helpers/db_helpers.js :db_helpers
		\./helpers/mail_send.js  :mail_send 
		\assert                  :assert        
		\jsonwebtoken            :jwt             
		\bcrypt                  :bcrypt } 

createUserContinue = (user, res)!->
	statusCode:1, shortId:user.shortId 
	|> JSON.stringify 
	|> res.send

returnJwt = (user, res)!->
	sId     = user.shortId
	profile = id: sId, email: user.email # We are sending the profile inside the token
	token   = jwt.sign(profile, secret, expiresInMinutes: config.get(\auth:expires_minutes))
	winston.info    "User logged in: #sId"
	console.log  "-->User logged in: #sId"
	res.json token:token, shortId:sId

POST =-> app.post "/api/v1/#{&0}", jsonParser, &1
GET  =-> app.get  "/api/v1/#{&0}", jsonParser, &1
PUT  =-> app.put  "/api/v1/#{&0}", jsonParser, &1

undefQ =->    typeof it == \undefined
undefnulQ =-> typeof it == \undefined  || it == null
undeflenQ =-> typeof it == \undefined  || !it?length
WERR = winston.error
# checkIt =-> if undefQ it.par => WERR im.msg; return it.next!/

### 1. USERS

POST \users, (Q,res,next)-> ### 1.1. Create new user
 	email     = Q.body?email
	pass      = Q.body?pass 
    sendEmail = true # 0 - validate email
	if undefnulQ Q.body                 => return next!
	if undefQ Q.body.email              => WERR "No email";  return next!
	if undefQ Q.body.pass               => WERR "No pass";   return next! 
	if !helpers.validateEmail email     => WERR "Bad email"; return next!
	if !helpers.validatePass pass       => WERR "Bad pass";  return next!
	if undefQ Q.query.do_not_send_email => sendEmail = false	

	db_helpers.findUserByEmail email, (err, user) -> # 1 - check if already exists
		if err            => WERR "Error: #err";  return next!
		if undefnulQ user => winston.info "User #email already exists"; return res.send "Already exists"
		name           = Q.body.name      or "" # could be empty
		lastName       = Q.body.last_name or "" # could be empty
		needValidation = true
		db_helpers.createNewUser name, lastName, email, pass, undefined, needValidation, (err, user) -> # 2 - create user + subscription
			if err or undefQ user => WERR "Can not create new user: #err"; return next!
			if sendEmail  # 4 - send validation e-mail
                link = config.get("mail:validation_link")
				validationLink = "#{link}?sig=#{user.validationSig}&id=#{user.shortId}"
				mail_send.sendUserValidation user.email, validationLink, (err)!->
					if err => WERR "Can not save user to DB: #err"; return next!
					createUserContinue user, res
			else createUserContinue user, res

GET \users/:shortId, (Q,res,next)-> ### 1.2. Get user data
	if undefQ request.params.shortId => WERR 'No shortId'; return next!
	shortId = request.params.shortId # req.user contains data from JWT (this route is only available for auth users)
	# getUser will compare id with shortId and deny any "HACKER" calls )))
	db_helpers.getUser req.user, shortId, (err, user) ->
		if err
			# err message is already printed to winston
			return next()

POST \users/:shortId/balance, (Q,res,next)-> ### 1.3. Increase User"s Balance
    # HEADER  Content-Type:application/json;
    # IN
    # OUT    

POST \users/:shortId/validation, (Q,res,next)-> ### 1.4. Validate user
    shortId = Q.params?shortId
	if undefQ shortId                   => WERR "No shortId";   return next!
	if undefQ Q.query?sig               => WERR "No signature"; return next!
	if !helpers.validateShortId shortId => WERR "Bad shortId";  return next! 
	db.UserModel.findByShortId shortId, (err, users) -> # 1 - get user
        user = users?0
		if err             => WERR "Error: #err";                 return next!
        if undeflenQ users => WERR "No such user: #shortId";      return next!
		if user.validated  => WERR "Already validated: #shortId"; return next! # 2 - check if already validated
		if Q.query.sig != user.validationSig => WERR "Can`t validate user: #shortId"; return next! # 3 - validate	
		user.validationSig = "" # 4 - save
		user.validated     = true
		user.modified      = Date.now!
		user.save (err) ->
            if err => WERR "Can not save user: #shortId"; return res.send \OK		
			mail_send.sendRegComplete user.email, (err)-> # send "registration complete" e-mail
				if err => WERR "Can not send reg complete e-mail: #err"; return res.send \OK			
				res.send \OK # 5 - return

 POST \users/:email/reset_password_request, (Q,res,next)-> ### 1.5. Reset password
 	winston.info "Reset password request"
	if undefQ Q.params.email => WERR "No email"; return res.send \OK
	email = Q.params.email 
    # 1 - get user
	if !helpers.validateEmail email => WERR "Bad email"; return res.send \OK
	winston.info "Reset password email is: #email" 
	db.UserModel.findByEmail email, (err, users) ->
        user = users?0
		if err               => WERR "Error: #email";  return res.send \OK
		if undeflenQ users   => WERR "No such user: #email";  return res.send \OK
		if !user?validated   => WERR "Not validated: #email"; return res.send \OK
		# 3 - generate new signature
		user.modified = Date.now!
		user.resetSig = helpers.generateResetSig user.email, user.pass
		user.save (err) ->
			if err => WERR "Can`t generate validation sig: #email"; return res.send \OK
			# 4 - send e-mail 
			resetLink = config.get(\mail:reset_link) + "?sig=#{user.resetSig}&id=#{user.shortId}"
			mail_send.sendResetPassword user.email, resetLink, (err) ->
				if err => WERR "Can not save user to DB: #err"; return next!
				res.send \OK

 PUT \users/:shortId/password, (Q,res,next)-> ### 1.6. Set new password
	shortId = Q.params?shortId # validate everything
	if undefQ Q.params.shortId => WERR "No shortId";   return next!
	if undefQ Q.query.sig      => WERR "No signature"; return next!
	if undefQ Q.query.new_val  => WERR "No password";  return next! # new password is here...
	if !helpers.validateShortId(shortId)      => WERR "Bad shortId"; return next!
	if !helpers.validatePass(Q.query.new_val) => WERR "Bad pass"; return next!
	db.UserModel.findByShortId shortId, (err, users) ->
        user = users?0
		if err                          => WERR "Error: #err";                   return next!
		if undeflenQ users              => WERR "No such user: #shortId";        return next!
		if !user.validated              => WERR "Not validated: #shortId";       return next! # 2 - check if already validated
		if undeflenQ user.resetSig      => WERR "No signature: #shortId";        return next! # 3 - validate	
		if Q.query.sig != user.resetSig => WERR "Can`t validate user: #shortId"; return next!		
		user.modified = Date.now! # 4 - set new password
		user.resetSig = ""
		bcrypt.hash Q.query.new_val, config.get(\auth:salt), (err, hash) ->
			user.password = hash
			if err => WERR "Can not gen hash: #err"; return next!
			user.save (err)->
				if err => WERR "Can not save user"; return next! # 5 - send "password has been changed" email
				mail_send.sendPassChanged user.email, (err) ->
					if err => WERR "Can not send email to user: #err" # eat this error return next!;
					res.send \OK


POST \/api/v1/users/:email/login", (Q,res,next)-> ### 1.7. Login
	winston.info "AUTH call"
	email = helpers.decodeUrlEnc Q.params?email
	pass  = Q.body?pass 
	if undefQ email     => WERR "No email"; return next!
	if undeflenQ Q.body => return next!
	if undefQ pass      => WERR "No pass"; return next!
	if !helpers.validateEmail(email) => WERR "Bad email"; return next!  # 1 - find user
	winston.info "Login: #email"
	db.UserModel.findByEmail email, (err, users) ->
        user = users?0
		if err             => WERR "Error: #err";                 return next!
		if undelenQ users  => WERR "No such user: #email";        return next!  # 2 - check if already validated
		if !user.validated => WERR "Still not validated: #email"; return res.send 401, "Wrong user or password"  # 3 - compare password  #console.log("-->LOGIN PASS: " + pass);  #console.log("-->USER SALT: " + user.salt);
		bcrypt.hash pass, config.get("auth:salt"), (err, hash) ->
			if err                   => WERR "Can`t hash password for check: #email"; return res.send 401, "Wrong user or password"
			if user.password != hash => WERR "Bad password result for: #email";       return res.send 401, "Wrong user or password"  # 4 - if OK -> give jwt
			returnJwt user, res

### 2. LANDING REQUESTS

GET \auth/users/:shortId/lrs, (Q,res,next)->  ### 2.1. Get a list of Lending Requests for user
    # HEADER  Authorization:Bearer TOKEN-HERE
    # OUT     [ 1234342344, 7879878789, 2423423423 ]

POST \auth/users/:shortId/lrs, (Q,res,next)-> ### 2.2. Create new Lending Request
    # HEADER   Content-Type:application/json; 
    # HEADER   Authorization:Bearer TOKEN-HERE
    # IN       eth_count:                120,
    # IN       token_amount:             10000,
    # IN       token_name:               "Augur tokens",
    # IN       token_smartcontract:      "https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code",
    # IN       token_infolink:           "www.augur.com",
    # IN       borrower_account_address: "0xbd997cd2513c5f031b889d968de071eeafe07130",
    # IN       borrower_id:              1234566,   // creator shortId
    # IN       days_to_lend:             30
    # OUT      id: 123123123

GET \auth/users/:shortId/lrs/:id, (Q,res,next)-> ### 2.3. Get a Lending Request
    # HEADER  Authorization:Bearer TOKEN-HERE
    # OUT     current_state:            1, // 1..10
    # OUT     eth_count:                120,
    # OUT     token_amount:             10000,
    # OUT     token_name:               "Augur tokens",
    # OUT     token_smartcontract:      "https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code",
    # OUT     token_infolink:           "www.augur.com",
    # OUT     borrower_account_address: "0xbd997cd2513c5f031b889d968de071eeafe07130",
    # OUT     lender_account_address:   "0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e",
    # OUT     borrower_id:              1234566,   // shortId
    # OUT     lender_id:                98232323,    // shortId
    # OUT     date_created:             "TODO",
    # OUT     date_modified:            "TODO",
    # OUT     days_to_lend:             30,
    # OUT     days_left:                0,

POST \auth/users/:shortId/lrs/:id/lend, (Q,res,next)-> ### 2.4. Lend
    # HEADER  Content-Type:application/json; Authorization:Bearer TOKEN-HERE
    # IN      ---
    # OUT     "address_to_send": "0xbd997cd2513c5f031b889d968de071eeafe07130",
    # OUT     "eth_count": 120,
    # OUT     "minutes_left": 1440    // 1 day left until this LR moves back to "waiting for lender" state

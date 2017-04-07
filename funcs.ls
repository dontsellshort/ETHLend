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
undeflenQ =-> typeof it == \undefined  || !it.length
WERR = winston.error
### 1. USERS

\users `POST` (Q,R,next)-> ### 1.1. Create new user
 	email     = Q.body?email
	pass      = Q.body?pass 
    sendEmail = true

    switch # 0 - validate email
	| undefnulQ Q.body                 => return next!
	| undefQ Q.body.email              => WERR 'No email';  return next!
	| undefQ Q.body.pass               => WERR 'No pass';   return next! 
	| !helpers.validateEmail email     => WERR 'Bad email'; return next!
	| !helpers.validatePass pass       => WERR 'Bad pass';  return next!
	| undefQ Q.query.do_not_send_email => sendEmail = false	

	db_helpers.findUserByEmail email, (err, user) -> # 1 - check if already exists
		if err            => WERR "Error: #err";  return next!
		if undefnulQ user => winston.info "User #email already exists"; return res.send 'Already exists'
		# 2 - create user + subscription
		name           = Q.body.name      or '' # could be empty
		lastName       = Q.body.last_name or '' # could be empty
		needValidation = true
		db_helpers.createNewUser name, lastName, email, pass, undefined, needValidation, (err, user) ->
			if err or undefQ user => WERR "Can not create new user: #err"; return next!
			if sendEmail  # 4 - send validation e-mail
                link = config.get('mail:validation_link')
				validationLink = "#{link}?sig=#{user.validationSig}&id=#{user.shortId}"
				mail_send.sendUserValidation user.email, validationLink, (err)!->
					if err => WERR "Can not save user to DB: #err"; return next!
					createUserContinue user, res
			else createUserContinue user, res

\users/:shortId `GET` -> ### 1.2. Get user data
    # HEADER  Content-Type:application/json;
    # IN
    # OUT    

\users/:shortId/balance `POST` (Q,R,next)-> ### 1.3. Increase User's Balance
    # HEADER  Content-Type:application/json;
    # IN
    # OUT    

\users/:shortId/validation?sig= `POST` (Q,R,next)-> ### 1.4. Validate user
    # HEADER  Content-Type:application/json;
    # IN
    # OUT    

 \users/:email/reset_password_request `POST` (Q,R,next)-> ### 1.5. Reset password
 	winston.info 'Reset password request'
	if undefQ Q.params.email => WERR 'No email'; return res.send \OK
	email = Q.params.email 
    # 1 - get user
	if !helpers.validateEmail email => WERR 'Bad email'; return res.send \OK
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

 
 
 
    # HEADER  Content-Type:application/json;
    # IN
    # OUT    

 \users/:shortId/password?sig=&new_val= `PUT` (Q,R,next)-> ### 1.6. Set new password
    # HEADER  Content-Type:application/json;
    # IN
    # OUT    

 \login `POST` (Q,R,next)-> ### 1.7. Login
    # HEADER  Content-Type:application/json;
    # IN
    # OUT    


### 2. LANDING REQUESTS

\auth/users/:shortId/lrs `GET` (Q,R,next)->  ### 2.1. Get a list of Lending Requests for user
    # HEADER  Authorization:Bearer TOKEN-HERE
    # OUT     [ 1234342344, 7879878789, 2423423423 ]

\auth/users/:shortId/lrs `POST` (Q,R,next)-> ### 2.2. Create new Lending Request
    # HEADER   Content-Type:application/json; 
    # HEADER   Authorization:Bearer TOKEN-HERE
    # IN       eth_count:                120,
    # IN       token_amount:             10000,
    # IN       token_name:               'Augur tokens',
    # IN       token_smartcontract:      'https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code',
    # IN       token_infolink:           'www.augur.com',
    # IN       borrower_account_address: '0xbd997cd2513c5f031b889d968de071eeafe07130',
    # IN       borrower_id:              1234566,   // creator shortId
    # IN       days_to_lend:             30
    # OUT      id: 123123123

\auth/users/:shortId/lrs/:id `GET` (Q,R,next)-> ### 2.3. Get a Lending Request
    # HEADER  Authorization:Bearer TOKEN-HERE
    # OUT     current_state:            1, // 1..10
    # OUT     eth_count:                120,
    # OUT     token_amount:             10000,
    # OUT     token_name:               'Augur tokens',
    # OUT     token_smartcontract:      'https://etherscan.io/address/0xb533aae346245e2e05b23f420C140bCA2529b8a6#code',
    # OUT     token_infolink:           'www.augur.com',
    # OUT     borrower_account_address: '0xbd997cd2513c5f031b889d968de071eeafe07130',
    # OUT     lender_account_address:   '0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e',
    # OUT     borrower_id:              1234566,   // shortId
    # OUT     lender_id:                98232323,    // shortId
    # OUT     date_created:             'TODO',
    # OUT     date_modified:            'TODO',
    # OUT     days_to_lend:             30,
    # OUT     days_left:                0,

\auth/users/:shortId/lrs/:id/lend `POST` (Q,R,next)-> ### 2.4. Lend
    # HEADER  Content-Type:application/json; Authorization:Bearer TOKEN-HERE
    # IN      ---
    # OUT     "address_to_send": "0xbd997cd2513c5f031b889d968de071eeafe07130",
    # OUT     "eth_count": 120,
    # OUT     "minutes_left": 1440    // 1 day left until this LR moves back to 'waiting for lender' state

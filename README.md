# EthLend
EthLend project description is here - https://docs.google.com/document/d/1OnTfjg1uZfajbtkJrXm1eolvNj4qKJda0Y8K-6V1BFE/edit?usp=sharing

## API Description
[http://docs.ethlend.apiary.io](http://docs.ethlend.apiary.io)

## Run:
* To run tests:
     ./run-tests.sh

* To run single test:
     **npm test**
     or
     **mocha \-\-reporter spec -g my_test**

* To run as a console application:
     **node main.js**

* To run as a daemon:
     **sudo /etc/init.d/'ethlend' start**

* To check out DB:
     mongo
     use 'ethlend'
     db.users.find()


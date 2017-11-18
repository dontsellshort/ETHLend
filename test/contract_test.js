var solc = require('solc');
var Web3 = require('web3');

var config = require('../config');
//var contract_helpers = require('../helpers/contracts.js');

var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

// You must set this ENV VAR before testing
//assert.notEqual(typeof(process.env.ETH_NODE),'undefined');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

var accounts;

var creator;
var borrower;
var feeCollector;
var lender;
var domainHash = '0x1111111111111111111111111111111111111111111111111111111111111113';
var initialBalanceCreator = 0;
var initialBalanceBorrower = 0;
var initialBalanceFeeCollector = 0;
var initialBalanceLender = 0;

var ledgerContractAddress;
var ledgerContract;

var contractAddress;
var contract;

var tokenAddress;
var token;

var repAddress;
var rep;

var ensContractAddress;
var ensContract;

var registrarContractAddress;
var registrarContract;

var txHash;

var ledgerAbi;
var requestAbi;

// init BigNumber
var unit = new BigNumber(Math.pow(10,18));

var WANTED_WEI = web3.toWei(0.1,'ether');
var PREMIUM_WEI = web3.toWei(0.1,'ether');

function diffWithGas(mustBe,diff){
     var gasFee = 5000000;
     return (diff>=mustBe) && (diff<=mustBe + gasFee);
}

function getContractAbi(contractName,cb){
     var file = './contracts/EthLend.sol';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          var output = solc.compile(source, 1);   // 1 activates the optimiser
          var abi = JSON.parse(output.contracts[contractName].interface);
          return cb(null,abi);
     });
}

function deployLedgerContract(data,cb){
     var file = './contracts/EthLend.sol';
     var contractName = ':Ledger';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);
          console.log('Checkpoint...5')

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 1); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          console.log('Creator: ' + creator);

          var whereToSendMoneyTo = feeCollector;

          console.log('whereToSendMoneyTo:', whereToSendMoneyTo); 
          console.log('repAddress:', repAddress);
          console.log('ensContractAddress:', ensContractAddress);
          console.log('registrarContractAddress:', registrarContractAddress);
          console.log('Checkpoint...6')

          tempContract.new(
               whereToSendMoneyTo, 
               repAddress,
               ensContractAddress,
               registrarContractAddress,
               300, 
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 5995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         ledgerContractAddress = result.contractAddress;
                         ledgerContract = web3.eth.contract(abi).at(ledgerContractAddress);

                         console.log('Ledger contract address: ');
                         console.log(ledgerContractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

function deployContract(data,cb){
     var file = './contracts/EthLend.sol';
     var contractName = ':LendingRequest';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          var whereToSendFee = creator;
          var collateralType = 1;
          var ensRegistryAddress = 0;

          tempContract.new(
               creator,
               borrower,
               whereToSendFee,
               collateralType,
               ensRegistryAddress,
               registrarContractAddress,
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 5995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         contractAddress = result.contractAddress;
                         contract = web3.eth.contract(abi).at(contractAddress);

                         console.log('Contract address: ');
                         console.log(contractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

function deployTokenContract(data,cb){
     var file = './contracts/SampleToken.sol';
     var contractName = ':SampleToken';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          tempContract.new(
               creator,
               borrower,
               {
                    from: creator, 
                    gas: 5995000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         tokenAddress = result.contractAddress;
                         token = web3.eth.contract(abi).at(tokenAddress);

                         console.log('Token address: ');
                         console.log(tokenAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

function deployEnsContract(data,cb){
     var file = './contracts/TestENS.sol';
     var contractName = ':TestENS';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;

          var tempContract = web3.eth.contract(abi);
          var alreadyCalled = false;

          console.log('Creator: ' + creator);

          var whereToSendMoneyTo = feeCollector;
          var ensRegistryAddress = 0;

          tempContract.new(
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 5995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    if(alreadyCalled){
                         return;
                    }

                    alreadyCalled = true;

                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    var alreadyCalled2 = false;

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         ensContractAddress = result.contractAddress;
                         ensContract = web3.eth.contract(abi).at(ensContractAddress);

                         console.log('ENS contract address: ');
                         console.log(ensContractAddress);

                         if(!alreadyCalled2){
                              alreadyCalled2 = true;

                              return cb(null);
                         }
                    });
               });
     });
}


function deployRegistrarContract(data,cb){
     var file = './contracts/TestRegistrar.sol';
     var contractName = ':Registrar';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;

          var tempContract = web3.eth.contract(abi);
          var alreadyCalled = false;

          console.log('Creator: ' + creator);

          tempContract.new(
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 5995000,
                    //gasPrice: 120000000000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    if(alreadyCalled){
                         return;
                    }

                    alreadyCalled = true;

                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    var alreadyCalled2 = false;

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         registrarContractAddress = result.contractAddress;
                         registrarContract = web3.eth.contract(abi).at(registrarContractAddress);

                         console.log('Registrar contract address: ');
                         console.log(registrarContractAddress);

                         if(!alreadyCalled2){
                              alreadyCalled2 = true;

                              return cb(null);
                         }
                    });
               });
     });
}


function deployRepContract(data,cb){
     var file = './contracts/ReputationToken.sol';
     var contractName = ':ReputationToken';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          assert.equal(err,null);

          var output = solc.compile(source, 0); // 1 activates the optimiser

          //console.log('OUTPUT: ');
          //console.log(output.contracts);

          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          var tempContract = web3.eth.contract(abi);

          var alreadyCalled = false;

          tempContract.new(
               creator,
               borrower,
               {
                    from: creator, 
                    gas: 5995000,
                    data: '0x' + bytecode
               }, 
               function(err, c){
                    assert.equal(err, null);

                    console.log('TX HASH: ');
                    console.log(c.transactionHash);

                    // TX can be processed in 1 minute or in 30 minutes...
                    // So we can not be sure on this -> result can be null.
                    web3.eth.getTransactionReceipt(c.transactionHash, function(err, result){
                         //console.log('RESULT: ');
                         //console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         repAddress = result.contractAddress;
                         rep = web3.eth.contract(abi).at(repAddress);

                         console.log('Token address: ');
                         console.log(repAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}


function updateRepContractCreator(cb){
     rep.changeCreator(
          ledgerContractAddress, 
          {
               from: creator,               
               gas: 2900000 
          },function(err,result){
               assert.equal(err,null);

               web3.eth.getTransactionReceipt(result, function(err, r2){
                    assert.equal(err, null);

                    cb();
               });
          }
     );
}

describe('Contracts 0 - Deploy Ledger', function() {
     before("Initialize everything", function(done) {
          console.log('Checkpoint...1')
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               console.log('Checkpoint...2')

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;
                    console.log('Checkpoint...3')

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;
                         console.log('Checkpoint...4')

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               console.log('Ledger deployed...')
               assert.equal(err,null);

               done();
          });
     });
});


describe('Contracts 1', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy ENS contract',function(done){
          var data = {};
          deployEnsContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Registrar contract',function(done){
          var data = {};
          deployRegistrarContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });


     it('should deploy Rep token contract',function(done){
          var data = {};
          deployRepContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should update creator',function(done){
          var data = {};
          updateRepContractCreator(function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Sample token contract',function(done){
          var data = {};
          deployTokenContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should get initial creator balance',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);

          console.log('Creator initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial borrower balance',function(done){
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          console.log('Borrower initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial feeCollector balance',function(done){
          initialBalanceFeeCollector = web3.eth.getBalance(feeCollector);

          console.log('FeeCollector initial balance is: ');
          console.log(initialBalanceFeeCollector.toString(10));
          done();
     });

     it('should get initial lender balance',function(done){
          initialBalanceLender = web3.eth.getBalance(lender);

          console.log('Lender initial balance is: ');
          console.log(initialBalanceLender.toString(10));
          done();
     });

     it('should get current count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,0);
          done();
     })

     it('should get intial count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,0);
          done();
     })

     it('should issue some tokens for me',function(done){
          token.issueTokens(
               borrower,
               1000,
               {
                    // anyone can issue tokens for anyone here)))
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should return 1000 as a balance',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          done();
     });


     it('should create new LendingRequest and set data',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;

          var data = {
               wanted_wei: WANTED_WEI,
               token_amount: 10,
               premium_wei: PREMIUM_WEI,

               token_name: 'SampleContract',
               token_infolink: 'https://some-sample-ico.network',

               // see that?
               token_smartcontract_address: tokenAddress,
               days_to_lend: 10
          };

          // this is set by creator (from within platform)
          ledgerContract.newLrAndSetData(
               0,
               0,
               data.wanted_wei,
               data.token_amount,
               data.premium_wei,
               data.token_name,
               data.token_infolink,
               data.token_smartcontract_address,
               data.days_to_lend,
               0,
               {
                    from: borrower,               
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });


     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })

     it('should get updated count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,1);
          done();
     })

     it('should get updated feeCollector balance',function(done){
          var current = web3.eth.getBalance(feeCollector);
          var feeAmount = 10000000000000000;

          var diff = current - initialBalanceFeeCollector;
          assert.equal(diff.toString(10),feeAmount);
          done();
     });

     it('should get updated borrower balance',function(done){
          var current = web3.eth.getBalance(borrower);
          var mustBe = 200000000000000000;

          var diff = initialBalanceBorrower - current;
          assert.equal(diffWithGas(mustBe,diff),true);
          done();
     });

     it('should get LR contract',function(done){
          assert.equal(ledgerContract.getLrCount(),1);

          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for Tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should get LR contract for user',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for Token" state
          assert.equal(state.toString(),1);
          done();
     })


     it('should move to Waiting for tokens state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should check if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 1 token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               1,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 9 more token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               9,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var balance = token.balanceOf(borrower);
          assert.equal(balance,990);

          var balance2 = token.balanceOf(a);
          assert.equal(balance2,10);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),3);
          done();
     });

     it('should move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for lender" state
          assert.equal(state.toString(),3);
          done();
     })

     it('should allow to ask for check again',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),3);
          done();
     });

     it('should collect money from Lender now',function(done){
          var current = web3.eth.getBalance(lender);

          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);
          var wanted_wei = lr.getNeededSumByLender();
          
          var amount = wanted_wei;

          // WARNING: see this
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: lender,               
                    to: a,
                    value: wanted_wei,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get correct lender',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          assert.equal(lr.getLender(),lender);
          done();
     })

     it('should get updated lender balance',function(done){
          var current = web3.eth.getBalance(lender);
          var wantedWei = WANTED_WEI;

          var diff = initialBalanceLender - current;
          assert.equal(diffWithGas(wantedWei,diff),true);
          done();
     })

     it('should move to WaitingForPayback state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting For Payback" state
          assert.equal(state.toString(),4);
          done();
     })

     it('should move all ETH to borrower',function(done){
          // ETH should be moved to borrower
          // tokens should be held on contract

          var wantedWei = WANTED_WEI;

          var current = web3.eth.getBalance(borrower);
          var diff = current - initialBalanceBorrower;

          console.log('DIFF: ', diff);
          console.log('CURR: ', wantedWei);

          assert.equal(diffWithGas(wantedWei,diff),true);

          done();
     });

     //////////////////////////////////////////////////////////
     it('should not move to Finished if not all money is sent',function(done){
          var amount = WANTED_WEI; // no premium!
          var a = ledgerContract.getLrForUser(borrower,0);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: borrower,               
                    to: a,
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);

                    done();
               }
          );
     });

     it('should not be in Finished state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // still in "Waiting For Payback" state
          assert.equal(state.toString(),4);
          done();
     })

     it('should send money back from borrower',function(done){
           var a = ledgerContract.getLrForUser(borrower,0);
           var lr = web3.eth.contract(requestAbi).at(a);
           var amount = lr.getNeededSumByBorrower();

           // this should be called by borrower
           web3.eth.sendTransaction(
               {
                     from: borrower,               
                     to: a,
                     value: amount,
                     gas: 3900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                          done();
                    });
               }
          );
     });

     ////////////////////// 
     it('should be in Finished state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Finished" state
          assert.equal(state.toString(),6);
          done();
     })

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,0);

          done();
     });
})


describe('Contracts 2 - cancel', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Rep token contract',function(done){
          var data = {};
          deployRepContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy ENS contract',function(done){
          var data = {};
          deployEnsContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should update creator',function(done){
          var data = {};
          updateRepContractCreator(function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should issue new LR and set data',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;
          
          var data = {
               wanted_wei: WANTED_WEI,
               token_amount: 10,
               premium_wei: PREMIUM_WEI,
          
               token_name: 'SampleContract',
               token_infolink: 'https://some-sample-ico.network',
          
               // see that?
               token_smartcontract_address: tokenAddress,
               days_to_lend: 10
          };
          
          // this is set by creator (from within platform)
          ledgerContract.newLrAndSetData(
               0,
               0,
               data.wanted_wei,
               data.token_amount,
               data.premium_wei,
               data.token_name,
               data.token_infolink,
               data.token_smartcontract_address,
               data.days_to_lend,
               0,
               {
                    from: borrower,               
                    value: amount,
                    gas: 2900000 
                    },function(err,result){
                         assert.equal(err,null);
          
                         web3.eth.getTransactionReceipt(result, function(err, r2){
                              assert.equal(err, null);
                                   done();
                              });
                         }
                    );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })
     
     it('should get correct LR state',function(done){
          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for Tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should cancel LR',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          // should be called by platform
          lr.cancell(
               {
                    // can be sent from ledger, main, borrower
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should get correct LR state',function(done){
          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Cancelled" state
          assert.equal(state.toString(),2);
          done();
     })

     it('should not cancel LR again',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.cancell(
               {
                    // can be sent from ledger, main, borrower
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.notEqual(err,null);
                    done();
               }
          );
     });

     it('should get correct LR state again',function(done){
          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Cancelled" state
          assert.equal(state.toString(),2);
          done();
     })
});

describe('Contracts 3 - cancel with refund', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Rep token contract',function(done){
          var data = {};
          deployRepContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy ENS contract',function(done){
          var data = {};
          deployEnsContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should update creator',function(done){
          var data = {};
          updateRepContractCreator(function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Sample token contract',function(done){
          var data = {};
          deployTokenContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should get initial creator balance',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);

          console.log('Creator initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial borrower balance',function(done){
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          console.log('Borrower initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial feeCollector balance',function(done){
          initialBalanceFeeCollector = web3.eth.getBalance(feeCollector);

          console.log('FeeCollector initial balance is: ');
          console.log(initialBalanceFeeCollector.toString(10));
          done();
     });

     it('should get initial lender balance',function(done){
          initialBalanceLender = web3.eth.getBalance(lender);

          console.log('Lender initial balance is: ');
          console.log(initialBalanceLender.toString(10));
          done();
     });

     it('should get current count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,0);
          done();
     })

     it('should get intial count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,0);
          done();
     })

     it('should issue some tokens for me',function(done){
          token.issueTokens(
               borrower,
               1000,
               {
                    // anyone can issue tokens for anyone here)))
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should return 1000 as a balance',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          done();
     });

     it('should issue new LR and set data',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;
          
          var data = {
               wanted_wei: WANTED_WEI,
               token_amount: 10,
               premium_wei: PREMIUM_WEI,
          
               token_name: 'SampleContract',
               token_infolink: 'https://some-sample-ico.network',
          
               // see that?
               token_smartcontract_address: tokenAddress,
               days_to_lend: 10
          };
          
          // this is set by creator (from within platform)
          ledgerContract.newLrAndSetData(
               0,
               0,
               data.wanted_wei,
               data.token_amount,
               data.premium_wei,
               data.token_name,
               data.token_infolink,
               data.token_smartcontract_address,
               data.days_to_lend,
               0,
               {
                    from: borrower,               
                    value: amount,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);
          
                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);
          
                              done();
                    });
               }
          );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })

     it('should get updated count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,1);
          done();
     })

     it('should get updated feeCollector balance',function(done){
          var current = web3.eth.getBalance(feeCollector);
          var feeAmount = 10000000000000000;

          var diff = current - initialBalanceFeeCollector;
          assert.equal(diff.toString(10),feeAmount);
          done();
     });

     it('should get updated borrower balance',function(done){
          var current = web3.eth.getBalance(borrower);
          var mustBe = 200000000000000000;

          var diff = initialBalanceBorrower - current;
          assert.equal(diffWithGas(mustBe,diff),true);
          done();
     });

     it('should get LR contract',function(done){
          assert.equal(ledgerContract.getLrCount(),1);

          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for Tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should get LR contract for user',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for Tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move to Waiting for tokens state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     });

     it('should check if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 10 more token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               10,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,990);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,10);

          done();
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),3);
          done();
     });

     it('should move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for lender" state
          assert.equal(state.toString(),3);
          done();
     })


     it('should return tokens to founder',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          lr.cancell(
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     })

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,0);

          done();
     });
});


describe('Contracts 4 - default', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Rep token contract',function(done){
          var data = {};
          deployRepContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy ENS contract',function(done){
          var data = {};
          deployEnsContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should update creator',function(done){
          var data = {};
          updateRepContractCreator(function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Sample token contract',function(done){
          var data = {};
          deployTokenContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should get initial creator balance',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);

          console.log('Creator initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial borrower balance',function(done){
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          console.log('Borrower initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial feeCollector balance',function(done){
          initialBalanceFeeCollector = web3.eth.getBalance(feeCollector);

          console.log('FeeCollector initial balance is: ');
          console.log(initialBalanceFeeCollector.toString(10));
          done();
     });

     it('should get initial lender balance',function(done){
          initialBalanceLender = web3.eth.getBalance(lender);

          console.log('Lender initial balance is: ');
          console.log(initialBalanceLender.toString(10));
          done();
     });

     it('should get current count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,0);
          done();
     })

     it('should get intial count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,0);
          done();
     })

     it('should issue some tokens for me',function(done){
          token.issueTokens(
               borrower,
               1000,
               {
                    // anyone can issue tokens for anyone here)))
                    from: creator,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should return 1000 as a balance',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,1000);
          done();
     });

     it('should issue new LR and set data',function(done){
      // 0.2 ETH
      var amount = 200000000000000000;
      
     var data = {
          wanted_wei: WANTED_WEI,
          token_amount: 10,
          premium_wei: PREMIUM_WEI,
      
          token_name: 'SampleContract',
          token_infolink: 'https://some-sample-ico.network',
      
                     // see that?
          token_smartcontract_address: tokenAddress,
          days_to_lend: 10
     };
          
     // this is set by creator (from within platform)
     ledgerContract.newLrAndSetData(
          0,
          0,
          data.wanted_wei,
          data.token_amount,
          data.premium_wei,
          data.token_name,
          data.token_infolink,
          data.token_smartcontract_address,
          data.days_to_lend,
          0,
          {
               from: borrower,               
               value: amount,
               gas: 2900000 
          },function(err,result){
               assert.equal(err,null);
      
               web3.eth.getTransactionReceipt(result, function(err, r2){
                    assert.equal(err, null);
      
                    done();
               });
          }
     );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })

     it('should get updated count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,1);
          done();
     })

     it('should get updated feeCollector balance',function(done){
          var current = web3.eth.getBalance(feeCollector);
          var feeAmount = 10000000000000000;

          var diff = current - initialBalanceFeeCollector;
          assert.equal(diff.toString(10),feeAmount);
          done();
     });

     it('should get updated borrower balance',function(done){
          var current = web3.eth.getBalance(borrower);
          var mustBe = 200000000000000000;

          var diff = initialBalanceBorrower - current;
          assert.equal(diffWithGas(mustBe,diff),true);
          done();
     });

     it('should get LR contract',function(done){
          assert.equal(ledgerContract.getLrCount(),1);

          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for Tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should get LR contract for user',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for Tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     

     it('should move to Waiting for tokens state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should check if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move 10 more token to LR',function(done){
          var lr = ledgerContract.getLrForUser(borrower,0);

          // Borrower -> LR contract
          token.transfer(
               lr,
               10,
               {
                    from: borrower,               
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should release tokens back to borrower',function(done){
          var balance = token.balanceOf(borrower);
          assert.equal(balance,990);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var balance2 = token.balanceOf(a);
          assert.equal(balance2,10);

          done();
     });

     it('should check again if tokens are transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),3);
          done();
     });

     it('should move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for lender" state
          assert.equal(state.toString(),3);
          done();
     })

     it('should collect money from Lender now',function(done){
          var current = web3.eth.getBalance(lender);

          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);
          var wanted_wei = lr.getNeededSumByLender();
          
          var amount = wanted_wei;

          // WARNING: see this
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: lender,               
                    to: a,
                    value: wanted_wei,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move to WaitingForPayback state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting For Payback" state
          assert.equal(state.toString(),4);
          done();
     })

     // TODO: now spend some time..
     // TODO: not working...
     // it('should request default',function(done){
     //      var a = ledgerContract.getLrForUser(borrower,0);
     //      var lr = web3.eth.contract(requestAbi).at(a);

     //      lr.requestDefault(
     //           {
     //                from: lender,               
     //                gas: 2900000 
     //           },function(err,result){
     //                assert.equal(err,null);

     //                web3.eth.getTransactionReceipt(result, function(err, r2){
     //                     assert.equal(err, null);

     //                     done();
     //                });
     //           }
     //      );
     // })

     // it('should be moved',function(done){
     //      assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
     //      var a = ledgerContract.getLrForUser(borrower,0);
     //      var lr = web3.eth.contract(requestAbi).at(a);

     //      var state = lr.getState();
     //      // "Default" state
     //      assert.equal(state.toString(),5);
     //      done();
     // })
});

//----------------------------------------

describe('Contracts 5 - domain', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];
               borrower = accounts[1];
               feeCollector = accounts[2];
               lender = accounts[3];

               var contractName = ':Ledger';
               getContractAbi(contractName,function(err,abi){
                    ledgerAbi = abi;

                    contractName = ':LendingRequest';
                    getContractAbi(contractName,function(err,abi){
                         requestAbi = abi;

                         done();
                    });
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Rep token contract',function(done){
          var data = {};
          deployRepContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy ENS contract',function(done){
          var data = {};
          deployEnsContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should update creator',function(done){
          var data = {};
          updateRepContractCreator(function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy Sample token contract',function(done){
          var data = {};
          deployTokenContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should get initial creator balance',function(done){
          initialBalanceCreator = web3.eth.getBalance(creator);

          console.log('Creator initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial borrower balance',function(done){
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          console.log('Borrower initial balance is: ');
          console.log(initialBalanceCreator.toString(10));

          done();
     });

     it('should get initial feeCollector balance',function(done){
          initialBalanceFeeCollector = web3.eth.getBalance(feeCollector);

          console.log('FeeCollector initial balance is: ');
          console.log(initialBalanceFeeCollector.toString(10));
          done();
     });

     it('should get initial lender balance',function(done){
          initialBalanceLender = web3.eth.getBalance(lender);

          console.log('Lender initial balance is: ');
          console.log(initialBalanceLender.toString(10));
          done();
     });

     it('should get current count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,0);
          done();
     })

     it('should get intial count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,0);
          done();
     })

     it('should set domain-hash to borrower',function(done){
          ensContract.setOwner(domainHash, borrower, {from: creator, gas: 2900000 }, (err,res)=>{
               assert.equal(err, null);
               web3.eth.getTransactionReceipt(res, (err, res2)=>{
                    assert.equal(err, null);
                    done();
               });             
          });
     });

     it('should return borrower as owner of domain',function(done){
          ensContract.owner(domainHash, (err,res)=>{
               assert.equal(borrower,res);
               done();
          });
     });

     it('should issue new ENS LR',function(done){
      var amount = 200000000000000000;
      
      var data = {
            wanted_wei: WANTED_WEI,
            token_amount: 0,
            premium_wei: PREMIUM_WEI,

            token_name: '',
            token_infolink: 'https://some-sample-ico.network',

            // see that?
            token_smartcontract_address: 0,
            days_to_lend: 10,
            ens_domain_hash: domainHash
       };
      
          //var a = ledgerContract.getLrForUser(borrower,0);
          //var lr = web3.eth.contract(requestAbi).at(a);

          // this is set by creator (from within platform)
      ledgerContract.newLrAndSetData(
         1,
         0,
         data.wanted_wei,
         data.token_amount,
         data.premium_wei,
         data.token_name,
         data.token_infolink,
         data.token_smartcontract_address,
         data.days_to_lend,
         data.ens_domain_hash,
         {
              from: borrower,               
              value: amount,
              gas: 2900000 
         },function(err,result){
              assert.equal(err,null);

              web3.eth.getTransactionReceipt(result, function(err, r2){
                   assert.equal(err, null);

                   done();
              });
         }
      );
     });

     it('should get updated count of LR',function(done){
          var count = ledgerContract.getLrCount();
          assert.equal(count,1);
          done();
     })

     it('should get updated count of LR for borrower',function(done){
          var count = ledgerContract.getLrCountForUser(borrower);
          assert.equal(count,1);
          done();
     })

     it('should get updated feeCollector balance',function(done){
          var current = web3.eth.getBalance(feeCollector);
          var feeAmount = 10000000000000000;

          var diff = current - initialBalanceFeeCollector;
          assert.equal(diff.toString(10),feeAmount);
          done();
     });

     it('should get updated borrower balance',function(done){
          var current = web3.eth.getBalance(borrower);
          var mustBe = 200000000000000000;

          var diff = initialBalanceBorrower - current;
          assert.equal(diffWithGas(mustBe,diff),true);
          done();
     });

     it('should get LR contract',function(done){
          assert.equal(ledgerContract.getLrCount(),1);

          var a = ledgerContract.getLr(0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for domain" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should get LR contract for user',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for domain" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move to Waiting for domain state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for domain" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should check if domain is transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     });

     it('should not move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),1);
          done();
     })

     it('should move domain to LR',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          // Borrower -> LR contract
          ensContract.setOwner(domainHash, a, {from: creator, gas: 2900000 }, (err,res)=>{
               assert.equal(err, null);
               web3.eth.getTransactionReceipt(res, (err, res2)=>{
                    assert.equal(err, null);
                    done();
               });             
          });

     });

     it('should check if domain is transferred',function(done){
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),3);
          done();
     });


     it('should move into <WaitingForLender> state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting for tokens" state
          assert.equal(state.toString(),3);
          done();
     })

     // it('should check again if domain is transferred',function(done){
     //      var a = ledgerContract.getLrForUser(borrower,0);
     //      var lr = web3.eth.contract(requestAbi).at(a);

     //      lr.checkDomain(
     //           {
     //                from: borrower,               
     //                gas: 2900000 
     //           },function(err,result){
     //                assert.equal(err,null);

     //                web3.eth.getTransactionReceipt(result, function(err, r2){
     //                     assert.equal(err, null);

     //                     done();
     //                });
     //           }
     //      );
     // });


     it('should collect money from Lender now',function(done){
          var current = web3.eth.getBalance(lender);

          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);
          var wanted_wei = lr.getNeededSumByLender();
          
          var amount = wanted_wei;

          // WARNING: see this
          initialBalanceBorrower = web3.eth.getBalance(borrower);

          // this should be called by borrower
          web3.eth.sendTransaction(
               {
                    from: lender,               
                    to: a,
                    value: wanted_wei,
                    gas: 2900000 
               },function(err,result){
                    assert.equal(err,null);

                    web3.eth.getTransactionReceipt(result, function(err, r2){
                         assert.equal(err, null);

                         done();
                    });
               }
          );
     });

     it('should move to WaitingForPayback state',function(done){
          assert.equal(ledgerContract.getLrCountForUser(borrower),1);
          
          var a = ledgerContract.getLrForUser(borrower,0);
          var lr = web3.eth.contract(requestAbi).at(a);

          var state = lr.getCurrentState();
          // "Waiting For Payback" state
          assert.equal(state.toString(),4);
          done();
     })
});

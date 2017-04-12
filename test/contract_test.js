var solc = require('solc');
var Web3 = require('web3');
var sleep = require('sleep');

var config = require('../config');
//var contract_helpers = require('../helpers/contracts.js');

var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

// You must set this ENV VAR before testing
assert.notEqual(typeof(process.env.ETH_NODE),'undefined');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

var accounts;

var creator;
var borrower;
var feeCollector;
var initialBalanceCreator = 0;
var initialBalanceBorrower = 0;
var initialBalanceFeeCollector = 0;

var ledgerContractAddress;
var ledgerContract;

var contractAddress;
var contract;

var txHash;

var ledgerAbi;
var requestAbi;

// init BigNumber
var unit = new BigNumber(Math.pow(10,18));

function diffWithGas(mustBe,diff){
     var gasFee = 1000000;
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

          console.log('Creator: ' + creator);

          var whereToSendMoneyTo = feeCollector;

          tempContract.new(
               whereToSendMoneyTo, 
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 4995000,
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

          tempContract.new(
               creator,
               borrower,
               {
                    from: creator, 
                    // should not exceed 5000000 for Kovan by default
                    gas: 4995000,
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

describe('Contract - Ledger', function() {
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

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
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

     it('should issue new LR',function(done){
          // 0.2 ETH
          var amount = 200000000000000000;

          // this should be called by borrower
          ledgerContract.createNewLendingRequest(
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
          var feeAmount = 100000000000000000;

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

     /*
     it('should return ZERO initial balance',function(done){
          var balance = ledgerContract.getBalance(borrower);
          assert.equal(balance,0);
          done();
     });

     it('send some money',function(done){
          web3.eth.sendTransaction({
               from: borrower, 
               to: ledgerContractAddress, 
               value: 100
          });

          done();
     });
     */

})

/*
describe('Contract1', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];

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

     it('should deploy Ledger contract',function(done){
          var data = {};
          deployLedgerContract(data,function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should deploy LendingRequest contract',function(done){
          deployContract({},function(err){
               assert.equal(err,null);

               done();
          });
     });

     it('should set data',function(done){
          var data = {
               wanted_wei: 1000000000,
               token_amount: 10,

               token_name: 'Cosmos',
               token_infolink: 'https://cosmos.network',
               // https://etherscan.io/address/0xCF965Cfe7C30323E9C9E41D4E398e2167506f764
               token_smartcontract_address: '0xCF965Cfe7C30323E9C9E41D4E398e2167506f764'
          };

          // TODO:
          contract.setData(data)
     });
})
*/

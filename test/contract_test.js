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

var contractAddress;
var contract;

var txHash;

var requestAbi;

// init BigNumber
var unit = new BigNumber(Math.pow(10,18));

function getContractAbi(contractName,cb){
     var file = './contracts/LendingRequest.sol';

     fs.readFile(file, function(err, result){
          assert.equal(err,null);

          var source = result.toString();
          assert.notEqual(source.length,0);

          var output = solc.compile(source, 1);   // 1 activates the optimiser
          var abi = JSON.parse(output.contracts[contractName].interface);
          return cb(null,abi);
     });
}

function deployContract(cb){
     var file = './contracts/LendingRequest.sol';
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

          console.log('C: ' + creator);

          tempContract.new(
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
                         console.log('RESULT: ');
                         console.log(result);

                         assert.equal(err, null);
                         assert.notEqual(result, null);

                         ledgerContractAddress = result.contractAddress;
                         ledgerContract = web3.eth.contract(abi).at(ledgerContractAddress);

                         console.log('Contract address: ');
                         console.log(ledgerContractAddress);

                         if(!alreadyCalled){
                              alreadyCalled = true;

                              return cb(null);
                         }
                    });
               });
     });
}

describe('Contract1', function() {
     before("Initialize everything", function(done) {
          web3.eth.getAccounts(function(err, as) {
               if(err) {
                    done(err);
                    return;
               }

               accounts = as;
               creator = accounts[0];

               var contractName = ':LendingRequest';
               getContractAbi(contractName,function(err,abi){
                    requestAbi = abi;

                    done();
               });
          });
     });

     after("Deinitialize everything", function(done) {
          done();
     });

     it('should deploy Ticket Ledger contract',function(done){
          deployContract(function(err){
               assert.equal(err,null);

               done();
          });
     });
})

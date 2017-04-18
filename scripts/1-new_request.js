var config = require('../config');

var solc = require('solc');
var fs = require('fs');
var assert = require('assert');
var BigNumber = require('bignumber.js');

// You must set this ENV VAR before running 
assert.notEqual(typeof(process.env.ETH_NODE),'undefined');

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));

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

// ************ READ THIS: ***********************
// This script will call Ledger contract's method that will then deploy new LendingRequest contract
// 
// 
// !!! This address should be set in ENV VARS or manually (see line below)
var creator = process.env.ETH_CREATOR_ADDRESS;
// https://kovan.etherscan.io/address/0xb9af8aa42c97f5a1f73c6e1a683c4bf6353b83e7
//var creator = '0xb9af8aa42c97f5a1f73c6e1a683c4bf6353b83e7';

// 1 - get accounts
web3.eth.getAccounts(function(err, as) {
     if(err) {
          return;
     }

     //creator = as[0];
     //creator = process.env.ETH_CREATOR_ADDRESS;

     // 2 - read ABI
     var contractName = ':Ledger';
     getContractAbi(contractName,function(err,abi){
          ledgerAbi = abi;

          contractName = ':LendingRequest';
          getContractAbi(contractName,function(err,abi){
               requestAbi = abi;

               // 0.2 ETH
               var amount = 200000000000000000;

               // this should be called by borrower
               var ledgerContractAddress = process.env.ETH_MAIN_ADDRESS;

               assert.notEqual(typeof(creator),'undefined');
               assert.notEqual(typeof(ledgerContractAddress),'undefined');

               var ledgerContract = web3.eth.contract(ledgerAbi).at(ledgerContractAddress);

               ledgerContract.createNewLendingRequest(
                    {
                         from: creator,               
                         value: amount,
                         gas: 2000000 
                    },function(err,result){
                         assert.equal(err,null);

                         console.log('TX: ' + result);

                         web3.eth.getTransactionReceipt(result, function(err, r2){
                              assert.equal(err, null);

                              console.log('Contract: ');
                              console.log(r2);

                              //console.log('Good!');
                         });
                    }
               );
          });
     });
});


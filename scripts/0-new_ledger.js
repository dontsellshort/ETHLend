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

          var abiJson = output.contracts[contractName].interface;

          var abi = JSON.parse(abiJson);
          var bytecode = output.contracts[contractName].bytecode;

          return cb(null,abi,bytecode,abiJson);
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
     getContractAbi(contractName,function(err,ledgerAbi,ledgerBytecode,abiJson){
          //console.log('ABI: ');
          //console.log(ledgerAbi);

          fs.writeFileSync('ledger_abi.out',abiJson);
          console.log('Wrote Ledger abi to file: ledger_abi.out');

          var contractName2 = ':LendingRequest';
          getContractAbi(contractName2,function(err,lrAbi,bytecode,abiJson){
          
               fs.writeFileSync('lr_abi.out',abiJson);
               console.log('Wrote LendingRequest abi to file: lr_abi.out');

               deployMain(creator,ledgerAbi,ledgerBytecode);
          });
     });
});

function deployMain(creator,ledgerAbi,ledgerBytecode){
     var tempContract = web3.eth.contract(ledgerAbi);

     // TODO: make param
     var whereToSendMoney = creator;

     tempContract.new(
          whereToSendMoney,
          {
               from: creator, 
               //gas: 4500000,
               gas: 4995000,
               data: '0x' + ledgerBytecode 
          }, 
          function(err, c){
               if(err){
                    console.log('ERROR: ' + err);
                    return;
               }

               console.log('TX hash: ');
               console.log(c.transactionHash);
          });

}


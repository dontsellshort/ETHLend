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

// 1 - get accounts
web3.eth.getAccounts(function(err, as) {
     if(err) {
          return;
     }

     // TODO: change this 
     var from = '0xb9af8aa42c97f5a1f73c6e1a683c4bf6353b83e7';

     // TODO: change this 
     var to = '0x0084452fd74EC0C79be9153142c3368F14a8A4a5';

     // TODO: change this 
     // 0.2 ETH
     var amountWei = web3.toWei(2,'ether');
     console.log('WEI: ', amountWei);

     // 2 - read ABI
     var contractName = ':Ledger';
     getContractAbi(contractName,function(err,abi){
          ledgerAbi = abi;

          contractName = ':LendingRequest';
          getContractAbi(contractName,function(err,abi){
               requestAbi = abi;

               web3.eth.sendTransaction(
                    {
                         from: from,               
                         to: to,
                         value: amountWei,
                    },function(err,result){
                         assert.equal(err,null);

                         console.log('TX: ' + result);
                    }
               );

          });
     });
});


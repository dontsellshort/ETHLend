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
     // Kirill
     //var to = '0x30B3BCCAA8F8fDbc5e9591fe8e7385A3B6b8e03a';

     // to Anton's MetaMask account
     var to = '0x312c43cbf189a4750395ab16fef8227266df8a57';

     // Ledger
     //var to = '0xe45Cd62858984e82E86eEe69b0Cd24B9FA30201a';

     // TODO: change this 
     // 2 ETH
     var amountWei = web3.toWei(8,'ether');
     console.log('WEI: ', amountWei);

     web3.eth.sendTransaction(
          {
               from: from,               
               to: to,
               value: amountWei,
               gas: 2900000 
          },function(err,result){
               assert.equal(err,null);

               console.log('TX: ' + result);
          }
     );
});


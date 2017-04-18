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

     // TODO: change this address manuall
     // contract was deployed from 'creator' address
     // but this is a second address 
     var lender = '0x00d0f25fbddb4f1bf1cf19563436799199abd532';

     // TODO: change this address manually
     // This is a deployed LendingRequest contract
     // https://kovan.etherscan.io/address/0xe0b942fe6241fe9f89b5a8b25b16e863a012fb7f
     var contractAddress = '0xE0B942Fe6241fE9F89B5a8b25b16E863A012Fb7F';
     var lr = web3.eth.contract(requestAbi).at(contractAddress);

     // 0.2 ETH
     var wanted_wei = 1000000000;
     var amount = wanted_wei;

     // 2 - read ABI
     var contractName = ':Ledger';
     getContractAbi(contractName,function(err,abi){
          ledgerAbi = abi;

          contractName = ':LendingRequest';
          getContractAbi(contractName,function(err,abi){
               requestAbi = abi;

               web3.eth.sendTransaction(
                    {
                         from: lender,               
                         to: lr,
                         value: wanted_wei,
                    },function(err,result){
                         assert.equal(err,null);

                         console.log('TX: ' + result);
                    }
               );

          });
     });
});


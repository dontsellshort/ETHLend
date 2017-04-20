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
     var borrower = '0xb9af8aa42c97f5a1f73c6e1a683c4bf6353b83e7';

     // TODO: change this address manually
     // This is a deployed LendingRequest contract
     // https://kovan.etherscan.io/address/0xe0b942fe6241fe9f89b5a8b25b16e863a012fb7f
     var contractAddress = '0x1cf89c0e1e1a6bc02e50d8f0edc5fe5713b40fa8';

     // TODO: change the data here
     var data = {
          eth_count:"1",
          token_amount:"100",
          token_name:"Aeternity",
          token_smartcontract:"0x6cC2D616E56e155D8A06E65542fdb9bD2D7f3c2E",
          token_infolink:"www.aeternity.com",
          days_to_lend:"30"
     };


     // 2 - read ABI
     var contractName = ':Ledger';
     getContractAbi(contractName,function(err,abi){
          ledgerAbi = abi;

          contractName = ':LendingRequest';
          getContractAbi(contractName,function(err,abi){
               var requestAbi = abi;
               var lr = web3.eth.contract(requestAbi).at(contractAddress);

               lr.setData(
                    data.eth_count,
                    data.token_amount,
                    data.token_name,
                    data.token_infolink,
                    data.token_smartcontract,
                    data.days_to_lend,
                    {
                         from: borrower,               
                         //value: amount,
                         gas: 2900000 
                    },function(err,result){
                         console.log('E: ' + err);
                         console.log('R: ' + result);

                         //cb(err);
                    }
               );

          });
     });
});


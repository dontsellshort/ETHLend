var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');
var winston = require('winston');
var sleep = require('sleep');

var helpers = require('../helpers/helpers.js');
var db_helpers = require('../helpers/db_helpers.js');

var config = require('../config');

// You must set this ENV VAR before
var enabled = (typeof(process.env.ETH_NODE)!=='undefined');
var web3 = null;
if(enabled){
     web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));
}

var g_creator = 0;
var g_abi;
var g_abiRequest;

var g_bytecode;
var g_ledgerAddress = process.env.ETH_MAIN_ADDRESS;
var g_ledger = 0;

function getContractAbi(contractName,cb){
     var file = './contracts/EthLend.sol';

     fs.readFile(file, function(err, result){
          if(err){
               return cb(err);
          }

          var source = result.toString();
          var output = solc.compile(source, 1); // 1 activates the optimiser
          var abi = JSON.parse(output.contracts[contractName].interface);
          var bytecode = output.contracts[contractName].bytecode;
          return cb(null,abi,bytecode);
     });
}

function getAccounts(cb){
     if(!enabled){
          return cb(null);
     }

     web3.eth.getAccounts(function(err, accounts) {
          if(err) {
               cb(err);
               return;
          }

          g_creator = accounts[0];

          console.log('CREATOR: ' + g_creator);
          cb(null);
     });
}

function compileContracts(cb){
     if(!enabled){
          return cb(null);
     }

     var ledgerContractName = ':Ledger';
     getContractAbi(ledgerContractName,function(err,abi,bytecode){
          if(err){return cb(err);}

          g_abi = abi;
          g_bytecode = bytecode;

          var ticketContractName = ':LendingRequest';
          getContractAbi(ticketContractName,function(err,abi,bytecode){
               if(err){return cb(err);}

               g_abiRequest = abi;

               if(!g_ledgerAddress || !g_ledgerAddress.length){
                    winston.info('Deploying new main contract...');

                    deployMain(function(err,address){
                         if(err){return cb(err);}
                         
                         g_ledgerAddress = address;
                         g_ledger = web3.eth.contract(g_abi).at(g_ledgerAddress);

                         winston.info('New main contract deployed...');
                         return cb(null);
                    });
               }else{
                    g_ledger = web3.eth.contract(g_abi).at(g_ledgerAddress);
                    return cb(null);
               }
          });
     });
}

// Exports:
exports.getAccount = getAccounts;
exports.compileContracts = compileContracts;

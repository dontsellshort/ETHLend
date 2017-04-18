var solc = require('solc');
var Web3 = require('web3');
var fs = require('fs');
var winston = require('winston');
//var sleep = require('sleep');

var helpers = require('../helpers/helpers.js');
var db_helpers = require('../helpers/db_helpers.js');

var config = require('../config');

// You must set this ENV VAR before
var enabled = 
     (typeof(process.env.ETH_NODE)!=='undefined') && 
     (typeof(process.env.SMART_CONTRACTS_ENABLED)!=='undefined') &&
     (process.env.SMART_CONTRACTS_ENABLED);

var startNode = (typeof(process.env.ETH_NODE)!=='undefined');

var web3 = null;
if(startNode){
     web3 = new Web3(new Web3.providers.HttpProvider(process.env.ETH_NODE));
}

var g_creator = 0;
var g_abi;
var g_abiRequest;

var g_bytecode;
var g_bytecodeRequest;

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
               g_bytecodeRequest = bytecode;

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

function deployMain(cb){
     if(!enabled){
          return cb(null);
     }

     var alreadyCalled = false;

     var tempContract = web3.eth.contract(g_abi);

     // TODO: make param
     var whereToSendMoney = g_creator;

     tempContract.new(
          whereToSendMoney,
          {
               from: g_creator, 
               gas: 4995000,
               data: g_bytecode
          }, 
          function(err, c){
               if(err){return cb(err);}

               // must wait here until TX is mined!
               // TODO: can fail if still not
               waitForTransaction(c.transactionHash,function(err,result){
                    if(err){return cb(err);}

                    if(!alreadyCalled){
                         alreadyCalled = true;

                         return cb(null,result.contractAddress);
                    }
               });
          });
}

function getAllLrs(cb){
     if(!enabled){
          return cb(null,[]);
     }

     winston.info('Asking Ledger contract for a list of all LRs');

     var out = [];

     var count = g_ledger.getLrCount();
     for(var i=0; i<count; ++i){
          var addr = g_ledger.getLr(i);
          out.push(addr);
     }

     return cb(null,out);
}

function getLrById(id,cb){
     if(!enabled){
          return cb(null,null);
     }

     winston.info('Asking Ledger contract for a LR: ' + id);
     var addr = id;
     var lr = web3.eth.contract(g_abiRequest).at(addr);
     return cb(null,lr);
}

// This should not be called from production code.
// Because 'createNewLendingRequest' must be called directly by borrower from his 
// Ethereum Wallet
function createNewLr(borrowerAddress,cb){
     if(!enabled){
          return cb(null);
     }

     winston.info('Creating new LR smart contract from Creator');

     // this is a fee 
     // 0.2 ETH
     var amount = 200000000000000000;
     g_ledger.createNewLendingRequest(
          {
               from: g_creator,               
               value: amount,
               gas: 2900000 
          },function(err,txHash){
               winston.info('TX hash: ' + txHash);

               return cb(null,txHash);
          }
     );
}

function updateLr(id,data,cb){
     if(!enabled){
          return cb(null);
     }

     winston.info('Updating contract: ' + id);

     var addr = id;
     var lr = web3.eth.contract(g_abiRequest).at(addr);
     
     console.log('Address: ' + addr);
     console.log('Data: ');
     console.log(data.token_smartcontract);

     lr.setData(
          web3.toWei(data.eth_count,'ether'),
          data.token_amount,
          data.token_name,
          data.token_infolink,
          data.token_smartcontract,
          data.days_to_lend,
          {
               from: g_creator,               
               //value: amount,
               gas: 2900000 
          },function(err,result){
               cb(err);
          }
     );
}

function convertLrToOut(lr,id){
     // TODO: convert/calculate other fields

     var out = {
          eth_count:                '' + web3.fromWei(lr.wanted_wei(),'ether'),
          token_amount:             '' + lr.token_amount(),
          token_name:               lr.token_name(),
          token_smartcontract:      lr.token_smartcontract,
          token_infolink:           lr.token_infolink,

          borrower_account_address: lr.borrower(),
          lender_account_address:   lr.lender(),

          days_to_lend:             '' + lr.days_to_lend(),
          current_state:            '' + lr.currentState(),

          //date_created:             lr.date_created,
          //waiting_for_loan_from:    lr.waiting_for_loan_from,
          //date_modified:            lr.date_modified,

          // TODO: fix it!!!!
          days_left:                '' + lr.days_to_lend(),

          //address_to_send:          lr.address_to_send,
          smart_contract_address:   '' + id,
          //minutes_left:             minutes_left,
          address_to_send:          '' + id,
          id:                       '' + id 
     };
                    
     return out;
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
function waitForTransaction(txHash,cb){
     return waitForTransactionInt(0,txHash,cb); 
}

function waitForTransactionInt(indexTry,txHash,cb){
     if(indexTry>20){
          return cb(new Error('Can not get tx receipt: ' + txHash));
     }

     // poll
     web3.eth.getTransactionReceipt(txHash, function(err, result){
          if(err){
               return cb(err);
          }

          if(result){
               // stop recursion
               return cb(null,result);
          }

          //sleep.sleep(3);

          // recurse
          winston.info('Trying again for tx: ' + txHash);
          waitForTransactionInt(indexTry + 1,txHash,cb);
     });
}

function getFeeAmount(){
     return (process.env.BALANCE_FEE_AMOUNT_IN_WEI || config.get('eth_params:balanceFeeAmountInWei'));
}

function getMainAddress(){
     return (g_ledgerAddress || config.get('eth_params:balanceFeeAddress'));
}

function getMainAddressLink(){
     return process.env.ETH_EXPLORER_ADDRESS_LINK + g_ledgerAddress;
}

function getMainAccount(){
     return g_creator;
}

function getMainAccountLink(){
     return process.env.ETH_EXPLORER_ADDRESS_LINK + g_creator;
}

function getBalance(address){
     if(!address){
          return 0;
     }
     return web3.eth.getBalance(address);
}

function isSmartContractsEnabled(){
     return enabled;
}

// Exports:
exports.getAccount = getAccounts;
exports.compileContracts = compileContracts;

exports.getFeeAmount = getFeeAmount;
exports.getMainAddress = getMainAddress;
exports.getMainAddressLink = getMainAddressLink;

exports.getMainAccount = getMainAccount;
exports.getMainAccountLink = getMainAccountLink;
exports.getBalance = getBalance;

exports.isSmartContractsEnabled = isSmartContractsEnabled;

exports.getAllLrs = getAllLrs;
exports.getLrById = getLrById;
exports.createNewLr = createNewLr;
exports.updateLr = updateLr;
exports.convertLrToOut = convertLrToOut;

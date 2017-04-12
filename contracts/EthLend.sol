//pragma solidity ^0.4.4;

contract Ledger {
     // who deployed Ledger
     address public mainAddress;
     address public whereToSendFee;

     mapping (address => mapping(uint => address)) lrsPerUser;
     mapping (address => uint) lrsCountPerUser;

     uint public totalLrCount = 0;
     mapping (uint => address) lrs;

     modifier byAnyone(){
          _;
     }

     function Ledger(address whereToSendFee_){
          mainAddress = msg.sender;
          whereToSendFee = whereToSendFee_;
     }

     /// Must be called by Borrower
     function createNewLendingRequest()payable byAnyone returns(address out){
          // 1 - send Fee to wherToSendFee 
          // 0.1 ETH
          uint feeAmount = 100000000000000000;
          if(!whereToSendFee.call.gas(200000).value(feeAmount)()){
               throw;
          }

          // 2 - create new LR
          // will be in state 'WaitingForData'
          out = new LendingRequest(mainAddress,msg.sender);

          // 3 - add to list
          uint currentCount = lrsCountPerUser[msg.sender];
          lrsPerUser[msg.sender][currentCount] = out;
          lrsCountPerUser[msg.sender]++;

          lrs[totalLrCount] = out;
          totalLrCount++;
     }

     function getLrCount()constant returns(uint out){
          out = totalLrCount;
          return;
     }

     function getLr(uint index) constant returns (address out){
          out = lrs[index];  
          return;
     }

     function getLrCountForUser(address a)constant returns(uint out){
          out = lrsCountPerUser[a];
          return;
     }

     function getLrForUser(address a,uint index) constant returns (address out){
          out = lrsPerUser[a][index];  
          return;
     }

     function(){
          throw;
     }
}

contract LendingRequest {
     string public name = "LendingRequest";
     
     address public ledger = 0x0;
     // who deployed Ledger
     address public mainAddress = 0x0;
     
     enum State {
          WaitingForData,
          WaitingForTokens,
          Cancelled,
          WaitingForLender,
          // lender must be set
          WaitingForLoan,
          Funded,
          WaitingForPayback,
          Default,
          PaybackReceived,
          Finished
     }

// Contract fields:
     State public currentState = State.WaitingForData;
     
     // This must be set by borrower:
     address public borrower = 0x0;
     uint public wanted_wei = 0;
     uint public token_amount = 0;
     string public token_name = "";
     string public token_infolink = "";
     address public token_smartcontract_address = 0x0;

     // This must be set by
     address public lender = 0x0;

     modifier byAnyone(){
          _;
     }

     modifier onlyByLedger(){
          if(msg.sender!=ledger)
               throw;
          _;
     }

     modifier onlyByMain(){
          if(msg.sender!=mainAddress)
               throw;
          _;
     }

     modifier byLedgerOrMain(){
          if((msg.sender!=mainAddress) && (msg.sender!=ledger))
               throw;
          _;
     }

     modifier onlyInState(State state){
          if(currentState!=state)
               throw;
          _;
     }

     function LendingRequest(address mainAddress_,address borrower_){
          ledger = msg.sender;

          mainAddress = mainAddress_;

          borrower = borrower_;
     }

     function changeLedgerAddress(address new_)onlyByLedger{
          ledger = new_;
     }

     function changeMainAddress(address new_)onlyByMain{
          mainAddress = new_;
     }

     function getState()constant returns(State out){
          out = currentState;
          return;
     }

     function getLender()constant returns(address out){
          out = lender;
     }

// 
     function setData(uint wanted_wei_, uint token_amount_, 
          string token_name_, string token_infolink_, address token_smartcontract_address_) 
               byLedgerOrMain onlyInState(State.WaitingForData)
     {
          wanted_wei = wanted_wei_;
          token_amount = token_amount_;
          token_name = token_name_;
          token_infolink = token_infolink_;
          token_smartcontract_address = token_smartcontract_address_;

          currentState = State.WaitingForTokens;
     }

     // Should check if tokens are 'trasferred' to this contracts address and controlled
     function checkTokens()byLedgerOrMain onlyInState(State.WaitingForTokens){
          // TODO:
          // !!! DOES NO CHECKS!!!
          
          // we are ready to search someone that has money
          // to give us
          currentState = State.WaitingForLender;
     }


     // This function is called when someone sends money to this contract directly.
     //
     // If someone is sending more than wanted_wei amount of money in WaitingForLender state
     // Then it means it's a Lender. Please remember him
     function() payable onlyInState(State.WaitingForLender) {
          if(msg.value<wanted_wei){
               throw;
          }

          lender = msg.sender;     

          currentState = State.Funded;
     }
}

//pragma solidity ^0.4.4;

contract Ledger {
     // who deployed Ledger
     address public mainAddress;
     address public whereToSendFee;

     modifier byAnyone(){
          _;
     }

     function Ledger(address whereToSendFee_){
          mainAddress = msg.sender;
          whereToSendFee = whereToSendFee_;
     }

     /// Must be called by Borrower
     function createNewLendingRequest()payable byAnyone returns(address out){
          // TODO:
          // 1 - send Fee to wherToSendFee 
          //out = whereToSendFee.call.gas(200000).value(this.balance)();

          // 2 - create new LR
          // will be in state 'WaitingForData'
          out = new LendingRequest(mainAddress,msg.sender);

          // TODO: add to list
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

     /// Constructor
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

     function setData(uint wanted_wei_, uint token_amount_, 
          string token_name_, string token_infolink_, address token_smartcontract_address_) 
               byLedgerOrMain onlyInState(State.WaitingForData)
     {
          wanted_wei = wanted_wei_;
          token_amount = token_amount_;
          token_name = token_name_;
          token_infolink = token_infolink_;
          token_smartcontract_address = token_smartcontract_address_;
     }

     /// 
     function selectLender()byLedgerOrMain onlyInState(State.WaitingForLender){
          // TODO:  
     }

     /// This function is called when someone sends money to this contract directly.
     function() {
          throw;
     }
}

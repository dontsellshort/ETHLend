pragma solidity ^0.4.17;

// Standard token interface (ERC 20)
// https://github.com/ethereum/EIPs/issues/20
contract Token 
{
// Functions:

    function totalSupply() public constant returns (uint256) {}

    function balanceOf(address) public constant returns (uint256) {}

    function transfer(address, uint256) public returns (bool) {}

    function transferFrom(address, address, uint256) public returns (bool) {}

    function approve(address, uint256) public returns (bool) {}

    function allowance(address, address) public constant returns (uint256) {}

// Events:
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

contract StdToken is Token // Transfer functions deleted!
{
// Fields:
     mapping(address => uint256) balances;
     mapping (address => mapping (address => uint256)) allowed;

     uint256 public allSupply = 0;

// Functions:
     function transfer(address _to, uint256 _value) public returns (bool success) 
     {
          if((balances[msg.sender] >= _value) && (balances[_to] + _value > balances[_to])) 
          {
               balances[msg.sender] -= _value;
               balances[_to] += _value;

               Transfer(msg.sender, _to, _value);
               return true;
          } 
          else 
          { 
               return false; 
          }
     }

     function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) 
     {
          if((balances[_from] >= _value) && (allowed[_from][msg.sender] >= _value) && (balances[_to] + _value > balances[_to])) 
          {
               balances[_to] += _value;
               balances[_from] -= _value;
               allowed[_from][msg.sender] -= _value;

               Transfer(_from, _to, _value);
               return true;
          } 
          else 
          { 
               return false; 
          }
     }

     function balanceOf(address _owner) public constant returns (uint256) 
     {
          return balances[_owner];
     }

     function approve(address _spender, uint256 _value) public returns (bool success) 
     {
          allowed[msg.sender][_spender] = _value;
          Approval(msg.sender, _spender, _value);

          return true;
     }

     function allowance(address _owner, address _spender) public constant returns (uint256 remaining) 
     {
          return allowed[_owner][_spender];
     }

     function totalSupply() public constant returns (uint256 supplyOut) 
     {
          supplyOut = allSupply;
          return;
     }
}

contract ReputationToken is StdToken {
     string public name = "EthlendReputationToken";
     uint public decimals = 18;
     string public symbol = "CRE";

     address public creator = 0x0;
     mapping(address => uint256) balancesLocked;

     function ReputationToken() public{
          creator = msg.sender;
     }

     function changeCreator(address newCreator) onlyCreator public{

          creator = newCreator;
     }

     function issueTokens(address forAddress, uint tokenCount) public onlyCreator returns (bool success){

          if(tokenCount==0) {
               success = false;
               return ;
          }

          balances[forAddress]+=tokenCount;
          allSupply+=tokenCount;

          success = true;
          return;
     }

     function burnTokens(address forAddress) public onlyCreator returns (bool success){

          allSupply-=balances[forAddress];

          balances[forAddress]=0;
          success = true;
          return;
     }

     function lockTokens(address forAddress, uint tokenCount) public onlyCreator returns (bool success){
          if(balances[forAddress]-balancesLocked[forAddress]<tokenCount){
              revert(); 
          }
          balancesLocked[forAddress]+=tokenCount;
          success = true;
          return;
     }

     function unlockTokens(address forAddress, uint tokenCount) public onlyCreator returns (bool success){
          if(balancesLocked[forAddress]<tokenCount){
              revert();
          }
          balancesLocked[forAddress]-=tokenCount;
          success = true;
          return;
     }

     function nonLockedTokensCount(address forAddress) public constant returns (uint tokenCount){
          if ( balancesLocked[forAddress] > balances[forAddress] ){
               tokenCount = 0;
               return;
          } else {
               tokenCount = balances[forAddress] - balancesLocked[forAddress];
               return;
          }

     }

     function transferFrom(address, address, uint256) public returns (bool success){
          success = false;
          return;
     }

     function transfer(address, uint256) public returns (bool success){
          success = false;
          return;      
     }
     
     modifier onlyCreator(){
         require(msg.sender==creator);
         _;
     }
}
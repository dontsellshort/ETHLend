pragma solidity ^0.4.16;

// TODO: move to separate file and include like this:
//import "github.com/oraclize/ethereum-api/oraclizeAPI.sol";

contract OraclizeI {
    address public cbAddress;
    function query(uint _timestamp, string _datasource, string _arg) payable returns (bytes32 _id);
    function query_withGasLimit(uint _timestamp, string _datasource, string _arg, uint _gaslimit) payable returns (bytes32 _id);
    function query2(uint _timestamp, string _datasource, string _arg1, string _arg2) payable returns (bytes32 _id);
    function query2_withGasLimit(uint _timestamp, string _datasource, string _arg1, string _arg2, uint _gaslimit) payable returns (bytes32 _id);
    function queryN(uint _timestamp, string _datasource, bytes _argN) payable returns (bytes32 _id);
    function queryN_withGasLimit(uint _timestamp, string _datasource, bytes _argN, uint _gaslimit) payable returns (bytes32 _id);
    function getPrice(string _datasource) returns (uint _dsprice);
    function getPrice(string _datasource, uint gaslimit) returns (uint _dsprice);
    function useCoupon(string _coupon);
    function setProofType(byte _proofType);
    function setConfig(bytes32 _config);
    function setCustomGasPrice(uint _gasPrice);
    function randomDS_getSessionPubKeyHash() returns(bytes32);
}
contract OraclizeAddrResolverI {
    function getAddress() returns (address _addr);
}
contract usingOraclize {
    uint constant day = 60*60*24;
    uint constant week = 60*60*24*7;
    uint constant month = 60*60*24*30;
    byte constant proofType_NONE = 0x00;
    byte constant proofType_TLSNotary = 0x10;
    byte constant proofType_Android = 0x20;
    byte constant proofType_Ledger = 0x30;
    byte constant proofType_Native = 0xF0;
    byte constant proofStorage_IPFS = 0x01;
    uint8 constant networkID_auto = 0;
    uint8 constant networkID_mainnet = 1;
    uint8 constant networkID_testnet = 2;
    uint8 constant networkID_morden = 2;
    uint8 constant networkID_consensys = 161;

    OraclizeAddrResolverI OAR;

    OraclizeI oraclize;
    modifier oraclizeAPI {
        if((address(OAR)==0)||(getCodeSize(address(OAR))==0))
            oraclize_setNetwork(networkID_auto);

        if(address(oraclize) != OAR.getAddress())
            oraclize = OraclizeI(OAR.getAddress());

        _;
    }
    modifier coupon(string code){
        oraclize = OraclizeI(OAR.getAddress());
        oraclize.useCoupon(code);
        _;
    }

    function oraclize_setNetwork(uint8 networkID) internal returns(bool){
        if (getCodeSize(0x1d3B2638a7cC9f2CB3D298A3DA7a90B67E5506ed)>0){ //mainnet
            OAR = OraclizeAddrResolverI(0x1d3B2638a7cC9f2CB3D298A3DA7a90B67E5506ed);
            oraclize_setNetworkName("eth_mainnet");
            return true;
        }
        if (getCodeSize(0xc03A2615D5efaf5F49F60B7BB6583eaec212fdf1)>0){ //ropsten testnet
            OAR = OraclizeAddrResolverI(0xc03A2615D5efaf5F49F60B7BB6583eaec212fdf1);
            oraclize_setNetworkName("eth_ropsten3");
            return true;
        }
        if (getCodeSize(0xB7A07BcF2Ba2f2703b24C0691b5278999C59AC7e)>0){ //kovan testnet
            OAR = OraclizeAddrResolverI(0xB7A07BcF2Ba2f2703b24C0691b5278999C59AC7e);
            oraclize_setNetworkName("eth_kovan");
            return true;
        }
        if (getCodeSize(0x146500cfd35B22E4A392Fe0aDc06De1a1368Ed48)>0){ //rinkeby testnet
            OAR = OraclizeAddrResolverI(0x146500cfd35B22E4A392Fe0aDc06De1a1368Ed48);
            oraclize_setNetworkName("eth_rinkeby");
            return true;
        }
        if (getCodeSize(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475)>0){ //ethereum-bridge
            OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);
            return true;
        }
        if (getCodeSize(0x20e12A1F859B3FeaE5Fb2A0A32C18F5a65555bBF)>0){ //ether.camp ide
            OAR = OraclizeAddrResolverI(0x20e12A1F859B3FeaE5Fb2A0A32C18F5a65555bBF);
            return true;
        }
        if (getCodeSize(0x51efaF4c8B3C9AfBD5aB9F4bbC82784Ab6ef8fAA)>0){ //browser-solidity
            OAR = OraclizeAddrResolverI(0x51efaF4c8B3C9AfBD5aB9F4bbC82784Ab6ef8fAA);
            return true;
        }
        return false;
    }

    function __callback(bytes32 myid, string result) {
        __callback(myid, result, new bytes(0));
    }
    function __callback(bytes32 myid, string result, bytes proof) {
    }
    
    function oraclize_useCoupon(string code) oraclizeAPI internal {
        oraclize.useCoupon(code);
    }

    function oraclize_getPrice(string datasource) oraclizeAPI internal returns (uint){
        return oraclize.getPrice(datasource);
    }

    function oraclize_getPrice(string datasource, uint gaslimit) oraclizeAPI internal returns (uint){
        return oraclize.getPrice(datasource, gaslimit);
    }
    
    function oraclize_query(string datasource, string arg) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        return oraclize.query.value(price)(0, datasource, arg);
    }
    function oraclize_query(uint timestamp, string datasource, string arg) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        return oraclize.query.value(price)(timestamp, datasource, arg);
    }
    function oraclize_query(uint timestamp, string datasource, string arg, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        return oraclize.query_withGasLimit.value(price)(timestamp, datasource, arg, gaslimit);
    }
    function oraclize_query(string datasource, string arg, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        return oraclize.query_withGasLimit.value(price)(0, datasource, arg, gaslimit);
    }
    function oraclize_query(string datasource, string arg1, string arg2) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        return oraclize.query2.value(price)(0, datasource, arg1, arg2);
    }
    function oraclize_query(uint timestamp, string datasource, string arg1, string arg2) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        return oraclize.query2.value(price)(timestamp, datasource, arg1, arg2);
    }
    function oraclize_query(uint timestamp, string datasource, string arg1, string arg2, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        return oraclize.query2_withGasLimit.value(price)(timestamp, datasource, arg1, arg2, gaslimit);
    }
    function oraclize_query(string datasource, string arg1, string arg2, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        return oraclize.query2_withGasLimit.value(price)(0, datasource, arg1, arg2, gaslimit);
    }
    function oraclize_query(string datasource, string[] argN) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        bytes memory args = stra2cbor(argN);
        return oraclize.queryN.value(price)(0, datasource, args);
    }
    function oraclize_query(uint timestamp, string datasource, string[] argN) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        bytes memory args = stra2cbor(argN);
        return oraclize.queryN.value(price)(timestamp, datasource, args);
    }
    function oraclize_query(uint timestamp, string datasource, string[] argN, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        bytes memory args = stra2cbor(argN);
        return oraclize.queryN_withGasLimit.value(price)(timestamp, datasource, args, gaslimit);
    }
    function oraclize_query(string datasource, string[] argN, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        bytes memory args = stra2cbor(argN);
        return oraclize.queryN_withGasLimit.value(price)(0, datasource, args, gaslimit);
    }
    function oraclize_query(string datasource, string[1] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](1);
        dynargs[0] = args[0];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[1] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](1);
        dynargs[0] = args[0];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[1] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](1);
        dynargs[0] = args[0];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, string[1] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](1);
        dynargs[0] = args[0];       
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    
    function oraclize_query(string datasource, string[2] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[2] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[2] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, string[2] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, string[3] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[3] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[3] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, string[3] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    
    function oraclize_query(string datasource, string[4] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[4] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[4] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, string[4] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, string[5] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[5] args) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, string[5] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, string[5] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        string[] memory dynargs = new string[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[] argN) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        bytes memory args = ba2cbor(argN);
        return oraclize.queryN.value(price)(0, datasource, args);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[] argN) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource);
        if (price > 1 ether + tx.gasprice*200000) return 0; // unexpectedly high price
        bytes memory args = ba2cbor(argN);
        return oraclize.queryN.value(price)(timestamp, datasource, args);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[] argN, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        bytes memory args = ba2cbor(argN);
        return oraclize.queryN_withGasLimit.value(price)(timestamp, datasource, args, gaslimit);
    }
    function oraclize_query(string datasource, bytes[] argN, uint gaslimit) oraclizeAPI internal returns (bytes32 id){
        uint price = oraclize.getPrice(datasource, gaslimit);
        if (price > 1 ether + tx.gasprice*gaslimit) return 0; // unexpectedly high price
        bytes memory args = ba2cbor(argN);
        return oraclize.queryN_withGasLimit.value(price)(0, datasource, args, gaslimit);
    }
    function oraclize_query(string datasource, bytes[1] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](1);
        dynargs[0] = args[0];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[1] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](1);
        dynargs[0] = args[0];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[1] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](1);
        dynargs[0] = args[0];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[1] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](1);
        dynargs[0] = args[0];       
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    
    function oraclize_query(string datasource, bytes[2] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[2] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[2] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[2] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](2);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[3] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[3] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[3] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[3] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](3);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    
    function oraclize_query(string datasource, bytes[4] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[4] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[4] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[4] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](4);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        return oraclize_query(datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[5] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[5] args) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(timestamp, datasource, dynargs);
    }
    function oraclize_query(uint timestamp, string datasource, bytes[5] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(timestamp, datasource, dynargs, gaslimit);
    }
    function oraclize_query(string datasource, bytes[5] args, uint gaslimit) oraclizeAPI internal returns (bytes32 id) {
        bytes[] memory dynargs = new bytes[](5);
        dynargs[0] = args[0];
        dynargs[1] = args[1];
        dynargs[2] = args[2];
        dynargs[3] = args[3];
        dynargs[4] = args[4];
        return oraclize_query(datasource, dynargs, gaslimit);
    }

    function oraclize_cbAddress() oraclizeAPI internal returns (address){
        return oraclize.cbAddress();
    }
    function oraclize_setProof(byte proofP) oraclizeAPI internal {
        return oraclize.setProofType(proofP);
    }
    function oraclize_setCustomGasPrice(uint gasPrice) oraclizeAPI internal {
        return oraclize.setCustomGasPrice(gasPrice);
    }
    function oraclize_setConfig(bytes32 config) oraclizeAPI internal {
        return oraclize.setConfig(config);
    }
    
    function oraclize_randomDS_getSessionPubKeyHash() oraclizeAPI internal returns (bytes32){
        return oraclize.randomDS_getSessionPubKeyHash();
    }

    function getCodeSize(address _addr) constant internal returns(uint _size) {
        assembly {
            _size := extcodesize(_addr)
        }
    }

    function parseAddr(string _a) internal returns (address){
        bytes memory tmp = bytes(_a);
        uint160 iaddr = 0;
        uint160 b1;
        uint160 b2;
        for (uint i=2; i<2+2*20; i+=2){
            iaddr *= 256;
            b1 = uint160(tmp[i]);
            b2 = uint160(tmp[i+1]);
            if ((b1 >= 97)&&(b1 <= 102)) b1 -= 87;
            else if ((b1 >= 65)&&(b1 <= 70)) b1 -= 55;
            else if ((b1 >= 48)&&(b1 <= 57)) b1 -= 48;
            if ((b2 >= 97)&&(b2 <= 102)) b2 -= 87;
            else if ((b2 >= 65)&&(b2 <= 70)) b2 -= 55;
            else if ((b2 >= 48)&&(b2 <= 57)) b2 -= 48;
            iaddr += (b1*16+b2);
        }
        return address(iaddr);
    }

    function strCompare(string _a, string _b) internal returns (int) {
        bytes memory a = bytes(_a);
        bytes memory b = bytes(_b);
        uint minLength = a.length;
        if (b.length < minLength) minLength = b.length;
        for (uint i = 0; i < minLength; i ++)
            if (a[i] < b[i])
                return -1;
            else if (a[i] > b[i])
                return 1;
        if (a.length < b.length)
            return -1;
        else if (a.length > b.length)
            return 1;
        else
            return 0;
    }

    function indexOf(string _haystack, string _needle) internal returns (int) {
        bytes memory h = bytes(_haystack);
        bytes memory n = bytes(_needle);
        if(h.length < 1 || n.length < 1 || (n.length > h.length))
            return -1;
        else if(h.length > (2**128 -1))
            return -1;
        else
        {
            uint subindex = 0;
            for (uint i = 0; i < h.length; i ++)
            {
                if (h[i] == n[0])
                {
                    subindex = 1;
                    while(subindex < n.length && (i + subindex) < h.length && h[i + subindex] == n[subindex])
                    {
                        subindex++;
                    }
                    if(subindex == n.length)
                        return int(i);
                }
            }
            return -1;
        }
    }

    function strConcat(string _a, string _b, string _c, string _d, string _e) internal returns (string) {
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        bytes memory _bc = bytes(_c);
        bytes memory _bd = bytes(_d);
        bytes memory _be = bytes(_e);
        string memory abcde = new string(_ba.length + _bb.length + _bc.length + _bd.length + _be.length);
        bytes memory babcde = bytes(abcde);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) babcde[k++] = _ba[i];
        for (i = 0; i < _bb.length; i++) babcde[k++] = _bb[i];
        for (i = 0; i < _bc.length; i++) babcde[k++] = _bc[i];
        for (i = 0; i < _bd.length; i++) babcde[k++] = _bd[i];
        for (i = 0; i < _be.length; i++) babcde[k++] = _be[i];
        return string(babcde);
    }

    function strConcat(string _a, string _b, string _c, string _d) internal returns (string) {
        return strConcat(_a, _b, _c, _d, "");
    }

    function strConcat(string _a, string _b, string _c) internal returns (string) {
        return strConcat(_a, _b, _c, "", "");
    }

    function strConcat(string _a, string _b) internal returns (string) {
        return strConcat(_a, _b, "", "", "");
    }

    // parseInt
    function parseInt(string _a) internal returns (uint) {
        return parseInt(_a, 0);
    }

    // parseInt(parseFloat*10^_b)
    function parseInt(string _a, uint _b) internal returns (uint) {
        bytes memory bresult = bytes(_a);
        uint mint = 0;
        bool decimals = false;
        for (uint i=0; i<bresult.length; i++){
            if ((bresult[i] >= 48)&&(bresult[i] <= 57)){
                if (decimals){
                   if (_b == 0) break;
                    else _b--;
                }
                mint *= 10;
                mint += uint(bresult[i]) - 48;
            } else if (bresult[i] == 46) decimals = true;
        }
        if (_b > 0) mint *= 10**_b;
        return mint;
    }

    function uint2str(uint i) internal returns (string){
        if (i == 0) return "0";
        uint j = i;
        uint len;
        while (j != 0){
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        while (i != 0){
            bstr[k--] = byte(48 + i % 10);
            i /= 10;
        }
        return string(bstr);
    }
    
    function stra2cbor(string[] arr) internal returns (bytes) {
            uint arrlen = arr.length;

            // get correct cbor output length
            uint outputlen = 0;
            bytes[] memory elemArray = new bytes[](arrlen);
            for (uint i = 0; i < arrlen; i++) {
                elemArray[i] = (bytes(arr[i]));
                outputlen += elemArray[i].length + (elemArray[i].length - 1)/23 + 3; //+3 accounts for paired identifier types
            }
            uint ctr = 0;
            uint cborlen = arrlen + 0x80;
            outputlen += byte(cborlen).length;
            bytes memory res = new bytes(outputlen);

            while (byte(cborlen).length > ctr) {
                res[ctr] = byte(cborlen)[ctr];
                ctr++;
            }
            for (i = 0; i < arrlen; i++) {
                res[ctr] = 0x5F;
                ctr++;
                for (uint x = 0; x < elemArray[i].length; x++) {
                    // if there's a bug with larger strings, this may be the culprit
                    if (x % 23 == 0) {
                        uint elemcborlen = elemArray[i].length - x >= 24 ? 23 : elemArray[i].length - x;
                        elemcborlen += 0x40;
                        uint lctr = ctr;
                        while (byte(elemcborlen).length > ctr - lctr) {
                            res[ctr] = byte(elemcborlen)[ctr - lctr];
                            ctr++;
                        }
                    }
                    res[ctr] = elemArray[i][x];
                    ctr++;
                }
                res[ctr] = 0xFF;
                ctr++;
            }
            return res;
        }

    function ba2cbor(bytes[] arr) internal returns (bytes) {
            uint arrlen = arr.length;

            // get correct cbor output length
            uint outputlen = 0;
            bytes[] memory elemArray = new bytes[](arrlen);
            for (uint i = 0; i < arrlen; i++) {
                elemArray[i] = (bytes(arr[i]));
                outputlen += elemArray[i].length + (elemArray[i].length - 1)/23 + 3; //+3 accounts for paired identifier types
            }
            uint ctr = 0;
            uint cborlen = arrlen + 0x80;
            outputlen += byte(cborlen).length;
            bytes memory res = new bytes(outputlen);

            while (byte(cborlen).length > ctr) {
                res[ctr] = byte(cborlen)[ctr];
                ctr++;
            }
            for (i = 0; i < arrlen; i++) {
                res[ctr] = 0x5F;
                ctr++;
                for (uint x = 0; x < elemArray[i].length; x++) {
                    // if there's a bug with larger strings, this may be the culprit
                    if (x % 23 == 0) {
                        uint elemcborlen = elemArray[i].length - x >= 24 ? 23 : elemArray[i].length - x;
                        elemcborlen += 0x40;
                        uint lctr = ctr;
                        while (byte(elemcborlen).length > ctr - lctr) {
                            res[ctr] = byte(elemcborlen)[ctr - lctr];
                            ctr++;
                        }
                    }
                    res[ctr] = elemArray[i][x];
                    ctr++;
                }
                res[ctr] = 0xFF;
                ctr++;
            }
            return res;
        }
        
        
    string oraclize_network_name;
    function oraclize_setNetworkName(string _network_name) internal {
        oraclize_network_name = _network_name;
    }
    
    function oraclize_getNetworkName() internal returns (string) {
        return oraclize_network_name;
    }
    
    function oraclize_newRandomDSQuery(uint _delay, uint _nbytes, uint _customGasLimit) internal returns (bytes32){
        if ((_nbytes == 0)||(_nbytes > 32)) throw;
        bytes memory nbytes = new bytes(1);
        nbytes[0] = byte(_nbytes);
        bytes memory unonce = new bytes(32);
        bytes memory sessionKeyHash = new bytes(32);
        bytes32 sessionKeyHash_bytes32 = oraclize_randomDS_getSessionPubKeyHash();
        assembly {
            mstore(unonce, 0x20)
            mstore(add(unonce, 0x20), xor(blockhash(sub(number, 1)), xor(coinbase, timestamp)))
            mstore(sessionKeyHash, 0x20)
            mstore(add(sessionKeyHash, 0x20), sessionKeyHash_bytes32)
        }
        bytes[3] memory args = [unonce, nbytes, sessionKeyHash]; 
        bytes32 queryId = oraclize_query(_delay, "random", args, _customGasLimit);
        oraclize_randomDS_setCommitment(queryId, sha3(bytes8(_delay), args[1], sha256(args[0]), args[2]));
        return queryId;
    }
    
    function oraclize_randomDS_setCommitment(bytes32 queryId, bytes32 commitment) internal {
        oraclize_randomDS_args[queryId] = commitment;
    }
    
    mapping(bytes32=>bytes32) oraclize_randomDS_args;
    mapping(bytes32=>bool) oraclize_randomDS_sessionKeysHashVerified;

    function verifySig(bytes32 tosignh, bytes dersig, bytes pubkey) internal returns (bool){
        bool sigok;
        address signer;
        
        bytes32 sigr;
        bytes32 sigs;
        
        bytes memory sigr_ = new bytes(32);
        uint offset = 4+(uint(dersig[3]) - 0x20);
        sigr_ = copyBytes(dersig, offset, 32, sigr_, 0);
        bytes memory sigs_ = new bytes(32);
        offset += 32 + 2;
        sigs_ = copyBytes(dersig, offset+(uint(dersig[offset-1]) - 0x20), 32, sigs_, 0);

        assembly {
            sigr := mload(add(sigr_, 32))
            sigs := mload(add(sigs_, 32))
        }
        
        
        (sigok, signer) = safer_ecrecover(tosignh, 27, sigr, sigs);
        if (address(sha3(pubkey)) == signer) return true;
        else {
            (sigok, signer) = safer_ecrecover(tosignh, 28, sigr, sigs);
            return (address(sha3(pubkey)) == signer);
        }
    }

    function oraclize_randomDS_proofVerify__sessionKeyValidity(bytes proof, uint sig2offset) internal returns (bool) {
        bool sigok;
        
        // Step 6: verify the attestation signature, APPKEY1 must sign the sessionKey from the correct ledger app (CODEHASH)
        bytes memory sig2 = new bytes(uint(proof[sig2offset+1])+2);
        copyBytes(proof, sig2offset, sig2.length, sig2, 0);
        
        bytes memory appkey1_pubkey = new bytes(64);
        copyBytes(proof, 3+1, 64, appkey1_pubkey, 0);
        
        bytes memory tosign2 = new bytes(1+65+32);
        tosign2[0] = 1; //role
        copyBytes(proof, sig2offset-65, 65, tosign2, 1);
        bytes memory CODEHASH = hex"fd94fa71bc0ba10d39d464d0d8f465efeef0a2764e3887fcc9df41ded20f505c";
        copyBytes(CODEHASH, 0, 32, tosign2, 1+65);
        sigok = verifySig(sha256(tosign2), sig2, appkey1_pubkey);
        
        if (sigok == false) return false;
        
        
        // Step 7: verify the APPKEY1 provenance (must be signed by Ledger)
        bytes memory LEDGERKEY = hex"7fb956469c5c9b89840d55b43537e66a98dd4811ea0a27224272c2e5622911e8537a2f8e86a46baec82864e98dd01e9ccc2f8bc5dfc9cbe5a91a290498dd96e4";
        
        bytes memory tosign3 = new bytes(1+65);
        tosign3[0] = 0xFE;
        copyBytes(proof, 3, 65, tosign3, 1);
        
        bytes memory sig3 = new bytes(uint(proof[3+65+1])+2);
        copyBytes(proof, 3+65, sig3.length, sig3, 0);
        
        sigok = verifySig(sha256(tosign3), sig3, LEDGERKEY);
        
        return sigok;
    }
    
    modifier oraclize_randomDS_proofVerify(bytes32 _queryId, string _result, bytes _proof) {
        // Step 1: the prefix has to match 'LP\x01' (Ledger Proof version 1)
        if ((_proof[0] != "L")||(_proof[1] != "P")||(_proof[2] != 1)) throw;
        
        bool proofVerified = oraclize_randomDS_proofVerify__main(_proof, _queryId, bytes(_result), oraclize_getNetworkName());
        if (proofVerified == false) throw;
        
        _;
    }
    
    function oraclize_randomDS_proofVerify__returnCode(bytes32 _queryId, string _result, bytes _proof) internal returns (uint8){
        // Step 1: the prefix has to match 'LP\x01' (Ledger Proof version 1)
        if ((_proof[0] != "L")||(_proof[1] != "P")||(_proof[2] != 1)) return 1;
        
        bool proofVerified = oraclize_randomDS_proofVerify__main(_proof, _queryId, bytes(_result), oraclize_getNetworkName());
        if (proofVerified == false) return 2;
        
        return 0;
    }
    
    function matchBytes32Prefix(bytes32 content, bytes prefix) internal returns (bool){
        bool match_ = true;
        
        for (var i=0; i<prefix.length; i++){
            if (content[i] != prefix[i]) match_ = false;
        }
        
        return match_;
    }

    function oraclize_randomDS_proofVerify__main(bytes proof, bytes32 queryId, bytes result, string context_name) internal returns (bool){
        bool checkok;
        
        
        // Step 2: the unique keyhash has to match with the sha256 of (context name + queryId)
        uint ledgerProofLength = 3+65+(uint(proof[3+65+1])+2)+32;
        bytes memory keyhash = new bytes(32);
        copyBytes(proof, ledgerProofLength, 32, keyhash, 0);
        checkok = (sha3(keyhash) == sha3(sha256(context_name, queryId)));
        if (checkok == false) return false;
        
        bytes memory sig1 = new bytes(uint(proof[ledgerProofLength+(32+8+1+32)+1])+2);
        copyBytes(proof, ledgerProofLength+(32+8+1+32), sig1.length, sig1, 0);
        
        
        // Step 3: we assume sig1 is valid (it will be verified during step 5) and we verify if 'result' is the prefix of sha256(sig1)
        checkok = matchBytes32Prefix(sha256(sig1), result);
        if (checkok == false) return false;
        
        
        // Step 4: commitment match verification, sha3(delay, nbytes, unonce, sessionKeyHash) == commitment in storage.
        // This is to verify that the computed args match with the ones specified in the query.
        bytes memory commitmentSlice1 = new bytes(8+1+32);
        copyBytes(proof, ledgerProofLength+32, 8+1+32, commitmentSlice1, 0);
        
        bytes memory sessionPubkey = new bytes(64);
        uint sig2offset = ledgerProofLength+32+(8+1+32)+sig1.length+65;
        copyBytes(proof, sig2offset-64, 64, sessionPubkey, 0);
        
        bytes32 sessionPubkeyHash = sha256(sessionPubkey);
        if (oraclize_randomDS_args[queryId] == sha3(commitmentSlice1, sessionPubkeyHash)){ //unonce, nbytes and sessionKeyHash match
            delete oraclize_randomDS_args[queryId];
        } else return false;
        
        
        // Step 5: validity verification for sig1 (keyhash and args signed with the sessionKey)
        bytes memory tosign1 = new bytes(32+8+1+32);
        copyBytes(proof, ledgerProofLength, 32+8+1+32, tosign1, 0);
        checkok = verifySig(sha256(tosign1), sig1, sessionPubkey);
        if (checkok == false) return false;
        
        // verify if sessionPubkeyHash was verified already, if not.. let's do it!
        if (oraclize_randomDS_sessionKeysHashVerified[sessionPubkeyHash] == false){
            oraclize_randomDS_sessionKeysHashVerified[sessionPubkeyHash] = oraclize_randomDS_proofVerify__sessionKeyValidity(proof, sig2offset);
        }
        
        return oraclize_randomDS_sessionKeysHashVerified[sessionPubkeyHash];
    }

    
    // the following function has been written by Alex Beregszaszi (@axic), use it under the terms of the MIT license
    function copyBytes(bytes from, uint fromOffset, uint length, bytes to, uint toOffset) internal returns (bytes) {
        uint minLength = length + toOffset;

        if (to.length < minLength) {
            // Buffer too small
            throw; // Should be a better way?
        }

        // NOTE: the offset 32 is added to skip the `size` field of both bytes variables
        uint i = 32 + fromOffset;
        uint j = 32 + toOffset;

        while (i < (32 + fromOffset + length)) {
            assembly {
                let tmp := mload(add(from, i))
                mstore(add(to, j), tmp)
            }
            i += 32;
            j += 32;
        }

        return to;
    }
    
    // the following function has been written by Alex Beregszaszi (@axic), use it under the terms of the MIT license
    // Duplicate Solidity's ecrecover, but catching the CALL return value
    function safer_ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal returns (bool, address) {
        // We do our own memory management here. Solidity uses memory offset
        // 0x40 to store the current end of memory. We write past it (as
        // writes are memory extensions), but don't update the offset so
        // Solidity will reuse it. The memory used here is only needed for
        // this context.

        // FIXME: inline assembly can't access return values
        bool ret;
        address addr;

        assembly {
            let size := mload(0x40)
            mstore(size, hash)
            mstore(add(size, 32), v)
            mstore(add(size, 64), r)
            mstore(add(size, 96), s)

            // NOTE: we can reuse the request memory because we deal with
            //       the return code
            ret := call(3000, 1, 0, size, 128, size, 32)
            addr := mload(size)
        }
  
        return (ret, addr);
    }

    // the following function has been written by Alex Beregszaszi (@axic), use it under the terms of the MIT license
    function ecrecovery(bytes32 hash, bytes sig) internal returns (bool, address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        if (sig.length != 65)
          return (false, 0);

        // The signature format is a compact form of:
        //   {bytes32 r}{bytes32 s}{uint8 v}
        // Compact means, uint8 is not padded to 32 bytes.
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))

            // Here we are loading the last 32 bytes. We exploit the fact that
            // 'mload' will pad with zeroes if we overread.
            // There is no 'mload8' to do this, but that would be nicer.
            v := byte(0, mload(add(sig, 96)))

            // Alternative solution:
            // 'byte' is not working due to the Solidity parser, so lets
            // use the second best option, 'and'
            // v := and(mload(add(sig, 65)), 255)
        }

        // albeit non-transactional signatures are not specified by the YP, one would expect it
        // to match the YP range of [27, 28]
        //
        // geth uses [0, 1] and some clients have followed. This might change, see:
        //  https://github.com/ethereum/go-ethereum/issues/2053
        if (v < 27)
          v += 27;

        if (v != 27 && v != 28)
            return (false, 0);

        return safer_ecrecover(hash, v, r, s);
    }
        
}
// </ORACLIZE_API>

contract EthTicker is usingOraclize {
// Fields:
     bool oraclizeLoaded = false;

     uint64 public lastTimeRateUpdated = 0;
     string public ethPriceInUsd = "";
     uint public ethPriceInUsdInt = 0;
     uint public oraclizeFee = 0;

     event newOraclizeQuery(string description);
     event priceReceived(string price);

// Functions
     function initEthTicker(uint _currentUsdToEthRate) internal {
          require(0==lastTimeRateUpdated);

          lastTimeRateUpdated = uint64(now);
          ethPriceInUsdInt = _currentUsdToEthRate;
     }

     // This should be called from Oraclize
     function __callback(bytes32 myid, string result, bytes proof) {
          require(msg.sender==oraclize_cbAddress());

          ethPriceInUsd = result;
          ethPriceInUsdInt = parseUInt(ethPriceInUsd);

          // send an event
          priceReceived(ethPriceInUsd);

          lastTimeRateUpdated = uint64(now);
     }

     function parseUInt(string self) internal constant returns (uint) {
          return parseUInt(self, 0);
     }

     function parseUInt(string self, uint _b) internal constant returns (uint) {
          bytes memory bresult = bytes(self);
          uint mint = 0;
          bool decimals = false;
          for (uint i=0; i<bresult.length; i++){
               if ((bresult[i] >= 48)&&(bresult[i] <= 57)){
                    if (decimals){
                         if (_b == 0) break;
                         else _b--;
                    }
                    mint *= 10;
                    mint += uint(bresult[i]) - 48;
               } else if (bresult[i] == 46) decimals = true;
          }
          if (_b > 0) mint *= 10**_b;
          return mint;
     }

     function getEthToUsdRate() public returns(uint){
          require(!isNeedToUpdateEthToUsdRate());
          return ethPriceInUsdInt;
     }

     // send the fee
     function updateEthToUsdRate() public payable {
          if(!oraclizeLoaded){
               oraclize_setProof(proofType_TLSNotary | proofStorage_IPFS);
               oraclizeLoaded = true;
          }

          // update each time (price can change)
          oraclizeFee = oraclize.getPrice("URL");
          require(msg.value>=oraclizeFee);

          string memory url = "json(https://api.kraken.com/0/public/Ticker?pair=ETHUSD).result.XETHZUSD.c.0";

          // update max each 1 minute 
          oraclize_query(60, "URL", url);

          // send an event
          newOraclizeQuery("Oraclize query was sent, standing by for the answer..");
     }

     function isNeedToUpdateEthToUsdRate() public constant returns(bool){
          // if more than 1h elapsed -> need update!
          uint64 oneHourPassed = lastTimeRateUpdated + 1 hours;  
          return (uint64(now) > oneHourPassed);
     }

     function getNow() public constant returns(uint){
          return uint64(now);
     }
}


/**
 * @title SafeMath by OpenZeppelin
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
  function mul(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal constant returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function sub(uint256 a, uint256 b) internal constant returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

/**
 * @title ERC20 interface, by OpenZeppelin
 */
contract ERC20Token {
     function balanceOf(address who) public constant returns (uint256);
     function transfer(address to, uint256 value) public returns (bool);
     function allowance(address owner, address spender) public constant returns (uint256);
     function transferFrom(address from, address to, uint256 value) public returns (bool);
     function approve(address spender, uint256 value) public returns (bool);
}

contract ReputationTokenInterface {
     function issueTokens(address forAddress, uint tokenCount) returns (bool success);
     function burnTokens(address forAddress) returns (bool success);
     function lockTokens(address forAddress, uint tokenCount) returns (bool success);
     function unlockTokens(address forAddress, uint tokenCount) returns (bool success);
     function approve(address _spender, uint256 _value) returns (bool success);
     function nonLockedTokensCount(address forAddress) constant returns (uint tokenCount);
}

contract AbstractENS {
     function owner(bytes32 node) constant returns(address);
     function resolver(bytes32 node) constant returns(address);
     function ttl(bytes32 node) constant returns(uint64);
     function setOwner(bytes32 node, address ownerVal);
     function setSubnodeOwner(bytes32 node, bytes32 label, address ownerVal);
     function setResolver(bytes32 node, address resolverVal);
     function setTTL(bytes32 node, uint64 ttlVal);
}

contract Registrar {
     function transfer(bytes32, address);
}


contract Ledger is EthTicker {     
     address public mainAddress;             //Contract Owner/Deployer address
     address public whereToSendFee;          //Platform fee collector address
     address public repTokenAddress;         //ReputationToken contract address
     address public ensRegistryAddress;      //ENS Registry address
     address public registrarAddress;        //Registrar address

     uint public totalLrCount = 0;           //Total count of LendingRequest created
     uint public borrowerFeeAmount = 0.01 ether; //Platform fee for Borrower

     mapping (address => mapping(uint => address)) lrsPerUser; //Mapping of LendingRequests per User
     mapping (address => uint) lrsCountPerUser;                //Lending request count per User
     mapping (uint => address) lrs;                            //Lending Requests

     
     function Ledger(address _whereToSendFee,     address _repTokenAddress, 
                     address _ensRegistryAddress, address _registrarAddress,
                     uint _currentUsdToEthRate){
          mainAddress = msg.sender;
          whereToSendFee = _whereToSendFee;
          repTokenAddress = _repTokenAddress;
          ensRegistryAddress = _ensRegistryAddress;
          registrarAddress = _registrarAddress;

          initEthTicker(_currentUsdToEthRate);
     }

     function getFeeSum() constant returns(uint){ return borrowerFeeAmount; }
     function getRepTokenAddress() constant returns(address){ return repTokenAddress; }
     function getLrCount() constant returns(uint){ return totalLrCount; }
     function getLr(uint _index) constant returns (address){ return lrs[_index]; }
     function getLrCountForUser(address _addr) constant returns(uint){ return lrsCountPerUser[_addr]; }
     function getLrForUser(address _addr, uint _index) constant returns (address){ return lrsPerUser[_addr][_index]; }
     
     // new ledger request and set data
     // if currency is USD - then _wanted_wei is in cents
     function newLrAndSetData(int _collateralType, uint _currency, uint _wanted_wei, uint _token_amount, uint _premium_wei,
                         string _token_name, string _token_infolink, address _token_smartcontract_address, 
                         uint _days_to_lend, bytes32 _ens_domain_hash) payable returns(address)
     {
          if(msg.value < borrowerFeeAmount){
               revert();
          }

          // 1 - send Fee to wherToSendFee
          whereToSendFee.transfer(borrowerFeeAmount);

          // 2 - create new LR
          // will be in state 'Init'
          LendingRequest lending_request = new LendingRequest(msg.sender, _collateralType, _currency);
          lending_request.setData(_wanted_wei, _token_amount, _premium_wei, _token_name, _token_infolink, _token_smartcontract_address, _days_to_lend, _ens_domain_hash);
          
          // 3 - add to list
          uint currentCount = lrsCountPerUser[msg.sender];
          lrsPerUser[msg.sender][currentCount] = lending_request;
          lrsCountPerUser[msg.sender]++;

          lrs[totalLrCount] = lending_request;
          totalLrCount++;

          return lending_request;

      }



     function getLrFundedCount() constant returns(uint out){
          out = 0;

          for(uint i=0; i<totalLrCount; ++i){
               LendingRequest lr = LendingRequest(lrs[i]);
               if(lr.getCurrentState() == LendingRequest.State.WaitingForPayback){
                    out++;
               }
          }

          return;
     }

     function getLrFunded(uint _index) constant returns (address){          
          LendingRequest lr = LendingRequest(lrs[_index]);
          if(lr.getCurrentState() == LendingRequest.State.WaitingForPayback){
               return lrs[_index];
          } else {
               return 0;
          }
     }

     function addRepTokens(address _potentialBorrower, uint _weiSum){
          ReputationTokenInterface repToken = ReputationTokenInterface(repTokenAddress);
          LendingRequest lr = LendingRequest(msg.sender);  
          // we`ll check is msg.sender is a real our LendingRequest
          if(lr.borrower() == _potentialBorrower && address(this) == lr.creator()){// we`ll take a lr contract and check address a – is he a borrower for this contract?
               uint repTokens = _weiSum / 10;
               repToken.issueTokens(_potentialBorrower,repTokens);               
          }
     }

     function lockRepTokens(address _potentialBorrower, uint _weiSum){
          ReputationTokenInterface repToken = ReputationTokenInterface(repTokenAddress);
          LendingRequest lr = LendingRequest(msg.sender);  
          // we`ll check is msg.sender is a real our LendingRequest
          if(lr.borrower() == _potentialBorrower && address(this)==lr.creator()){// we`ll take a lr contract and check address a – is he a borrower for this contract?
               uint repTokens = _weiSum;
               repToken.lockTokens(_potentialBorrower, repTokens);               
          }
     }

     function unlockRepTokens(address _potentialBorrower, uint _weiSum){
          ReputationTokenInterface repToken = ReputationTokenInterface(repTokenAddress);
          LendingRequest lr = LendingRequest(msg.sender);
          // we`ll check is msg.sender is a real our LendingRequest
          if(lr.borrower() == _potentialBorrower && address(this)==lr.creator()){// we`ll take a lr contract and check address a – is he a borrower for this contract?
               uint repTokens = _weiSum;
               repToken.unlockTokens(_potentialBorrower, repTokens);               
          }
     }

     function burnRepTokens(address _potentialBorrower){
          ReputationTokenInterface repToken = ReputationTokenInterface(repTokenAddress);
          LendingRequest lr = LendingRequest(msg.sender);  
          // we`ll check is msg.sender is a real our LendingRequest
          if(lr.borrower() == _potentialBorrower && address(this) == lr.creator()){// we`ll take a lr contract and check address a – is he a borrower for this contract?
               repToken.burnTokens(_potentialBorrower);               
          }
     }     

     function approveRepTokens(address _potentialBorrower,uint _weiSum) returns (bool success){
          ReputationTokenInterface repToken = ReputationTokenInterface(repTokenAddress);
          success = repToken.nonLockedTokensCount(_potentialBorrower) >= _weiSum;
          return;             
     } 

     /*function() payable {
          createNewLendingRequest();
     }*/
}

/*
 * LendingRequest Contract will be created for each loan request.
 */
contract LendingRequest {
     /* Different states of LendingRequest contract */
     enum State {  
          Init,   //Initial state
          WaitingForTokens,   //Waiting for ERC20 tokens from Borrower
          Cancelled,          //When loan cancelled
          WaitingForLender,   //When ERC20 tokens received from borrower, now looking for Lender
          WaitingForPayback,  //When money received from Lender and sent to Borrower
          Default,            //When loan defaulted by Borrower
          Finished            //When loan paid in full by Borrower and finished 
     }

     /* Collateral Types */
     enum Type {
          TokensCollateral,   //Tokens as a Collateral
          EnsCollateral,      //ENS Domain as a Collateral
          RepCollateral       //Reputation tokens as a Collateral
     }

     enum Currency {
          EthCurrency,
          UsdCurrency
     }

     using SafeMath for uint256;               //SafeMath Library using for uint256
     Ledger ledger;                            //Ledger Contract
     address public creator            = 0x0;  //Creator of this contract, always be Ledger's address
     address public registrarAddress   = 0x0;  //Registrar contract address
     address public ensRegistryAddress = 0x0;  //This is an address of AbstractENS contract
     address public mainAddress        = 0x0;  //Who deployed Parent Ledger
     address public whereToSendFee     = 0x0;  //Platform fee will be sent to this wallet address

     // if currency in USD - still in ETH!
     uint public lenderFeeAmount = 0.01 ether;            //Lender's platform fee
     State private currentState   = State.Init;  //Initial state WaitingForData
     Type public currentType     = Type.TokensCollateral; //Initialized with Tokens Collateral 
     Currency public currency    = Currency.EthCurrency;

     /* These variables will be set by borrower: */
     address public borrower  = 0x0;                     //Borrower's wallet address

     // if currency is USD - then is in cents
     uint public wanted_wei   = 0;                       //How much wei Borrower request from Lender
     // if currency is USD - then is in cents
     uint public premium_wei  = 0;                       //How much premium in wei Borrower wants to pay to Lender

     uint public token_amount = 0;                       //Count of ERC20-tokens Borrower wants to put as collateral
     uint public days_to_lend = 0;                       //Number of days to lend the loan
     string public token_name = "";                      //Name of the ERC20-token Borrower putting as a collateral
     bytes32 public ens_domain_hash;                     //ENS Domain hash which Borrower putting as a collateral
     string public token_infolink = "";                  //Token info link (optional)
     address public token_smartcontract_address = 0x0;   //ERC20 Token's contract address
     

     /* These variables will be set when Lender is found */
     uint public start     = 0;    //Holds the startTime of the loan when loan Funded
     address public lender = 0x0;  //Lender's wallet address


     /* Constants Methods: */
     function isEns() constant returns(bool){ return (currentType==Type.EnsCollateral); }
     function isRep() constant returns(bool){ return (currentType==Type.RepCollateral); }
     function getLender() constant returns(address){ return lender; }     
     function getBorrower() constant returns(address){ return borrower; }
     function getTokenName() constant returns(string){ return token_name; }
     function getDaysToLen() constant returns(uint){ return days_to_lend; }
     function getTokenAmount() constant returns(uint){ return token_amount; }     
     function getTokenInfoLink() constant returns(string){ return token_infolink; }
     function getEnsDomainHash() constant returns(bytes32){ return ens_domain_hash; }
     function getTokenSmartcontractAddress() constant returns(address){ return token_smartcontract_address; }
    
     modifier onlyByLedger(){
          require(Ledger(msg.sender) == ledger);
          _;
     }

     modifier onlyByMain(){
          require(msg.sender == mainAddress);
          _;
     }

     modifier byLedgerOrMain(){
          require(msg.sender == mainAddress || Ledger(msg.sender) == ledger);
          _;
     }

     modifier byLedgerMainOrBorrower(){
          require(msg.sender == mainAddress || Ledger(msg.sender) == ledger || msg.sender == borrower);
          _;
     }

     modifier onlyByLender(){
          require(msg.sender == lender);
          _;
     }

     modifier onlyInState(State _state){
          require(getCurrentState() == _state);
          _;
     }

     function LendingRequest(address _borrower, int _collateralType, uint _currency){
          creator = msg.sender;
          ledger = Ledger(msg.sender);

          borrower = _borrower;
          mainAddress = ledger.mainAddress();
          whereToSendFee = ledger.whereToSendFee();
          registrarAddress = ledger.registrarAddress();
          ensRegistryAddress = ledger.ensRegistryAddress();
    
          // collateral: tokens or ENS domain?
          if (_collateralType == 0){
               currentType = Type.TokensCollateral;
          } else if(_collateralType == 1){
               currentType = Type.EnsCollateral;
          } else if(_collateralType == 2){
               currentType = Type.RepCollateral;
          } else {
               revert();
          }

          if (_currency ==0){
               currency = Currency.EthCurrency;
          } else if(_currency == 1){
               currency = Currency.UsdCurrency;
          } else {
               revert();
          }
     }

     function getCurrentState() constant returns(State){
       if(currentState == State.WaitingForTokens){
         if(currentType == Type.TokensCollateral){
            ERC20Token token = ERC20Token(token_smartcontract_address);

            uint tokenBalance = token.balanceOf(this);
            if(tokenBalance >= token_amount){
               // we are ready to search someone 
               // to give us the money
               return State.WaitingForLender;
            }else{
                return currentState;
            } 
          }else if(currentType == Type.EnsCollateral){
            AbstractENS ens = AbstractENS(ensRegistryAddress);
            if(ens.owner(ens_domain_hash)==address(this)){
               // we are ready to search someone 
               // to give us the money
               return State.WaitingForLender;
            }else{
                return currentState;
            }
          }else{
              return currentState;
          }
       }else{
         return currentState;
       }

     }

     function changeLedgerAddress(address _new) onlyByLedger{
          ledger = Ledger(_new);
     }

     function changeMainAddress(address _new) onlyByMain{
          mainAddress = _new;
     }

     // if currency is USD - then _wanted_wei is in cents
     function setData(uint _wantedWei, uint _tokenAmount, uint _premiumWei,
                         string _tokenName, string _tokenInfolink, address _tokenSmartContractAddress, 
                         uint _daysToLend, bytes32 _ensDomainHash) 
               byLedgerMainOrBorrower onlyInState(State.Init)
     {
          wanted_wei = _wantedWei;
          premium_wei = _premiumWei;
          token_amount = _tokenAmount; // will be ZERO if isCollateralEns is true 
          token_name = _tokenName;
          token_infolink = _tokenInfolink;
          token_smartcontract_address = _tokenSmartContractAddress;
          days_to_lend = _daysToLend;
          ens_domain_hash = _ensDomainHash;

          if(currentType == Type.RepCollateral){
               uint val = convertToEth(wanted_wei);
               if(ledger.approveRepTokens(borrower, val)){
                    ledger.lockRepTokens(borrower, val);
                    currentState = State.WaitingForLender;
               }
          } else {
               currentState = State.WaitingForTokens;
          }
     }

     function cancell() byLedgerMainOrBorrower {
          // 1 - check current state
          if((getCurrentState() != State.WaitingForTokens) && (getCurrentState() != State.WaitingForLender))
               revert();

          if(getCurrentState() == State.WaitingForLender){
               // return tokens back to Borrower
               releaseToBorrower();
          }
          currentState = State.Cancelled;
     }

     // This function is called when someone sends money to this contract directly.
     //
     // If someone is sending at least 'wanted_wei' amount of money in WaitingForLender state
     // -> then it means it's a Lender.
     //
     // If someone is sending at least 'wanted_wei' amount of money in WaitingForPayback state
     // -> then it means it's a Borrower returning money back. 
     function() payable {
          if(getCurrentState() == State.WaitingForLender){
               waitingForLender();
          } else if(getCurrentState() == State.WaitingForPayback){
               waitingForPayback();
          } else {
               revert(); //In any other state, do not accept Ethers
          }
     }

     // If no lenders -> borrower can cancel the LR
     function returnTokens() byLedgerMainOrBorrower onlyInState(State.WaitingForLender){
          // tokens are released back to borrower
          releaseToBorrower();
          currentState = State.Finished;
     }

     function waitingForLender() payable onlyInState(State.WaitingForLender){
          uint neededWei = getNeededSumByLender(); 
          require(msg.value >= neededWei);

          // send platform fee first
          whereToSendFee.transfer(lenderFeeAmount);

          // if you sent this -> you are the lender
          lender = msg.sender;     

          // ETH is sent to borrower in full
          // Tokens are kept inside of this contract
          uint val = convertToEth(wanted_wei);
          borrower.transfer(val);

          currentState = State.WaitingForPayback;

          start = now;
     }

     // if time hasn't passed yet - Borrower can return loan back
     // and get his tokens back
     // 
     // anyone can call this (not only the borrower)
     function waitingForPayback() payable onlyInState(State.WaitingForPayback){
          require(msg.value>=getNeededSumByBorrower());

          // ETH is sent back to lender in full with premium!!!
          lender.transfer(msg.value);

          releaseToBorrower(); // tokens are released back to borrower

          uint val = convertToEth(wanted_wei);
          ledger.addRepTokens(borrower,val);
          currentState = State.Finished; // finished
     }

     // How much should lender send
     function getNeededSumByLender() public constant returns(uint){
          // can throw if USD/ETH rate is not updated
          uint val = convertToEth(wanted_wei);
          return val.add(lenderFeeAmount);
     }

     // How much should borrower return to release tokens
     function getNeededSumByBorrower() public constant returns(uint){
          // can throw if USD/ETH rate is not updated
          uint val = convertToEth(wanted_wei);
          uint val2 = convertToEth(premium_wei);
          return val.add(val2);
     }

     // After time has passed but lender hasn't returned the loan -> move tokens to lender
     // anyone can call this (not only the lender)
     function requestDefault() onlyInState(State.WaitingForPayback){
          if(now < (start + days_to_lend * 1 days)){
               revert();
          }

          releaseToLender(); // tokens are released to the lender        
          // ledger.addRepTokens(lender,wanted_wei); // Only Lender get Reputation tokens
          currentState = State.Default; 
     }

     function releaseToLender() internal {
          if(currentType==Type.EnsCollateral){
               AbstractENS ens = AbstractENS(ensRegistryAddress);
               Registrar registrar = Registrar(registrarAddress);

               ens.setOwner(ens_domain_hash,lender);
               registrar.transfer(ens_domain_hash,lender);
          }else if (currentType==Type.RepCollateral){
               uint val = convertToEth(wanted_wei);
               ledger.unlockRepTokens(borrower, val);
          }else{
               ERC20Token token = ERC20Token(token_smartcontract_address);
               uint tokenBalance = token.balanceOf(this);
               token.transfer(lender,tokenBalance);
          }

          ledger.burnRepTokens(borrower);
     }

     function releaseToBorrower() internal {
          if(currentType==Type.EnsCollateral){
               AbstractENS ens = AbstractENS(ensRegistryAddress);
               Registrar registrar = Registrar(registrarAddress);
               ens.setOwner(ens_domain_hash,borrower);
               registrar.transfer(ens_domain_hash,borrower);

          }else if (currentType==Type.RepCollateral){
               uint val = convertToEth(wanted_wei);
               ledger.unlockRepTokens(borrower, val);
          }else{
               ERC20Token token = ERC20Token(token_smartcontract_address);
               uint tokenBalance = token.balanceOf(this);
               token.transfer(borrower,tokenBalance);
          }
     }

     function convertToEth(uint weiOrCents) public constant returns(uint){
          // type is USD 
          if(Currency.UsdCurrency==currency){
               uint usdPerEth = ledger.getEthToUsdRate();
               return (weiOrCents * (1 ether)) / (usdPerEth * 100);
          }

          // type is ETH
          return weiOrCents;
     }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Certification {
    struct Certificate {
        string uid;
        string candidateName;
        string courseName;
        string orgName;
        string ipfsHash;
        uint256 timestamp;
        bool revoked; // Added revoked status to struct
    }

    mapping(string => Certificate) public certificates;
    address public owner;
    
    event CertificateGenerated(
        string indexed certificateId,
        string uid,
        string candidateName,
        string ipfsHash,
        uint256 timestamp
    );
    
    event CertificateRevoked(string indexed certificateId);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    function generateCertificate(
        string memory certificateId,
        string memory uid,
        string memory candidateName,
        string memory courseName,
        string memory orgName,
        string memory ipfsHash
    ) public onlyOwner {
        require(
            bytes(certificates[certificateId].ipfsHash).length == 0,
            "Certificate exists"
        );
        require(bytes(certificateId).length > 0, "Empty ID");
        require(bytes(ipfsHash).length > 0, "Empty IPFS hash");

        certificates[certificateId] = Certificate({
            uid: uid,
            candidateName: candidateName,
            courseName: courseName,
            orgName: orgName,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            revoked: false // Initialize revoked status
        });

        emit CertificateGenerated(certificateId, uid, candidateName, ipfsHash, block.timestamp);
    }

    function getCertificate(string memory certificateId)
        public
        view
        returns (
            string memory uid,
            string memory candidateName,
            string memory courseName,
            string memory orgName,
            string memory ipfsHash,
            uint256 timestamp,
            bool revoked
        )
    {
        Certificate memory c = certificates[certificateId];
        require(bytes(c.uid).length != 0, "Certificate not found"); // Changed check to uid
        return (
            c.uid,
            c.candidateName,
            c.courseName,
            c.orgName,
            c.ipfsHash,
            c.timestamp,
            c.revoked
        );
    }

    function isVerified(string memory certificateId) public view returns (bool) {
        Certificate memory c = certificates[certificateId];
        return bytes(c.uid).length != 0 && !c.revoked; 
        // Changed check to uid
    }

    function revokeCertificate(string memory certificateId) public onlyOwner {
        Certificate memory c = certificates[certificateId];
        require(bytes(c.uid).length != 0, "Certificate not found"); // Changed check to uid
        require(!c.revoked, "Already revoked");
        
        certificates[certificateId].revoked = true;
        emit CertificateRevoked(certificateId);
    }
}
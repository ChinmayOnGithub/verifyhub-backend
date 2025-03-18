// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Certification {
    struct Certificate {
        string uid;
        string candidateName;  // Consistent naming
        string courseName;
        string orgName;
        string ipfsHash;
        uint256 timestamp;
    }

    mapping(string => Certificate) public certificates; // certificateId => Certificate

    // Enhanced event with more data for debugging
    event CertificateGenerated(
        string indexed certificateId,
        string uid,
        string candidateName,
        string ipfsHash,
        uint256 timestamp
    );

    // Optional: Add access control
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function generateCertificate(
        string memory certificateId,
        string memory uid,
        string memory candidateName,
        string memory courseName,
        string memory orgName,
        string memory ipfsHash
    ) public onlyOwner {  // Added onlyOwner for security
        require(
            bytes(certificates[certificateId].ipfsHash).length == 0,
            "Certificate ID already exists"
        );
        require(bytes(certificateId).length > 0, "Certificate ID cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        certificates[certificateId] = Certificate(
            uid,
            candidateName,
            courseName,
            orgName,
            ipfsHash,
            block.timestamp
        );

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
            uint256 timestamp
        )
    {
        require(
            bytes(certificates[certificateId].ipfsHash).length != 0,
            "Certificate does not exist"
        );
        Certificate memory c = certificates[certificateId];
        return (c.uid, c.candidateName, c.courseName, c.orgName, c.ipfsHash, c.timestamp);
    }

    function isVerified(string memory certificateId) public view returns (bool) {
        return bytes(certificates[certificateId].ipfsHash).length != 0;
    }

    // Optional: Allow owner to update contract if needed
    function setOwner(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
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
    }

    mapping(string => Certificate) public certificates; // certificateId => Certificate
    event CertificateGenerated(string certificateId);

    function generateCertificate(
        string memory certificateId,  // Now using explicit ID
        string memory uid,
        string memory candidateName,
        string memory courseName,
        string memory orgName,
        string memory ipfsHash
    ) public {
        require(
            bytes(certificates[certificateId].ipfsHash).length == 0,
            "Certificate ID exists"
        );
        
        certificates[certificateId] = Certificate(
            uid,
            candidateName,
            courseName,
            orgName,
            ipfsHash,
            block.timestamp
        );
        
        emit CertificateGenerated(certificateId);
    }

    function getCertificate(string memory certificateId) public view returns (
        string memory,
        string memory,
        string memory,
        string memory,
        string memory,
        uint256
    ) {
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
}
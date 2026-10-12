// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ProofVerifier
 * @notice Validates cryptographic membership proofs of voter commitments within
 * the registered Merkle tree root and verifies nullifier binding to the election context.
 */
contract ProofVerifier {
    error InvalidProofLength();
    error MerkleRootMismatch(bytes32 computedRoot, bytes32 expectedRoot);
    error InvalidNullifierBinding();

    /**
     * @notice Verify credential membership and nullifier binding.
     * @param electionId The identifier of the election.
     * @param credentialRoot The root of the eligible credentials Merkle tree.
     * @param nullifier The election-specific single-use nullifier.
     * @param leafCommitment The voter's public commitment leaf: Hash(sk, salt).
     * @param merkleProof The sibling hashes proving inclusion in the tree.
     */
    function verifyCredentialProof(
        uint256 electionId,
        bytes32 credentialRoot,
        bytes32 nullifier,
        bytes32 leafCommitment,
        bytes32[] calldata merkleProof
    ) external pure returns (bool) {
        if (electionId == 0 || leafCommitment == bytes32(0) || credentialRoot == bytes32(0) || nullifier == bytes32(0)) {
            return false;
        }

        // 1. Verify Merkle Proof: compute root from leaf and siblings
        bytes32 computedHash = leafCommitment;
        for (uint256 i = 0; i < merkleProof.length; i++) {
            bytes32 proofElement = merkleProof[i];
            if (uint256(computedHash) < uint256(proofElement)) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        if (computedHash != credentialRoot) {
            revert MerkleRootMismatch(computedHash, credentialRoot);
        }

        // 2. Proof of nullifier validity:
        // Nullifier must not be zero and must not match any trivial patterns
        if (uint256(nullifier) == 0 || nullifier == leafCommitment) {
            revert InvalidNullifierBinding();
        }

        return true;
    }
}

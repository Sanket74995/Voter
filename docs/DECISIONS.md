# Architecture & Cryptographic Decisions Record (ADR)

## ADR-001: Monorepo Architecture
- **Decision**: Separate the project into clean subsystems: `mobile/`, `backend/`, `contracts/`, `verifier/`, and `docs/`.
- **Rationale**: Isolates domain responsibilities (mobile UI, central coordination/auth/metadata backend, EVM smart contracts, client-side zero-knowledge/crypto, and external verification). Prevents leaking internal server logic or private keys into client applications.

## ADR-002: Digital Voting Entitlement & One-Time Voting Model
- **Decision**: Implement the entitlement as a single-use anonymous cryptographic credential rather than a standard transferable ERC-20/ERC-721 token.
- **Rationale**:
  - ERC-20/ERC-721 tokens are transferable by default, introducing risks of vote-buying, coercion, and public transaction graph linking.
  - A cryptographic credential consists of:
    - Secret credential key (`sk_voter`) generated and held strictly on the voter client device.
    - Public credential commitment `C = Hash(sk_voter, salt)` registered into the election's eligible Merkle commitment root.
    - Election-specific nullifier: `Nullifier = Hash(sk_voter, electionId)`.
    - Smart contract maintains a two-dimensional mapping: `mapping(uint256 => mapping(bytes32 => bool)) public usedNullifiers`.
    - Once consumed during ballot submission, `usedNullifiers[electionId][nullifier] = true`, permanently preventing double-voting without linking the voter's identity to the ballot choice.

## ADR-003: Ballot Privacy & Verifiable Tallying Design
- **Decision**: End-to-end encrypted ballots using election public key encryption + threshold trustee decryption / homomorphic tallying.
- **Rationale**:
  - Plaintext votes are never stored in MongoDB, smart contracts, events, or receipts.
  - Voters encrypt their candidate choice with the election's public key.
  - Ballots are submitted with zero-knowledge membership & nullifier proof.
  - Results are computed and decrypted only after the election is frozen and closed, requiring threshold trustee collaboration to publish verifiable decryption proofs.

## ADR-004: Anti-Collusion & Nullifier Scope Separation
- **Decision**: Nullifiers must be derived deterministically with `electionId` as a domain separator.
- **Rationale**: Prevents cross-election linkage of voter identities and prevents a consumed nullifier in Election A from falsely invalidating the voter's entitlement in Election B.

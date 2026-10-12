# System Architecture: Blockchain-Based Voting System

## High-Level Topology

```
+-------------------------------------------------------------+
|                      React Native CLI                       |
|           (Voter / Admin / Party Rep Mobile App)            |
+------------------------------+------------------------------+
                               | HTTPS / JSON-RPC
                               v
+-------------------------------------------------------------+
|                     Node.js / Express API                   |
|  - Role-based Auth (JWT + bcrypt)                           |
|  - Voter Eligibility & Credential Issuance Engine           |
|  - Election State Coordinator                               |
|  - Relay Service (Submits anonymous txs without identity)  |
+---------------+-----------------------------+---------------+
                |                             |
                v                             v
+-------------------------------+  +--------------------------+
|       MongoDB Database        |  |   Hardhat Local EVM /    |
| - Users & Roles               |  |   EVM Compatible Chain   |
| - Elections & Parties         |  |--------------------------|
| - Eligibility Registrations   |  | 1. ElectionManager.sol   |
| - Administrative Audit Logs   |  | 2. Voting.sol            |
| (NO plain votes / nullifiers) |  | 3. ProofVerifier.sol     |
+-------------------------------+  | 4. TallyRegistry.sol     |
                                   +--------------------------+
                                              ^
                                              | Web3 Event Logs
+---------------------------------------------+---------------+
|                 Independent Verifier CLI                    |
| - Fetches on-chain encrypted ballot logs & nullifier sets   |
| - Recomputes Merkle roots, checks zero-knowledge proofs     |
| - Validates published tally commitments against smart state |
+-------------------------------------------------------------+
```

## Security & Privacy Boundary Separation
1. **Separation of Identity from Ballot Choice**:
   - MongoDB holds Voter Identity -> Eligibility Status.
   - The Smart Contract holds Nullifiers -> Encrypted Ballots.
   - There is NO cross-referencing key or linkage table stored in MongoDB or emitted in blockchain events.
2. **Deterministic Domain-Separated Nullifiers**:
   - `Nullifier = Poseidon / Keccak(sk_voter, electionId)`.
   - Cannot be correlated across elections or back to voter identity.
3. **Smart Contract Single-Use Invariant**:
   - Enforced by EVM atomic storage: `usedNullifiers[electionId][nullifier]`.
   - Any transaction attempting to replay an existing nullifier reverts immediately with custom error `NullifierAlreadyUsed`.

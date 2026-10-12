# Software Requirements Specification (SRS)
## Blockchain-Based Voting System

### 1. Introduction
#### 1.1 Purpose
This document defines the software requirements for an academic, end-to-end demonstrable, privacy-preserving Blockchain-Based Voting System. The application guarantees single-use voting eligibility, ballot confidentiality, voter anonymity, and independent public verifiability without relying on central trust.

#### 1.2 System Scope
The system consists of:
1. **Mobile Application**: React Native CLI mobile client for voters, administrators, and party representatives.
2. **Backend Gateway**: Node.js/Express service interfacing with MongoDB and coordinating authentication, eligibility metadata, and blockchain relay.
3. **Smart Contracts**: Solidity EVM contracts on Hardhat local network (and testnet) managing election lifecycle, nullifier deduplication, and tally commitment.
4. **Independent Verifier**: A standalone verification tool enabling election observers to inspect cryptographic proofs and tallies without privileged access.

---

### 2. Overall Description
#### 2.1 User Classes and Characteristics
- **Election Commission Administrator**: Creates and schedules elections, registers political parties, imports eligible voter identities, registers credential commitment roots, opens/closes voting, and publishes final tallies.
- **Eligible Voter**: Obtains single-use voting credentials, verifies active election status, selects a party/candidate, casts an encrypted ballot with a zero-knowledge membership proof, and verifies ballot inclusion.
- **Political Party Representative**: Views approved candidate metadata, monitors voting milestones, and views public audit records.
- **Public Observer**: Independently executes verification routines against published blockchain events and tally commitments.

#### 2.2 Operating Environment
- Mobile: Android (API 28+) via React Native CLI.
- Backend: Node.js v20+ / v22+, MongoDB 7.0+.
- Smart Contracts: Solidity 0.8.28 on EVM / Hardhat.

---

### 3. System Features & Functional Requirements
#### 3.1 Authentication & Role-Based Access (FR-AUTH)
- FR-AUTH-1: Secure user registration and password hashing using bcrypt.
- FR-AUTH-2: JWT session issuance with short lifetimes and role-based middleware enforcement (`admin`, `voter`, `party_rep`).
- FR-AUTH-3: Rate limiting on authentication routes to mitigate brute-force attempts.

#### 3.2 Election Lifecycle (FR-ELEC)
- FR-ELEC-1: Election creation with title, description, start time, end time, and candidate options.
- FR-ELEC-2: Configuration freezing: candidate lists and election parameters cannot be altered once the election is published and opened.
- FR-ELEC-3: Strict state machine: `Draft` -> `Frozen` -> `Open` -> `Closed` -> `Tallied` -> `Published`.

#### 3.3 Digital Voting Entitlements & Single-Use Enforcement (FR-CRED)
- FR-CRED-1: Exactly one voting entitlement is issued to an approved voter identity per election.
- FR-CRED-2: Credential commitment tree (Merkle tree) root is registered on the smart contract before voting commences.
- FR-CRED-3: Voting burns an election-specific nullifier on-chain: `usedNullifiers[electionId][nullifier] = true`.

#### 3.4 Anonymous Encrypted Ballot Submission (FR-VOTE)
- FR-VOTE-1: Ballots are encrypted client-side using election public encryption keys.
- FR-VOTE-2: Submission carries a zero-knowledge membership proof proving inclusion in the credential tree without exposing voter identity.
- FR-VOTE-3: Double-voting attempts using an identical nullifier are rejected by smart-contract revert.

#### 3.5 Tallying & Independent Verifiability (FR-TALLY)
- FR-TALLY-1: Ballots remain encrypted until election closing.
- FR-TALLY-2: Tally publication includes decrypted aggregate counts, trustee share proofs, and cryptographic commitments.
- FR-TALLY-3: Standalone verifier CLI reproduces the aggregate tally and validates all nullifiers against on-chain logs.

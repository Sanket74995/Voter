# Blockchain-Based Voting System
### Full-Stack Mobile Application | React Native CLI | Node.js & MongoDB | Solidity & Hardhat | Independent Verifier

An end-to-end demonstrable, privacy-preserving, decentralized voting system designed for academic evaluation. Built using a monorepo architecture with genuine EVM smart contracts, client-side ballot encryption, deterministic nullifiers, single-use voting credentials, role-based access control, and an independent election-results verification engine.

---

## Key Features

1. **One-Time Anonymous Credentials**:
   - Eligible voters register a public commitment $C = \text{Hash}(sk, salt)$ without disclosing their secret key.
   - The Election Commission aggregates commitments into a Merkle tree root registered on-chain.
   - Ballots consume an election-specific nullifier $\text{Nullifier} = \text{Hash}(sk, \text{electionId})$.
2. **Double-Voting Prevention**:
   - Enforced by Solidity smart contracts via atomic state mapping `usedNullifiers[electionId][nullifier]`.
   - Repeated submissions using the same nullifier revert with custom error `NullifierAlreadyUsed`.
3. **Client-Side Ballot Encryption**:
   - Voter choice is encrypted on the device with the election's public key before broadcast.
   - Plaintext choices are never sent to the backend, stored in MongoDB, or emitted in blockchain events.
4. **Verifiable Tallying & Result Withholding**:
   - Candidate-level counts are strictly withheld until the election is closed and certified.
   - Published tallies are verified against on-chain ballot counts and committed via `TallyRegistry.sol`.
5. **Independent Public Verifier**:
   - Standalone CLI tool enabling election observers to audit published artifacts without privileged access.
6. **Polished React Native CLI Mobile App**:
   - 14 customized civic technology screens with role-aware dashboards (Voter, Administrator, Party Representative).
   - Examiner quick-fill chips for instantaneous demonstration of different roles.

---

## Monorepo Architecture

```
blockchain-voting-system/
├── mobile/          # React Native CLI Application (JavaScript)
│   ├── android/     # Native Android build configuration (Gradle 9.4.1)
│   ├── src/         # Screens, components, services, crypto, theme, navigation
│   └── __tests__/   # Mobile Jest unit and component tests
├── backend/         # Express.js REST API Gateway & MongoDB Interface
│   ├── src/         # Models, controllers, routes, middleware, audit, blockchain
│   ├── tests/       # Supertest & Jest backend integration tests
│   └── server.js    # Express HTTP server
├── contracts/       # Solidity Smart Contracts & Hardhat EVM Environment
│   ├── contracts/   # ElectionManager.sol, Voting.sol, ProofVerifier.sol, TallyRegistry.sol
│   ├── test/        # Hardhat unit and security tests
│   └── scripts/     # deploy.js deployment automation
├── verifier/        # Standalone Independent Election Verifier CLI
│   ├── src/         # Verification engine
│   └── tests/       # Verifier test suite
└── docs/            # Comprehensive engineering documentation
    ├── SRS.md
    ├── ARCHITECTURE.md
    ├── DECISIONS.md
    ├── THREAT_MODEL.md
    ├── API_DOCUMENTATION.md
    ├── TESTING_REPORT.md
    ├── DEPLOYMENT.md
    └── IMPLEMENTATION_STATUS.md
```

---

## Technology Stack

- **Mobile**: React Native CLI (`0.87.1`), React (`19.2.3`), JavaScript
- **Backend**: Node.js (`v22.14.0`), Express (`4.21.2`), Mongoose (`8.10.1`), JWT, bcryptjs
- **Database**: MongoDB (Local Windows Service on `127.0.0.1:27017`)
- **Blockchain**: Solidity (`0.8.28`), Hardhat (`2.22.18`), ethers.js (`6.13.5`)
- **Testing**: Jest, Supertest, Hardhat Chai Matchers, React Native Test Renderer

---

## Quick Start & Running Locally

### 1. Prerequisites Check
Ensure Node.js v20+, MongoDB, and Java are running:
```bash
node --version
npm --version
java -version
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root and in `backend/`:
```bash
cp .env.example .env
```

### 3. Deploy Smart Contracts to Local Hardhat Network
In a terminal, compile and deploy the contracts:
```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js
```
The deployment manifest will automatically be written to `backend/src/blockchain/deployedContracts.json`.

### 4. Start the Express Backend
```bash
cd backend
npm start
```
Verify the server is healthy by visiting `http://127.0.0.1:5000/health`.

### 5. Launch the React Native Mobile Application
```bash
cd mobile
npx react-native start
```
To run on an Android emulator or attached device:
```bash
npx react-native run-android
```

---

## Automated Test Suite (32 Passed, 0 Failed)

Run individual test suites:

```bash
# 1. Smart Contracts Security Tests (12 passing tests)
npm --prefix contracts test

# 2. Backend & Database Integration Tests (12 passing tests)
npm --prefix backend test

# 3. Independent Verifier Tests (4 passing tests)
npm --prefix verifier test

# 4. Mobile Screens & Component Tests (4 passing tests)
npm --prefix mobile test
```

Or run all from root:
```bash
npm run test:contracts
npm run test:backend
npm run test:verifier
npm run test:mobile
```

---

## Demonstration Workflow for Academic Review

1. **Sign In as Administrator**:
   - Use the **👔 Admin** quick-fill chip on the Login Screen (`commissioner@test.com`).
   - Create a new election using the guided 3-step Wizard (`Title`, `Dates`, `Approved Candidates`).
   - Navigate to Voter Registry and approve eligibility for `VOTER-2026-999`.
   - Click **Freeze Config** to compute and lock the Merkle commitment root on-chain.
   - Click **Open Voting Window** to activate the election.
2. **Sign In as Voter**:
   - Use the **🗳️ Voter** quick-fill chip (`alice@test.com`).
   - View eligible active elections.
   - Click **Obtain Digital Credential** to register a public commitment.
   - Select a candidate option and review the manifesto.
   - Click **Encrypt & Cast Ballot**. Watch the real-time client encryption and blockchain broadcast pipeline.
   - Receive a **Privacy-Safe Ballot Receipt** containing transaction hash and burned nullifier.
3. **Verify Double-Voting Prevention**:
   - Attempt to vote a second time with the same credential. The smart contract immediately rejects the transaction with `NullifierAlreadyUsed`.
4. **Close & Publish Results**:
   - Switch back to Admin, click **Close Voting Window**, then click **Execute Tally & Publish**.
   - Review certified vote counts, turnout percentages, and on-chain tally commitments.
5. **Run Independent Verifier**:
   - Execute `npm --prefix verifier test` to audit on-chain artifacts independently.

---

## Project Documentation
Detailed specifications are available in the [`docs/`](file:///c:/Users/Sanket/Desktop/college/Voting/docs) directory:
- [Software Requirements Specification (SRS)](file:///c:/Users/Sanket/Desktop/college/Voting/docs/SRS.md)
- [System Architecture](file:///c:/Users/Sanket/Desktop/college/Voting/docs/ARCHITECTURE.md)
- [Architectural & Cryptographic Decisions (ADR)](file:///c:/Users/Sanket/Desktop/college/Voting/docs/DECISIONS.md)
- [Threat Model & Security Analysis](file:///c:/Users/Sanket/Desktop/college/Voting/docs/THREAT_MODEL.md)
- [REST API Documentation](file:///c:/Users/Sanket/Desktop/college/Voting/docs/API_DOCUMENTATION.md)
- [Test Execution & Security Validation Report](file:///c:/Users/Sanket/Desktop/college/Voting/docs/TESTING_REPORT.md)
- [Deployment & Setup Guide](file:///c:/Users/Sanket/Desktop/college/Voting/docs/DEPLOYMENT.md)
- [Implementation Progress Log](file:///c:/Users/Sanket/Desktop/college/Voting/docs/IMPLEMENTATION_STATUS.md)
# Voter

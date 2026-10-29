# API Documentation: Blockchain-Based Voting System

## Base URL
- Development Localhost: `http://127.0.0.1:5000/api`
- Android Emulator Loopback: `http://10.0.2.2:5000/api`

---

## 1. Authentication Endpoints

### POST `/api/auth/register`
Register a new user identity record.
- **Request Body**:
  ```json
  {
    "voterId": "VOTER-2026-001",
    "fullName": "Alice Johnson",
    "email": "alice@example.edu",
    "password": "SecurePassword123!",
    "role": "voter" // "voter" | "admin" | "party_rep"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Registration successful.",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "67a9...",
        "voterId": "VOTER-2026-001",
        "fullName": "Alice Johnson",
        "email": "alice@example.edu",
        "role": "voter"
      }
    }
  }
  ```

### POST `/api/auth/login`
Authenticate with email or Voter ID and password.
- **Request Body**:
  ```json
  {
    "identifier": "VOTER-2026-001",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**: Returns JWT session token and user profile.

---

## 2. Election Endpoints

### GET `/api/elections`
List elections. Supports optional query: `?status=OPEN`.
- **Response `200 OK`**: Returns array of election summaries.

### GET `/api/elections/:id`
Fetch single election details with approved candidates.

### POST `/api/elections` (Admin Only)
Create an election in `DRAFT` state.
- **Request Body**:
  ```json
  {
    "title": "General Election 2026",
    "description": "National democratic process",
    "startTime": "2026-10-15T00:00:00.000Z",
    "endTime": "2026-10-22T00:00:00.000Z"
  }
  ```

### POST `/api/elections/:id/freeze` (Admin Only)
Freezes election parameters and computes the Merkle commitment root of all eligible voters. Requires at least one eligible voter, and every eligible voter must have an active credential before this endpoint succeeds. Eligibility and credential membership cannot change after freezing.

### POST `/api/elections/:id/open` (Admin Only)
Transitions state from `FROZEN` to `OPEN`. An election cannot be opened directly from `DRAFT`.

### POST `/api/elections/:id/close` (Admin Only)
Transitions state to `CLOSED` terminating ballot submission.

---

## 3. Eligibility & Credential Endpoints

### POST `/api/eligibility/register` (Admin Only)
Import eligible voter for an election.
- **Request Body**:
  ```json
  {
    "electionId": "ELEC-101",
    "voterId": "VOTER-2026-001"
  }
  ```

### GET `/api/eligibility/my/:electionId` (Authenticated Voter)
Check voter's eligibility and issuance state for an election.

### POST `/api/eligibility/issue-credential` (Authenticated Voter)
Registers voter's public commitment `C = Hash(secret, salt)`. Credentials can only be issued while the election is in `DRAFT`; all voters must obtain credentials before the administrator freezes the election.
- **Request Body**:
  ```json
  {
    "electionId": "ELEC-101",
    "commitment": "0x5a3f..."
  }
  ```

### GET `/api/eligibility/proof/:electionId?commitment=0x...`
Returns the sibling hashes proving inclusion in the registered Merkle root.

---

## 4. Voting Endpoints

### POST `/api/ballots/prepare` (Authenticated Voter)
Fetches election public encryption key and candidate list.

### POST `/api/ballots/submit` (Rate Limited)
Anonymous submission relayed to the EVM contract.
- **Request Body**:
  ```json
  {
    "electionId": "ELEC-101",
    "nullifier": "0x98f...",
    "ballotCommitment": "0x12c...",
    "encryptedBallot": "0x7b...",
    "leafCommitment": "0x5a3f...",
    "merkleProof": ["0xabc...", "0xdef..."]
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Ballot successfully validated and recorded on the blockchain.",
    "data": {
      "receipt": {
        "electionId": "ELEC-101",
        "nullifier": "0x98f...",
        "ballotCommitment": "0x12c...",
        "transactionHash": "0x4a1...",
        "blockNumber": 124,
        "status": "ACCEPTED_ON_CHAIN"
      }
    }
  }
  ```

### GET `/api/ballots/status/:electionId/:nullifier`
Query smart contract storage to check whether a nullifier is consumed.

---

## 5. Results & Verification Endpoints

### GET `/api/results/:id`
- If election is `OPEN`: Returns aggregate turnout only (candidate counts withheld).
- If election is `PUBLISHED`: Returns certified candidate vote counts, percentages, and proofs.

### POST `/api/results/:id/tally` (Admin Only)
Computes tally of decrypted ballots, submits tally commitment to `TallyRegistry.sol`, and sets status to `PUBLISHED`.

### GET `/api/results/:id/public-record`
Returns all public artifacts required by the Independent Verifier CLI.

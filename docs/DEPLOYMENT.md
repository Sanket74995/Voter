# Deployment Guide: Blockchain-Based Voting System

## 1. Prerequisites
- Node.js `v20.x` or `v22.x`
- npm `10.x+`
- MongoDB local service or MongoDB Atlas URI
- OpenJDK 17 or 21 (for Android builds)
- Android SDK with platform-tools (ADB)

---

## 2. Local Development Startup (Step-by-Step)

### Step 2.1: Start Local EVM Hardhat Node
```bash
cd contracts
npx hardhat node
```
This starts a local JSON-RPC node on `http://127.0.0.1:8545` with 20 pre-funded test accounts.

### Step 2.2: Deploy Smart Contracts
In a new terminal:
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```
This automatically deploys `ElectionManager`, `ProofVerifier`, `Voting`, and `TallyRegistry`, links them, and writes the deployment manifest to `backend/src/blockchain/deployedContracts.json`.

### Step 2.3: Start Node.js Express Backend
Ensure MongoDB is running, then:
```bash
cd backend
npm start
```
The server will start on `http://127.0.0.1:5000`. You can test health by visiting `http://127.0.0.1:5000/health`.

### Step 2.4: Launch React Native Mobile Application
In a new terminal:
```bash
cd mobile
npx react-native start
```
To launch on an attached Android emulator or device:
```bash
npx react-native run-android
```
*(Note: If testing on Android Emulator, the mobile app connects to the backend at `http://10.0.2.2:5000/api` automatically).*

---

## 3. Public Testnet Deployment (e.g. Sepolia / Polygon Amoy)

### Step 3.1: Configure Testnet in `contracts/hardhat.config.js`
```javascript
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
  },
}
```

### Step 3.2: Deploy to Testnet
```bash
cd contracts
npx hardhat run scripts/deploy.js --network sepolia
```

### Step 3.3: Update Backend Configuration
Set in `backend/.env`:
```env
HARDHAT_RPC_URL=https://rpc.sepolia.org
ELECTION_MANAGER_ADDRESS=0x...
VOTING_CONTRACT_ADDRESS=0x...
PROOF_VERIFIER_ADDRESS=0x...
TALLY_REGISTRY_ADDRESS=0x...
```

---

## 4. Running the Independent Verifier
To audit an election independently:
```bash
node verifier/src/index.js
npm --prefix verifier test
```

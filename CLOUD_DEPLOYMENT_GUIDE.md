# 24/7 Production Cloud Deployment Guide

> **Deploy your Voting System to the Cloud — Runs Permanently Without Your Laptop Turned On!**

---

## Architecture Overview

```
┌─────────────────────────────────┐
│     Civic Voting Mobile App     │ (Installed Permanently on Android Phone)
└────────────────┬────────────────┘
                 │ HTTPS (e.g. https://voting-backend.onrender.com/api)
                 ▼
┌─────────────────────────────────┐
│  Express.js Backend on Render   │ (Free 24/7 Cloud Hosting at Render.com)
└────────┬───────────────┬────────┘
         │               │
         ▼               ▼
┌─────────────────┐  ┌───────────────────────────────────┐
│  MongoDB Atlas  │  │  Polygon Amoy / Ethereum Sepolia  │
│  (Cloud DB)     │  │  (Free Public EVM Blockchain)     │
└─────────────────┘  └───────────────────────────────────┘
```

---

## Step 1: Set Up Free Cloud MongoDB (MongoDB Atlas)

1. Go to **[mongodb.com/atlas](https://www.mongodb.com/atlas)** and sign up for a free account.
2. Click **Create a Deployment** ➔ Select **M0 (Free forever)** cluster.
3. Under **Security Quickstart**:
   - **Username & Password**: Choose an admin username & password (e.g., `admin` / `VotingSecure2026`). *Save these!*
   - Click **Create User**.
4. Under **Network Access** (IP Access List):
   - Click **Add IP Address** ➔ Choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *(This allows your Render cloud server to connect to MongoDB).*
5. Click **Connect** ➔ **Drivers (Node.js)**:
   - Copy your connection string:
     ```
     mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/blockchain_voting?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual database user password.

---

## Step 2: Deploy Smart Contracts to Public Blockchain (Free)

We have pre-configured **Polygon Amoy** and **Ethereum Sepolia** testnets in `contracts/hardhat.config.js`.

### 1. Get Free Testnet Gas Tokens:
- You need a tiny amount of free testnet tokens to pay deployment gas.
- **Polygon Amoy Faucet**: [faucet.polygon.technology](https://faucet.polygon.technology/) (enter your MetaMask wallet address).
- **Sepolia Faucet**: [sepoliafaucet.com](https://sepoliafaucet.com/) or [cloud.google.com/application/web3/faucet/ethereum/sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).

### 2. Export Private Key:
- In MetaMask: Account Details ➔ **Show Private Key** ➔ Copy it.

### 3. Deploy with One Command:
Open PowerShell on your PC and run:

```powershell
cd c:\Users\Sanket\Desktop\college\Voting\contracts

# For Polygon Amoy (Recommended - Fast & Free):
$env:DEPLOYER_PRIVATE_KEY="your_private_key_here"
npm run deploy:amoy

# OR for Ethereum Sepolia:
# $env:DEPLOYER_PRIVATE_KEY="your_private_key_here"
# npm run deploy:sepolia
```

When finished, the terminal will print:
```
[Deployed] ElectionManager: 0x...
[Deployed] ProofVerifier:   0x...
[Deployed] Voting:          0x...
[Deployed] TallyRegistry:   0x...
```
*Save these 4 contract addresses!*

---

## Step 3: Deploy Backend to Free Cloud Hosting (Render.com)

1. Push your code to GitHub:
   ```powershell
   cd c:\Users\Sanket\Desktop\college\Voting
   git add .
   git commit -m "feat: prepare project for cloud deployment"
   git push origin Deploy_Test
   ```
2. Go to **[Render.com](https://render.com)** and sign in with GitHub.
3. Click **New +** (top right) ➔ Select **Web Service**.
4. Choose your GitHub repository: `Sanket74995/Voter` (Branch: `Deploy_Test` or `main`).
5. Configure the service:
   - **Name**: `blockchain-voting-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Scroll down to **Environment Variables** and add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `10000` | Render standard port |
| `MONGODB_URI` | `mongodb+srv://admin:pass@cluster0...` | Your Atlas connection string from Step 1 |
| `JWT_SECRET` | `super_secret_voting_jwt_key_2026_xyz` | Random 32+ character string |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `BLOCKCHAIN_RPC_URL` | `https://rpc-amoy.polygon.technology` | Public testnet RPC |
| `DEPLOYER_PRIVATE_KEY` | `your_private_key_here` | Used by relayer to sponsor voter gas |
| `ELECTION_MANAGER_ADDRESS` | `0x...` | From Step 2 deployment |
| `PROOF_VERIFIER_ADDRESS` | `0x...` | From Step 2 deployment |
| `VOTING_CONTRACT_ADDRESS` | `0x...` | From Step 2 deployment |
| `TALLY_REGISTRY_ADDRESS` | `0x...` | From Step 2 deployment |

7. Click **Deploy Web Service**!
8. Within 2 minutes, Render will show `Live` with your permanent public URL:
   `https://blockchain-voting-backend.onrender.com`

*Test it in your browser: open `https://blockchain-voting-backend.onrender.com/health` — it will return `{"status":"UP"}`!*

---

## Step 4: Seed Initial Accounts & Elections on Cloud MongoDB

To load the initial test accounts (Admin, Voter, Candidates) onto your new cloud MongoDB Atlas database, run this one-time command from your PC:

```powershell
cd c:\Users\Sanket\Desktop\college\Voting\backend
$env:MONGODB_URI="your_mongodb_atlas_connection_string_here"
node src/utils/seedVoters.js
```

---

## Step 5: Connect Mobile App & Build Final Permanent APK

1. In [`mobile/src/services/api.js`](file:///c:/Users/Sanket/Desktop/college/Voting/mobile/src/services/api.js):
   Set the default URL to your new Render cloud endpoint:
   ```javascript
   const DEFAULT_API_BASE_URL = 'https://blockchain-voting-backend.onrender.com/api';
   ```
2. Build the final standalone Release APK:
   ```powershell
   cd c:\Users\Sanket\Desktop\college\Voting\mobile\android
   .\gradlew.bat assembleRelease
   ```
3. Copy the updated standalone APK [`CivicVotingApp.apk`](file:///c:/Users/Sanket/Desktop/college/Voting/CivicVotingApp.apk) to your phone.

---

### 🎉 Congratulations!
Your voting application is now **fully cloud-native and decentralized**:
- Your phone app works **anywhere in the world** on 4G, 5G, or Wi-Fi.
- Ballots are stored permanently on the **public EVM blockchain**.
- The backend and database run **24/7 on the cloud** with zero reliance on your laptop!

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blockchain_voting',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_voting_system_academic_2026_xyz',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  HARDHAT_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545',
  DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  ELECTION_MANAGER_ADDRESS: process.env.ELECTION_MANAGER_ADDRESS || '',
  VOTING_CONTRACT_ADDRESS: process.env.VOTING_CONTRACT_ADDRESS || '',
  PROOF_VERIFIER_ADDRESS: process.env.PROOF_VERIFIER_ADDRESS || '',
  TALLY_REGISTRY_ADDRESS: process.env.TALLY_REGISTRY_ADDRESS || '',
};

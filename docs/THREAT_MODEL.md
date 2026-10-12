# Threat Model & Cryptographic Security Analysis

## 1. Assets to Protect
1. **Voter Privacy**: The secret link between a voter's real identity and their selected candidate/party.
2. **Election Integrity**: Guarantee that only eligible voters can cast a ballot, and at most once.
3. **Tally Verifiability**: Guarantee that all valid ballots are counted and no fraudulent ballots are injected.
4. **Availability**: Preventing Denial of Service against election submission windows.

## 2. Threat Actors & Attack Scenarios
- **Malicious Administrator**:
  - *Goal*: Discover who voted for which party or stuff ballots.
  - *Mitigation*: Administrator only receives the public credential commitment `C = Hash(sk, salt)` and cannot decrypt individual ballots. Ballots are encrypted under an election public key with split trustee keys.
- **Double Voter (Malicious Voter)**:
  - *Goal*: Vote multiple times using the same credential or multiple credentials.
  - *Mitigation*: Database allows only one credential per voter per election. The smart contract consumes the election-specific nullifier on the first vote. Repeated transactions revert atomically.
- **Eavesdropper / Network Observer**:
  - *Goal*: Correlate mobile IP addresses or transaction sender addresses with ballot options.
  - *Mitigation*: Ballot submission utilizes a backend relay service or anonymous RPC node; ballots are encrypted payloads.
- **Compromised Database Operator**:
  - *Goal*: Steal plaintext votes or forge nullifier states.
  - *Mitigation*: Plaintext votes and nullifiers are NEVER stored in MongoDB. The blockchain is the sole authoritative state for nullifiers.

## 3. Residual Risks & Trust Assumptions
- Device malware on voter phone (keylogger / screen recording).
- Timing correlation attacks if voter volume is extremely low (anonymity set size < 10).
- Collusion among all threshold trustees holding decryption shares.

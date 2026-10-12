const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Election = require('../src/models/Election');
const Party = require('../src/models/Party');
const VoterEligibility = require('../src/models/VoterEligibility');
const CredentialIssuance = require('../src/models/CredentialIssuance');
const { generateCredentialSecret, computeCommitment } = require('../src/utils/crypto');

describe('Backend API & Integration Test Suite', () => {
  let adminToken;
  let voterToken;
  let adminUser;
  let voterUser;
  let createdElectionId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(env.MONGODB_URI);
    // Clear test collections
    await User.deleteMany({ email: /@test\.com$/ });
    await Election.deleteMany({ title: /Test Election/ });
    await Party.deleteMany({});
    await VoterEligibility.deleteMany({});
    await CredentialIssuance.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /health should return 200 UP status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });
  });

  describe('2. Authentication & Role-Based Authorization', () => {
    it('should register an admin user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          voterId: 'ADMIN-2026-001',
          fullName: 'Chief Election Commissioner',
          email: 'commissioner@test.com',
          password: 'AdminPassword123!',
          role: 'admin',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');
      adminToken = res.body.data.token;
      adminUser = res.body.data.user;
    });

    it('should register a voter user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          voterId: 'VOTER-2026-999',
          fullName: 'Alice Voter',
          email: 'alice@test.com',
          password: 'VoterPassword123!',
          role: 'voter',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('voter');
      voterToken = res.body.data.token;
      voterUser = res.body.data.user;
    });

    it('should reject registration with duplicate voter ID', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          voterId: 'VOTER-2026-999', // duplicate
          fullName: 'Duplicate Person',
          email: 'dup@test.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should login voter using identifier and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'alice@test.com',
          password: 'VoterPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject unauthorized access to admin endpoints by ordinary voter', async () => {
      const res = await request(app)
        .post('/api/elections')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          title: 'Unauthorized Election',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Election Management Lifecycle', () => {
    it('Admin creates an election in DRAFT state', async () => {
      const res = await request(app)
        .post('/api/elections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Election 2026',
          description: 'Official collegiate voting trial',
          startTime: new Date(),
          endTime: new Date(Date.now() + 86400000), // 24 hours later
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.election.status).toBe('DRAFT');
      createdElectionId = res.body.data.election.electionId;
    });

    it('Registers candidate options for the election', async () => {
      const p1 = await request(app)
        .post('/api/parties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          electionId: createdElectionId,
          name: 'National Unity Party',
          candidateName: 'Dr. Jane Smith',
          symbol: 'Sun',
        });
      expect(p1.status).toBe(201);

      const p2 = await request(app)
        .post('/api/parties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          electionId: createdElectionId,
          name: 'Green Future Alliance',
          candidateName: 'John Appleseed',
          symbol: 'Tree',
        });
      expect(p2.status).toBe(201);
    });

    it('Imports voter eligibility and issues digital voting credential commitment', async () => {
      // 1. Admin imports voter eligibility
      const elRes = await request(app)
        .post('/api/eligibility/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          electionId: createdElectionId,
          voterId: voterUser.voterId,
        });
      expect(elRes.status).toBe(201);

      // 2. Voter checks eligibility
      const checkRes = await request(app)
        .get(`/api/eligibility/my/${createdElectionId}`)
        .set('Authorization', `Bearer ${voterToken}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.isEligible).toBe(true);

      // 3. Voter generates credential secret & salt locally and submits commitment
      const secret = generateCredentialSecret();
      const salt = generateCredentialSecret();
      const commitment = computeCommitment(secret, salt);

      const issueRes = await request(app)
        .post('/api/eligibility/issue-credential')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          electionId: createdElectionId,
          commitment,
        });
      expect(issueRes.status).toBe(201);
      expect(issueRes.body.data.commitment).toBe(commitment);

      // 4. Double issuance MUST be rejected
      const dupRes = await request(app)
        .post('/api/eligibility/issue-credential')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({
          electionId: createdElectionId,
          commitment,
        });
      expect(dupRes.status).toBe(409);
    });

    it('Admin freezes election and opens it for voting', async () => {
      // Freeze: calculates Merkle root
      const freezeRes = await request(app)
        .post(`/api/elections/${createdElectionId}/freeze`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(freezeRes.status).toBe(200);
      expect(freezeRes.body.data.election.status).toBe('FROZEN');
      expect(freezeRes.body.data.election.credentialRoot).toBeDefined();

      // Open
      const openRes = await request(app)
        .post(`/api/elections/${createdElectionId}/open`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(openRes.status).toBe(200);
      expect(openRes.body.data.election.status).toBe('OPEN');
    });

    it('Voter prepares ballot and receives election parameters', async () => {
      const res = await request(app)
        .post('/api/ballots/prepare')
        .set('Authorization', `Bearer ${voterToken}`)
        .send({ electionId: createdElectionId });

      expect(res.status).toBe(200);
      expect(res.body.data.candidates.length).toBe(2);
      expect(res.body.data.credentialRoot).toBeDefined();
    });

    it('Results are withheld while election is still OPEN', async () => {
      const res = await request(app).get(`/api/results/${createdElectionId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isPublished).toBe(false);
      // Candidate counts are NOT exposed
      expect(res.body.data.candidateResults).toBeUndefined();
    });
  });
});

const DEFAULT_API_BASE_URL = 'http://10.0.2.2:5000/api';

class ApiClient {
  constructor() {
    this.baseUrl = DEFAULT_API_BASE_URL;
    this.token = null;
  }

  setBaseUrl(url) {
    this.baseUrl = url.endsWith('/api') ? url : `${url}/api`;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      // Provide clean error message
      throw new Error(err.message || 'Network request failed. Ensure backend is running.');
    }
  }

  // Auth endpoints
  async login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async register(voterId, fullName, email, password, role = 'voter', phoneNumber = '') {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ voterId, fullName, email, password, role, phoneNumber }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Elections
  async getElections(status = null) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/elections${query}`);
  }

  async getElectionById(id) {
    return this.request(`/elections/${id}`);
  }

  async createElection(title, description, startTime, endTime) {
    return this.request('/elections', {
      method: 'POST',
      body: JSON.stringify({ title, description, startTime, endTime }),
    });
  }

  async freezeElection(id) {
    return this.request(`/elections/${id}/freeze`, { method: 'POST' });
  }

  async openElection(id) {
    return this.request(`/elections/${id}/open`, { method: 'POST' });
  }

  async closeElection(id) {
    return this.request(`/elections/${id}/close`, { method: 'POST' });
  }

  // Parties
  async getElectionParties(electionId) {
    return this.request(`/parties/election/${electionId}`);
  }

  async registerParty(electionId, name, candidateName, symbol, symbolUrl = '', manifestoSummary = '') {
    return this.request('/parties', {
      method: 'POST',
      body: JSON.stringify({ electionId, name, candidateName, symbol, symbolUrl, manifestoSummary }),
    });
  }

  // Eligibility & Credentials
  async checkMyEligibility(electionId) {
    return this.request(`/eligibility/my/${electionId}`);
  }

  async issueCredential(electionId, commitment) {
    return this.request('/eligibility/issue-credential', {
      method: 'POST',
      body: JSON.stringify({ electionId, commitment }),
    });
  }

  async getCredentialProof(electionId, commitment) {
    return this.request(`/eligibility/proof/${electionId}?commitment=${encodeURIComponent(commitment)}`);
  }

  async registerVoterEligibility(electionId, voterId) {
    return this.request('/eligibility/register', {
      method: 'POST',
      body: JSON.stringify({ electionId, voterId }),
    });
  }

  async revokeCredential(electionId, voterId, reason) {
    return this.request('/eligibility/revoke-credential', {
      method: 'POST',
      body: JSON.stringify({ electionId, voterId, reason }),
    });
  }

  // Ballots
  async prepareBallot(electionId) {
    return this.request('/ballots/prepare', {
      method: 'POST',
      body: JSON.stringify({ electionId }),
    });
  }

  async submitBallot(payload) {
    return this.request('/ballots/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getBallotStatus(electionId, nullifier) {
    return this.request(`/ballots/status/${electionId}/${encodeURIComponent(nullifier)}`);
  }

  // Results
  async getResults(electionId) {
    return this.request(`/results/${electionId}`);
  }

  async tallyAndPublish(electionId) {
    return this.request(`/results/${electionId}/tally`, { method: 'POST' });
  }

  async getPublicElectionRecord(electionId) {
    return this.request(`/results/${electionId}/public-record`);
  }
}

export const api = new ApiClient();

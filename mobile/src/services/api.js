const DEFAULT_API_BASE_URL = 'https://voter-31oa.onrender.com/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class ApiClient {
  constructor() {
    this.baseUrl = DEFAULT_API_BASE_URL;
    this.token = null;
  }

  async initialize() {
    const savedBaseUrl = await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY);
    if (savedBaseUrl) {
      this.baseUrl = this.normalizeBaseUrl(savedBaseUrl);
    }
    return this.baseUrl;
  }

  normalizeBaseUrl(url) {
    const trimmedUrl = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^/]+(?:\/.*)?$/i.test(trimmedUrl)) {
      throw new Error('Enter a valid server URL beginning with http:// or https://.');
    }
    return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`;
  }

  async setBaseUrl(url) {
    const baseUrl = this.normalizeBaseUrl(url);
    await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, baseUrl);
    this.baseUrl = baseUrl;
    return this.baseUrl;
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

    const controller = new AbortController();
    const timeoutMs = options.timeout || 8000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(
          `Connection timed out (${this.baseUrl}). Check that the backend is running and that your phone and PC can reach each other.`
        );
      }
      if (err.message === 'Network request failed') {
        throw new Error(
          `Cannot reach ${this.baseUrl}. Start the backend. For an Android emulator use 10.0.2.2; for a USB-connected phone run "adb reverse tcp:5000 tcp:5000"; for Wi-Fi use your PC's local IP.`
        );
      }
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

  async bulkRegisterVoterEligibility(electionId, voterIds) {
    return this.request('/eligibility/bulk-register', {
      method: 'POST',
      body: JSON.stringify({ electionId, voterIds }),
    });
  }

  async getRegisteredVoters() {
    return this.request('/eligibility/registered-voters');
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

export { ApiClient };
export const api = new ApiClient();

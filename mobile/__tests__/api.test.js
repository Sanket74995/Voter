jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from '../src/services/api';

describe('API server configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(null);
  });

  it('saves and restores the configured server URL', async () => {
    const client = new ApiClient();
    const savedUrl = await client.setBaseUrl('http://192.168.1.20:5000/');

    expect(savedUrl).toBe('http://192.168.1.20:5000/api');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@voter/apiBaseUrl',
      'http://192.168.1.20:5000/api'
    );

    AsyncStorage.getItem.mockResolvedValue(savedUrl);
    const restartedClient = new ApiClient();
    await restartedClient.initialize();
    expect(restartedClient.baseUrl).toBe(savedUrl);
  });

  it('rejects invalid URLs without changing the configured address', async () => {
    const client = new ApiClient();
    const initialUrl = client.baseUrl;

    await expect(client.setBaseUrl('not a URL')).rejects.toThrow(
      'Enter a valid server URL'
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(client.baseUrl).toBe(initialUrl);
  });
});

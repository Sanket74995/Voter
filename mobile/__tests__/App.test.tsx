import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { OnboardingScreen } from '../src/screens/onboarding/OnboardingScreen';
import { LoginScreen } from '../src/screens/auth/LoginScreen';
import { BallotVerificationScreen } from '../src/screens/verification/BallotVerificationScreen';

jest.setTimeout(30000);

describe('React Native CLI App Test Suite', () => {
  test('renders main App container and SplashScreen correctly', async () => {
    let tree: any;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<App />);
    });
    expect(tree).toBeDefined();
  });

  test('renders OnboardingScreen with privacy principles', async () => {
    let tree: any;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<OnboardingScreen onGetStarted={() => {}} />);
    });
    expect(tree).toBeDefined();
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('One-Time Anonymous Credentials');
    expect(str).toContain('End-to-End Encrypted Ballots');
  });

  test('renders LoginScreen with input controls and demo quick fill buttons', async () => {
    let tree: any;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<LoginScreen onLoginSuccess={() => {}} />);
    });
    expect(tree).toBeDefined();
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('Civic Voting Portal');
    expect(str).toContain('Examiner Quick Fill');
  });

  test('renders BallotVerificationScreen with verification controls', async () => {
    let tree: any;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<BallotVerificationScreen onBack={() => {}} />);
    });
    expect(tree).toBeDefined();
    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain('Independent Inclusion Verification');
  });
});

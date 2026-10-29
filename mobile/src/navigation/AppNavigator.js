import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';

// Screen imports
import { SplashScreen } from '../screens/splash/SplashScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { VoterDashboardScreen } from '../screens/voter/VoterDashboardScreen';
import { ElectionDetailsScreen } from '../screens/elections/ElectionDetailsScreen';
import { BallotScreen } from '../screens/ballot/BallotScreen';
import { VoteSubmissionScreen } from '../screens/ballot/VoteSubmissionScreen';
import { BallotVerificationScreen } from '../screens/verification/BallotVerificationScreen';
import { ResultsScreen } from '../screens/results/ResultsScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { CreateElectionWizardScreen } from '../screens/admin/CreateElectionWizardScreen';
import { VoterEligibilityManagementScreen } from '../screens/admin/VoterEligibilityManagementScreen';
import { PartyRepDashboardScreen } from '../screens/parties/PartyRepDashboardScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

export const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('SPLASH');
  const [user, setUser] = useState(null);
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [electionParties, setElectionParties] = useState([]);
  const [screenStack, setScreenStack] = useState([]);

  const lastBackPressRef = useRef(0);

  const navigateTo = (screen) => {
    setScreenStack((prev) => [...prev, currentScreen]);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenStack.length > 0) {
      const prevScreen = screenStack[screenStack.length - 1];
      setScreenStack((prev) => prev.slice(0, prev.length - 1));
      setCurrentScreen(prevScreen);
    } else {
      routeHome(user);
    }
  };

  const routeHome = (authenticatedUser) => {
    setScreenStack([]);
    if (!authenticatedUser) {
      setCurrentScreen('LOGIN');
      return;
    }
    if (authenticatedUser.role === 'admin') {
      setCurrentScreen('ADMIN_DASHBOARD');
    } else if (authenticatedUser.role === 'party_rep') {
      setCurrentScreen('PARTY_DASHBOARD');
    } else {
      setCurrentScreen('VOTER_DASHBOARD');
    }
  };

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    routeHome(authenticatedUser);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('LOGIN');
    setScreenStack([]);
  };

  // Global Android Hardware / Gesture Back Handler
  useEffect(() => {
    const onHardwareBack = () => {
      // 1. If there is a screen in history, go back to previous screen
      if (screenStack.length > 0) {
        const prevScreen = screenStack[screenStack.length - 1];
        setScreenStack((prev) => prev.slice(0, prev.length - 1));
        setCurrentScreen(prevScreen);
        return true; // Prevents app from closing!
      }

      // 2. If on a sub-screen without stack, go to dashboard
      const isRootScreen =
        currentScreen === 'SPLASH' ||
        currentScreen === 'ONBOARDING' ||
        currentScreen === 'LOGIN' ||
        currentScreen === 'VOTER_DASHBOARD' ||
        currentScreen === 'ADMIN_DASHBOARD' ||
        currentScreen === 'PARTY_DASHBOARD';

      if (!isRootScreen) {
        routeHome(user);
        return true;
      }

      // 3. If on a main dashboard, require two presses to exit app
      if (
        currentScreen === 'VOTER_DASHBOARD' ||
        currentScreen === 'ADMIN_DASHBOARD' ||
        currentScreen === 'PARTY_DASHBOARD'
      ) {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressRef.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      }

      // Allow default exit on Login / Onboarding
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBack
    );

    return () => subscription.remove();
  }, [screenStack, currentScreen, user]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.screenContainer}>
        {currentScreen === 'SPLASH' && (
          <SplashScreen onFinish={() => setCurrentScreen('ONBOARDING')} />
        )}

        {currentScreen === 'ONBOARDING' && (
          <OnboardingScreen onGetStarted={() => navigateTo('LOGIN')} />
        )}

        {currentScreen === 'LOGIN' && (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}

        {currentScreen === 'VOTER_DASHBOARD' && (
          <VoterDashboardScreen
            user={user}
            onSelectElection={(election) => {
              setSelectedElection(election);
              navigateTo('ELECTION_DETAILS');
            }}
            onNavigateToVerification={() => navigateTo('BALLOT_VERIFICATION')}
            onNavigateToSettings={() => navigateTo('SETTINGS')}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'ADMIN_DASHBOARD' && (
          <AdminDashboardScreen
            user={user}
            onCreateElection={() => navigateTo('CREATE_ELECTION')}
            onManageEligibility={() => navigateTo('VOTER_ELIGIBILITY')}
            onNavigateToSettings={() => navigateTo('SETTINGS')}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'PARTY_DASHBOARD' && (
          <PartyRepDashboardScreen
            user={user}
            onNavigateToSettings={() => navigateTo('SETTINGS')}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'ELECTION_DETAILS' && selectedElection && (
          <ElectionDetailsScreen
            election={selectedElection}
            user={user}
            onBack={goBack}
            onProceedToVote={(election, parties) => {
              setSelectedElection(election);
              setElectionParties(parties);
              navigateTo('BALLOT');
            }}
            onViewResults={(election) => {
              setSelectedElection(election);
              navigateTo('RESULTS');
            }}
          />
        )}

        {currentScreen === 'BALLOT' && selectedElection && (
          <BallotScreen
            election={selectedElection}
            parties={electionParties}
            onBack={goBack}
            onConfirmSelection={(candidate) => {
              setSelectedCandidate(candidate);
              navigateTo('VOTE_SUBMISSION');
            }}
          />
        )}

        {currentScreen === 'VOTE_SUBMISSION' && selectedElection && selectedCandidate && (
          <VoteSubmissionScreen
            election={selectedElection}
            user={user}
            selectedCandidate={selectedCandidate}
            onFinishVoting={() => routeHome(user)}
          />
        )}

        {currentScreen === 'BALLOT_VERIFICATION' && (
          <BallotVerificationScreen onBack={goBack} />
        )}

        {currentScreen === 'RESULTS' && selectedElection && (
          <ResultsScreen election={selectedElection} onBack={goBack} />
        )}

        {currentScreen === 'CREATE_ELECTION' && (
          <CreateElectionWizardScreen
            onBack={goBack}
            onElectionCreated={() => routeHome(user)}
          />
        )}

        {currentScreen === 'VOTER_ELIGIBILITY' && (
          <VoterEligibilityManagementScreen onBack={goBack} />
        )}

        {currentScreen === 'SETTINGS' && (
          <SettingsScreen user={user} onBack={goBack} onLogout={handleLogout} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});

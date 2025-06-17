import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, Box, Center, Text } from '@chakra-ui/react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './components/Projects';
import ProjectDetails from './components/ProjectDetails';
import Reports from './components/Reports';
import Finance from './pages/Finance';
import Payments from './pages/Payments';
import ServiceTickets from './pages/ServiceTickets';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

// Create a finance route component that only checks for authentication
const FinanceRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100vh">
          <Box textAlign="center">
            <Text fontSize="xl" color="red.500" mb={4}>
              Something went wrong
            </Text>
            <Text color="gray.600">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
          </Box>
        </Center>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ChakraProvider>
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Navigate to="/dashboard" replace />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/finance"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Finance />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Payments />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Projects />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/modules"
                element={
                  <PrivateRoute>
                    <Layout>
                      {/* Dynamically import to avoid circular import issues */}
                      {React.createElement(require('./components/ModulesPage').default)}
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ProjectDetails />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Reports />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/service-tickets"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ServiceTickets />
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </Router>
      </ChakraProvider>
    </ErrorBoundary>
  );
};

export default App;

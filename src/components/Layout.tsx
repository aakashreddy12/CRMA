import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Link,
  useToast,
  HStack,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isFinance, user } = useAuth();
  const toast = useToast();

  const handleSignOut = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error signing out',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Flex
        as="nav"
        align="center"
        padding="4"
        borderBottom="1px"
        borderColor="gray.200"
        bg="white"
        justify="space-between"
      >
        <Flex align="center">
          <Text fontSize="xl" fontWeight="bold" color="green.600" mr="8">
            Axiso Green Energy
          </Text>
          
          {/* Navigation links for all users */}
          <ChakraLink
            as={RouterLink}
            to="/dashboard"
            mr="4"
            color={location.pathname === '/dashboard' ? 'green.600' : 'gray.600'}
            fontWeight={location.pathname === '/dashboard' ? 'bold' : 'normal'}
          >
            Dashboard
          </ChakraLink>
          <ChakraLink
            as={RouterLink}
            to="/projects"
            mr="4"
            color={location.pathname.includes('/projects') ? 'green.600' : 'gray.600'}
            fontWeight={location.pathname.includes('/projects') ? 'bold' : 'normal'}
          >
            Projects
          </ChakraLink>
          <ChakraLink
            as={RouterLink}
            to="/modules"
            mr="4"
            color={location.pathname === '/modules' ? 'green.600' : 'gray.600'}
            fontWeight={location.pathname === '/modules' ? 'bold' : 'normal'}
          >
            Modules
          </ChakraLink>
          <ChakraLink
            as={RouterLink}
            to="/reports"
            mr="4"
            color={location.pathname === '/reports' ? 'green.600' : 'gray.600'}
            fontWeight={location.pathname === '/reports' ? 'bold' : 'normal'}
          >
            Reports
          </ChakraLink>
          <ChakraLink
            as={RouterLink}
            to="/service-tickets"
            mr="4"
            color={location.pathname === '/service-tickets' ? 'green.600' : 'gray.600'}
            fontWeight={location.pathname === '/service-tickets' ? 'bold' : 'normal'}
          >
            Service Tickets
          </ChakraLink>
          
          {/* Show Finance link only for finance users */}
          {isFinance && (
            <>
              <ChakraLink
                as={RouterLink}
                to="/finance"
                mr="4"
                color={location.pathname === '/finance' ? 'green.600' : 'gray.600'}
                fontWeight={location.pathname === '/finance' ? 'bold' : 'normal'}
              >
                Finance
              </ChakraLink>
              <ChakraLink
                as={RouterLink}
                to="/payments"
                color={location.pathname === '/payments' ? 'green.600' : 'gray.600'}
                fontWeight={location.pathname === '/payments' ? 'bold' : 'normal'}
              >
                Payments
              </ChakraLink>
            </>
          )}
        </Flex>
        <Button
          colorScheme="red"
          variant="outline"
          size="sm"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </Flex>
      <Box p={4}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 
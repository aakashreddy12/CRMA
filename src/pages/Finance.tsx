import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Flex,
  Select,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  HStack,
  SimpleGrid
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Project {
  id: string;
  name: string;
  customer_name: string;
  proposal_amount: number;
  advance_payment: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
  current_stage: string;
  payment_mode: 'Loan' | 'Cash';
  start_date: string;
}

const Finance: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalExpectedThisMonth, setTotalExpectedThisMonth] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const { isFinance, isAuthenticated } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated || !isFinance) return;
    fetchProjects();
  }, [isAuthenticated, isFinance, filter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('projects')
        .select('*')
        .neq('status', 'deleted');

      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setProjects(data);

        // Calculate total outstanding
        const totalOutstanding = data.reduce((sum, project) => {
          return sum + (project.balance_amount || 0);
        }, 0);
        setTotalOutstanding(totalOutstanding);

        // Calculate expected this month based on 45-day collection timeframe
        const currentDate = new Date();
        const expectedThisMonth = data
          .filter(p => p.status === 'active' && p.start_date)
          .reduce((sum, project) => {
            const startDate = new Date(project.start_date);
            
            // If start date isn't valid, skip this project
            if (isNaN(startDate.getTime())) return sum;
            
            // Calculate the due date (start date + 45 days)
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + 45);
            
            // Calculate current month start and end
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            // If due date falls within current month, include the balance in expected amount
            if (dueDate >= monthStart && dueDate <= monthEnd) {
              return sum + (project.balance_amount || 0);
            }
            
            // If due date has already passed but payment is still outstanding
            if (dueDate < currentDate) {
              return sum + (project.balance_amount || 0);
            }
            
            return sum;
          }, 0);
          
        setTotalExpectedThisMonth(expectedThisMonth);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch financial data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on search term
  const filteredProjects = projects.filter(project => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      project.name.toLowerCase().includes(term) ||
      project.customer_name.toLowerCase().includes(term) ||
      project.current_stage.toLowerCase().includes(term)
    );
  });

  return (
    <Box p={6} maxW="1400px" mx="auto">
      <Heading as="h1" size="xl" mb={6}>
        Finance Dashboard
      </Heading>

      {/* Key Financial Statistics */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Outstanding Amount</StatLabel>
              <StatNumber>₹{totalOutstanding.toLocaleString()}</StatNumber>
              <Text fontSize="sm" color="gray.500">From all projects</Text>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Expected This Month</StatLabel>
              <StatNumber>₹{totalExpectedThisMonth.toLocaleString()}</StatNumber>
              <Text fontSize="sm" color="gray.500">Based on 45-day collection timeframe</Text>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Active Projects</StatLabel>
              <StatNumber>{projects.filter(p => p.status === 'active').length}</StatNumber>
              <Text fontSize="sm" color="gray.500">With outstanding payments</Text>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Filters and Search */}
      <Flex mb={6} justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
        <HStack>
          <Button 
            colorScheme={filter === 'all' ? 'blue' : 'gray'} 
            onClick={() => setFilter('all')}
          >
            All Projects
          </Button>
          <Button 
            colorScheme={filter === 'active' ? 'blue' : 'gray'} 
            onClick={() => setFilter('active')}
          >
            Active Projects
          </Button>
          <Button 
            colorScheme={filter === 'completed' ? 'blue' : 'gray'} 
            onClick={() => setFilter('completed')}
          >
            Completed Projects
          </Button>
        </HStack>
        
        <FormControl maxW="300px">
          <Input
            placeholder="Search by name or customer"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FormControl>
      </Flex>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <Heading size="md">Projects Receivables</Heading>
        </CardHeader>
        <CardBody>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Project Name</Th>
                <Th>Customer</Th>
                <Th>Total Amount</Th>
                <Th>Paid</Th>
                <Th>Outstanding</Th>
                <Th>Payment Mode</Th>
                <Th>Stage</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProjects.map(project => (
                <Tr key={project.id}>
                  <Td fontWeight="medium">{project.name}</Td>
                  <Td>{project.customer_name}</Td>
                  <Td>₹{project.proposal_amount?.toLocaleString()}</Td>
                  <Td>₹{((project.advance_payment || 0) + (project.paid_amount || 0)).toLocaleString()}</Td>
                  <Td fontWeight="bold" color={project.balance_amount > 0 ? "red.500" : "green.500"}>
                    ₹{project.balance_amount?.toLocaleString()}
                  </Td>
                  <Td>
                    <Badge colorScheme={project.payment_mode === 'Loan' ? 'purple' : 'blue'}>
                      {project.payment_mode}
                    </Badge>
                  </Td>
                  <Td>{project.current_stage}</Td>
                  <Td>
                    <Badge colorScheme={project.status === 'active' ? 'green' : 'gray'}>
                      {project.status}
                    </Badge>
                  </Td>
                </Tr>
              ))}
              
              {filteredProjects.length === 0 && (
                <Tr>
                  <Td colSpan={8} textAlign="center" py={4}>
                    {loading ? 'Loading...' : 'No projects found'}
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Finance; 
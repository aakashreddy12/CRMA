import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Text,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
  Flex,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { PROJECT_STAGES } from '../lib/constants';

interface Project {
  id: string;
  name: string;
  customer_name: string;
  status: string;
  current_stage: string;
  proposal_amount: number;
  created_at: string;
  start_date: string;
  kwh: number;
}

// Utility function to calculate elapsed time since start date - same as in Projects.tsx
const calculateElapsedTime = (startDateStr: string | null) => {
  if (!startDateStr) return 'N/A';
  
  const startDate = new Date(startDateStr);
  const currentDate = new Date();
  
  // Check for invalid date
  if (isNaN(startDate.getTime())) return 'N/A';
  
  const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week';
  if (diffWeeks < 4) return `${diffWeeks} weeks`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month';
  if (diffMonths < 12) return `${diffMonths} months`;
  
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return '1 year';
  return `${diffYears} years`;
};

// For backward compatibility - keeping this function for any existing code that might use it
const getTimeElapsed = (timestamp: string) => {
  const now = new Date();
  const projectDate = new Date(timestamp);
  const diffInMillis = now.getTime() - projectDate.getTime();
  
  const days = Math.floor(diffInMillis / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffInMillis % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMillis % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ago`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  }
  return `${minutes}m ago`;
};

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
    totalKWH: 0,
  });
  const [stageStats, setStageStats] = useState<Record<string, number>>({});
  const [monthlyKWH, setMonthlyKWH] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'stage'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [monthlyTrends, setMonthlyTrends] = useState<number[]>(Array(12).fill(0));
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  
  // Get current year and create an array of years (current year and 4 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Check if current user is contact@axisogreen.in
  const isRestrictedUser = user?.email === 'contact@axisogreen.in';

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, selectedYear, sortBy, sortOrder]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching projects from Supabase...');
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'deleted');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Projects fetched:', projects);

      if (projects) {
        // Log all possible status values to debug
        const allStatusesMap: Record<string, boolean> = {};
        projects.forEach(p => {
          if (p.status) allStatusesMap[p.status] = true;
        });
        const allStatuses = Object.keys(allStatusesMap);
        console.log('All status values found in DB:', allStatuses);
        
        // Filter projects for selected year WITHOUT filtering by status yet
        const yearProjects = projects.filter((project: Project) => {
          const projectDate = new Date(project.start_date || project.created_at);
          return projectDate.getFullYear() === selectedYear;
        });
        
        // Case-insensitive filtering for active projects
        const activeProjects = projects.filter((p: Project) => 
          typeof p.status === 'string' && p.status.toLowerCase() === 'active'
        );
        console.log('All active projects (case-insensitive):', activeProjects.length);
        console.log('Active project IDs:', activeProjects.map(p => p.id));
        
        // Case-insensitive filtering for completed projects
        const completedProjects = projects.filter((p: Project) => 
          typeof p.status === 'string' && p.status.toLowerCase() === 'completed'
        );

        // Sort projects based on selected criteria
        const sortedProjects = [...yearProjects].sort((a: Project, b: Project) => {
          if (sortBy === 'date') {
            // For date sorting, we should compare duration from oldest to newest
            // For ascending, we want oldest first (longest duration first)
            // For descending, we want newest first (shortest duration first)
            const dateA = new Date(a.start_date || a.created_at).getTime();
            const dateB = new Date(b.start_date || b.created_at).getTime();
            
            // Smaller timestamp = older date = longer duration
            return sortOrder === 'asc' 
              ? dateA - dateB  // Oldest first (ascending by start date)
              : dateB - dateA; // Newest first (descending by start date)
          } else if (sortBy === 'amount') {
            return sortOrder === 'asc' 
              ? a.proposal_amount - b.proposal_amount
              : b.proposal_amount - a.proposal_amount;
          } else {
            const stageA = PROJECT_STAGES.indexOf(a.current_stage);
            const stageB = PROJECT_STAGES.indexOf(b.current_stage);
            return sortOrder === 'asc' ? stageA - stageB : stageB - stageA;
          }
        });

        // Calculate total revenue and KWH from all projects
        const totalRevenue: number = projects.reduce((sum: number, p: Project) => sum + (p.proposal_amount || 0), 0);
        const totalKWH: number = projects.reduce((sum: number, p: Project) => sum + (p.kwh || 0), 0);

        // Count unique customers
        const customerMap: Record<string, boolean> = {};
        projects.forEach(p => {
          if (p.customer_name) customerMap[p.customer_name] = true;
        });
        const uniqueCustomersCount = Object.keys(customerMap).length;

        setStats({
          totalCustomers: uniqueCustomersCount,
          activeProjects: activeProjects.length,
          completedProjects: completedProjects.length,
          totalRevenue,
          totalKWH
        });

        // Update projects list - filter active projects for display using case-insensitive comparison
        setProjects(sortedProjects);
        
        // Filter active projects from the sorted list
        const filteredActiveProjects = sortedProjects.filter((p: Project) => 
          typeof p.status === 'string' && p.status.toLowerCase() === 'active'
        );
        
        console.log('Active projects for display (filtered by year):', filteredActiveProjects.length);
        setActiveProjects(filteredActiveProjects);

        // Calculate monthly trends using the filtered active projects
        const trends = Array(12).fill(0);
        filteredActiveProjects.forEach((project: Project) => {
          const month = new Date(project.created_at).getMonth();
          trends[month]++;
        });
        setMonthlyTrends(trends);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch reports data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <VStack spacing={4}>
          <Text fontSize="lg">Loading dashboard...</Text>
          <Progress size="xs" isIndeterminate w="200px" />
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb="6">
        <Text fontSize="2xl">Reports & Analytics</Text>
        <HStack spacing={4}>
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
              Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => setSortBy('date')}>Date</MenuItem>
              <MenuItem onClick={() => setSortBy('amount')}>Amount</MenuItem>
              <MenuItem onClick={() => setSortBy('stage')}>Stage</MenuItem>
            </MenuList>
          </Menu>
          <Button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            rightIcon={<ChevronDownIcon transform={sortOrder === 'asc' ? 'rotate(180deg)' : 'none'} />}
          >
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            width="120px"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </HStack>
      </Flex>

      <VStack spacing={8} align="stretch">
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: `repeat(${isRestrictedUser ? 4 : 5}, 1fr)` }} gap={6}>
          <Stat>
            <StatLabel>Total Customers</StatLabel>
            <StatNumber>{stats.totalCustomers}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Active Projects</StatLabel>
            <StatNumber>{stats.activeProjects}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Completed Projects</StatLabel>
            <StatNumber>{stats.completedProjects}</StatNumber>
          </Stat>
          {!isRestrictedUser && (
            <Stat>
              <StatLabel>Total Revenue</StatLabel>
              <StatNumber>₹{stats.totalRevenue.toLocaleString()}</StatNumber>
            </Stat>
          )}
          <Stat>
            <StatLabel>Total KWH</StatLabel>
            <StatNumber>{stats.totalKWH.toLocaleString()} kW</StatNumber>
          </Stat>
        </Grid>

        <Card>
          <CardHeader>
            <Heading size="md">Active Projects</Heading>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Project Name</Th>
                  <Th>Customer</Th>
                  <Th>Current Stage</Th>
                  <Th>Amount</Th>
                  <Th>KWH</Th>
                  <Th>Duration</Th>
                </Tr>
              </Thead>
              <Tbody>
                {activeProjects.map((project) => (
                  <Tr key={project.id}>
                    <Td>{project.name}</Td>
                    <Td>{project.customer_name}</Td>
                    <Td>
                      <Badge colorScheme="blue">{project.current_stage}</Badge>
                    </Td>
                    <Td>₹{project.proposal_amount.toLocaleString()}</Td>
                    <Td>{project.kwh || 'N/A'}</Td>
                    <Td>
                      <Tooltip label={project.start_date ? `Project started on ${new Date(project.start_date).toLocaleDateString()}` : 'Using creation date'}>
                        <Text>{calculateElapsedTime(project.start_date || project.created_at)}</Text>
                      </Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default Dashboard; 
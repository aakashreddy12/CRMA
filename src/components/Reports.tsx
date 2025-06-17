import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Grid,
  Stat as ChakraStat,
  StatLabel,
  StatNumber,
  Progress as ChakraProgress,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
  Flex,
  VStack,
  Tooltip,
  Badge,
  Heading,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { PROJECT_STAGES } from '../lib/constants';
import { useAuth } from '../context/AuthContext';

interface Project {
  id: string;
  status: string;
  current_stage: string;
  proposal_amount: number;
  created_at: string;
  start_date: string;
  kwh: number;
}

// Group stages for better visualization
const STAGE_GROUPS = [
  { name: 'Advance Payment', stages: ['Advance Payment Done', 'Advance Payment -- Approvals / First Payment'] },
  { name: 'Approvals & Loan', stages: ['Approvals -- Loan Applications', 'Loan Started -- Loan Process', 'Loan Approved / First Payment Collected -- Material Order'] },
  { name: 'Materials', stages: ['Materials Ordered -- Materials Deliver', 'Materials Delivered -- Installation'] },
  { name: 'Installation', stages: ['Installation Done / Second Payment Done -- Net meter Application'] },
  { name: 'Net Metering', stages: ['Net Meter Application -- Net Meter Installation', 'Net Meter Installed -- Inspection / Final Payment'] },
  { name: 'Inspection & Finalization', stages: ['Approved Inspection -- Subsidy in Progress', 'Subsidy Disbursed -- Final payment', 'Final Payment Done'] }
];

// Define colors for different stage groups
const GROUP_COLORS = {
  'Advance Payment': 'blue',
  'Approvals & Loan': 'purple',
  'Materials': 'orange',
  'Installation': 'teal',
  'Net Metering': 'green',
  'Inspection & Finalization': 'red'
};

const Reports = () => {
  const { user } = useAuth();
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
  
  // Get current year and create an array of years (current year and 4 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Check if current user is contact@axisogreen.in
  const isRestrictedUser = user?.email === 'contact@axisogreen.in';

  useEffect(() => {
    fetchStats();
  }, [selectedYear]); // Refetch when year changes

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
        const active = projects.filter((p: Project) => p.status === 'active');
        const completed = projects.filter((p: Project) => p.status === 'completed');
        const totalRevenue = projects.reduce((sum: number, p: Project) => sum + (p.proposal_amount || 0), 0);
        const totalKWH = projects.reduce((sum: number, p: Project) => sum + (p.kwh || 0), 0);

        setStats({
          totalCustomers: projects.length,
          activeProjects: active.length,
          completedProjects: completed.length,
          totalRevenue,
          totalKWH,
        });

        // Calculate projects in each stage (excluding deleted projects)
        const stages: Record<string, number> = {};
        PROJECT_STAGES.forEach(stage => {
          stages[stage] = projects.filter((p: Project) => p.current_stage === stage).length;
        });
        setStageStats(stages);

        // Calculate monthly KWH usage for the selected year
        const monthlyKWHData: Record<string, number> = {
          'January': 0, 'February': 0, 'March': 0, 'April': 0, 'May': 0, 'June': 0,
          'July': 0, 'August': 0, 'September': 0, 'October': 0, 'November': 0, 'December': 0
        };
        
        const monthNames = Object.keys(monthlyKWHData);
        
        projects.forEach((project: Project) => {
          const dateToUse = project.start_date || project.created_at;
          const projectDate = new Date(dateToUse);
          const projectYear = projectDate.getFullYear();
          const projectMonth = projectDate.getMonth(); // 0-11
          
          if (projectYear === selectedYear && project.kwh) {
            monthlyKWHData[monthNames[projectMonth]] += project.kwh;
          }
        });
        
        setMonthlyKWH(monthlyKWHData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch reports data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate the maximum KWH for any month to set the bar scale
  const maxMonthlyKWH = monthlyKWH ? Math.max(...Object.values(monthlyKWH), 1) : 1;

  // Calculate maximum projects in any stage for scaling
  const maxProjectsInStage = Math.max(...Object.values(stageStats), 1);

  const getStageGroup = (stage: string) => {
    if (stage.includes('Advance Payment')) return 'Advance Payment';
    if (stage.includes('Approvals') || stage.includes('Loan')) return 'Approvals & Loan';
    if (stage.includes('Materials')) return 'Materials';
    if (stage.includes('Installation')) return 'Installation';
    if (stage.includes('Net Meter')) return 'Net Meter';
    if (stage.includes('Inspection')) return 'Inspection';
    if (stage.includes('Subsidy')) return 'Subsidy';
    if (stage.includes('Final Payment')) return 'Final Payment';
    return 'Other';
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="green.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" minH="400px">
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">Error Loading Reports</AlertTitle>
        <AlertDescription maxWidth="sm">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Box>
      <Text fontSize="2xl" mb="6">Reports & Analytics</Text>

      <Grid templateColumns={`repeat(${isRestrictedUser ? 4 : 5}, 1fr)`} gap={6} mb="8">
        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Total Customers</StatLabel>
          <StatNumber>{stats.totalCustomers}</StatNumber>
        </ChakraStat>

        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Active Projects</StatLabel>
          <StatNumber>{stats.activeProjects}</StatNumber>
        </ChakraStat>

        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Completed Projects</StatLabel>
          <StatNumber>{stats.completedProjects}</StatNumber>
        </ChakraStat>

        {!isRestrictedUser && (
          <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
            <StatLabel>Total Revenue</StatLabel>
            <StatNumber>₹{stats.totalRevenue.toLocaleString()}</StatNumber>
          </ChakraStat>
        )}

        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Total KWH</StatLabel>
          <StatNumber>{stats.totalKWH.toLocaleString()}</StatNumber>
        </ChakraStat>
      </Grid>

      <Box bg="white" p="6" borderRadius="lg" boxShadow="sm" mb="8">
        <Flex justify="space-between" align="center" mb="6">
          <Text fontSize="lg" fontWeight="bold">KWH Usage by Month (Based on Project Start Date)</Text>
          <Select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            width="150px"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Flex>
        
        <Flex height="250px" alignItems="flex-end" mb="2" mt="30px">
          {Object.entries(monthlyKWH).map(([month, kwh]) => (
            <VStack key={month} flex="1" spacing="0">
              <Box 
                height={`${Math.max((kwh / maxMonthlyKWH) * 180, kwh ? 20 : 0)}px`}
                width="70%" 
                bg="green.500"
                borderTopRadius="md"
                position="relative"
              >
                {kwh > 0 && (
                  <Text 
                    position="absolute"
                    top="-25px"
                    left="50%"
                    transform="translateX(-50%)"
                    color="black"
                    fontWeight="bold"
                    fontSize="xs"
                    width="100px"
                    textAlign="center"
                  >
                    {kwh.toLocaleString()} KWH
                  </Text>
                )}
              </Box>
              <Text 
                fontSize="xs" 
                fontWeight="medium" 
                pt="2"
                transform="rotate(-45deg)" 
                transformOrigin="top left"
                width="100%"
                textAlign="center"
                height="60px"
                overflow="visible"
              >
                {month.substring(0, 3)}
              </Text>
            </VStack>
          ))}
        </Flex>
      </Box>

      <Box bg="white" p="6" borderRadius="lg" boxShadow="sm">
        <Text fontSize="xl" fontWeight="bold" mb="6">Project Stages Distribution</Text>
        
        {STAGE_GROUPS.map((group, index) => (
          <Box key={group.name} mb={6}>
            <Flex align="center" mb={3}>
              <Badge colorScheme={GROUP_COLORS[group.name as keyof typeof GROUP_COLORS]} px={2} py={1} borderRadius="md">
                {group.name}
              </Badge>
              <Text ml={2} fontSize="md" fontWeight="medium">
                {group.stages.reduce((count, stage) => count + (stageStats[stage] || 0), 0)} projects
              </Text>
            </Flex>
            
            {group.stages.map(stage => {
              const count = stageStats[stage] || 0;
              const percentage = Math.round((count / maxProjectsInStage) * 100);
              
              return (
                <Tooltip 
                  key={stage} 
                  label={`${count} project${count !== 1 ? 's' : ''} in "${stage}" stage`} 
                  hasArrow
                >
                  <HStack mb={3} spacing={3}>
                    <Text minW="250px" fontSize="sm" color="gray.600">{stage}</Text>
                    <Box position="relative" width="full" height="20px">
                      <ChakraProgress
                        value={count > 0 ? Math.max(percentage, 5) : 0}
                        height="16px"
                        borderRadius="full"
                        colorScheme={GROUP_COLORS[group.name as keyof typeof GROUP_COLORS]}
                        bgColor="gray.100"
                      />
                      <Text 
                        position="absolute" 
                        right="8px" 
                        top="50%" 
                        transform="translateY(-50%)" 
                        fontSize="xs" 
                        fontWeight="bold"
                        color={count > 0 ? "white" : "gray.500"}
                        zIndex={2}
                      >
                        {count}
                      </Text>
                    </Box>
                  </HStack>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Reports; 
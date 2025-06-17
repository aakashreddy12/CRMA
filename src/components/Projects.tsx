import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  CloseButton,
  FormControl,
  FormLabel,
  Input,
  VStack,
  TableContainer,
  Select,
  Badge,
  useToast,
  HStack,
  Text,
  Tooltip
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  project_type: 'DCR' | 'Non DCR';
  payment_mode: 'Loan' | 'Cash';
  proposal_amount: number;
  advance_payment: number;
  balance_amount: number;
  status: string;
  current_stage: string;
  start_date: string;
  kwh: number;
}

// Define filter structure
interface FilterOptions {
  field: string;
  value: string;
}

// Utility function to calculate elapsed time since start date
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

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const [newProject, setNewProject] = useState({
    name: '',
    customer_name: '',
    email: '',
    phone: '',
    address: '',
    project_type: 'DCR',
    payment_mode: 'Cash',
    proposal_amount: '',
    advance_payment: '',
    loan_amount: '',
    start_date: '',
    kwh: '',
  });
  const [loading, setLoading] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterOptions[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();
  
  // Filter modal state
  const { 
    isOpen: isFilterOpen, 
    onOpen: onFilterOpen, 
    onClose: onFilterClose 
  } = useDisclosure();
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const fetchProjects = useCallback(async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .neq('status', 'deleted');

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch projects. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      if (data) {
        setAllProjects(data);
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Apply filters and search whenever activeFilters or searchTerm changes
  const applyFilters = useCallback(() => {
    let filtered = allProjects;
    if (activeFilters.length > 0) {
      filtered = filtered.filter(project => {
        return activeFilters.every(filter => {
          const projectValue = String(project[filter.field as keyof Project] || '').toLowerCase();
          return projectValue.includes(filter.value.toLowerCase());
        });
      });
    }
    if (searchTerm.trim() !== '') {
      const keyword = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        Object.values(project).some(val =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(keyword)
        )
      );
    }
    setProjects(filtered);
  }, [activeFilters, allProjects, searchTerm]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Get available values for a field
  const getFieldOptions = (field: string): string[] => {
    if (!field) return [];

    // Get unique values from the projects using a simple object to track uniqueness
    const uniqueValuesMap: Record<string, boolean> = {};
    
    allProjects.forEach(project => {
      const value = project[field as keyof Project];
      if (value !== null && value !== undefined) {
        uniqueValuesMap[String(value)] = true;
      }
    });

    return Object.keys(uniqueValuesMap);
  };

  // Render the appropriate input based on selected field
  const renderFilterValueInput = () => {
    if (!filterField) return (
      <Input
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        placeholder="Select a field first"
        isDisabled={!filterField}
      />
    );

    // Fields with predefined options
    if (['status', 'project_type', 'payment_mode', 'current_stage'].includes(filterField)) {
      const options = getFieldOptions(filterField);
      
      return (
        <Select
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          placeholder={`Select ${filterField}`}
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
      );
    }

    // Default text input for other fields
    return (
      <Input
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        placeholder="Enter filter value"
      />
    );
  };

  // Add new filter
  const addFilter = () => {
    if (!filterField || !filterValue) {
      toast({
        title: 'Filter Error',
        description: 'Please select both a field and value to filter by',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setActiveFilters(prev => [...prev, { field: filterField, value: filterValue }]);
    setFilterField('');
    setFilterValue('');
    onFilterClose();
  };

  // Remove a filter
  const removeFilter = (index: number) => {
    setActiveFilters(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const startDate = newProject.start_date 
        ? new Date(newProject.start_date).toISOString() 
        : new Date().toISOString();
        
      const proposal = parseFloat(newProject.proposal_amount);
      const advance = parseFloat(newProject.advance_payment);
      const loan = parseFloat(newProject.loan_amount || '0');
      
      const projectData = {
        name: newProject.name,
        customer_name: newProject.customer_name,
        email: newProject.email,
        phone: newProject.phone,
        address: newProject.address,
        project_type: newProject.project_type,
        payment_mode: newProject.payment_mode,
        proposal_amount: proposal,
        advance_payment: advance,
        loan_amount: loan,
        paid_amount: 0,
        status: 'active',
        current_stage: 'Advance payment done',
        start_date: startDate,
        kwh: parseFloat(newProject.kwh),
      };

      const { error } = await supabase
        .from('projects')
        .insert([projectData]);

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: 'Error',
          description: 'Failed to create project. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Project created successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onClose();
      setNewProject({
        name: '',
        customer_name: '',
        email: '',
        phone: '',
        address: '',
        project_type: 'DCR',
        payment_mode: 'Cash',
        proposal_amount: '',
        advance_payment: '',
        loan_amount: '',
        start_date: '',
        kwh: '',
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'deleted' })
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));

      toast({
        title: 'Success',
        description: 'Project deleted successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const toggleProjectStatus = async (projectId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'completed' : 'active';
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId 
            ? { ...project, status: newStatus }
            : project
        )
      );

      toast({
        title: 'Success',
        description: `Project marked as ${newStatus}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project status. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={4}>
      <HStack justify="space-between" mb={4}>
        <Button colorScheme="blue" onClick={onOpen}>
          Create New Project
        </Button>
        <HStack>
          <Button 
            colorScheme="teal" 
            onClick={onFilterOpen}
            leftIcon={<Box as="span">🔍</Box>}
          >
            Filter Projects
          </Button>
          {activeFilters.length > 0 && (
            <Button 
              colorScheme="red" 
              variant="outline" 
              onClick={clearAllFilters}
              size="sm"
            >
              Clear Filters ({activeFilters.length})
            </Button>
          )}
        </HStack>
      </HStack>

      {/* Search Bar */}
      <Box mb={4}>
        <Input
          placeholder="Search projects by any keyword..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          size="md"
        />
      </Box>

      {/* Display active filters */}
      {activeFilters.length > 0 && (
        <Box mb={4} p={2} borderWidth="1px" borderRadius="md">
          <Text fontWeight="bold" mb={2}>Active Filters:</Text>
          <HStack spacing={2} flexWrap="wrap">
            {activeFilters.map((filter, index) => (
              <Badge 
                key={index} 
                colorScheme="teal" 
                p={2} 
                borderRadius="md"
              >
                {filter.field}: {filter.value}
                <Button 
                  size="xs" 
                  ml={1} 
                  onClick={() => removeFilter(index)}
                  variant="ghost"
                >
                  ×
                </Button>
              </Badge>
            ))}
          </HStack>
        </Box>
      )}

      {/* Filter Modal */}
      <Modal isOpen={isFilterOpen} onClose={onFilterClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Filter Projects</ModalHeader>
          <CloseButton position="absolute" right={2} top={2} onClick={onFilterClose} />
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="sm" color="gray.600" mb={2}>
                Select a field and value to filter the projects. You can add multiple filters.
              </Text>
              
              <FormControl>
                <FormLabel>Filter By</FormLabel>
                <Select
                  value={filterField}
                  onChange={(e) => {
                    setFilterField(e.target.value);
                    setFilterValue(''); // Reset value when field changes
                  }}
                  placeholder="Select field to filter by"
                >
                  <option value="name">Project Name</option>
                  <option value="customer_name">Customer Name</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="address">Address</option>
                  <option value="project_type">Project Type</option>
                  <option value="payment_mode">Payment Mode</option>
                  <option value="status">Status</option>
                  <option value="current_stage">Current Stage</option>
                  <option value="kwh">KWH</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Value</FormLabel>
                {renderFilterValueInput()}
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {filterField === 'status' ? 
                    'Filter by project status (active/completed)' : 
                    filterField === 'project_type' ? 
                    'Filter by DCR or Non DCR projects' :
                    filterField === 'payment_mode' ?
                    'Filter by Cash or Loan payment mode' :
                    'Enter text to filter (case insensitive)'}
                </Text>
              </FormControl>

              <Button 
                colorScheme="teal" 
                width="full" 
                onClick={addFilter}
                isDisabled={!filterField || !filterValue}
              >
                Apply Filter
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Project Name</Th>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th>Payment Mode</Th>
              <Th>Total Amount</Th>
              <Th>Advance Paid</Th>
              <Th>Balance</Th>
              <Th>Start Date</Th>
              <Th>Duration</Th>
              <Th>KWH</Th>
              <Th>Status</Th>
              <Th>Current Stage</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {projects.map(project => (
              <Tr key={project.id}>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.name}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.customer_name}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  <Badge colorScheme={project.project_type === 'DCR' ? 'green' : 'blue'}>
                    {project.project_type}
                  </Badge>
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.payment_mode}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  ₹{project.proposal_amount.toLocaleString()}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  ₹{project.advance_payment.toLocaleString()}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  ₹{project.balance_amount.toLocaleString()}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  <Tooltip label={project.start_date ? `Project started on ${new Date(project.start_date).toLocaleDateString()}` : 'Start date not set'}>
                    <Text>{calculateElapsedTime(project.start_date)}</Text>
                  </Tooltip>
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.kwh || 'N/A'}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  <Badge colorScheme={project.status === 'active' ? 'green' : 'blue'}>
                    {project.status}
                  </Badge>
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.current_stage}
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme={project.status === 'active' ? 'blue' : 'green'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectStatus(project.id, project.status);
                      }}
                    >
                      {project.status === 'active' ? 'Mark Complete' : 'Mark Active'}
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                          deleteProject(project.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Project</ModalHeader>
          <CloseButton position="absolute" right={2} top={2} onClick={onClose} />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Project Name</FormLabel>
                <Input
                  name="name"
                  value={newProject.name}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Customer Name</FormLabel>
                <Input
                  name="customer_name"
                  value={newProject.customer_name}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={newProject.email}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input
                  name="phone"
                  value={newProject.phone}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input
                  name="address"
                  value={newProject.address}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Project Start Date</FormLabel>
                <Input
                  name="start_date"
                  type="date"
                  value={newProject.start_date}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Project Type</FormLabel>
                <Select
                  name="project_type"
                  value={newProject.project_type}
                  onChange={(e) => setNewProject(prev => ({
                    ...prev,
                    project_type: e.target.value
                  }))}
                >
                  <option value="DCR">DCR</option>
                  <option value="Non DCR">Non DCR</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Payment Mode</FormLabel>
                <Select
                  name="payment_mode"
                  value={newProject.payment_mode}
                  onChange={(e) => setNewProject(prev => ({
                    ...prev,
                    payment_mode: e.target.value
                  }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="Loan">Loan</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Total Amount</FormLabel>
                <Input
                  name="proposal_amount"
                  type="number"
                  value={newProject.proposal_amount}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Advance Payment</FormLabel>
                <Input
                  name="advance_payment"
                  type="number"
                  value={newProject.advance_payment}
                  onChange={handleInputChange}
                  max={newProject.proposal_amount}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Loan Amount</FormLabel>
                <Input
                  name="loan_amount"
                  type="number"
                  value={newProject.loan_amount}
                  onChange={handleInputChange}
                  max={newProject.proposal_amount}
                />
              </FormControl>

              <FormControl>
                <FormLabel>KWH</FormLabel>
                <Input
                  name="kwh"
                  type="number"
                  value={newProject.kwh}
                  onChange={handleInputChange}
                />
              </FormControl>

              <Button colorScheme="blue" width="full" onClick={handleSubmit}>
                Create Project
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Projects; 
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Button,
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
  Flex,
  Spacer,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  VStack,
  Spinner,
  Center,
  HStack,
  Text,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { AddIcon, CheckIcon, ViewIcon, DeleteIcon } from '@chakra-ui/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Define interface for Service Ticket
interface ServiceTicket {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Define interface for Customer
interface Customer {
  customer_name: string;
  email: string;
  phone: string;
  address: string;
}

// Helper function to get deleted tickets from localStorage
const getDeletedTicketIds = (): string[] => {
  try {
    const deletedTickets = localStorage.getItem('deletedServiceTickets');
    return deletedTickets ? JSON.parse(deletedTickets) : [];
  } catch (error) {
    console.error('Error getting deleted tickets from localStorage', error);
    return [];
  }
};

// Helper function to add a deleted ticket to localStorage
const addDeletedTicketId = (id: string): void => {
  try {
    const currentDeleted = getDeletedTicketIds();
    if (!currentDeleted.includes(id)) {
      localStorage.setItem('deletedServiceTickets', JSON.stringify([...currentDeleted, id]));
    }
  } catch (error) {
    console.error('Error adding deleted ticket to localStorage', error);
  }
};

const ServiceTickets = () => {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
    address: '',
    description: ''
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const dropdown = document.getElementById('customer-dropdown-box');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown]);

  const [viewTicket, setViewTicket] = useState<ServiceTicket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<ServiceTicket | null>(null);
  const { isOpen: isNewOpen, onOpen: onNewOpen, onClose: onNewClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Fetch all service tickets with filter for deleted tickets
  const fetchServiceTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get list of deleted ticket IDs from localStorage
      const deletedIds = getDeletedTicketIds();
      
      const { data, error } = await supabase
        .from('service_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out any tickets that are in our deleted IDs list
      const filteredData = data?.filter(ticket => !deletedIds.includes(ticket.id)) || [];
      
      // Set the tickets state with the filtered data
      setTickets(filteredData);
    } catch (error: any) {
      console.error('Error fetching service tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch service tickets',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch customers for dropdown
  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('customer_name, email, phone, address')
        .in('status', ['active', 'finished']);

      if (error) throw error;
      
      // Remove duplicates by customer name
      const uniqueCustomers: { [key: string]: Customer } = {};
      data?.forEach(customer => {
        if (!uniqueCustomers[customer.customer_name]) {
          uniqueCustomers[customer.customer_name] = customer;
        }
      });
      
      setCustomers(Object.values(uniqueCustomers));
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [toast]);

  // Load data on component mount and when authenticated state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchServiceTickets();
      fetchCustomers();
    }
  }, [isAuthenticated, fetchServiceTickets, fetchCustomers]); // All dependencies are correct

  // Additional cleanup effect for when dialog is closed without confirmation
  useEffect(() => {
    if (!isDeleteOpen) {
      setTicketToDelete(null);
    }
  }, [isDeleteOpen]);

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission for creating new ticket
  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.description) {
      toast({
        title: 'Missing fields',
        description: 'Please select a customer and provide a description',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_tickets')
        .insert([
          {
            customer_name: formData.customer_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            description: formData.description,
            status: 'open'
          }
        ])
        .select();

      if (error) throw error;

      setTickets(prev => [data[0], ...prev]);
      
      toast({
        title: 'Success',
        description: 'Service ticket created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset form and close modal
      setFormData({
        customer_name: '',
        email: '',
        phone: '',
        address: '',
        description: ''
      });
      setSelectedCustomer(null);
      onNewClose();
      
      // Refresh tickets list
      fetchServiceTickets();
    } catch (error: any) {
      console.error('Error creating service ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create service ticket',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle marking a ticket as complete
  const handleMarkComplete = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_tickets')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select();

      if (error) throw error;

      // Update ticket in state
      setTickets(prev => 
        prev.map(ticket => 
          ticket.id === ticketId ? { ...data[0] } : ticket
        )
      );
      
      toast({
        title: 'Success',
        description: 'Service ticket marked as completed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error updating service ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service ticket',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Open delete confirmation dialog
  const handleDeleteClick = (ticket: ServiceTicket) => {
    setTicketToDelete(ticket);
    onDeleteOpen();
  };

  // Handle delete ticket with localStorage tracking
  const handleDeleteConfirm = async () => {
    if (!ticketToDelete) return;
    
    try {
      const { error } = await supabase
        .from('service_tickets')
        .delete()
        .eq('id', ticketToDelete.id);

      if (error) throw error;

      // Add the deleted ticket ID to localStorage
      addDeletedTicketId(ticketToDelete.id);

      // Remove from state
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketToDelete.id));
      
      toast({
        title: 'Success',
        description: 'Service ticket deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Close confirmation dialog
      onDeleteClose();
      
      // If the delete was triggered from view modal, close that too
      if (viewTicket && viewTicket.id === ticketToDelete.id) {
        onViewClose();
      }
      
      // Clear the ticket to delete from state
      setTicketToDelete(null);
    } catch (error: any) {
      console.error('Error deleting service ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service ticket',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // View ticket details
  const handleViewTicket = (ticket: ServiceTicket) => {
    setViewTicket(ticket);
    onViewOpen();
  };

  // Function to get badge color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'red';
      case 'in_progress':
        return 'orange';
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };

  // Format date function to replace date-fns dependency
  const formatDate = (dateString: string, format = 'short') => {
    const date = new Date(dateString);
    
    if (format === 'short') {
      return date.toLocaleDateString(); // Format: MM/DD/YYYY
    }
    
    return date.toLocaleString(); // Format: MM/DD/YYYY, HH:MM:SS AM/PM
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <Card mb={6}>
        <CardHeader>
          <Flex align="center">
            <Heading size="lg">Service Tickets</Heading>
            <Spacer />
            <Button 
              leftIcon={<AddIcon />} 
              colorScheme="green" 
              onClick={onNewOpen}
            >
              New Ticket
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <Center py={10}>
              <Spinner size="xl" color="green.500" />
            </Center>
          ) : tickets.length === 0 ? (
            <Center py={10}>
              <Text>No service tickets found. Create a new one to get started.</Text>
            </Center>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Ticket ID</Th>
                  <Th>Customer</Th>
                  <Th>Date Created</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {tickets.map((ticket) => (
                  <Tr key={ticket.id}>
                    <Td>{ticket.id.substring(0, 8)}...</Td>
                    <Td>{ticket.customer_name}</Td>
                    <Td>{formatDate(ticket.created_at)}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="View Details">
                          <IconButton
                            aria-label="View ticket"
                            icon={<ViewIcon />}
                            size="sm"
                            colorScheme="blue"
                            onClick={() => handleViewTicket(ticket)}
                          />
                        </Tooltip>
                        {ticket.status !== 'completed' && (
                          <Tooltip label="Mark as Complete">
                            <IconButton
                              aria-label="Mark as complete"
                              icon={<CheckIcon />}
                              size="sm"
                              colorScheme="green"
                              onClick={() => handleMarkComplete(ticket.id)}
                            />
                          </Tooltip>
                        )}
                        <Tooltip label="Delete Ticket">
                          <IconButton
                            aria-label="Delete ticket"
                            icon={<DeleteIcon />}
                            size="sm"
                            colorScheme="red"
                            onClick={() => handleDeleteClick(ticket)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Create New Ticket Modal */}
      <Modal isOpen={isNewOpen} onClose={onNewClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Service Ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Customer</FormLabel>
                <Box w="100%" position="relative" id="customer-dropdown-box">
                  <Input
                    placeholder="Search or select customer"
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setFormData({ ...formData, customer_name: e.target.value });
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    autoComplete="off"
                  />
                  {showCustomerDropdown && (
                    <Box position="absolute" bg="white" zIndex={10} w="100%" maxH="180px" overflowY="auto" borderWidth={1} borderRadius="md" boxShadow="md">
                      {filteredCustomers.length === 0 && (
                        <Text px={4} py={2} color="gray.500">No customers found</Text>
                      )}
                      {filteredCustomers.map((customer) => (
                        <Box
                          key={customer.customer_name}
                          px={4} py={2}
                          _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              customer_name: customer.customer_name,
                              email: customer.email || '',
                              phone: customer.phone || '',
                              address: customer.address || '',
                            });
                            setSelectedCustomer(customer);
                            setCustomerSearch(customer.customer_name);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          {customer.customer_name}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </FormControl>

              {selectedCustomer && (
                <>
                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      isReadOnly
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Phone</FormLabel>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      isReadOnly
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Address</FormLabel>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      isReadOnly
                    />
                  </FormControl>
                </>
              )}

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  placeholder="Describe the issue..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNewClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleSubmit}>
              Create Ticket
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Ticket Details Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ticket Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewTicket && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Status:</Text>
                  <Badge colorScheme={getStatusColor(viewTicket.status)} mt={1}>
                    {viewTicket.status.replace('_', ' ')}
                  </Badge>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Customer:</Text>
                  <Text>{viewTicket.customer_name}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Contact:</Text>
                  <Text>{viewTicket.email}</Text>
                  <Text>{viewTicket.phone}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Address:</Text>
                  <Text>{viewTicket.address}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Description:</Text>
                  <Text>{viewTicket.description}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Created:</Text>
                  <Text>{formatDate(viewTicket.created_at, 'long')}</Text>
                </Box>
                
                {viewTicket.completed_at && (
                  <Box>
                    <Text fontWeight="bold">Completed:</Text>
                    <Text>{formatDate(viewTicket.completed_at, 'long')}</Text>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              {viewTicket && (
                <Button
                  colorScheme="red"
                  onClick={() => handleDeleteClick(viewTicket)}
                >
                  Delete
                </Button>
              )}
              <Button variant="ghost" onClick={onViewClose}>
                Close
              </Button>
              {viewTicket && viewTicket.status !== 'completed' && (
                <Button
                  colorScheme="green"
                  onClick={() => {
                    handleMarkComplete(viewTicket.id);
                    onViewClose();
                  }}
                >
                  Mark as Complete
                </Button>
              )}
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Service Ticket
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this service ticket?
              {ticketToDelete && (
                <Box mt={2}>
                  <Text fontWeight="bold">Customer: {ticketToDelete.customer_name}</Text>
                  <Text fontWeight="bold">Status: {ticketToDelete.status}</Text>
                </Box>
              )}
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default ServiceTickets; 
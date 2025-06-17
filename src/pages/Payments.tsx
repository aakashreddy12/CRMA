import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Select,
  HStack,
  Flex,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Add a new interface for project data
interface Project {
  id: string;
  name: string;
}

interface PaymentHistoryItem {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  order_id: string;
  payment_id: string;
  project_id: string;
  project_name: string;
}

const Payments: React.FC = () => {
  const { user, isFinance } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Redirect if not finance user
  useEffect(() => {
    if (!isFinance) {
      navigate('/dashboard');
      toast({
        title: 'Access denied',
        description: 'You do not have access to this page',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [isFinance, navigate, toast]);

  // Load projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setProjects(data || []);
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error fetching projects',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    fetchProjects();
  }, [toast]);

  // Load payment history
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      setLoadingHistory(true);
      try {
        // Check if the payments table exists
        const { error: tableCheckError } = await supabase
          .from('payments')
          .select('id')
          .limit(1);
        
        // If payments table doesn't exist, set history to empty array and show a message
        if (tableCheckError && tableCheckError.message.includes('does not exist')) {
          console.error('Payments table does not exist:', tableCheckError);
          toast({
            title: 'Database Setup Required',
            description: 'The payments table needs to be created in your database.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
          setPaymentHistory([]);
          setLoadingHistory(false);
          return;
        }

        // Get payments data
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id, 
            created_at, 
            amount, 
            status, 
            order_id, 
            payment_id, 
            project_id
          `)
          .order('created_at', { ascending: false });

        if (paymentsError) throw paymentsError;

        // Get projects data to join with payments
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, name');

        if (projectsError) throw projectsError;

        // Create a map of project IDs to names for quick lookup
        const projectMap: { [key: string]: string } = {};
        (projectsData || []).forEach((project: Project) => {
          projectMap[project.id] = project.name;
        });

        // Join the data manually
        const formattedData = (paymentsData || []).map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          amount: item.amount,
          status: item.status,
          order_id: item.order_id,
          payment_id: item.payment_id,
          project_id: item.project_id,
          project_name: projectMap[item.project_id] || 'Unknown Project',
        }));

        setPaymentHistory(formattedData);
      } catch (error: any) {
        console.error('Error fetching payment history:', error);
        toast({
          title: 'Error fetching payment history',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoadingHistory(false);
      }
    };

    if (isFinance) {
      fetchPaymentHistory();
    }
  }, [isFinance, toast]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!amount || !selectedProject) {
      toast({
        title: 'Missing information',
        description: 'Please enter amount and select a project',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      // Check if payment_orders table exists
      const { error: tableCheckError } = await supabase
        .from('payment_orders')
        .select('id')
        .limit(1);
      
      if (tableCheckError && tableCheckError.message.includes('does not exist')) {
        toast({
          title: 'Database Setup Required',
          description: 'The payment_orders table needs to be created in your database.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }

      // Load the Razorpay script
      const res = await loadRazorpayScript();
      
      if (!res) {
        throw new Error('Razorpay SDK failed to load');
      }

      // Create order in Supabase
      const amountInPaise = Math.round(parseFloat(amount) * 100);
      const { data: orderData, error: orderError } = await supabase
        .from('payment_orders')
        .insert([
          {
            amount: amountInPaise,
            status: 'created',
            project_id: selectedProject,
            created_by: user?.id
          }
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Get selected project name
      const project = projects.find(p => p.id === selectedProject);
      
      // Configure Razorpay options
      const options = {
        key: 'rzp_test_NCm6iCJioqxsjo', // Razorpay test key ID
        amount: amountInPaise,
        currency: 'INR',
        name: 'Axiso Green Energy',
        description: `Payment for ${project?.name || 'Project'}`,
        // Using Supabase order ID as receipt instead of actual Razorpay order_id
        receipt: `receipt_${orderData.id}`,
        handler: async function (response: any) {
          try {
            // Save payment details
            const { error: paymentError } = await supabase
              .from('payments')
              .insert([
                {
                  amount: amountInPaise / 100, // Convert back to regular amount
                  status: 'success',
                  order_id: orderData.id,
                  payment_id: response.razorpay_payment_id,
                  project_id: selectedProject
                }
              ]);

            if (paymentError) throw paymentError;

            // Update order status
            const { error: updateError } = await supabase
              .from('payment_orders')
              .update({ status: 'paid' })
              .eq('id', orderData.id);

            if (updateError) throw updateError;

            toast({
              title: 'Payment Successful',
              description: `Payment ID: ${response.razorpay_payment_id}`,
              status: 'success',
              duration: 5000,
              isClosable: true,
            });

            // Refresh payment history
            const { data: newPaymentsData, error: paymentsError } = await supabase
              .from('payments')
              .select(`
                id, 
                created_at, 
                amount, 
                status, 
                order_id, 
                payment_id, 
                project_id
              `)
              .order('created_at', { ascending: false });

            if (paymentsError) throw paymentsError;

            // Get projects data to join with payments
            const { data: projectsData, error: projectsError } = await supabase
              .from('projects')
              .select('id, name');

            if (projectsError) throw projectsError;

            // Create a map of project IDs to names for quick lookup
            const projectMap: { [key: string]: string } = {};
            (projectsData || []).forEach((project: Project) => {
              projectMap[project.id] = project.name;
            });

            // Join the data manually
            const formattedData = (newPaymentsData || []).map((item: any) => ({
              id: item.id,
              created_at: item.created_at,
              amount: item.amount,
              status: item.status,
              order_id: item.order_id,
              payment_id: item.payment_id,
              project_id: item.project_id,
              project_name: projectMap[item.project_id] || 'Unknown Project',
            }));

            setPaymentHistory(formattedData);
            setAmount('');
            setSelectedProject('');
          } catch (error: any) {
            console.error('Error processing payment:', error);
            toast({
              title: 'Error processing payment',
              description: error.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
        },
        prefill: {
          name: 'Dhanush',
          email: 'dhanush@axisogreen.in',
        },
        theme: {
          color: '#38A169',
        },
        // Important: Image should be your company logo
        image: 'https://yourbrandlogo.com/logo.png',
        // Config Razorpay to use our secret key - note: this is not secure for production
        // In production, you should use a backend API to create orders
        notes: {
          address: 'Axiso Green Energy Corporate Office'
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isFinance) {
    return null; // Don't render anything if not finance user
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>Payment Portal</Heading>
      
      <Flex direction={{ base: "column", md: "row" }} gap={10}>
        <Box 
          p={6} 
          bg="white" 
          borderRadius="md" 
          boxShadow="sm" 
          width={{ base: "100%", md: "40%" }}
        >
          <VStack spacing={4} align="flex-start">
            <Heading size="md" mb={2}>Make a Payment</Heading>
            
            <FormControl isRequired>
              <FormLabel>Select Project</FormLabel>
              <Select 
                placeholder="Select project" 
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Amount (INR)</FormLabel>
              <Input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </FormControl>
            
            <Button 
              colorScheme="green" 
              onClick={handlePayment}
              isLoading={loading}
              loadingText="Processing"
              width="full"
              mt={4}
            >
              Pay Now
            </Button>
          </VStack>
        </Box>
        
        <Box 
          p={6} 
          bg="white" 
          borderRadius="md" 
          boxShadow="sm"
          width={{ base: "100%", md: "60%" }}
        >
          <Heading size="md" mb={4}>Payment History</Heading>
          
          {loadingHistory ? (
            <Center py={10}>
              <Spinner size="lg" color="green.500" />
            </Center>
          ) : paymentHistory.length === 0 ? (
            <Text color="gray.500" py={10} textAlign="center">
              No payment history found
            </Text>
          ) : (
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Project</Th>
                    <Th isNumeric>Amount</Th>
                    <Th>Status</Th>
                    <Th>Payment ID</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paymentHistory.map((payment) => (
                    <Tr key={payment.id}>
                      <Td>{new Date(payment.created_at).toLocaleDateString()}</Td>
                      <Td>{payment.project_name}</Td>
                      <Td isNumeric>₹{payment.amount.toFixed(2)}</Td>
                      <Td>
                        <Badge colorScheme={payment.status === 'success' ? 'green' : 'yellow'}>
                          {payment.status}
                        </Badge>
                      </Td>
                      <Td fontSize="xs">{payment.payment_id || '-'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default Payments; 
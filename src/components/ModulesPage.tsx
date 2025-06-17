import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
  HStack,
  useToast,
  InputGroup,
  InputRightElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Text,
  Divider,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { supabase } from '../utils/supabaseClient';

interface Module {
  id: number;
  name: string;
  watt: number;
}

interface Inverter {
  id: number;
  name: string;
}

interface Assignment {
  id: number;
  customer_name: string;
  module: Module;
  inverter: Inverter;
  quantity: number;
}

const ModulesPage: React.FC = () => {
  // State
  const [modules, setModules] = useState<Module[]>([]);
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Form state
  const [moduleName, setModuleName] = useState('');
  const [moduleWatt, setModuleWatt] = useState<number>(0);
  const [inverterName, setInverterName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | ''>('');
  const [selectedInverterId, setSelectedInverterId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const toast = useToast();

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Modules
      const { data: modulesData } = await supabase.from('modules').select('*');
      setModules(modulesData || []);
      // Inverters
      const { data: invertersData } = await supabase.from('inverters').select('*');
      setInverters(invertersData || []);
      // Customers from projects table (distinct customer_name)
      const { data: projectsData } = await supabase.from('projects').select('customer_name');
      const customerNames = Array.from(new Set((projectsData || []).map((p: any) => p.customer_name)));
      setCustomers(customerNames);
      // Assignments (join module and inverter info)
      const { data: assignmentsData } = await supabase
        .from('customer_module_assignments')
        .select('id, customer_name, modules(*), inverters(*), quantity');
      setAssignments(
        (assignmentsData || []).map((a: any) => ({
          id: a.id,
          customer_name: a.customer_name,
          module: Array.isArray(a.modules) ? a.modules[0] : a.modules,
          inverter: Array.isArray(a.inverters) ? a.inverters[0] : a.inverters,
          quantity: a.quantity,
        }))
      );
    };
    fetchData();
  }, []);

  // Add module (Supabase)
  const handleAddModule = async () => {
    if (!moduleName || !moduleWatt) return;
    const { data, error } = await supabase
      .from('modules')
      .insert([{ name: moduleName, watt: moduleWatt }])
      .select();
    if (!error && data) {
      setModules([...modules, ...data]);
      setModuleName('');
      setModuleWatt(0);
    }
  };

  // Add inverter (Supabase)
  const handleAddInverter = async () => {
    if (!inverterName) return;
    const { data, error } = await supabase
      .from('inverters')
      .insert([{ name: inverterName }])
      .select();
    if (!error && data) {
      setInverters([...inverters, ...data]);
      setInverterName('');
    }
  };

  // Assign module/inverter to customer (Supabase)
  const handleAssign = async () => {
    if (!selectedCustomer || !selectedModuleId || !selectedInverterId || !quantity) return;
    const { data, error } = await supabase
      .from('customer_module_assignments')
      .insert([{ customer_name: selectedCustomer, module_id: selectedModuleId, inverter_id: selectedInverterId, quantity }])
      .select('id, customer_name, modules(*), inverters(*), quantity');
    if (!error && data) {
      setAssignments([
        ...assignments,
        ...data.map((a: any) => ({
          id: a.id,
          customer_name: a.customer_name,
          module: Array.isArray(a.modules) ? a.modules[0] : a.modules,
          inverter: Array.isArray(a.inverters) ? a.inverters[0] : a.inverters,
          quantity: a.quantity,
        })),
      ]);
      setSelectedCustomer('');
      setSelectedModuleId('');
      setSelectedInverterId('');
      setQuantity(1);
    }
  };

  return (
    <Box maxW="900px" mx="auto" p={8}>
      <Heading mb={8} color="green.600" size="lg">Module & Inverter Management</Heading>
      <Flex gap={10} mb={10} wrap="wrap">
        <VStack align="stretch" spacing={4} flex={1} minW="260px">
          <Heading size="md">Add Module</Heading>
          <Input
            placeholder="Module Name"
            value={moduleName}
            onChange={e => setModuleName(e.target.value)}
            variant="filled"
          />
          <Input
            type="number"
            placeholder="Watt"
            value={moduleWatt || ''}
            onChange={e => setModuleWatt(Number(e.target.value))}
            variant="filled"
          />
          <Button colorScheme="green" onClick={handleAddModule}>Add Module</Button>
        </VStack>
        <VStack align="stretch" spacing={4} flex={1} minW="260px">
          <Heading size="md">Add Inverter</Heading>
          <Input
            placeholder="Inverter Name"
            value={inverterName}
            onChange={e => setInverterName(e.target.value)}
            variant="filled"
          />
          <Button colorScheme="green" onClick={handleAddInverter}>Add Inverter</Button>
        </VStack>
      </Flex>
      <Divider my={8} />
      <VStack align="stretch" spacing={4} mb={10}>
        <Heading size="md">Assign Module & Inverter to Customer</Heading>
        <Flex gap={4} wrap="wrap">
          {/* Customer Combo Input/Dropdown */}
          <Box minW="220px">
            <InputGroup>
              <Input
                placeholder="Customer Name"
                value={customerInput || selectedCustomer}
                onChange={e => {
                  setCustomerInput(e.target.value);
                  setSelectedCustomer(e.target.value);
                  setShowCustomerMenu(true);
                }}
                variant="filled"
                onFocus={() => setShowCustomerMenu(true)}
                onBlur={() => setTimeout(() => setShowCustomerMenu(false), 150)}
              />
              <InputRightElement>
                <IconButton
                  aria-label="Show customers"
                  icon={<ChevronDownIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCustomerMenu((v) => !v)}
                  tabIndex={-1}
                />
              </InputRightElement>
            </InputGroup>
            {showCustomerMenu && (
              <Box
                position="absolute"
                zIndex={10}
                bg="white"
                borderRadius="md"
                boxShadow="md"
                mt={1}
                maxH="180px"
                overflowY="auto"
                w="full"
              >
                {customers
                  .filter(
                    (c) =>
                      !customerInput ||
                      c.toLowerCase().includes(customerInput.toLowerCase())
                  )
                  .map((c) => (
                    <Box
                      key={c}
                      px={4}
                      py={2}
                      _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                      onMouseDown={() => {
                        setSelectedCustomer(c);
                        setCustomerInput(c);
                        setShowCustomerMenu(false);
                      }}
                    >
                      {c}
                    </Box>
                  ))}
                {customers.length === 0 && (
                  <Text px={4} py={2} color="gray.400">No customers found</Text>
                )}
              </Box>
            )}
          </Box>
          {/* Module Dropdown */}
          <Box minW="180px">
            <Input
              as="select"
              value={selectedModuleId}
              onChange={e => setSelectedModuleId(Number(e.target.value))}
              variant="filled"
            >
              <option value="">Select Module</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.watt}W)</option>
              ))}
            </Input>
          </Box>
          {/* Inverter Dropdown */}
          <Box minW="180px">
            <Input
              as="select"
              value={selectedInverterId}
              onChange={e => setSelectedInverterId(Number(e.target.value))}
              variant="filled"
            >
              <option value="">Select Inverter</option>
              {inverters.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Input>
          </Box>
          <Input
            type="number"
            min={1}
            placeholder="Quantity"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            variant="filled"
            w="100px"
          />
          <Button colorScheme="green" onClick={handleAssign} minW="120px">
            Assign
          </Button>
        </Flex>
      </VStack>
      <Divider my={8} />
      <Heading size="md" mb={4}>Assignments</Heading>
      <Table variant="simple" colorScheme="green" bg="white" borderRadius="md" boxShadow="md" overflow="hidden">
        <Thead>
          <Tr>
            <Th>Customer Name</Th>
            <Th>Module Assigned</Th>
            <Th>Watts</Th>
            <Th>Quantity</Th>
            <Th>Inverter Name</Th>
            <Th>KWH</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {assignments.map(a => {
            const kwh = a.module?.watt && a.quantity ? (a.module.watt * a.quantity) / 1000 : '';
            return (
              <Tr key={a.id}>
                <Td>{a.customer_name}</Td>
                <Td>{a.module?.name}</Td>
                <Td>{a.module?.watt}</Td>
                <Td>{a.quantity}</Td>
                <Td>{a.inverter?.name}</Td>
                <Td>{typeof kwh === 'number' ? kwh.toFixed(2) : ''}</Td>
                <Td>
                  <Button colorScheme="red" size="sm" onClick={async () => {
                    const { error } = await supabase.from('customer_module_assignments').delete().eq('id', a.id);
                    if (!error) {
                      setAssignments(assignments.filter(x => x.id !== a.id));
                      toast({ title: 'Assignment deleted', status: 'success', duration: 2000 });
                    } else {
                      toast({ title: 'Failed to delete', status: 'error', duration: 2000 });
                    }
                  }}>
                    Delete
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ModulesPage;

// Note: Make sure you have a .env file in your project root with:
// REACT_APP_SUPABASE_URL=your_supabase_url
// REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
// And restart your dev server after adding or editing .env.

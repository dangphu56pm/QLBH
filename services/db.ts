import { Customer, Product, Order, User, Category, ViewState, MenuConfigItem, DebtTransaction, InventoryTransaction } from '../types';

const KEYS = {
  PRODUCTS: 'app_products',
  CUSTOMERS: 'app_customers',
  ORDERS: 'app_orders',
  USERS: 'app_users',
  CATEGORIES: 'app_categories',
  SESSION: 'app_session',
  MENU_CONFIG: 'app_menu_config',
  DEBT_TRANSACTIONS: 'app_debt_transactions',
  INVENTORY_TRANSACTIONS: 'app_inventory_transactions',
};

// Hàm helper để giả lập độ trễ mạng nếu cần (không dùng ở đây để app nhanh)
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- MENU CONFIGURATION ---
export const getMenuConfig = (): MenuConfigItem[] => {
  const data = localStorage.getItem(KEYS.MENU_CONFIG);
  if (!data) {
    // Default Order
    const defaultOrder: MenuConfigItem[] = [
      { id: ViewState.DASHBOARD, isVisible: true },
      { id: ViewState.SALES, isVisible: true },
      { id: ViewState.INVENTORY, isVisible: true },
      { id: ViewState.IMPORT_STOCK, isVisible: true }, // Added
      { id: ViewState.EXPORT_STOCK, isVisible: true }, // Added
      { id: ViewState.CATEGORIES, isVisible: true }, 
      { id: ViewState.CUSTOMERS, isVisible: true },
      { id: ViewState.DEBT, isVisible: true },
      { id: ViewState.USERS, isVisible: true },
    ];
    localStorage.setItem(KEYS.MENU_CONFIG, JSON.stringify(defaultOrder));
    return defaultOrder;
  }
  return JSON.parse(data);
};

export const saveMenuConfig = (config: MenuConfigItem[]): void => {
  localStorage.setItem(KEYS.MENU_CONFIG, JSON.stringify(config));
  window.dispatchEvent(new Event('menu-config-change'));
};

// --- CATEGORIES ---
export const getCategories = (): Category[] => {
  const data = localStorage.getItem(KEYS.CATEGORIES);
  if (!data) {
    const seed: Category[] = [
      { id: '1', name: 'Lương thực' },
      { id: '2', name: 'Gia vị' },
      { id: '3', name: 'Đồ uống' },
      { id: '4', name: 'Bánh kẹo' },
      { id: '5', name: 'Hóa mỹ phẩm' },
      { id: '6', name: 'Khác' },
    ];
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

export const saveCategory = (category: Category): void => {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === category.id);
  if (index >= 0) {
    categories[index] = category;
  } else {
    categories.push({ ...category, id: category.id || generateId() });
  }
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  window.dispatchEvent(new Event('category-change'));
};

export const deleteCategory = (id: string): void => {
  const categories = getCategories().filter(c => c.id !== id);
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  window.dispatchEvent(new Event('category-change'));
};

// --- PRODUCTS ---
export const getProducts = (): Product[] => {
  const data = localStorage.getItem(KEYS.PRODUCTS);
  if (!data) {
    // Seed data
    const seed: Product[] = [
      { id: '1', code: 'SP001', name: 'Gạo ST25', unit: 'kg', price: 35000, cost: 28000, stock: 100, category: 'Lương thực' },
      { id: '2', code: 'SP002', name: 'Nước mắm Nam Ngư', unit: 'chai', price: 42000, cost: 35000, stock: 50, category: 'Gia vị' },
      { id: '3', code: 'SP003', name: 'Mì Hảo Hảo', unit: 'thùng', price: 115000, cost: 105000, stock: 200, category: 'Lương thực' },
    ];
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

export const saveProduct = (product: Product): void => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.push({ ...product, id: product.id || generateId() });
  }
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('db-change'));
};

export const deleteProduct = (id: string): void => {
  const products = getProducts().filter(p => p.id !== id);
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('db-change'));
};

// --- INVENTORY TRANSACTIONS ---

export const getInventoryTransactions = (): InventoryTransaction[] => {
  const data = localStorage.getItem(KEYS.INVENTORY_TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

export const createInventoryTransaction = (transaction: Omit<InventoryTransaction, 'id'>): void => {
  const transactions = getInventoryTransactions();
  const newTrans = { ...transaction, id: generateId() };
  transactions.push(newTrans);
  localStorage.setItem(KEYS.INVENTORY_TRANSACTIONS, JSON.stringify(transactions));

  // Update Product Stock
  const products = getProducts();
  newTrans.items.forEach(item => {
    const productIndex = products.findIndex(p => p.id === item.productId);
    if (productIndex >= 0) {
      if (newTrans.type === 'import') {
        products[productIndex].stock += item.quantity;
        // Optional: Update cost price if provided
        if (item.cost && item.cost > 0) {
            products[productIndex].cost = item.cost;
        }
      } else {
        products[productIndex].stock -= item.quantity;
      }
    }
  });
  
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  window.dispatchEvent(new Event('db-change'));
};


// --- CUSTOMERS ---
export const getCustomers = (): Customer[] => {
  const data = localStorage.getItem(KEYS.CUSTOMERS);
  if (!data) {
    const seed: Customer[] = [
      { id: '1', name: 'Nguyễn Văn A', phone: '0909123456', address: 'Hà Nội', debt: 0, gender: 'Nam', age: 32, weight: 70 },
      { id: '2', name: 'Trần Thị B', phone: '0912345678', address: 'TP.HCM', debt: 500000, gender: 'Nữ', age: 28, weight: 52 },
    ];
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

export const saveCustomer = (customer: Customer): void => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === customer.id);
  if (index >= 0) {
    customers[index] = customer;
  } else {
    customers.push({ ...customer, id: customer.id || generateId() });
  }
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  window.dispatchEvent(new Event('db-change'));
};

export const deleteCustomer = (id: string): void => {
  const customers = getCustomers().filter(c => c.id !== id);
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  window.dispatchEvent(new Event('db-change'));
};

export const updateCustomerDebt = (customerId: string, amountChange: number): void => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === customerId);
  if (index >= 0) {
    customers[index].debt += amountChange;
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event('db-change'));
  }
};

// --- ORDERS ---
export const getOrders = (): Order[] => {
  const data = localStorage.getItem(KEYS.ORDERS);
  return data ? JSON.parse(data) : [];
};

export const createOrder = (order: Omit<Order, 'id'>): void => {
  const orders = getOrders();
  const newOrder: Order = { ...order, id: generateId() };
  orders.push(newOrder);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));

  // Update Inventory
  const products = getProducts();
  newOrder.items.forEach(item => {
    const pIndex = products.findIndex(p => p.id === item.productId);
    if (pIndex >= 0) {
      products[pIndex].stock -= item.quantity;
    }
  });
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));

  // Update Customer Debt if any
  if (newOrder.debtAmount > 0) {
    updateCustomerDebt(newOrder.customerId, newOrder.debtAmount);
  } else {
      // Just trigger event since updateCustomerDebt already triggers it
      window.dispatchEvent(new Event('db-change'));
  }
};

export const deleteOrder = (id: string): void => {
  const orders = getOrders();
  const orderToDelete = orders.find(o => o.id === id);
  
  if (!orderToDelete) return;

  // 1. Hoàn lại tồn kho (Inventory Rollback)
  const products = getProducts();
  orderToDelete.items.forEach(item => {
    const pIndex = products.findIndex(p => p.id === item.productId);
    if (pIndex >= 0) {
      products[pIndex].stock += item.quantity;
    }
  });
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));

  // 2. Hoàn lại công nợ nếu có (Debt Rollback)
  // Nếu đơn hàng đã tạo ra nợ, khi xóa đơn hàng thì phải trừ nợ đó đi
  if (orderToDelete.debtAmount > 0) {
    // Lưu ý: updateCustomerDebt cộng thêm giá trị, nên để trừ nợ ta truyền số âm
    updateCustomerDebt(orderToDelete.customerId, -orderToDelete.debtAmount);
  }

  // 3. Xóa đơn hàng khỏi danh sách
  const newOrders = orders.filter(o => o.id !== id);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(newOrders));

  // 4. Trigger update
  window.dispatchEvent(new Event('db-change'));
};

// --- DEBT TRANSACTIONS (NEW) ---
export const getDebtTransactions = (): DebtTransaction[] => {
  const data = localStorage.getItem(KEYS.DEBT_TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

// --- PAYMENT FOR DEBT ---
export const payDebt = (customerId: string, amount: number, staffName: string): void => {
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    
    // 1. Update Debt Balance
    updateCustomerDebt(customerId, -amount);
    
    // 2. Log Transaction
    if (customer) {
        const transactions = getDebtTransactions();
        const newTransaction: DebtTransaction = {
            id: generateId(),
            customerId: customerId,
            customerName: customer.name,
            amount: amount,
            date: new Date().toISOString(),
            note: 'Thu nợ khách hàng',
            staffName: staffName
        };
        transactions.push(newTransaction);
        localStorage.setItem(KEYS.DEBT_TRANSACTIONS, JSON.stringify(transactions));
    }

    window.dispatchEvent(new Event('db-change'));
};

// --- USERS & AUTH ---
export const getUsers = (): User[] => {
  const data = localStorage.getItem(KEYS.USERS);
  if (!data) {
    // Default Admin
    const seed: User[] = [
      { id: '1', username: 'admin', password: '123', name: 'Quản Trị Viên', role: 'admin' },
      { id: '2', username: 'staff', password: '123', name: 'Nhân Viên BH', role: 'staff' },
    ];
    localStorage.setItem(KEYS.USERS, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  
  if (index >= 0) {
    // If updating, preserve password if not provided
    const existingUser = users[index];
    users[index] = { 
        ...user, 
        password: user.password ? user.password : existingUser.password 
    };
  } else {
    users.push({ ...user, id: user.id || generateId() });
  }
  
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  window.dispatchEvent(new Event('user-change'));
};

export const deleteUser = (id: string): void => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  window.dispatchEvent(new Event('user-change'));
};

export const login = (username: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    // Store simple session
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = (): void => {
  localStorage.removeItem(KEYS.SESSION);
  window.location.reload();
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};
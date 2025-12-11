
import { Customer, Product, Order, User, Category, Unit, ViewState, MenuConfigItem, DebtTransaction, InventoryTransaction, SyncConfig } from '../types';

const KEYS = {
  PRODUCTS: 'app_products',
  CUSTOMERS: 'app_customers',
  ORDERS: 'app_orders',
  USERS: 'app_users',
  CATEGORIES: 'app_categories',
  UNITS: 'app_units',
  SESSION: 'app_session',
  MENU_CONFIG: 'app_menu_config',
  DEBT_TRANSACTIONS: 'app_debt_transactions',
  INVENTORY_TRANSACTIONS: 'app_inventory_transactions',
  SYNC_CONFIG: 'app_sync_config',
};

// Hàm helper để giả lập độ trễ mạng nếu cần (không dùng ở đây để app nhanh)
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- MENU CONFIGURATION ---
export const getMenuConfig = (): MenuConfigItem[] => {
  const data = localStorage.getItem(KEYS.MENU_CONFIG);
  const defaultOrder: MenuConfigItem[] = [
    { id: ViewState.DASHBOARD, isVisible: true },
    { id: ViewState.SALES, isVisible: true },
    { id: ViewState.CUSTOMERS, isVisible: true }, // Moved Up
    { id: ViewState.INVENTORY, isVisible: true }, // Moved Down below Customers
    { id: ViewState.IMPORT_STOCK, isVisible: true }, 
    { id: ViewState.EXPORT_STOCK, isVisible: true }, 
    { id: ViewState.CATEGORIES, isVisible: true }, 
    { id: ViewState.UNITS, isVisible: true },
    { id: ViewState.DEBT, isVisible: true },
    { id: ViewState.REPORTS, isVisible: true }, 
    { id: ViewState.USERS, isVisible: true }, // Moved Up above System
    { id: ViewState.SYSTEM, isVisible: true },
    { id: ViewState.SETTINGS_GENERAL, isVisible: true }, // Child of SYSTEM
    { id: ViewState.SETTINGS_DATA, isVisible: true },    // Child of SYSTEM
    { id: ViewState.MENU_MANAGEMENT, isVisible: true },  // Child of SYSTEM
  ];

  if (!data) {
    localStorage.setItem(KEYS.MENU_CONFIG, JSON.stringify(defaultOrder));
    return defaultOrder;
  }

  // Migration: Ensure new menu items exist in stored config
  const storedConfig: MenuConfigItem[] = JSON.parse(data);
  let hasChanges = false;
  
  defaultOrder.forEach(defItem => {
      if (!storedConfig.find(item => item.id === defItem.id)) {
          storedConfig.push(defItem);
          hasChanges = true;
      }
  });

  // --- MIGRATION LOGIC FOR ORDERING ---
  
  // 1. REPORTS below DEBT (Old request)
  const reportsIndex = storedConfig.findIndex(i => i.id === ViewState.REPORTS);
  const debtIndex = storedConfig.findIndex(i => i.id === ViewState.DEBT);
  if (reportsIndex !== -1 && debtIndex !== -1 && reportsIndex < debtIndex) {
      const [item] = storedConfig.splice(reportsIndex, 1);
      const newDebtIndex = storedConfig.findIndex(i => i.id === ViewState.DEBT);
      storedConfig.splice(newDebtIndex + 1, 0, item);
      hasChanges = true;
  }

  // 2. INVENTORY below CUSTOMERS (New request)
  // Check if INVENTORY comes BEFORE CUSTOMERS
  const invIndex = storedConfig.findIndex(i => i.id === ViewState.INVENTORY);
  const custIndex = storedConfig.findIndex(i => i.id === ViewState.CUSTOMERS);
  
  if (invIndex !== -1 && custIndex !== -1 && invIndex < custIndex) {
      const [item] = storedConfig.splice(invIndex, 1);
      const newCustIndex = storedConfig.findIndex(i => i.id === ViewState.CUSTOMERS);
      storedConfig.splice(newCustIndex + 1, 0, item);
      hasChanges = true;
  }

  // 3. USERS above SYSTEM (New request)
  // Check if USERS comes AFTER SYSTEM
  const userIndex = storedConfig.findIndex(i => i.id === ViewState.USERS);
  const sysIndex = storedConfig.findIndex(i => i.id === ViewState.SYSTEM);

  if (userIndex !== -1 && sysIndex !== -1 && userIndex > sysIndex) {
      const [item] = storedConfig.splice(userIndex, 1);
      const newSysIndex = storedConfig.findIndex(i => i.id === ViewState.SYSTEM);
      storedConfig.splice(newSysIndex, 0, item);
      hasChanges = true;
  }

  // Clean up removed items
  const validIds = Object.values(ViewState);
  const filteredConfig = storedConfig.filter(item => validIds.includes(item.id));
  if (filteredConfig.length !== storedConfig.length) {
      hasChanges = true;
  }

  if (hasChanges) {
      localStorage.setItem(KEYS.MENU_CONFIG, JSON.stringify(filteredConfig));
      return filteredConfig;
  }

  return storedConfig;
};

export const saveMenuConfig = (config: MenuConfigItem[]): void => {
  localStorage.setItem(KEYS.MENU_CONFIG, JSON.stringify(config));
  window.dispatchEvent(new Event('menu-config-change'));
};

// --- SYNC / AUTO BACKUP CONFIG ---
export const getSyncConfig = (): SyncConfig => {
  const data = localStorage.getItem(KEYS.SYNC_CONFIG);
  if (!data) {
    return {
      autoBackup: false,
      intervalMinutes: 60, // Mặc định 60 phút
      lastBackup: new Date().toISOString(),
      expiryAlertDays: 30, // Mặc định cảnh báo trước 30 ngày
      themeColor: 'blue', // Mặc định màu xanh
      shopName: 'Quản Lý Bán Hàng',
      shopLogo: ''
    };
  }
  // Migration for old config
  const config = JSON.parse(data);
  if (config.expiryAlertDays === undefined) {
      config.expiryAlertDays = 30;
  }
  if (!config.themeColor) {
      config.themeColor = 'blue';
  }
  if (!config.shopName) {
      config.shopName = 'Quản Lý Bán Hàng';
  }
  if (config.shopLogo === undefined) {
      config.shopLogo = '';
  }
  return config;
};

export const saveSyncConfig = (config: SyncConfig): void => {
  localStorage.setItem(KEYS.SYNC_CONFIG, JSON.stringify(config));
  // Không cần dispatch event vì logic check sẽ đọc trực tiếp từ localStorage mỗi lần chạy interval
  // Tuy nhiên, dispatch để component Dashboard cập nhật UI ngay lập tức
  window.dispatchEvent(new Event('config-change'));
};

export const updateLastBackupTime = (): void => {
  const config = getSyncConfig();
  config.lastBackup = new Date().toISOString();
  saveSyncConfig(config);
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

// --- UNITS (NEW) ---
export const getUnits = (): Unit[] => {
  const data = localStorage.getItem(KEYS.UNITS);
  if (!data) {
    const seed: Unit[] = [
      { id: '1', name: 'Cái' },
      { id: '2', name: 'Hộp' },
      { id: '3', name: 'Thùng' },
      { id: '4', name: 'Chai' },
      { id: '5', name: 'Lốc' },
      { id: '6', name: 'Kg' },
      { id: '7', name: 'Gói' },
    ];
    localStorage.setItem(KEYS.UNITS, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

export const saveUnit = (unit: Unit): void => {
  const units = getUnits();
  const index = units.findIndex(u => u.id === unit.id);
  if (index >= 0) {
    units[index] = unit;
  } else {
    units.push({ ...unit, id: unit.id || generateId() });
  }
  localStorage.setItem(KEYS.UNITS, JSON.stringify(units));
  window.dispatchEvent(new Event('unit-change'));
};

export const deleteUnit = (id: string): void => {
  const units = getUnits().filter(u => u.id !== id);
  localStorage.setItem(KEYS.UNITS, JSON.stringify(units));
  window.dispatchEvent(new Event('unit-change'));
};

// --- PRODUCTS ---
export const getProducts = (): Product[] => {
  const data = localStorage.getItem(KEYS.PRODUCTS);
  if (!data) {
    // Seed data
    const seed: Product[] = [
      { id: '1', code: 'SP001', name: 'Gạo ST25', unit: 'Kg', price: 35000, cost: 28000, stock: 100, category: 'Lương thực', batchNumber: 'L001', expiryDate: '2025-12-31' },
      { id: '2', code: 'SP002', name: 'Nước mắm Nam Ngư', unit: 'Chai', price: 42000, cost: 35000, stock: 50, category: 'Gia vị', batchNumber: 'L002', expiryDate: '2024-10-20' },
      { id: '3', code: 'SP003', name: 'Mì Hảo Hảo', unit: 'Thùng', price: 115000, cost: 105000, stock: 200, category: 'Lương thực' },
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
        // Update cost price if provided
        if (item.cost && item.cost > 0) {
            products[productIndex].cost = item.cost;
        }
        // Update Batch & Expiry if provided (Only for Import)
        if (item.batchNumber) {
            products[productIndex].batchNumber = item.batchNumber;
        }
        if (item.expiryDate) {
            products[productIndex].expiryDate = item.expiryDate;
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

// --- DEBT TRANSACTIONS (NEW) ---
export const getDebtTransactions = (): DebtTransaction[] => {
  const data = localStorage.getItem(KEYS.DEBT_TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

const createDebtTransaction = (trans: DebtTransaction): void => {
    const transactions = getDebtTransactions();
    transactions.push(trans);
    localStorage.setItem(KEYS.DEBT_TRANSACTIONS, JSON.stringify(transactions));
}

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
    
    // Log Debt Transaction (Order creation)
    createDebtTransaction({
        id: generateId(),
        customerId: newOrder.customerId,
        customerName: newOrder.customerName,
        amount: newOrder.debtAmount,
        date: new Date().toISOString(),
        note: `Nợ từ đơn hàng #${newOrder.id}`,
        staffName: newOrder.staffName,
        type: 'order',
        orderId: newOrder.id
    });
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
    
    // Log Debt Transaction (Rollback)
    createDebtTransaction({
        id: generateId(),
        customerId: orderToDelete.customerId,
        customerName: orderToDelete.customerName,
        amount: orderToDelete.debtAmount, // Số tiền được hoàn lại
        date: new Date().toISOString(),
        note: `Hủy đơn hàng #${orderToDelete.id}`,
        staffName: orderToDelete.staffName || 'System',
        type: 'rollback',
        orderId: orderToDelete.id
    });
  }

  // 3. Xóa đơn hàng khỏi danh sách
  const newOrders = orders.filter(o => o.id !== id);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(newOrders));

  // 4. Trigger update
  window.dispatchEvent(new Event('db-change'));
};


// --- PAYMENT FOR DEBT ---
export const payDebt = (customerId: string, amount: number, staffName: string): void => {
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    
    // 1. Update Customer Debt Balance (Global)
    updateCustomerDebt(customerId, -amount);
    
    // 2. Update specific orders (FIFO - First In First Out)
    // Find all orders for this customer that have debt > 0
    const allOrders = getOrders();
    const customerOrders = allOrders
        .filter(o => o.customerId === customerId && o.debtAmount > 0 && o.status !== 'cancelled');
    
    // Sort oldest first
    customerOrders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let remainingPayment = amount;
    
    for (const order of customerOrders) {
        if (remainingPayment <= 0) break;

        const amountToPayForThisOrder = Math.min(order.debtAmount, remainingPayment);
        
        // Update Order
        order.debtAmount -= amountToPayForThisOrder;
        order.paidAmount += amountToPayForThisOrder;
        
        remainingPayment -= amountToPayForThisOrder;
    }
    
    // Save updated orders back to storage
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(allOrders));

    // 3. Log Transaction
    if (customer) {
        createDebtTransaction({
            id: generateId(),
            customerId: customerId,
            customerName: customer.name,
            amount: amount,
            date: new Date().toISOString(),
            note: 'Thu nợ khách hàng',
            staffName: staffName,
            type: 'payment'
        });
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

// --- EXPORT / IMPORT DATA ---

export const exportDatabase = (): string => {
    const data: Record<string, any> = {};
    // Iterate over all keys (except session) and collect data
    Object.values(KEYS).forEach(key => {
        if (key === KEYS.SESSION) return;
        const item = localStorage.getItem(key);
        if (item) {
            data[key] = JSON.parse(item);
        }
    });
    // Add metadata
    data['metadata'] = {
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    return JSON.stringify(data, null, 2);
};

export const importDatabase = (jsonString: string): { success: boolean, message: string } => {
    try {
        const data = JSON.parse(jsonString);
        
        // Basic validation
        if (!data || typeof data !== 'object') {
            return { success: false, message: 'File không hợp lệ' };
        }

        // Restore keys
        Object.values(KEYS).forEach(key => {
            if (key === KEYS.SESSION) return;
            if (data[key]) {
                localStorage.setItem(key, JSON.stringify(data[key]));
            }
        });

        return { success: true, message: 'Khôi phục dữ liệu thành công!' };
    } catch (e) {
        return { success: false, message: 'Lỗi khi đọc file: ' + (e as Error).message };
    }
};

// --- SAMPLE DATA GENERATOR ---
export const generateSampleData = (): void => {
    // 1. Clear existing transactional data
    localStorage.removeItem(KEYS.ORDERS);
    localStorage.removeItem(KEYS.DEBT_TRANSACTIONS);
    localStorage.removeItem(KEYS.INVENTORY_TRANSACTIONS);
    // Keep users and settings, but reset Products and Customers to have clean slate + new ones
    
    // 2. Generate Products
    const sampleProducts: Product[] = [
        { id: generateId(), code: 'SP001', name: 'Gạo ST25 Ông Cua', unit: 'Kg', price: 35000, cost: 28000, stock: 1500, category: 'Lương thực', batchNumber: 'L01/24', expiryDate: '2025-12-31' },
        { id: generateId(), code: 'SP002', name: 'Nước mắm Nam Ngư', unit: 'Chai', price: 42000, cost: 35000, stock: 500, category: 'Gia vị', batchNumber: 'L02/24', expiryDate: '2025-06-30' },
        { id: generateId(), code: 'SP003', name: 'Mì Hảo Hảo Tôm Chua Cay', unit: 'Thùng', price: 115000, cost: 105000, stock: 200, category: 'Lương thực', expiryDate: '2024-12-20' },
        { id: generateId(), code: 'SP004', name: 'Dầu ăn Tường An 1L', unit: 'Chai', price: 55000, cost: 48000, stock: 300, category: 'Gia vị', expiryDate: '2025-08-15' },
        { id: generateId(), code: 'SP005', name: 'Bia Tiger Thùng 24', unit: 'Thùng', price: 350000, cost: 330000, stock: 100, category: 'Đồ uống', expiryDate: '2024-11-01' },
        { id: generateId(), code: 'SP006', name: 'Nước ngọt Coca Cola 1.5L', unit: 'Chai', price: 20000, cost: 16000, stock: 400, category: 'Đồ uống' },
        { id: generateId(), code: 'SP007', name: 'Đường cát trắng Biên Hòa', unit: 'Kg', price: 22000, cost: 18000, stock: 600, category: 'Gia vị' },
        { id: generateId(), code: 'SP008', name: 'Sữa Ông Thọ Đỏ', unit: 'Lon', price: 25000, cost: 21000, stock: 250, category: 'Đồ uống' },
        { id: generateId(), code: 'SP009', name: 'Trứng gà Ba Huân (vỉ 10)', unit: 'Hộp', price: 32000, cost: 28000, stock: 100, category: 'Lương thực', expiryDate: '2024-10-15' },
        { id: generateId(), code: 'SP010', name: 'Bánh ChocoPie Hộp 12', unit: 'Hộp', price: 50000, cost: 42000, stock: 150, category: 'Bánh kẹo' },
    ];
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(sampleProducts));

    // 3. Generate Customers
    const sampleCustomers: Customer[] = [
        { id: generateId(), name: 'Nguyễn Văn An', phone: '0901234567', address: '123 Lê Lợi, Q1', debt: 0, gender: 'Nam', age: 35 },
        { id: generateId(), name: 'Trần Thị Bích', phone: '0912345678', address: '45 Nguyễn Huệ, Q1', debt: 0, gender: 'Nữ', age: 28 },
        { id: generateId(), name: 'Lê Văn Cường', phone: '0987654321', address: '789 Trần Hưng Đạo, Q5', debt: 0, gender: 'Nam', age: 40 },
        { id: generateId(), name: 'Phạm Thị Dung', phone: '0933445566', address: '12 Võ Văn Kiệt, Q1', debt: 0, gender: 'Nữ', age: 30 },
        { id: generateId(), name: 'Hoàng Văn Em', phone: '0977889900', address: '34 Lê Duẩn, Q1', debt: 0, gender: 'Nam', age: 25 },
        { id: generateId(), name: 'Vũ Thị Hạnh', phone: '0909090909', address: '56 Pasteur, Q3', debt: 0, gender: 'Nữ', age: 45 },
        { id: generateId(), name: 'Đặng Văn Giang', phone: '0911223344', address: '78 Hai Bà Trưng, Q1', debt: 0, gender: 'Nam', age: 50 },
        { id: generateId(), name: 'Bùi Thị Hoa', phone: '0922334455', address: '90 Lý Tự Trọng, Q1', debt: 0, gender: 'Nữ', age: 32 },
        { id: generateId(), name: 'Đỗ Văn Hùng', phone: '0944556677', address: '11 Điện Biên Phủ, BT', debt: 0, gender: 'Nam', age: 29 },
        { id: generateId(), name: 'Ngô Thị Kim', phone: '0955667788', address: '22 Xô Viết Nghệ Tĩnh, BT', debt: 0, gender: 'Nữ', age: 38 },
    ];
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(sampleCustomers));

    // 4. Generate Orders (100 orders over 90 days)
    const generatedOrders: Order[] = [];
    const generatedDebtTrans: DebtTransaction[] = [];
    const now = new Date();
    
    // Helper to get random item from array
    const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    // Helper to get random int
    const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    for (let i = 0; i < 100; i++) {
        const customer = getRandom(sampleCustomers);
        
        // Random date within last 90 days
        const daysAgo = getRandomInt(0, 90);
        const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        // Add random time
        orderDate.setHours(getRandomInt(8, 20), getRandomInt(0, 59));

        // Create random cart items (1 to 5 items)
        const numItems = getRandomInt(1, 5);
        const cartItems = [];
        let totalAmount = 0;

        for (let j = 0; j < numItems; j++) {
            const product = getRandom(sampleProducts);
            // Avoid duplicate products in one order for simplicity
            if (cartItems.find(it => it.productId === product.id)) continue;

            const quantity = getRandomInt(1, 5);
            const total = quantity * product.price;
            cartItems.push({
                productId: product.id,
                productName: product.name,
                quantity: quantity,
                price: product.price,
                total: total
            });
            totalAmount += total;
            
            // Decrease stock
            product.stock = Math.max(0, product.stock - quantity);
        }

        if (cartItems.length === 0) continue;

        // Payment logic: 80% full payment, 20% partial (debt)
        let paidAmount = totalAmount;
        let debtAmount = 0;
        
        const isDebt = Math.random() < 0.2; // 20% chance
        if (isDebt) {
            paidAmount = Math.floor(Math.random() * totalAmount / 1000) * 1000; // Random paid amount
            debtAmount = totalAmount - paidAmount;
            
            // Update customer debt
            customer.debt += debtAmount;
            
            // Create debt transaction
            generatedDebtTrans.push({
                id: generateId(),
                customerId: customer.id,
                customerName: customer.name,
                amount: debtAmount,
                date: orderDate.toISOString(),
                note: `Nợ từ đơn hàng tự động`,
                staffName: 'Admin',
                type: 'order',
                orderId: 'temp_id' // Will update after order creation
            });
        }

        const order: Order = {
            id: generateId(),
            customerId: customer.id,
            customerName: customer.name,
            date: orderDate.toISOString(),
            items: cartItems,
            totalAmount: totalAmount,
            discount: 0,
            finalAmount: totalAmount,
            paidAmount: paidAmount,
            debtAmount: debtAmount,
            status: 'completed',
            staffName: 'Admin'
        };
        
        // Fix transaction orderId
        const relatedTrans = generatedDebtTrans.find(t => t.date === order.date && t.customerId === customer.id);
        if (relatedTrans) relatedTrans.orderId = order.id;

        generatedOrders.push(order);
    }

    // Save all data
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(sampleProducts));
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(sampleCustomers));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(generatedOrders));
    localStorage.setItem(KEYS.DEBT_TRANSACTIONS, JSON.stringify(generatedDebtTrans));

    // Dispatch Events
    window.dispatchEvent(new Event('db-change'));
};

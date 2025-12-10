export interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  price: number; // Giá bán
  cost: number;  // Giá vốn
  stock: number;
  category: string;
  barcode?: string; // Mã vạch/QR code để quét
}

export interface Category {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  debt: number;
  gender?: string; // Nam, Nữ, Khác
  age?: number;
  weight?: number; // kg
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // ISO String
  totalAmount: number; // Tổng tiền hàng (Subtotal)
  discount?: number;   // Số tiền giảm giá
  finalAmount?: number; // Thành tiền sau giảm (totalAmount - discount)
  paidAmount: number;
  debtAmount: number; // = finalAmount - paidAmount
  items: OrderItem[];
  status: 'completed' | 'cancelled';
  staffName?: string; // Nhân viên tạo đơn
}

export interface DebtTransaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string; // ISO String
  note?: string;
  staffName?: string; // Người thu nợ
}

// --- INVENTORY TRANSACTIONS ---
export type TransactionType = 'import' | 'export';

export interface InventoryTransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  cost?: number; // Giá nhập (chỉ dùng cho import)
}

export interface InventoryTransaction {
  id: string;
  code: string; // Mã phiếu (VD: PNK001, PXK001)
  type: TransactionType;
  date: string;
  items: InventoryTransactionItem[];
  staffName: string;
  note?: string;
  totalAmount: number; // Tổng giá trị phiếu
}

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  password?: string; // In real app, this should be hashed. Here we store plain for demo.
  name: string;
  role: UserRole;
}

// Enum cho các màn hình view
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',     // Danh sách sản phẩm
  IMPORT_STOCK = 'IMPORT_STOCK', // Nhập kho
  EXPORT_STOCK = 'EXPORT_STOCK', // Xuất kho
  CATEGORIES = 'CATEGORIES',   // Quản lý danh mục (New)
  CUSTOMERS = 'CUSTOMERS',
  SALES = 'SALES',
  DEBT = 'DEBT',
  USERS = 'USERS', // View quản lý nhân viên
  MENU_MANAGEMENT = 'MENU_MANAGEMENT', // View quản lý menu
}

export interface MenuConfigItem {
  id: ViewState;
  isVisible: boolean;
  customLabel?: string; // Cho phép đổi tên hiển thị (optional)
}
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Scale,
  ShoppingCart,
  Truck,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Building2,
  Boxes,
  Receipt,
  Calculator,
  BarChart3,
  Globe,
  UserCircle,
  Menu,
  X,
  Database,
  HardDrive
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    title: 'Weighbridge',
    icon: Scale,
    path: '/weighbridge',
  },
  {
    title: 'Purchases',
    icon: ShoppingCart,
    children: [
      { title: 'Local Purchases', path: '/local-purchases' },
      { title: 'International Purchases', path: '/intl-purchases' },
    ],
  },
  {
    title: 'Sales',
    icon: Truck,
    children: [
      { title: 'Local Sales', path: '/local-sales' },
      { title: 'Export Sales', path: '/export-sales' },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    path: '/inventory',
  },
  {
    title: 'Master Data',
    icon: Boxes,
    children: [
      { title: 'Companies', path: '/companies' },
      { title: 'Branches / Yards', path: '/branches' },
      { title: 'Customers', path: '/customers' },
      { title: 'Suppliers', path: '/suppliers' },
      { title: 'Brokers', path: '/brokers' },
      { title: 'Scrap Items', path: '/scrap-items' },
      { title: 'VAT Codes', path: '/vat-codes' },
      { title: 'Currencies', path: '/currencies' },
      { title: 'Ports', path: '/ports' },
      { title: 'Weighbridges', path: '/weighbridges-master' },
    ],
  },
  {
    title: 'Finance',
    icon: Calculator,
    children: [
      { title: 'Chart of Accounts', path: '/accounts' },
      { title: 'Journal Entries', path: '/journal-entries' },
      { title: 'Payments', path: '/payments' },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    children: [
      { title: 'Purchase Register', path: '/reports/purchases' },
      { title: 'Sales Register', path: '/reports/sales' },
      { title: 'VAT Report', path: '/reports/vat' },
      { title: 'Stock Aging', path: '/reports/stock-aging' },
      { title: 'Broker Commission', path: '/reports/broker-commission' },
      { title: 'Party Ledger', path: '/reports/party-ledger' },
    ],
  },
  {
    title: 'Users',
    icon: Users,
    path: '/users',
  },
  {
    title: 'Audit Logs',
    icon: FileText,
    path: '/audit-logs',
  },
];

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState(['Purchases', 'Sales', 'Master Data']);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleExpand = (title) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (path) => location.pathname === path;
  const isChildActive = (children) => children?.some((child) => location.pathname === child.path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const hasChildren = item.children?.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const active = item.path ? isActive(item.path) : isChildActive(item.children);

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpand(item.title)}
            className={`nav-item w-full justify-between ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
            data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              {item.title}
            </span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {isExpanded && (
            <div className="ml-8 mt-1 space-y-1">
              {item.children.map((child) => (
                <Link
                  key={child.path}
                  to={child.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-item ${isActive(child.path) ? 'nav-item-active' : 'nav-item-inactive'}`}
                  data-testid={`nav-${child.title.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {child.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`nav-item ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
        data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
      >
        <Icon className="w-5 h-5" />
        {item.title}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white sidebar-shadow transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-sm flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-manrope font-bold">ScrapOS</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4 px-3">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="p-4 border-t border-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-sm hover:bg-slate-800 transition-colors">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-slate-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                    <p className="text-xs text-slate-400 capitalize">{user?.role || 'viewer'}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'light' ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-4 p-2 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            data-testid="mobile-menu-btn"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-sm"
              data-testid="theme-toggle-btn"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1600px]">
          {children}
        </main>
      </div>
    </div>
  );
};

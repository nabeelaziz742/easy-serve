import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  ChefHat,
  Star,
  BarChart3,
  Banknote,
  Boxes,
  ShoppingCart,
  ScrollText,
  Receipt,
  Table2,
  KanbanSquare,
  ClipboardList,
  Settings,
  ReceiptText,
  Store,
  Plus,
  CalendarClock,
} from "lucide-react";

// One menu for every staff role, so the manager, waiter and chef panels are
// the same product. Each role sees only its own sections.
const FLOOR = {
  title: "Floor",
  items: [
    { href: "/admin/tables", label: "Tables", icon: Table2 },
    { href: "/admin/orders", label: "Order Board", icon: KanbanSquare },
    { href: "/admin/reviews", label: "Table Reviews", icon: Star },
  ],
};

const MANAGER = [
  {
    title: "Overview",
    items: [{ href: "/manager", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Inventory & Supply",
    items: [
      { href: "/manager/inventory", label: "Inventory", icon: Boxes },
      { href: "/manager/purchases", label: "Purchases / Stock In", icon: ShoppingCart },
      { href: "/manager/recipes", label: "Recipes / BOM", icon: ScrollText },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/manager/expenses", label: "Expenses", icon: Receipt },
      { href: "/manager/reports", label: "Financial Reports", icon: BarChart3 },
      { href: "/manager/cash", label: "Cash Settlement", icon: Banknote },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/manager/orders", label: "Orders & Bills", icon: ReceiptText },
      { href: "/manager/reservations", label: "Reservations", icon: CalendarClock },
      { href: "/manager/menu", label: "Menu Items", icon: UtensilsCrossed },
      { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  FLOOR,
  {
    title: "Staff & Service",
    items: [
      { href: "/manager/waiters", label: "Waiters", icon: Users },
      { href: "/manager/chefs", label: "Chefs", icon: ChefHat },
      { href: "/manager/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    title: "Restaurant",
    items: [{ href: "/manager/settings", label: "Settings", icon: Settings }],
  },
];

// The super admin runs the platform, not a restaurant: only onboarding.
const SUPER_ADMIN = [
  {
    title: "Restaurants",
    items: [
      { href: "/super-admin", label: "All Restaurants", icon: Store, exact: true },
      { href: "/super-admin/restaurants/new", label: "Add Restaurant", icon: Plus },
    ],
  },
];

const WAITER = [
  {
    title: "Service",
    items: [
      { href: "/waiter", label: "Orders", icon: ClipboardList, exact: true },
      { href: "/admin/waiter", label: "My Shift", icon: LayoutDashboard },
    ],
  },
  // Kitchen statuses belong to the chef and reviews to the manager, so the
  // waiter only gets the table overview from the floor section.
  { title: "Floor", items: [FLOOR.items[0]] },
];

const CHEF = [
  {
    title: "Kitchen",
    items: [
      { href: "/chef", label: "Kitchen Queue", icon: ChefHat, exact: true },
      { href: "/admin/orders", label: "Order Board", icon: KanbanSquare },
    ],
  },
  { title: "Floor", items: [FLOOR.items[0]] },
];

const NAV_BY_ROLE = {
  manager: MANAGER,
  restaurant_owner: MANAGER,
  super_admin: SUPER_ADMIN,
  waiter: WAITER,
  chef: CHEF,
};

const PANEL_LABEL = {
  manager: "Manager Panel",
  restaurant_owner: "Owner Panel",
  super_admin: "Super Admin Panel",
  waiter: "Waiter Panel",
  chef: "Kitchen Panel",
};

export const getStaffNav = (role) => NAV_BY_ROLE[role] || [];
export const getPanelLabel = (role) => PANEL_LABEL[role] || "Staff Panel";

// Routes rendered inside the staff shell instead of the public website.
export const STAFF_PREFIXES = ["/super-admin", "/admin", "/manager", "/waiter", "/chef"];
export const isStaffPath = (pathname = "") =>
  STAFF_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

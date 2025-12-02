// src/components/admin-view/sidebar.jsx
import {
  BadgeCheck,
  LayoutDashboard,
  ShoppingBasket,
  UserPlus,
  Star,
  Users,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Fragment, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

// Logo import
import Logo from "../../assets/pictures/LOGO/AcquaLogo.png";

const adminSidebarMenuItems = [
  { id: "dashboard", label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard /> },
  { id: "inventory", label: "Inventory", path: "/admin/inventory", icon: <ShoppingBasket /> },
  { id: "products", label: "Products", path: "/admin/products", icon: <ShoppingBasket /> },
  { id: "orders", label: "Orders", path: "/admin/orders", icon: <BadgeCheck /> },
  { id: "ratings", label: "Ratings", path: "/admin/ratings", icon: <Star /> },
  { id: "users", label: "Users", path: "/admin/users", icon: <Users /> },
  { id: "pos", label: "POS (Walk-In)", path: "/admin/pos", icon: <ShoppingBasket /> },
];

function MenuItems({ setOpen, collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="mt-4 flex flex-col gap-2">
      {adminSidebarMenuItems.map((menuItem) => {
        const active = isActive(menuItem.path);
        return (
          <div
            key={menuItem.id}
            onClick={() => {
              navigate(menuItem.path);
              setOpen?.(false);
            }}
            title={collapsed ? menuItem.label : undefined}
            className={`
              group flex items-center gap-3 cursor-pointer px-3 py-2 rounded-md transition-all
              ${collapsed ? "justify-center" : ""}
              ${active ? "bg-gradient-to-r from-indigo-600/20 to-cyan-400/10 ring-1 ring-indigo-600/20 shadow-sm" : "hover:bg-white/5"}
              ${active ? "text-foreground font-semibold" : "text-muted-foreground"}
            `}
          >
            <div
              className={`
                flex items-center justify-center text-lg
                ${active ? "text-indigo-500" : "group-hover:text-white text-muted-foreground"}
              `}
            >
              {menuItem.icon}
            </div>

            {!collapsed && (
              <span className="flex-1 text-lg tracking-tight">
                {menuItem.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default function AdminSideBar({ open, setOpen }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem("adminSidebarCollapsed");
    if (v !== null) setCollapsed(v === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", collapsed);
  }, [collapsed]);

  return (
    <Fragment>
      {/* Mobile Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <div className="flex flex-col h-full">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-3 mt-5 mb-5">
                <img src={Logo} alt="Logo" className="h-10 w-auto object-contain" />
                <div className="text-2xl font-extrabold">Admin Panel</div>
              </SheetTitle>
            </SheetHeader>
            <MenuItems setOpen={setOpen} collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col
          ${collapsed ? "w-20" : "w-64"}
          transition-all duration-200
          p-4 border-r bg-white/10 backdrop-blur-md shadow-sm
        `}
      >
        {/* Centered Logo (NO TEXT) */}
        <div
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center justify-center mb-4 cursor-pointer"
        >
          <img
            src={Logo}
            alt="Logo"
            className={`${collapsed ? "h-10" : "h-20"} w-auto object-contain`}
          />
        </div>

        {/* Menu Items */}
        <MenuItems collapsed={collapsed} />

        {/* Collapse Button */}
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-all border border-white/20"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </Fragment>
  );
}

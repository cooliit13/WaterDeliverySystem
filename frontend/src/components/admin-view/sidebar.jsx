import {
  BadgeCheck,
  ChartNoAxesCombined,
  LayoutDashboard,
  ShoppingBasket,
  UserPlus,
} from "lucide-react";
import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

const adminSidebarMenuItems = [
  { id: "dashboard", label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard /> },
  { id: "inventory", label: "Inventory", path: "/admin/inventory", icon: <ShoppingBasket /> },
  { id: "products", label: "Products", path: "/admin/products", icon: <ShoppingBasket /> },
  { id: "orders", label: "Orders", path: "/admin/orders", icon: <BadgeCheck /> },
  { id: "add-driver", label: "Add Driver", path: "/admin/add-driver", icon: <UserPlus /> },
];

function MenuItems({ setOpen }) {
  const navigate = useNavigate();

  return (
    <nav className="mt-4 flex flex-col gap-2">
      {adminSidebarMenuItems.map((menuItem) => (
        <div
          key={menuItem.id}
          onClick={() => {
            navigate(menuItem.path);
            setOpen?.(false);
          }}
          className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground text-lg"
        >
          {menuItem.icon}
          <span>{menuItem.label}</span>
        </div>
      ))}
    </nav>
  );
}

export default function AdminSideBar({ open, setOpen }) {
  const navigate = useNavigate();

  return (
    <Fragment>
      {/* Mobile Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <div className="flex flex-col h-full">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2 mt-5 mb-5">
                <ChartNoAxesCombined size={30} />
                <h1 className="text-2xl font-extrabold">Admin Panel</h1>
              </SheetTitle>
            </SheetHeader>
            <MenuItems setOpen={setOpen} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-background p-6 lg:flex flex-col">
  <div
    onClick={() => navigate("/admin/dashboard")}
    className="flex cursor-pointer items-center gap-2 mb-4"
  >
    <ChartNoAxesCombined size={30} />
    <h1 className="text-2xl font-extrabold">Water Admin</h1>
  </div>

  <MenuItems />
</aside>

    </Fragment>
  );
}

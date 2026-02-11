import {
  HousePlug,
  LogOut,
  Menu,
  ShoppingCart,
  UserCog,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";
import { shoppingViewHeaderMenuItems } from "@/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { logoutUser } from "@/store/auth-slice";
import UserCartWrapper from "./cart-wrapper";
import { useEffect, useState } from "react";
import { fetchCartItems } from "@/store/shop/cart-slice";
import { Label } from "../ui/label";
import { toast } from "react-hot-toast";

// socket.io-client
import { io } from "socket.io-client";

// ⭐ Import Your LOGO Here ⭐
import Logo from "@/assets/pictures/LOGO/AcquaLogo.png";

function MenuItems() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  function handleNavigate(getCurrentMenuItem) {
    sessionStorage.removeItem("filters");

    const currentFilter =
      getCurrentMenuItem.id !== "home" &&
      getCurrentMenuItem.id !== "products" &&
      getCurrentMenuItem.id !== "search"
        ? { category: [getCurrentMenuItem.id] }
        : null;

    sessionStorage.setItem("filters", JSON.stringify(currentFilter));

    location.pathname.includes("listing") && currentFilter !== null
      ? setSearchParams(
          new URLSearchParams(`?category=${getCurrentMenuItem.id}`)
        )
      : navigate(getCurrentMenuItem.path);
  }

  return (
    <nav className="flex flex-col mb-3 lg:mb-0 lg:items-center gap-6 lg:flex-row">
      {shoppingViewHeaderMenuItems.map((menuItem) => {
        const active = isActive(menuItem.path);

        return (
          <Label
            onClick={() => handleNavigate(menuItem)}
            key={menuItem.id}
            className={`
              text-sm font-medium cursor-pointer transition-all
              relative px-1 py-1
              ${active ? "text-blue-600 font-semibold" : "text-muted-foreground"}
            `}
          >
            {/* Text */}
            <span
              className={`
                ${active ? "text-blue-600" : "hover:text-foreground"}
                transition-colors
              `}
            >
              {menuItem.label}
            </span>

            {/* Hover Underline */}
            <span
              className={`
                absolute left-0 bottom-0 h-[2px] w-0 bg-blue-500 transition-all
                group-hover:w-full
                ${active ? "w-full" : ""}
              `}
            ></span>
          </Label>
        );
      })}
    </nav>
  );
}


function HeaderRightContent() {
  const { user } = useSelector((state) => state.auth);
  const { cartItems } = useSelector((state) => state.shopCart);
  const { orderList } = useSelector((state) => state.shopOrder || {});
  const [openCartSheet, setOpenCartSheet] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Count "On the Way" orders
  const onTheWayCount = Array.isArray(orderList)
    ? orderList.filter(
        (o) =>
          String(o?.orderStatus || "")
            .toLowerCase()
            .replace(/\s+/g, "") === "ontheway" ||
          String(o?.orderStatus || "").toLowerCase() === "on the way" ||
          String(o?.orderStatus || "").toLowerCase() === "on-the-way"
      ).length
    : 0;

  const handleLogout = () => {
    toast(
      (t) => (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm font-medium">
            Are you sure you want to logout?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await dispatch(logoutUser()).unwrap();
                  localStorage.removeItem("token");
                  toast.success("You have been logged out.");
                  navigate("/auth/login");
                } catch (error) {
                  console.error("Logout failed:", error);
                  toast.error("Failed to logout. Try again.");
                }
              }}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: "top-center",
      }
    );
  };

  // Fetch cart items
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchCartItems(user.id));
    }
  }, [dispatch, user?.id]);

  // Realtime socket listener
  useEffect(() => {
    if (!user?.id) return;

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

    const socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      try {
        socket.emit("identify", user.id);
      } catch (err) {}
    });

    const onOrderStatusUpdate = (payload) => {
      const { orderId, status } = payload || {};

      toast(
        (t) => (
          <div className="p-2">
            <div className="font-semibold">Order Update</div>
            <div className="text-sm">
              Order #{orderId} is now <strong>{status}</strong>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(`/shop/orders/${orderId}`);
                }}
              >
                View order
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.dismiss(t.id)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ),
        { duration: 8000, position: "top-right" }
      );
    };

    socket.on("order:status:update", onOrderStatusUpdate);

    return () => {
      socket.off("order:status:update", onOrderStatusUpdate);
      try {
        socket.disconnect();
      } catch {}
    };
  }, [user?.id, navigate]);

  return (
    <div className="flex lg:items-center lg:flex-row flex-col gap-4">
      {/* Track Orders */}
      <Button
        onClick={() => navigate("/shop/orders")}
        variant="outline"
        className="hidden sm:inline-flex items-center gap-2"
      >
        <span className="text-sm">Track Orders</span>
        {onTheWayCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs px-2 py-0.5">
            {onTheWayCount}
          </span>
        )}
      </Button>

      {/* Cart Button */}
      <Sheet open={openCartSheet} onOpenChange={setOpenCartSheet}>
        <Button
          onClick={() => setOpenCartSheet(true)}
          variant="outline"
          size="icon"
          className="relative"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute top-[-5px] right-[2px] font-bold text-sm">
            {cartItems?.items?.length || 0}
          </span>
        </Button>
        <UserCartWrapper
          setOpenCartSheet={setOpenCartSheet}
          cartItems={cartItems?.items || []}
        />
      </Sheet>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="bg-black cursor-pointer">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <AvatarFallback className="bg-black text-white font-extrabold">
                {user?.fullName ? user.fullName[0].toUpperCase() : "?"}
              </AvatarFallback>
            )}
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" className="w-56">
          <DropdownMenuLabel>
            Logged in as {user?.fullName || "Guest"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate("/shop/account")}>
            <UserCog className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ⭐⭐⭐ SHOPPING HEADER (Logo Added Here!) ⭐⭐⭐ */
function ShoppingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">

        {/* LOGO ONLY — centered and clickable */}
        <Link to="/shop/home" className="flex items-center">
          <img
            src={Logo}
            alt="Logo"
            className="h-12 w-auto object-contain"
          />
        </Link>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-full max-w-xs">
            <MenuItems />
            <HeaderRightContent />
          </SheetContent>
        </Sheet>

        <div className="hidden lg:block">
          <MenuItems />
        </div>

        <div className="hidden lg:block">
          <HeaderRightContent />
        </div>
      </div>
    </header>
  );
}

export default ShoppingHeader;

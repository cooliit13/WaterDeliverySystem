// App.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { checkAuth } from "@/store/auth-slice";

// 🧩 Layout Components
import AdminLayout from "./components/admin-view/layout";
import ShoppingLayout from "./components/shopping-view/layout";
import DriverLayout from "./components/driver-view/layout";
import AddDriver from "./components/admin-view/add-driver"; // ✅ already imported
import ShoppingOrderTrack from "@/components/shopping-view/order-track";
import ShoppingOrders from "@/components/shopping-view/orders"; // <-- ADDED import

// 📄 Auth Pages
import AuthLogin from "./pages/auth/login";
import AuthRegister from "./pages/auth/register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";

// 📄 Admin Pages
import AdminDashboard from "./pages/admin-view/dashboard";
import AdminProducts from "./pages/admin-view/products";
import AdminOrders from "./pages/admin-view/orders";
import AdminFeatures from "./pages/admin-view/features";
import InventoryPage from "./pages/admin-view/InventoryPage";

// ✅ POS page (ONLY NEW IMPORT)
import AdminPOS from "@/pages/admin-view/POS";

// 🚚 Driver Page
import DriverDashboard from "./pages/driver-view/dashboard";

// 🛍️ Shopping Pages
import ShoppingHome from "./pages/shopping-view/home";
import ShoppingListing from "./pages/shopping-view/listing";
import ShoppingCheckout from "./pages/shopping-view/checkout";
import ShoppingAccount from "./pages/shopping-view/account";
import SearchProducts from "./pages/shopping-view/search";

// NEW: Admin Ratings page
import AdminRatings from "@/components/admin-view/AdminRatings";

// ---- NEW IMPORTS (minimal) ----
import UsersAdmin from "./pages/admin-view/UsersAdmin";
import DriversAdmin from "./pages/admin-view/DriversAdmin";
// -------------------------------

// 🚫 Other Pages
import NotFound from "./pages/not-found";
import UnauthPage from "./pages/unauth-page";

// ✅ ProtectedRoute
import ProtectedRoute from "./components/admin-view/ProtectedRoute";

// 🏠 Landing Page
import LandingPage from "./pages/landing-page/LandingPage";

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      dispatch(checkAuth());
    }
  }, [dispatch]);

  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>
        {/* 🏠 Default Redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              (() => {
                const role = user?.role?.toLowerCase();
                if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
                if (role === "driver") return <Navigate to="/driver/dashboard" replace />;
                return <Navigate to="/shop/home" replace />;
              })()
            ) : (
              <LandingPage />
            )
          }
        />

        {/* 🧾 Authentication Routes */}
        <Route path="/auth/login" element={<AuthLogin />} />
        <Route path="/auth/register" element={<AuthRegister />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password/:token" element={<ResetPassword />} />
        <Route path="/auth/verify/:token" element={<VerifyEmail />} />

        {/* 🛠️ Admin Routes (Protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="features" element={<AdminFeatures />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="add-driver" element={<AddDriver />} />
          <Route path="pos" element={<AdminPOS />} />

          {/* <-- NEW Admin Ratings Route */}
          <Route path="ratings" element={<AdminRatings />} />

          {/* <-- NEW: Users & Drivers admin routes (minimal additions) */}
          <Route path="users" element={<UsersAdmin />} />
          <Route path="drivers" element={<DriversAdmin />} />
        </Route>

        {/* 🚚 Driver Routes (Protected) */}
        <Route
          path="/driver"
          element={
            <ProtectedRoute allowedRoles={["driver"]}>
              <DriverLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DriverDashboard />} />
        </Route>

        {/* 🛒 Shopping Routes (Public) */}
        <Route path="/shop" element={<ShoppingLayout />}>
          <Route path="home" element={<ShoppingHome />} />
          <Route path="listing" element={<ShoppingListing />} />
          <Route path="checkout" element={<ShoppingCheckout />} />
          <Route path="account" element={<ShoppingAccount />} />
          <Route path="search" element={<SearchProducts />} />

          <Route path="orders" element={<ShoppingOrders />} />
          <Route path="orders/:id/track" element={<ShoppingOrderTrack />} />
        </Route>

        {/* 🚫 Other Pages */}
        <Route path="/unauth-page" element={<UnauthPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;

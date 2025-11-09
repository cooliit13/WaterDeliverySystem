/**
 * Main Application Entry Point (Frontend Only)
 * -----------------------------------------
 * Simplified version without authentication or Redux.
 * Directly renders pages and layouts for frontend development.
 */
import { Toaster } from "react-hot-toast";
import { Route, Routes, Navigate } from "react-router-dom";

// 🧩 Layout Components
import AdminLayout from "./components/admin-view/layout";
import ShoppingLayout from "./components/shopping-view/layout";

// 📄 Auth Pages
import AuthLogin from "./pages/auth/login";
import AuthRegister from "./pages/auth/register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword"; // ✅ Added this import

// 📄 Admin Pages
import AdminDashboard from "./pages/admin-view/dashboard";
import AdminProducts from "./pages/admin-view/products";
import AdminOrders from "./pages/admin-view/orders";
import AdminFeatures from "./pages/admin-view/features";
import InventoryPage from "./pages/admin-view/InventoryPage";





// 🛍️ Shopping Pages
import ShoppingHome from "./pages/shopping-view/home";
import ShoppingListing from "./pages/shopping-view/listing";
import ShoppingCheckout from "./pages/shopping-view/checkout";
import ShoppingAccount from "./pages/shopping-view/account";
import SearchProducts from "./pages/shopping-view/search";
import VerifyEmail from "./pages/auth/VerifyEmail";

// Driver Page
import DriverDashboard from "./pages/driver-view/dashboard";
import DriverLayout from "./components/driver-view/layout";


// 🚫 Other Pages
import NotFound from "./pages/not-found";
import UnauthPage from "./pages/unauth-page";

function App() {
  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>
        {/* 🏠 Default Redirect */}
        <Route path="/" element={<Navigate to="/auth/login" />} />

        {/* 🧾 Authentication Routes */}
        <Route path="/auth/login" element={<AuthLogin />} />
        <Route path="/auth/register" element={<AuthRegister />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password/:token" element={<ResetPassword />} />
        <Route path="/auth/verify/:token" element={<VerifyEmail />} />




        {/* 🛠️ Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="features" element={<AdminFeatures />} />
          <Route path="inventory" element={<InventoryPage />} />
        </Route>
 {/* Driver */}
        <Route path="/driver" element={<DriverLayout />}>
  <Route path="dashboard" element={<DriverDashboard />} />
</Route>

        {/* 🛒 Shopping Routes */}
        <Route path="/shop" element={<ShoppingLayout />}>
          <Route path="home" element={<ShoppingHome />} />
          <Route path="listing" element={<ShoppingListing />} />
          <Route path="checkout" element={<ShoppingCheckout />} />
          <Route path="account" element={<ShoppingAccount />} />
          <Route path="search" element={<SearchProducts />} />
        </Route>

        {/* 🚫 Other Pages */}
        <Route path="/unauth-page" element={<UnauthPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;

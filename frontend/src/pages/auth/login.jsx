import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function AuthLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in both email and password!");
      return;
    }

    // 🧩 Check for admin account
    if (
      formData.email.toLowerCase() === "2301113504@student.buksu.edu.ph" &&
      formData.password === "admin123"
    ) {
      toast.success("Welcome Admin!");
      setTimeout(() => navigate("/admin/dashboard"), 1500);
      return;
    }

    // 🧩 Check for regular user (temporary mock)
    if (formData.email === "test@example.com" && formData.password === "123456") {
      toast.success("Login successful!");
      setTimeout(() => navigate("/shop/home"), 1500);
      return;
    }

    toast.error("Invalid email or password!");
  };

  const handleGoogleLogin = () => {
    toast("Google Sign-In not yet implemented");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl rounded-2xl border border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-blue-700">
              Welcome Back 👋
            </CardTitle>
            <p className="text-gray-500 text-sm mt-2">
              Login to your water delivery account
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Login Button */}
              <Button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
                Login
              </Button>

              {/* OR Separator */}
              <div className="flex items-center my-2">
                <hr className="flex-1 border-gray-300" />
                <span className="mx-2 text-gray-400 text-sm">OR</span>
                <hr className="flex-1 border-gray-300" />
              </div>

              {/* Google Login */}
              <Button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2"
                />
                Login with Google
              </Button>

              {/* Register Link */}
              <p className="text-center text-sm text-gray-600 mt-3">
                Don’t have an account?{" "}
                <span
                  onClick={() => navigate("/auth/register")}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Register here
                </span>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import axios from "axios";

export default function AuthRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    frequency: "Weekly",
    bottleSize: "5L",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      // 🧩 Send only the required data for backend
      const response = await axios.post("http://localhost:5000/api/auth/register", {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      if (response.status === 201) {
        toast.success("Registration successful!");
        setTimeout(() => navigate("/auth/login"), 1500);
      }
    } catch (error) {
      if (error.response) {
        // The backend sent an error response
        toast.error(error.response.data.message || "Registration failed!");
      } else if (error.request) {
        // No response received (CORS or server down)
        toast.error("No response from server. Check your backend connection.");
      } else {
        // Error before sending request
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg px-6"
      >
        <Card className="shadow-xl rounded-2xl border border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-blue-700">
              Water Delivery Registration
            </CardTitle>
            <p className="text-gray-500 text-sm mt-2">
              Create your account and start scheduling your deliveries
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="09XXXXXXXXX"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street, Barangay, City"
                />
              </div>

              {/* Frequency and Bottle Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Delivery Frequency</Label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option>Weekly</option>
                    <option>Bi-weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="bottleSize">Bottle Size</Label>
                  <select
                    id="bottleSize"
                    name="bottleSize"
                    value={formData.bottleSize}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option>5L</option>
                    <option>12L</option>
                    <option>20L</option>
                  </select>
                </div>
              </div>

              {/* Passwords */}
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
              >
                Register
              </Button>

              {/* OR separator */}
              <div className="flex items-center my-2">
                <hr className="flex-1 border-gray-300" />
                <span className="mx-2 text-gray-400 text-sm">OR</span>
                <hr className="flex-1 border-gray-300" />
              </div>


              {/* Redirect to Login */}
              <p className="text-center text-sm text-gray-600 mt-3">
                Already have an account?{" "}
                <span
                  onClick={() => navigate("/auth/login")}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Login here
                </span>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

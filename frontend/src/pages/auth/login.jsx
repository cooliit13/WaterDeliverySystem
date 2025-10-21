import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import ReCAPTCHA from "react-google-recaptcha"; // ✅ Added import

export default function AuthLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [captchaToken, setCaptchaToken] = useState(null); // ✅ reCAPTCHA state

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in both email and password!");
      return;
    }

    if (!captchaToken) {
      toast.error("Please complete the reCAPTCHA!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, captchaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      toast.success("Login successful!");
      localStorage.setItem("token", data.token);
      setTimeout(() => navigate("/shop/home"), 1500);
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    }
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

              {/* ✅ reCAPTCHA v2 Checkbox */}
              <div className="flex justify-center mt-2">
                <ReCAPTCHA
                  sitekey="6LdE5fErAAAAAMPMecxawBsdaPb7baXSM2OkJDez"
                  onChange={(token) => setCaptchaToken(token)}
                />
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
              >
                Login
              </Button>
              <p
  className="text-right text-sm text-blue-600 hover:underline cursor-pointer mt-1"
  onClick={() => navigate("/auth/forgot-password")}
>
  Forgot Password?
</p>


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

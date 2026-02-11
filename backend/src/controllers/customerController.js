import Customer from "../models/customer.js";
import generateToken from "../utils/generateToken.js";

// Register
export const registerCustomer = async (req, res) => {
  try {
    const { name, email, password, address, contact } = req.body;

    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
      return res.status(400).json({ message: "Customer already exists" });
    }

    const customer = await Customer.create({
      name,
      email,
      password,
      address,
      contact,
    });

    if (customer) {
      res.status(201).json({
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        token: generateToken(customer._id),
      });
    } else {
      res.status(400).json({ message: "Invalid customer data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Login
export const authCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });

    if (customer && (await customer.matchPassword(password))) {
      res.json({
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        token: generateToken(customer._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get own profile
export const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).select("-password");
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update own profile
export const updateCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    customer.name = req.body.name || customer.name;
    customer.email = req.body.email || customer.email;
    customer.address = req.body.address || customer.address;
    customer.contact = req.body.contact || customer.contact;

    if (req.body.password) customer.password = req.body.password;

    const updatedCustomer = await customer.save();

    res.json({
      _id: updatedCustomer._id,
      name: updatedCustomer.name,
      email: updatedCustomer.email,
      address: updatedCustomer.address,
      contact: updatedCustomer.contact,
      token: generateToken(updatedCustomer._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Delete account (customer)
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    await customer.deleteOne();
    res.json({ message: "Customer account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  List all customers (admin)
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().select("-password");
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//  Token validation (for frontend)
export const validateToken = async (req, res) => {
  try {
    if (req.customer) {
      res.json({ valid: true, customer: req.customer });
    } else {
      res.status(401).json({ valid: false });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

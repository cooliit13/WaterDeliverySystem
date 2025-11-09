// ======================
// Registration & Login
// ======================
export const registerFormControls = [
  { name: "userName", label: "User Name", placeholder: "Enter your user name", componentType: "input", type: "text" },
  { name: "email", label: "Email", placeholder: "Enter your email", componentType: "input", type: "email" },
  { name: "password", label: "Password", placeholder: "Enter your password", componentType: "input", type: "password" },
];

export const loginFormControls = [
  { name: "email", label: "Email", placeholder: "Enter your email", componentType: "input", type: "email" },
  { name: "password", label: "Password", placeholder: "Enter your password", componentType: "input", type: "password" },
];

// ======================
// Add Product Form
// ======================
export const addProductFormElements = [
  { label: "Title", name: "title", componentType: "input", type: "text", placeholder: "Enter product title" },
  { label: "Description", name: "description", componentType: "textarea", placeholder: "Enter product description" },
  { label: "Price", name: "price", componentType: "input", type: "number", placeholder: "Enter product price" },
];

// ======================
// Shopping Header Menu
// ======================
export const shoppingViewHeaderMenuItems = [
  { id: "home", label: "Home", path: "/shop/home" },
  { id: "products", label: "Products", path: "/shop/listing" },
  { id: "search", label: "Search", path: "/shop/search" },
];

// ======================
// Category Filter Options
// ======================
export const filterOptions = {
  category: [
    { id: "filters", label: "Water Filters" },
    { id: "pumpsTanks", label: "Pumps & Tanks" },
    { id: "dispensers", label: "Dispensers" },
    { id: "accessoriesTools", label: "Accessories & Tools" },
    { id: "waterDispensers", label: "Water Dispensers" },
  ],
};

// ======================
// Sorting Options
// ======================
export const sortOptions = [
  { id: "price-lowtohigh", label: "Price: Low to High" },
  { id: "price-hightolow", label: "Price: High to Low" },
  { id: "title-atoz", label: "Title: A to Z" },
  { id: "title-ztoa", label: "Title: Z to A" },
];

// ======================
// Address Form Controls
// ======================
// ======================
// Address Form Controls
// ======================
export const addressFormControls = [
  {
    label: "Full Name",
    name: "fullName",
    componentType: "input",
    type: "text",
    placeholder: "Enter full name",
  },
  {
    label: "Street",
    name: "street",
    componentType: "input",
    type: "text",
    placeholder: "Enter street / house no.",
  },
  {
    label: "Province",
    name: "province",
    componentType: "input",
    type: "text",
    placeholder: "Enter province",
  },
  {
    label: "Postal Code",
    name: "postalCode",
    componentType: "input",
    type: "text",
    placeholder: "Enter postal code",
  },
  {
    label: "Phone Number",
    name: "phoneNumber",
    componentType: "input",
    type: "text",
    placeholder: "Enter phone number",
  },
  {
    label: "Notes",
    name: "notes",
    componentType: "textarea",
    placeholder: "Optional notes",
  },
];


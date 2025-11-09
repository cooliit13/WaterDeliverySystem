import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import UserCartItemsContent from "./cart-items-content";

function UserCartWrapper({ cartItems, setOpenCartSheet }) {
  const navigate = useNavigate();

  // total calculation
const totalCartAmount = Array.isArray(cartItems)
  ? cartItems.reduce((sum, item) => {
      const product = item?.productId || {};
      const price =
        product.salePrice > 0
          ? product.salePrice
          : product.price || 0;

      return sum + price * (item?.quantity || 0);
    }, 0)
  : 0;


  return (
    // ✅ Add aria-describedby={undefined} to silence Radix warning
    <SheetContent aria-describedby={undefined} className="sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Your Cart</SheetTitle>
      </SheetHeader>

      <div className="mt-8 space-y-4">
        {cartItems && cartItems.length > 0 ? (
          cartItems.map((item) => (
            // ✅ Use productId._id if productId is an object (populated), otherwise fallback
            <UserCartItemsContent
              key={item?.productId?._id || item?.productId || item?._id}
              cartItem={item}
            />
          ))
        ) : (
          <p className="text-center text-gray-500">Your cart is empty</p>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex justify-between">
          <span className="font-bold">Total</span>
          <span className="font-bold">₱{totalCartAmount.toFixed(2)}</span>
        </div>
      </div>

      <Button
        onClick={() => {
          navigate("/shop/checkout");
          setOpenCartSheet(false);
        }}
        className="w-full mt-6"
      >
        Checkout
      </Button>
    </SheetContent>
  );
}

export default UserCartWrapper;

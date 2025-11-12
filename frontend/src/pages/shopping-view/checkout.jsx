import Address from "@/components/shopping-view/address";
import img from "../../assets/account.jpg";
import { useDispatch, useSelector } from "react-redux";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { requestPurchase } from "@/store/shop/order-slice";
import { fetchCartItems } from "@/store/shop/cart-slice";
import { fetchAllFilteredProducts } from "@/store/shop/products-slice";
import { useToast } from "@/components/ui/use-toast";

// ✅ added imports for calendar
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";

function ShoppingCheckout() {
  const dispatch = useDispatch();
  const { toast } = useToast();

  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);
  const { approvalURL } = useSelector((state) => state.shopOrder);

  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchCartItems(user.id));
      dispatch(
        fetchAllFilteredProducts({
          filterParams: {},
          sortParams: "price-lowtohigh",
        })
      );
    }
  }, [dispatch, user]);

  const handleCartUpdate = () => {
    if (user?.id) {
      dispatch(fetchCartItems(user.id));
    }
  };

  const totalCartAmount =
    cartItems?.items?.length > 0
      ? cartItems.items.reduce((sum, item) => {
          const product = item?.productId;
          const price = Number(
            product?.salePrice > 0 ? product?.salePrice : product?.price || 0
          );
          const quantity = Number(item?.quantity || 0);
          return sum + price * quantity;
        }, 0)
      : 0;

  const handleRequestPurchase = () => {
    if (!cartItems?.items?.length) {
      return toast({ title: "Cart is empty", variant: "destructive" });
    }

    if (!currentSelectedAddress) {
      return toast({
        title: "Please select an address first",
        variant: "destructive",
      });
    }

    if (!deliveryDate) {
      return toast({
        title: "Please select a delivery date",
        variant: "destructive",
      });
    }

    const formattedItems = cartItems.items.map((item) => {
      const product = item.productId;
      const price = Number(
        product?.salePrice > 0 ? product.salePrice : product?.price || 0
      );
      return {
        productId: product?._id,
        productName: product?.title,
        price,
        quantity: Number(item?.quantity || 0),
      };
    });

    const orderData = {
      userId: user?.id,
      cartItems: formattedItems,
      totalAmount: totalCartAmount,
      deliveryDate: new Date(deliveryDate).toISOString(),
      addressInfo: {
        addressId: currentSelectedAddress?._id,
        address: currentSelectedAddress?.address,
        city: currentSelectedAddress?.city,
        pincode: currentSelectedAddress?.pincode,
        phone: currentSelectedAddress?.phone,
        notes: currentSelectedAddress?.notes,
      },
    };

    dispatch(requestPurchase(orderData))
      .unwrap()
      .then(() => {
        toast({ title: "Purchase request sent successfully!" });
      })
      .catch((err) => {
        console.error("Request purchase error:", err);
        toast({
          title: "Failed to send request",
          variant: "destructive",
        });
      });
  };

  if (approvalURL) {
    window.location.href = approvalURL;
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-[300px] w-full overflow-hidden">
        <img src={img} className="h-full w-full object-cover object-center" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 p-5">
        <Address
          selectedId={currentSelectedAddress}
          setCurrentSelectedAddress={setCurrentSelectedAddress}
        />

        <div className="flex flex-col gap-4">
          {cartItems?.items?.length > 0 ? (
            cartItems.items.map((item) => (
              <UserCartItemsContent
                key={item.productId._id || item.productId}
                cartItem={item}
                onCartUpdate={handleCartUpdate}
              />
            ))
          ) : (
            <p className="text-center text-gray-500">
              Your cart is empty or still loading...
            </p>
          )}

          {/* ✅ Modern calendar-style date picker */}
          <div className="mt-4">
            <label className="block font-medium mb-2">
              Choose Delivery Date
            </label>
            <div className="border rounded-lg p-3 bg-white shadow-sm">
              <DayPicker
                mode="single"
                selected={deliveryDate ? new Date(deliveryDate) : undefined}
                onSelect={(date) =>
                  date && setDeliveryDate(format(date, "yyyy-MM-dd"))
                }
                fromDate={new Date()} // disable past dates
                modifiersClassNames={{
                  selected: "bg-blue-500 text-white rounded-full",
                  today: "font-bold border border-blue-400",
                }}
                styles={{
                  caption: { textAlign: "center", fontWeight: "bold" },
                }}
              />
            </div>
            {deliveryDate && (
              <p className="text-sm text-gray-600 mt-2">
                Selected:{" "}
                <span className="font-semibold text-blue-600">
                  {deliveryDate}
                </span>
              </p>
            )}
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold">₱{totalCartAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 w-full">
            <Button
              onClick={handleRequestPurchase}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              Request Purchase
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShoppingCheckout;

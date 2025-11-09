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

function ShoppingCheckout() {
  const dispatch = useDispatch();
  const { toast } = useToast();

  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);
  const { approvalURL } = useSelector((state) => state.shopOrder);
  const { productList } = useSelector((state) => state.shopProducts);

  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);

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

  // ✅ FIXED: NaN-proof, safe pricing, works even if product object is partial
  const totalCartAmount =
    cartItems?.items?.length > 0
      ? cartItems.items.reduce((sum, item) => {
          const product = item?.productId;

          const price = Number(
            product?.salePrice > 0
              ? product?.salePrice
              : product?.price || 0
          );

          const quantity = Number(item?.quantity || 0);

          return sum + price * quantity;
        }, 0)
      : 0;

  // ✅ Request purchase handler
  const handleRequestPurchase = () => {
    if (!cartItems?.items?.length) {
      toast({
        title: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    if (!currentSelectedAddress) {
      toast({
        title: "Please select an address first",
        variant: "destructive",
      });
      return;
    }

    // ✅ FIXED: Backend-friendly formatting
    const formattedItems = cartItems.items.map((item) => {
      const product = item.productId;

      const price = Number(
        product?.salePrice > 0
          ? product.salePrice
          : product?.price || 0
      );

      return {
        productId: product?._id,
        productName: product?.title, // ✅ FIXED name
        price,
        quantity: Number(item?.quantity || 0),
      };
    });

    const orderData = {
      userId: user?.id,
      cartItems: formattedItems,
      totalAmount: totalCartAmount,
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
        console.log("Request purchase error:", err);
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
        <img
          src={img}
          className="h-full w-full object-cover object-center"
        />
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

          <div className="mt-8 space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold">
                ₱{totalCartAmount.toFixed(2)}
              </span>
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

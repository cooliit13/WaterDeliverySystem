// frontend/src/pages/shopping-view/checkout.jsx
import Address from "@/components/shopping-view/address";
import img from "../../assets/account.jpg";
import { useDispatch, useSelector } from "react-redux";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { requestPurchase } from "@/store/shop/order-slice";
import { fetchCartItems } from "@/store/shop/cart-slice";
import { fetchAllFilteredProducts } from "@/store/shop/products-slice";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

// calendar
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";

function ShoppingCheckout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);
  const { approvalURL } = useSelector((state) => state.shopOrder);
  const { productList } = useSelector((state) => state.shopProducts); // make sure product list is available

  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState("");

  // modal + countdown state
  const [showModal, setShowModal] = useState(false);
  const [modalInfo, setModalInfo] = useState({ title: "", message: "", orderId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);

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

  useEffect(() => {
    if (showModal) {
      setCountdown(3);
      countdownRef.current = setInterval(() => setCountdown((c) => c - 1), 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showModal]);

  useEffect(() => {
    if (showModal && countdown <= 0) {
      setShowModal(false);
      if (user?.id) dispatch(fetchCartItems(user.id));
      // Important: redirect to /shop/orders (your orders page)
      navigate("/shop/orders");
    }
  }, [countdown, showModal, dispatch, navigate, user]);

  const handleCartUpdate = () => {
    if (user?.id) dispatch(fetchCartItems(user.id));
  };

  const totalCartAmount =
    cartItems?.items?.length > 0
      ? cartItems.items.reduce((sum, item) => {
          const product = item?.productId;
          const price = Number(product?.salePrice > 0 ? product?.salePrice : product?.price || 0);
          const quantity = Number(item?.quantity || 0);
          return sum + price * quantity;
        }, 0)
      : 0;

  // Helper: same detectStock logic used in listing
  function detectStock(product) {
    const raw =
      product?.totalStock ??
      product?.stock ??
      product?.quantityAvailable ??
      product?.quantity ??
      product?.available ??
      product?.inventoryCount ??
      product?.stockCount;

    return raw !== undefined && raw !== null ? Number(raw) : null;
  }

  const handleRequestPurchase = () => {
    if (isSubmitting) return;
    if (!cartItems?.items?.length) return toast({ title: "Cart is empty", variant: "destructive" });
    if (!currentSelectedAddress) return toast({ title: "Please select an address first", variant: "destructive" });
    if (!deliveryDate) return toast({ title: "Please select a delivery date", variant: "destructive" });

    // --- STOCK VALIDATION BEFORE SENDING ORDER ---
    // For each cart item, obtain current stock info. Prefer productList if available, otherwise use item.productId
    for (const item of cartItems.items) {
      const product = item.productId;
      // attempt to find the freshest product data in productList by _id (if productList fetched)
      const freshProduct = productList?.find((p) => p._id === (product?._id || product)) || product;
      const currentStock = detectStock(freshProduct);
      const qtyRequested = Number(item.quantity || 0);

      // If stock is known and insufficient, block checkout
      if (currentStock !== null) {
        if (currentStock <= 0) {
          toast({
            title: `Product "${product?.title || product}" is out of stock.`,
            variant: "destructive",
          });
          return;
        }
        if (qtyRequested > currentStock) {
          toast({
            title: `Only ${currentStock} unit(s) available for "${product?.title || product}". Please update your cart.`,
            variant: "destructive",
          });
          return;
        }
      }
      // if currentStock is null, we allow (unknown inventory source); consider fetching server-side if you want strict guarantees
    }

    const formattedItems = cartItems.items.map((item) => {
      const product = item.productId;
      const price = Number(product?.salePrice > 0 ? product.salePrice : product?.price || 0);
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

    setIsSubmitting(true);
    dispatch(requestPurchase(orderData))
      .unwrap()
      .then((res) => {
        setIsSubmitting(false);
        // we don't need orderId here — we redirect to shop orders page
        setModalInfo({
          title: "Purchase request sent!",
          message: "Your order has been created. You will be redirected to your Orders page.",
          orderId: null,
        });
        setShowModal(true);
        toast({ title: "Purchase request sent successfully!" });

        if (user?.id) dispatch(fetchCartItems(user.id));
      })
      .catch((err) => {
        console.error("Request purchase error:", err);
        setIsSubmitting(false);
        toast({ title: "Failed to send request", variant: "destructive" });
      });
  };

  // If there's an approval URL (external payment flow), redirect immediately
  if (approvalURL) {
    window.location.href = approvalURL;
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-[300px] w-full overflow-hidden">
        <img src={img} className="h-full w-full object-cover object-center" alt="banner" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 p-5">
        <Address selectedId={currentSelectedAddress} setCurrentSelectedAddress={setCurrentSelectedAddress} />

        <div className="flex flex-col gap-4">
          {cartItems?.items?.length > 0 ? (
            cartItems.items.map((item) => (
              <UserCartItemsContent key={item.productId._id || item.productId} cartItem={item} onCartUpdate={handleCartUpdate} />
            ))
          ) : (
            <p className="text-center text-gray-500">Your cart is empty or still loading...</p>
          )}

          <div className="mt-4">
            <label className="block font-medium mb-2">Choose Delivery Date</label>
            <div className="border rounded-lg p-3 bg-white shadow-sm">
              <DayPicker
                mode="single"
                selected={deliveryDate ? new Date(deliveryDate) : undefined}
                onSelect={(date) => date && setDeliveryDate(format(date, "yyyy-MM-dd"))}
                fromDate={new Date()}
                modifiersClassNames={{
                  selected: "bg-blue-500 text-white rounded-full",
                  today: "font-bold border border-blue-400",
                }}
              />
            </div>
            {deliveryDate && <p className="text-sm text-gray-600 mt-2">Selected: <span className="font-semibold text-blue-600">{deliveryDate}</span></p>}
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold">₱{totalCartAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 w-full">
            <Button onClick={handleRequestPurchase} className="w-full bg-blue-500 hover:bg-blue-600" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Request Purchase"}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-lg text-center">
            <h3 className="text-xl font-bold mb-2">{modalInfo.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{modalInfo.message} You will be redirected in <span className="font-semibold">{countdown}</span> second{countdown !== 1 ? "s" : ""}.</p>

            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setShowModal(false); navigate("/shop/orders"); }}>
                Go to Orders
              </Button>
              <Button onClick={() => setShowModal(false)} variant="ghost">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShoppingCheckout;

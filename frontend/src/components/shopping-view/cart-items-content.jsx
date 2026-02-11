import { Minus, Plus, Trash } from "lucide-react";
import { Button } from "../ui/button";
import { useDispatch } from "react-redux";
import { deleteCartItem, updateCartQuantity } from "@/store/shop/cart-slice";
import { useToast } from "../ui/use-toast";

function UserCartItemsContent({ cartItem, onCartUpdate }) {
  const dispatch = useDispatch();
  const { toast } = useToast();

  if (!cartItem) return null;

  const normalizedProductId =
    cartItem?.productId && typeof cartItem.productId === "object"
      ? cartItem.productId._id || cartItem.productId.id
      : cartItem.productId || cartItem.product || cartItem._id;

  const productData =
    cartItem && typeof cartItem.productId === "object"
      ? cartItem.productId
      : cartItem.product || null;

  const priceCandidate =
    productData?.salePrice ?? productData?.price ?? cartItem?.price ?? 0;
  const productPrice = Number(priceCandidate) || 0;

  const quantity = Number(cartItem?.quantity || 1);

  // ----- Robust totalStock detection -----
  // check many common names your backend might use
  const rawStock =
    productData?.totalStock ??
    productData?.stock ??
    productData?.quantityAvailable ??
    productData?.quantity ??
    productData?.available ??
    cartItem?.totalStock ??
    cartItem?.stock ??
    cartItem?.quantityAvailable ??
    cartItem?.quantity ??
    cartItem?.available;

  // normalize to number (if undefined -> null)
  const totalStock = typeof rawStock !== "undefined" && rawStock !== null
    ? Number(rawStock)
    : null;

  // Debug: remove later
  if (totalStock === null) {
    // eslint-disable-next-line no-console
    console.warn("[CartItem] stock not found on productData/cartItem:", {
      normalizedProductId,
      productData,
      cartItem,
    });
  }

  const productTitle =
    productData?.name || productData?.title || cartItem?.name || "Unknown Product";

  const productImage =
    productData?.image ||
    (Array.isArray(productData?.images) ? productData.images[0] : null) ||
    cartItem?.image ||
    "/placeholder.png";

  // Helper function for updating quantity
  const updateQuantity = (value) => {
    dispatch(
      updateCartQuantity({
        productId: normalizedProductId,
        quantity: value,
      })
    )
      .unwrap()
      .then((cart) => {
        toast({ title: "Cart updated" });
        onCartUpdate && onCartUpdate(cart);
      })
      .catch(() => {
        toast({
          title: "Could not update cart",
          variant: "destructive",
        });
      });
  };

  // + / - handling
  const handleUpdateQuantity = (type) => {
    // if stock unknown (null), allow updates (or optionally block — see notes)
    const newQuantity =
      type === "plus" ? quantity + 1 : quantity - 1;

    if (newQuantity < 1) return;

    if (totalStock !== null && newQuantity > totalStock) {
      toast({
        title: `Only ${totalStock} units available`,
        variant: "destructive",
      });
      return;
    }

    updateQuantity(newQuantity);
  };

  // Manual number input
  const handleManualQuantityChange = (e) => {
    let value = Number(e.target.value);

    if (isNaN(value)) return;

    if (value < 1) value = 1;

    if (totalStock !== null && value > totalStock) {
      toast({
        title: `Only ${totalStock} units available`,
        variant: "destructive",
      });
      value = totalStock;
    }

    updateQuantity(value);
  };

  // DELETE ITEM
  const handleDelete = () => {
    dispatch(deleteCartItem(normalizedProductId))
      .unwrap()
      .then((cart) => {
        toast({ title: "Item removed" });
        onCartUpdate && onCartUpdate(cart);
      })
      .catch(() => {
        toast({
          title: "Failed to remove item",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="flex items-center space-x-4 border-b py-4">
      <img
        src={productImage}
        alt={productTitle}
        className="w-20 h-20 rounded object-cover bg-gray-100"
        onError={(e) => {
          e.target.src = "/placeholder.png";
        }}
      />

      <div className="flex-1">
        <h3 className="font-extrabold text-gray-800">{productTitle}</h3>

        {/* Show available or out of stock; if null -> unknown */}
        {totalStock === null ? (
          <p className="text-xs text-gray-600 mt-1">Available: —</p>
        ) : totalStock > 0 ? (
          <p className="text-xs text-green-600 mt-1">Available: {totalStock} pcs</p>
        ) : (
          <p className="text-xs text-red-500 mt-1 font-bold">OUT OF STOCK</p>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            disabled={quantity <= 1 || totalStock === 0}
            onClick={() => handleUpdateQuantity("minus")}
          >
            <Minus className="w-4 h-4" />
          </Button>

          <input
            type="number"
            className="w-16 text-center border rounded-md py-1 font-semibold"
            value={quantity}
            min={1}
            max={totalStock ?? undefined}
            disabled={totalStock === 0}
            onChange={handleManualQuantityChange}
          />

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            disabled={totalStock === 0}
            onClick={() => handleUpdateQuantity("plus")}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <p className="font-semibold">
          {totalStock === 0 ? "₱0.00" : `₱${(productPrice * quantity).toFixed(2)}`}
        </p>

        <Trash
          onClick={handleDelete}
          className="cursor-pointer mt-1 text-red-500 hover:text-red-600"
          size={20}
        />
      </div>
    </div>
  );
}

export default UserCartItemsContent;

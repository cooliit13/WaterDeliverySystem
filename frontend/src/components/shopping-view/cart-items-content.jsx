import { Minus, Plus, Trash } from "lucide-react";
import { Button } from "../ui/button";
import { useDispatch } from "react-redux";
import { deleteCartItem, updateCartQuantity } from "@/store/shop/cart-slice";
import { useToast } from "../ui/use-toast";

function UserCartItemsContent({ cartItem, onCartUpdate }) {
  const dispatch = useDispatch();
  const { toast } = useToast();

  if (!cartItem) return null;

  // Normalize productId (backend sometimes nests product object)
  const normalizedProductId =
    cartItem?.productId && typeof cartItem.productId === "object"
      ? cartItem.productId._id || cartItem.productId.id
      : cartItem.productId || cartItem.product || cartItem._id;

  // Use backend-populated product object (if present)
  const productData =
    cartItem && typeof cartItem.productId === "object" ? cartItem.productId : cartItem.product || null;

  // Price (safe fallback; handles strings and undefined)
  const priceCandidate = productData?.salePrice ?? productData?.price ?? cartItem?.price ?? 0;
  const productPrice = Number(priceCandidate) || 0;

  const quantity = Number(cartItem?.quantity || 1);

  // Prefer product.name (schema) then title then cart item name
  const productTitle = productData?.name || productData?.title || cartItem?.name || "Unknown Product";

  const productImage =
    productData?.image ||
    (Array.isArray(productData?.images) ? productData.images[0] : null) ||
    cartItem?.image ||
    "/placeholder.png";

  const totalStock = Number(productData?.totalStock ?? 9999);

  // update quantity
  const handleUpdateQuantity = (type) => {
    const newQuantity = type === "plus" ? quantity + 1 : quantity - 1;

    if (newQuantity < 1) return;
    if (newQuantity > totalStock) {
      toast({ title: `Only ${totalStock} units available`, variant: "destructive" });
      return;
    }

    dispatch(updateCartQuantity({ productId: normalizedProductId, quantity: newQuantity }))
      .unwrap()
      .then((cart) => {
        toast({ title: "Cart updated" });
        onCartUpdate && onCartUpdate(cart);
      })
      .catch(() => {
        toast({ title: "Could not update cart", variant: "destructive" });
      });
  };

  // delete item
  const handleDelete = () => {
    dispatch(deleteCartItem(normalizedProductId))
      .unwrap()
      .then((cart) => {
        toast({ title: "Item removed" });
        onCartUpdate && onCartUpdate(cart);
      })
      .catch(() => {
        toast({ title: "Failed to remove item", variant: "destructive" });
      });
  };

  return (
    <div className="flex items-center space-x-4 border-b py-4">
      <img
        src={productImage}
        alt={productTitle}
        className="w-20 h-20 rounded object-cover bg-gray-100"
        onError={(e) => {
          // eslint-disable-next-line no-param-reassign
          e.target.src = "/placeholder.png";
        }}
      />

      <div className="flex-1">
        <h3 className="font-extrabold text-gray-800">{productTitle}</h3>

        <div className="flex items-center gap-2 mt-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleUpdateQuantity("minus")} disabled={quantity <= 1}>
            <Minus className="w-4 h-4" />
          </Button>

          <span className="font-semibold w-6 text-center">{quantity}</span>

          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleUpdateQuantity("plus")}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <p className="font-semibold">₱{(productPrice * quantity).toFixed(2)}</p>

        <Trash onClick={handleDelete} className="cursor-pointer mt-1 text-red-500 hover:text-red-600" size={20} />
      </div>
    </div>
  );
}

export default UserCartItemsContent;

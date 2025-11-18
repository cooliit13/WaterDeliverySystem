import { Card, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

/*
  Unified product tile that supports:
   - Customer mode (default): exact original ShoppingProductTile behavior and callbacks
     props: product, handleGetProductDetails, handleAddtoCart
   - Admin mode: pass isAdmin={true} and provide admin props:
     props: product, setFormData, setOpenCreateProductsDialog, setCurrentEditedId, handleDelete, openEditDialog
*/

function AdminProductTile({
  product,
  // customer callbacks (keep original names so existing customer code works)
  handleGetProductDetails,
  handleAddtoCart,

  // admin props (used only when isAdmin === true)
  setFormData,
  setOpenCreateProductsDialog,
  setCurrentEditedId,
  handleDelete,
  openEditDialog,

  // control mode
  isAdmin = false,
}) {
  // minimal safe fallbacks
  const title = product?.title ?? product?.name ?? "Untitled product";
  const img = product?.image ?? product?.imageUrl ?? null;
  const price = product?.price ?? "0.00";

  // admin helper to open edit dialog with normalized form data
  function openEdit() {
    if (!setFormData || !setOpenCreateProductsDialog || !setCurrentEditedId) return;
    setFormData({
      image: null,
      title: product?.title ?? product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? "",
      averageReview: product?.averageReview ?? 0,
      existingImageUrl: product?.image ?? product?.imageUrl ?? null,
    });
    setCurrentEditedId(product?._id ?? product?.id ?? null);
    setOpenCreateProductsDialog(true);
  }

  // Render admin UI (Edit/Delete)
  if (isAdmin) {
    return (
      <Card className="w-full max-w-sm mx-auto rounded-2xl bg-white/40 backdrop-blur-md border border-white/30 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
        <div>
          <div className="relative">
            <img
              src={img}
              alt={title}
              className="w-full h-[260px] object-cover rounded-t-2xl"
            />
          </div>

          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h2>

            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {product?.description || "No description provided."}
            </p>

            <span className="text-xl font-bold text-blue-700 tracking-wide">
              ₱{price}
            </span>
          </CardContent>

          <CardFooter className="flex justify-between items-center px-5 pb-4">
            <Button
              className="rounded-xl px-4 bg-blue-600 hover:bg-blue-700 hover:shadow-md transition"
              onClick={() => {
                if (typeof openEditDialog === "function") {
                  openEditDialog();
                  return;
                }
                openEdit();
              }}
            >
              Edit
            </Button>

            <Button
              className="rounded-xl px-4 bg-red-500 hover:bg-red-600 hover:shadow-md transition"
              onClick={() => handleDelete(product?._id ?? product?.id ?? null)}
            >
              Delete
            </Button>
          </CardFooter>
        </div>
      </Card>
    );
  }

  // Customer mode: use your original ShoppingProductTile markup & callbacks exactly
  return (
    <Card className="w-full max-w-sm mx-auto">
      {/* keep the click area for details exactly as before */}
      <div onClick={() => typeof handleGetProductDetails === "function" && handleGetProductDetails(product?._id)}>
        <div className="relative">
          <img
            src={product?.image}
            alt={product?.title}
            className="w-full h-[300px] object-cover rounded-t-lg"
          />
          {product?.totalStock === 0 ? (
            <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
              Out Of Stock
            </Badge>
          ) : product?.totalStock < 10 ? (
            <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
              {`Only ${product?.totalStock} left`}
            </Badge>
          ) : product?.salePrice > 0 ? (
            <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
              Sale
            </Badge>
          ) : null}
        </div>

        <CardContent className="p-4">
          <h2 className="text-xl font-bold mb-2">{product?.title}</h2>

          <div className="flex justify-between items-center mb-2">
            <span
              className={`${
                product?.salePrice > 0 ? "line-through" : ""
              } text-lg font-semibold text-primary`}
            >
              ₱{product?.price}
            </span>
            {product?.salePrice > 0 ? (
              <span className="text-lg font-semibold text-primary">
                ₱{product?.salePrice}
              </span>
            ) : null}
          </div>
        </CardContent>
      </div>

      <CardFooter>
        {product?.totalStock === 0 ? (
          <Button className="w-full opacity-60 cursor-not-allowed">
            Out Of Stock
          </Button>
        ) : (
          // IMPORTANT: call original callback signature so existing code works
          <Button
            onClick={(e) => {
              // stop propagation so parent click (view details) doesn't trigger
              e.stopPropagation();
              if (typeof handleAddtoCart === "function") {
                handleAddtoCart(product?._id, product?.totalStock);
              }
            }}
            className="w-full"
          >
            Add to cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default AdminProductTile;

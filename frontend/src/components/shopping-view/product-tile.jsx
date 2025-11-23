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

  // ----------------------------
  // Customer mode (updated: only name + price)
  // ----------------------------
  return (
    <Card className="w-full max-w-sm mx-auto rounded-lg overflow-hidden shadow-sm flex flex-col">
      {/* CLICKABLE TOP SECTION */}
      <div
        onClick={() =>
          typeof handleGetProductDetails === "function" &&
          handleGetProductDetails(product?._id)
        }
        className="cursor-pointer flex flex-col flex-grow"
      >
        {/* IMAGE */}
        <div className="relative">
          <img
            src={product?.image}
            alt={product?.title ?? product?.name}
            className="w-full h-[300px] object-cover"
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

        {/* TEXT CONTENT AREA (name + price only) */}
        <CardContent className="p-4 flex flex-col">
          {/* NAME – centered */}
          <h2 className="text-lg font-semibold text-slate-800 text-center mb-2">
            {product?.title ?? product?.name ?? "Water"}
          </h2>

          {/* PRICE – centered and placed at bottom of content area */}
          <div className="text-center mt-auto">
            {product?.salePrice > 0 ? (
              <div className="flex items-baseline justify-center gap-3">
                <span className="text-sm line-through text-gray-400">
                  ₱{product?.price}
                </span>
                <span className="text-lg font-bold text-blue-700">
                  ₱{product?.salePrice}
                </span>
              </div>
            ) : (
              <div className="text-lg font-bold text-blue-700">
                ₱{product?.price ?? "0.00"}
              </div>
            )}
          </div>
        </CardContent>
      </div>

      {/* FOOTER: ADD TO CART BUTTON */}
      <CardFooter className="px-4 pb-4">
        {product?.totalStock === 0 ? (
          <Button className="w-full opacity-60 cursor-not-allowed">
            Out Of Stock
          </Button>
        ) : (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof handleAddtoCart === "function") {
                handleAddtoCart(product?._id, product?.totalStock);
              }
            }}
            className="w-full bg-slate-900 text-white hover:bg-slate-800"
          >
            Add to cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default AdminProductTile;

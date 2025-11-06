import { Button } from "../ui/button";
import { Card, CardContent, CardFooter } from "../ui/card";

function AdminProductTile({
  product,
  setFormData,
  setOpenCreateProductsDialog,
  setCurrentEditedId,
  handleDelete,
}) {
  return (
    <Card
      className="
        w-full max-w-sm mx-auto rounded-2xl 
        bg-white/40 backdrop-blur-md border border-white/30
        shadow-md hover:shadow-xl 
        transition-all duration-300 hover:scale-[1.02]
      "
    >
      <div>
        <div className="relative">
          <img
            src={product?.image}
            alt={product?.title}
            className="w-full h-[260px] object-cover rounded-t-2xl"
          />
        </div>

        <CardContent className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {product?.title}
          </h2>

          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {product?.description || "No description provided."}
          </p>

          <span className="text-xl font-bold text-blue-700 tracking-wide">
            ₱{product?.price}
          </span>
        </CardContent>

        <CardFooter className="flex justify-between items-center px-5 pb-4">
          <Button
            className="rounded-xl px-4 bg-blue-600 hover:bg-blue-700 hover:shadow-md transition"
            onClick={() => {
              setOpenCreateProductsDialog(true);
              setCurrentEditedId(product?._id);
              setFormData(product);
            }}
          >
            Edit
          </Button>

          <Button
            className="rounded-xl px-4 bg-red-500 hover:bg-red-600 hover:shadow-md transition"
            onClick={() => handleDelete(product?._id)}
          >
            Delete
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}

export default AdminProductTile;

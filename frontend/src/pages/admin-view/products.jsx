// AdminProducts.jsx
import ProductImageUpload from "@/components/admin-view/image-upload";
import AdminProductTile from "@/components/admin-view/product-tile";
import CommonForm from "@/components/common/form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { addProductFormElements } from "@/config";
import {
  addNewProduct,
  deleteProduct,
  editProduct,
  fetchAllProducts,
} from "@/store/admin/products-slice"; // <-- matches your slice file
import { Fragment, useEffect, useState } from "react";
import { useDispatch } from "react-redux";

const initialFormData = {
  image: null,
  title: "",
  description: "",
  price: "",
  averageReview: 0,
  existingImageUrl: null, // optional: keep existing image when editing
};

function AdminProducts() {
  const [openCreateProductsDialog, setOpenCreateProductsDialog] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [imageFile, setImageFile] = useState(null);
  const [imageLoadingState, setImageLoadingState] = useState(false);
  const [currentEditedId, setCurrentEditedId] = useState(null);
  const [productList, setProductList] = useState([]);

  const { toast } = useToast();
  const dispatch = useDispatch();

  const isFormValid = () =>
    ["title", "description", "price"].every((key) => !!formData[key]);

  // refresh helper
  const refreshProducts = async () => {
    try {
      const action = await dispatch(fetchAllProducts());
      if (action?.payload?.products) {
        setProductList(action.payload.products);
      } else if (Array.isArray(action.payload)) {
        // some APIs return array directly
        setProductList(action.payload);
      } else {
        setProductList([]);
        console.warn("fetchAllProducts returned unexpected payload:", action);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setProductList([]);
    }
  };

  useEffect(() => {
    refreshProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("averageReview", formData.averageReview ?? 0);

      if (imageFile) {
        data.append("image", imageFile);
      } else if (formData.existingImageUrl) {
        // optional: let backend know to keep existing image
        data.append("existingImageUrl", formData.existingImageUrl);
      }

      if (currentEditedId) {
        // IMPORTANT: call editProduct using object signature that matches your slice:
        await dispatch(editProduct({ id: currentEditedId, formData: data }));
        toast({ title: "Product edited successfully" });
      } else {
        await dispatch(addNewProduct(data));
        toast({ title: "Product added successfully" });
      }

      // reset form and state
      setFormData(initialFormData);
      setImageFile(null);
      setOpenCreateProductsDialog(false);
      setCurrentEditedId(null);

      // refresh list
      await refreshProducts();
    } catch (err) {
      console.error("Error submitting product:", err);
      toast({
        title: "Submission failed",
        description: "Check console for details",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteProduct(id)); // dispatch returns a promise
      toast({ title: "Product deleted" });
      await refreshProducts();
    } catch (err) {
      console.error("Delete failed:", err);
      toast({
        title: "Delete failed",
        description: "Check console for details",
        variant: "destructive",
      });
    }
  };

  // Optional helper used if AdminProductTile doesn't populate the form itself.
  // You can call this from a tile's Edit button instead of relying on the tile.
  const openEditDialogFor = (product) => {
    setFormData({
      title: product.title || "",
      description: product.description || "",
      price: product.price || "",
      averageReview: product.averageReview ?? 0,
      existingImageUrl: product.imageUrl || product.image || null,
    });
    setCurrentEditedId(product._id);
    setImageFile(null); // user must upload new file to change
    setOpenCreateProductsDialog(true);
  };

  return (
    <Fragment>
      <div className="mb-5 w-full flex justify-end">
        <Button
          onClick={() => {
            setFormData(initialFormData);
            setCurrentEditedId(null);
            setImageFile(null);
            setOpenCreateProductsDialog(true);
          }}
        >
          Add New Product
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productList.length > 0 ? (
          productList.map((product) => (
            <AdminProductTile
              key={product._id}
              product={product}
              setFormData={setFormData}
              setOpenCreateProductsDialog={setOpenCreateProductsDialog}
              setCurrentEditedId={setCurrentEditedId}
              // if the tile calls handleDelete with id: use this
              handleDelete={(id) => handleDelete(id)}
              // also expose a quick-edit function in case the tile wants direct data
              openEditDialog={() => openEditDialogFor(product)}
            />
          ))
        ) : (
          <p className="text-center text-gray-500">No products found.</p>
        )}
      </div>

      <Sheet
        open={openCreateProductsDialog}
        onOpenChange={(open) => {
          if (!open) {
            setOpenCreateProductsDialog(false);
            setFormData(initialFormData);
            setImageFile(null);
            setCurrentEditedId(null);
          }
        }}
      >
        <SheetContent side="right" className="overflow-auto">
          <SheetHeader>
            <SheetTitle>{currentEditedId ? "Edit Product" : "Add New Product"}</SheetTitle>
          </SheetHeader>

          <ProductImageUpload
            imageFile={imageFile}
            setImageFile={setImageFile}
            imageLoadingState={imageLoadingState}
            setImageLoadingState={setImageLoadingState}
          />

          <div className="py-6">
            <CommonForm
              onSubmit={onSubmit}
              formData={formData}
              setFormData={setFormData}
              buttonText={currentEditedId ? "Edit" : "Add"}
              formControls={addProductFormElements}
              isBtnDisabled={!isFormValid()}
            />
          </div>
        </SheetContent>
      </Sheet>
    </Fragment>
  );
}

export default AdminProducts;

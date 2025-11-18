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
} from "@/store/admin/products-slice";
import { Fragment, useEffect, useState } from "react";
import { useDispatch } from "react-redux";

const initialFormData = {
  image: null,
  title: "",
  description: "",
  price: "",
  averageReview: 0,
  existingImageUrl: null,
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

  // refresh helper with minimal normalization + logging
  const refreshProducts = async () => {
    try {
      const action = await dispatch(fetchAllProducts());
      console.log("fetchAllProducts action:", action);

      let raw = null;
      if (action?.payload?.products) {
        raw = action.payload.products;
      } else if (Array.isArray(action.payload)) {
        raw = action.payload;
      } else if (action?.payload) {
        if (Array.isArray(action.payload.data)) raw = action.payload.data;
        else if (Array.isArray(action.payload.results)) raw = action.payload.results;
        else {
          console.warn("fetchAllProducts returned unexpected payload:", action.payload);
          raw = [];
        }
      } else {
        raw = [];
      }

      const normalized = (raw || []).map((p) => {
        const title = p.title ?? p.name ?? p.productName ?? "";
        const imageUrl = p.imageUrl ?? p.image ?? (p.image?.url ? p.image.url : null);
        return {
          _id: p._id ?? p.id ?? null,
          title,
          description: p.description ?? p.desc ?? "",
          price: p.price ?? p.amount ?? 0,
          image: imageUrl,
          imageUrl: imageUrl,
          averageReview: p.averageReview ?? p.rating ?? 0,
          __raw: p,
        };
      });

      setProductList(normalized);
      console.log("Normalized productList:", normalized);
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
        data.append("existingImageUrl", formData.existingImageUrl);
      }

      if (currentEditedId) {
        const res = await dispatch(editProduct({ id: currentEditedId, formData: data }));
        console.log("editProduct result:", res);
        toast({ title: "Product edited successfully" });
      } else {
        const res = await dispatch(addNewProduct(data));
        console.log("addNewProduct result:", res);
        toast({ title: "Product added successfully" });
      }

      setFormData(initialFormData);
      setImageFile(null);
      setOpenCreateProductsDialog(false);
      setCurrentEditedId(null);

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
      await dispatch(deleteProduct(id));
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

  const openEditDialogFor = (product) => {
    setFormData({
      image: null,
      title: product.title ?? product.name ?? "",
      description: product.description ?? "",
      price: product.price ?? "",
      averageReview: product.averageReview ?? 0,
      existingImageUrl: product.image ?? product.imageUrl ?? null,
    });
    setCurrentEditedId(product._id);
    setImageFile(null);
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
              handleDelete={(id) => handleDelete(id)}
              openEditDialog={() => openEditDialogFor(product)}
              isAdmin={true} // IMPORTANT: admin mode (shows Edit/Delete)
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

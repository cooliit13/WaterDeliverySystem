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
import { useNavigate } from "react-router-dom";

const initialFormData = {
  image: null,
  title: "",
  description: "",
  price: "",
  averageReview: 0,
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
  const navigate = useNavigate();

  const isFormValid = () =>
    ["title", "description", "price"].every((key) => formData[key]);

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      // Prepare FormData for backend
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("averageReview", formData.averageReview || 0);

      if (imageFile) {
        data.append("image", imageFile); // only send File object
      }

      if (currentEditedId) {
        await dispatch(editProduct({ id: currentEditedId, formData: data }));
      } else {
        await dispatch(addNewProduct(data));
        toast({ title: "Product added successfully" });
      }

      setFormData(initialFormData);
      setImageFile(null);
      setOpenCreateProductsDialog(false);
      setCurrentEditedId(null);
      dispatch(fetchAllProducts());
    } catch (err) {
      console.error("Error submitting product:", err);
      toast({
        title: "Submission failed",
        description: "Check console for details",
        variant: "destructive",
      });
    }
  };

  // Fetch products
// Fetch products
useEffect(() => {
  dispatch(fetchAllProducts()).then((res) => {
    if (res?.payload?.products) {
      setProductList(res.payload.products);
    } else {
      console.warn("No products found in response:", res);
    }
  });
}, [dispatch]);


  return (
    <Fragment>
      <div className="mb-5 w-full flex justify-end">
        <Button onClick={() => setOpenCreateProductsDialog(true)}>Add New Product</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productList.length
          ? productList.map((product) => (
              <AdminProductTile
                key={product._id}
                product={product}
                setFormData={setFormData}
                setOpenCreateProductsDialog={setOpenCreateProductsDialog}
                setCurrentEditedId={setCurrentEditedId}
                handleDelete={(id) => dispatch(deleteProduct(id).then(() => dispatch(fetchAllProducts())))}
              />
            ))
          : <p className="text-center text-gray-500">No products found.</p>
        }
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
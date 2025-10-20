import ProductImageUpload from "@/components/admin-view/image-upload";
import { Button } from "@/components/ui/button";
import { addFeatureImage, getFeatureImages, deleteFeatureImage } from "@/store/common-slice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

function AdminDashboard() {
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [imageLoadingState, setImageLoadingState] = useState(false);
  const dispatch = useDispatch();
  const { featureImageList } = useSelector((state) => state.commonFeature);

  function handleUploadFeatureImage() {
    dispatch(addFeatureImage(uploadedImageUrl)).then((data) => {
      if (data?.payload?.success) {
        dispatch(getFeatureImages());
        setImageFile(null);
        setUploadedImageUrl("");
      }
    });
  }

  function handleDeleteImage(imageId) {
    if (window.confirm("Are you sure you want to delete this image?")) {
      dispatch(deleteFeatureImage(imageId)).then((data) => {
        if (data?.payload?.success) {
          dispatch(getFeatureImages());
        }
      });
    }
  }

  useEffect(() => {
    dispatch(getFeatureImages());
  }, [dispatch]);

  return (
    <div>
      <ProductImageUpload
        imageFile={imageFile}
        setImageFile={setImageFile}
        uploadedImageUrl={uploadedImageUrl}
        setUploadedImageUrl={setUploadedImageUrl}
        setImageLoadingState={setImageLoadingState}
        imageLoadingState={imageLoadingState}
        isCustomStyling={true}
      />
      <Button onClick={handleUploadFeatureImage} className="mt-5 w-full">
        Upload
      </Button>

      <div className="flex flex-col gap-4 mt-5">
        {featureImageList && featureImageList.length > 0 ? (
          featureImageList.map((featureImgItem) => (
            <div key={featureImgItem._id} className="relative group">
              <img
                src={featureImgItem.image}
                className="w-full h-[300px] object-cover rounded-t-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                onClick={() => handleDeleteImage(featureImgItem._id)}
              >
                Delete
              </Button>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center">
            No feature images uploaded yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;

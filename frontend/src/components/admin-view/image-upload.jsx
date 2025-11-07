import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useRef } from "react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import axios from "axios";

function ProductImageUpload({
  imageFile,
  setImageFile,
  uploadedImageUrl,
  setUploadedImageUrl,
  imageLoadingState,
  setImageLoadingState,
  isEditMode = false,
}) {
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setUploadedImageUrl("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!imageFile) return alert("Select an image first");
    setImageLoadingState(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("my_file", imageFile);

      const res = await axios.post(
        "http://localhost:5000/api/admin/products/upload-image",
        formData,
        { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) setUploadedImageUrl(res.data.result.secure_url || res.data.result.url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setImageLoadingState(false);
    }
  }

  return (
    <div className="w-full mt-4 max-w-md mx-auto">
      <Label className="text-lg font-semibold mb-2 block">Upload Image</Label>
      <div className={`border-2 border-dashed rounded-lg p-4 ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}>
        <Input id="image-upload" type="file" className="hidden" ref={inputRef} onChange={handleFileChange} disabled={isEditMode} />

        {!imageFile ? (
          <Label htmlFor="image-upload" className="flex flex-col items-center justify-center h-32 cursor-pointer">
            <UploadCloudIcon className="w-10 h-10 text-muted-foreground mb-2" />
            Drag & drop or click to upload
          </Label>
        ) : imageLoadingState ? (
          <Skeleton className="h-10 bg-gray-100" />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileIcon className="w-8 h-8 text-primary mr-2" />
              <p className="text-sm font-medium">{imageFile.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleUpload}>Upload</Button>
              <Button variant="ghost" size="icon" onClick={handleRemoveImage}>
                <XIcon className="w-4 h-4" />
                <span className="sr-only">Remove</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductImageUpload;
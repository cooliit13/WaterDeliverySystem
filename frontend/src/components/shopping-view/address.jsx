import { useEffect, useState } from "react";
import CommonForm from "../common/form";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { addressFormControls } from "@/config";
import { useDispatch, useSelector } from "react-redux";
import {
  addNewAddress,
  deleteAddress,
  editaAddress,
  fetchAllAddresses,
} from "@/store/shop/address-slice";
import AddressCard from "./address-card";
import { useToast } from "../ui/use-toast";

const initialAddressFormData = {
  fullName: "",
  street: "",
  province: "",
  postalCode: "",
  phoneNumber: "",
  notes: "",
};

function Address({ setCurrentSelectedAddress, selectedId }) {
  const [formData, setFormData] = useState(initialAddressFormData);
  const [currentEditedId, setCurrentEditedId] = useState(null);
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { addressList } = useSelector((state) => state.shopAddress);
  const { toast } = useToast();

  function handleManageAddress(event) {
    event.preventDefault();

    if (addressList?.length >= 3 && currentEditedId === null) {
      setFormData(initialAddressFormData);
      toast({
        title: "You can add max 3 addresses",
        variant: "destructive",
      });
      return;
    }

    // ✅ FIXED PAYLOAD (this matches EXACTLY what backend expects)
    const backendPayload = {
      fullName: formData.fullName,
      street: formData.street,
      province: formData.province,
      postalCode: formData.postalCode,
      phoneNumber: formData.phoneNumber,
      notes: formData.notes,
      userId: user?.id,
    };

    if (currentEditedId !== null) {
      // ✅ EDIT
      dispatch(
        editaAddress({
          userId: user?.id,
          addressId: currentEditedId,
          formData: backendPayload,
        })
      ).then((data) => {
        if (data?.payload?.success) {
          dispatch(fetchAllAddresses(user?.id));
          setCurrentEditedId(null);
          setFormData(initialAddressFormData);
          toast({ title: "Address updated successfully" });
        }
      });
    } else {
      // ✅ ADD
      dispatch(addNewAddress(backendPayload)).then((data) => {
        if (data?.payload?.success) {
          dispatch(fetchAllAddresses(user?.id));
          setFormData(initialAddressFormData);
          toast({ title: "Address added successfully" });
        }
      });
    }
  }

  function handleDeleteAddress(getCurrentAddress) {
    dispatch(
      deleteAddress({ userId: user?.id, addressId: getCurrentAddress._id })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchAllAddresses(user?.id));
        toast({ title: "Address deleted successfully" });
      }
    });
  }

  function handleEditAddress(getCurrentAddress) {
    setCurrentEditedId(getCurrentAddress?._id);

    // ✅ MATCH YOUR FORM KEYS
    setFormData({
      fullName: getCurrentAddress?.fullName || "",
      street: getCurrentAddress?.address || "",
      province: getCurrentAddress?.city || "",
      postalCode: getCurrentAddress?.pincode || "",
      phoneNumber: getCurrentAddress?.phone || "",
      notes: getCurrentAddress?.notes || "",
    });
  }

  function isFormValid() {
    const requiredFields = [
      "fullName",
      "street",
      "province",
      "postalCode",
      "phoneNumber",
    ];

    return requiredFields.every(
      (field) => (formData[field] || "").toString().trim() !== ""
    );
  }

  useEffect(() => {
    if (user?.id) dispatch(fetchAllAddresses(user.id));
  }, [dispatch, user]);

  return (
    <Card>
      <div className="mb-5 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {addressList && addressList.length > 0
          ? addressList.map((singleAddressItem) => (
              <AddressCard
                key={singleAddressItem._id}
                selectedId={selectedId}
                handleDeleteAddress={handleDeleteAddress}
                addressInfo={singleAddressItem}
                handleEditAddress={handleEditAddress}
                setCurrentSelectedAddress={setCurrentSelectedAddress}
              />
            ))
          : null}
      </div>

      <CardHeader>
        <CardTitle>
          {currentEditedId !== null ? "Edit Address" : "Add New Address"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <CommonForm
          formControls={addressFormControls}
          formData={formData}
          setFormData={setFormData}
          buttonText={currentEditedId !== null ? "Edit" : "Add"}
          onSubmit={handleManageAddress}
          isBtnDisabled={!isFormValid()}
        />
      </CardContent>
    </Card>
  );
}

export default Address;
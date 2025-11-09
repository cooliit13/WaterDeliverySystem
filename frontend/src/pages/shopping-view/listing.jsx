import ProductDetailsDialog from "@/components/shopping-view/product-details";
import ShoppingProductTile from "@/components/shopping-view/product-tile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { sortOptions } from "@/config";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import {
  fetchAllFilteredProducts,
  fetchProductDetails,
} from "@/store/shop/products-slice";
import { ArrowUpDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";

function ShoppingListing() {
  const dispatch = useDispatch();
  const { productList, productDetails } = useSelector(
    (state) => state.shopProducts
  );
  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);
  const [sort, setSort] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const { toast } = useToast();

  function handleSort(value) {
    setSort(value);
  }

  function handleGetProductDetails(getCurrentProductId) {
    dispatch(fetchProductDetails(getCurrentProductId));
  }

  // ✅ FIXED VERSION (minimal change: use res.error instead of success flag)
  function handleAddtoCart(getCurrentProductId, getTotalStock) {
    try {
      if (!user || !user.id) {
        toast({
          title: "Please log in first to add items to your cart.",
          variant: "destructive",
        });
        return;
      }

      const getCartItems = cartItems?.items || [];

      // Check stock for existing item
      const existingItem = getCartItems.find(
        (item) => item.productId === getCurrentProductId
      );
      if (existingItem && existingItem.quantity + 1 > getTotalStock) {
        toast({
          title: `Only ${getTotalStock} units available for this product.`,
          variant: "destructive",
        });
        return;
      }

      dispatch(
        addToCart({
          productId: getCurrentProductId,
          quantity: 1,
        })
      ).then((res) => {

        // ✅ NEW: Check if thunk succeeded
        if (!res.error) {
          dispatch(fetchCartItems());
          toast({
            title: "Product added to cart!",
          });
        } else {
          toast({
            title: "Could not update your cart. Please try again.",
            variant: "destructive",
          });
        }
      });
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast({
        title: "Something went wrong while adding to cart.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    console.log("🧠 User from Redux:", user);
  }, [user]);

  useEffect(() => {
    setSort("price-lowtohigh");
  }, []);

  useEffect(() => {
    if (sort !== null)
      dispatch(fetchAllFilteredProducts({ filterParams: {}, sortParams: sort }));
  }, [dispatch, sort]);

  useEffect(() => {
    if (productDetails !== null) setOpenDetailsDialog(true);
  }, [productDetails]);

  return (
    <div className="p-4 md:p-6">
      <div className="bg-background w-full rounded-lg shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-extrabold">All Products</h2>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {productList?.length} Products
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <ArrowUpDownIcon className="h-4 w-4" />
                  <span>Sort by</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuRadioGroup value={sort} onValueChange={handleSort}>
                  {sortOptions.map((sortItem) => (
                    <DropdownMenuRadioItem
                      value={sortItem.id}
                      key={sortItem.id}
                    >
                      {sortItem.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {productList && productList.length > 0
            ? productList.map((productItem) => (
                <ShoppingProductTile
                  key={productItem._id}
                  handleGetProductDetails={handleGetProductDetails}
                  product={productItem}
                  handleAddtoCart={handleAddtoCart}
                />
              ))
            : null}
        </div>
      </div>
      <ProductDetailsDialog
        open={openDetailsDialog}
        setOpen={setOpenDetailsDialog}
        productDetails={productDetails}
      />
    </div>
  );
}

export default ShoppingListing;

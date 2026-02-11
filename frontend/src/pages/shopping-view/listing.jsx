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
import { ArrowUpDownIcon, CheckIcon } from "lucide-react";
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
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const { toast } = useToast();
  const [addUiState, setAddUiState] = useState({});

  // SORTING
  function handleSort(value) {
    setSort(value);
  }

  function handleGetProductDetails(id) {
    dispatch(fetchProductDetails(id));
  }

  function detectStock(product) {
    const raw =
      product?.totalStock ??
      product?.stock ??
      product?.quantityAvailable ??
      product?.quantity ??
      product?.available ??
      product?.inventoryCount ??
      product?.stockCount;

    return raw !== undefined && raw !== null ? Number(raw) : null;
  }

  async function addToCartWithUi(id, totalStock) {
    try {
      if (!user || !user.id) {
        toast({
          title: "Please log in first to add items to your cart.",
          variant: "destructive",
        });
        return;
      }

      // BLOCK: explicit out-of-stock guard
      if (totalStock !== null && totalStock <= 0) {
        toast({
          title: "This product is out of stock.",
          variant: "destructive",
        });
        return;
      }

      const existingItem = cartItems?.items?.find((i) => i.productId === id);
      // existing item quantity check (if existing item + 1 would exceed totalStock)
      if (existingItem && totalStock !== null && existingItem.quantity + 1 > totalStock) {
        toast({
          title: `Only ${totalStock} units available.`,
          variant: "destructive",
        });
        return;
      }

      setAddUiState((s) => ({ ...s, [id]: "loading" }));

      const res = await dispatch(addToCart({ productId: id, quantity: 1 }));

      if (!res.error) {
        dispatch(fetchCartItems());
        toast({ title: "Product added to cart!" });

        setAddUiState((s) => ({ ...s, [id]: "added" }));
        setTimeout(() => {
          setAddUiState((s) => ({ ...s, [id]: "idle" }));
        }, 1500);
      } else {
        setAddUiState((s) => ({ ...s, [id]: "error" }));
        toast({
          title: "Could not update your cart.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      setAddUiState((s) => ({ ...s, [id]: "error" }));
      toast({
        title: "Something went wrong.",
        variant: "destructive",
      });
    }
  }

  // AUTO APPLY SORT
  useEffect(() => {
    setSort("price-lowtohigh");
  }, []);

  useEffect(() => {
    if (sort !== null)
      dispatch(fetchAllFilteredProducts({ filterParams: {}, sortParams: sort }));
  }, [sort]);

  useEffect(() => {
    if (productDetails) setOpenDetailsDialog(true);
  }, [productDetails]);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white w-full rounded-lg shadow-sm">
        {/* HEADER */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-extrabold">All Products</h2>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {productList?.length ?? 0} Products
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
                  {sortOptions.map((s) => (
                    <DropdownMenuRadioItem key={s.id} value={s.id}>
                      {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
          {productList?.length ? (
            productList.map((item) => {
              const totalStock = detectStock(item);
              const ui = addUiState[item._id] || "idle";

              // if out of stock, provide a no-op handler that shows toast
              const safeAddHandler =
                totalStock !== null && totalStock <= 0
                  ? () =>
                      toast({
                        title: "This product is out of stock.",
                        variant: "destructive",
                      })
                  : () => addToCartWithUi(item._id, totalStock);

              return (
                <div
                  key={item._id}
                  className="relative bg-white rounded-xl p-4 border border-gray-100 shadow-sm
                             hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* PRODUCT TILE */}
                  <div className="overflow-hidden rounded-lg">
                    <div className="transform transition-transform duration-300 hover:scale-105">
                      <ShoppingProductTile
                        handleGetProductDetails={handleGetProductDetails}
                        product={item}
                        handleAddtoCart={safeAddHandler}
                      />
                    </div>
                  </div>

                  {/* STOCK LABEL */}
                  <div className="w-full flex justify-center mt-3 text-sm">
                    {totalStock === null ? (
                      <span className="text-gray-500">Available: —</span>
                    ) : totalStock > 0 ? (
                      <span className="text-green-600">
                        Available: {totalStock} pcs
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold">OUT OF STOCK</span>
                    )}
                  </div>

                  {/* ADD-TO-CART STATUS BADGE */}
                  <div className="absolute top-3 right-3 z-30">
                    {ui === "loading" && (
                      <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs shadow animate-pulse">
                        Adding...
                      </div>
                    )}
                    {ui === "added" && (
                      <div className="px-3 py-1 rounded-full bg-green-600 text-white text-xs shadow flex items-center gap-1">
                        <CheckIcon className="w-4 h-4" /> Added
                      </div>
                    )}
                    {ui === "error" && (
                      <div className="px-3 py-1 rounded-full bg-red-500 text-white text-xs shadow">
                        Error
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div>No products available.</div>
          )}
        </div>
      </div>

      {/* DIALOG */}
      <ProductDetailsDialog
        open={openDetailsDialog}
        setOpen={setOpenDetailsDialog}
        productDetails={productDetails}
      />
    </div>
  );
}

export default ShoppingListing;

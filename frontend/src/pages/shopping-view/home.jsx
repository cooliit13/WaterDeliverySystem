import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllFilteredProducts,
  fetchProductDetails,
} from "@/store/shop/products-slice";
import ShoppingProductTile from "@/components/shopping-view/product-tile";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { useToast } from "@/components/ui/use-toast";
import ProductDetailsDialog from "@/components/shopping-view/product-details";
import { getFeatureImages } from "@/store/common-slice";

// Local banner assets (rename files if your bundler can't handle spaces/parentheses)
import bannerLocal1 from "@/assets/pictures/banners/AquaTrack- Water Refilling this is the name (1).jpg";
import bannerLocal2 from "@/assets/pictures/banners/create me a banner web picture that promotes water refilling station.jpg";
import bannerLocal3 from "@/assets/pictures/banners/a (2).png";

function ShoppingHome() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { productList, productDetails } = useSelector(
    (state) => state.shopProducts
  );
  const { featureImageList } = useSelector((state) => state.commonFeature);

  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();

  function handleGetProductDetails(getCurrentProductId) {
    dispatch(fetchProductDetails(getCurrentProductId));
  }

  function handleAddtoCart(getCurrentProductId) {
    dispatch(
      addToCart({
        userId: user?.id,
        productId: getCurrentProductId,
        quantity: 1,
      })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchCartItems(user?.id));
        toast({
          title: "Product is added to cart",
        });
      }
    });
  }

  useEffect(() => {
    if (productDetails !== null) setOpenDetailsDialog(true);
  }, [productDetails]);

  // keep your existing auto-advance behavior (uses featureImageList length)
  useEffect(() => {
    if (Array.isArray(featureImageList) && featureImageList.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % featureImageList.length);
      }, 4000);

      return () => clearInterval(timer);
    }
  }, [featureImageList]);

  useEffect(() => {
    dispatch(
      fetchAllFilteredProducts({
        filterParams: {},
        sortParams: "price-lowtohigh",
      })
    );
  }, [dispatch]);

  useEffect(() => {
    dispatch(getFeatureImages());
  }, [dispatch]);

  // ----------------------------------------------------------------
  // Slide data: exactly 3 slides focusing on Mineral, Alkaline, Purified
  // Priority: productList (first 3) -> featureImageList (first 3) -> local assets
  // Left descriptions use the provided copy; right card keeps slide.desc
  // ----------------------------------------------------------------
  const slideData = (() => {
    const types = ["Mineral Water", "Alkaline Water", "Purified Water"];
    // Left column descriptions (as requested)
    const leftDescriptions = {
      "Mineral Water":
        "Natural water enriched with essential minerals for daily hydration and body balance.",
      "Alkaline Water":
        "High-pH water designed to neutralize acidity and support better overall hydration.",
      "Purified Water":
        "Ultra-clean water filtered to remove impurities, perfect for safe everyday drinking.",
    };

    if (Array.isArray(productList) && productList.length >= 3) {
      return productList.slice(0, 3).map((p, i) => {
        const title = types[i];
        return {
          id: p._id,
          image: p.image || (featureImageList?.[i]?.image ?? ""),
          title,
          price: p.price ?? "",
          // right description: keep existing product desc if present
          desc:
            p.shortDescription ||
            p.description ||
            (title === "Mineral Water"
              ? "Naturally balanced minerals — refreshing and healthy."
              : title === "Alkaline Water"
              ? "pH-boosted water for hydration and balance."
              : "Ultra-purified water — clean taste, every refill."),
          // left description: use the exact requested copy
          leftDesc: leftDescriptions[title],
        };
      });
    }

    if (Array.isArray(featureImageList) && featureImageList.length >= 3) {
      return featureImageList.slice(0, 3).map((f, i) => {
        const title = types[i];
        return {
          id: `feature-${i}`,
          image: f.image,
          title,
          price: f.price || "",
          desc:
            f.caption ||
            (title === "Mineral Water"
              ? "Naturally balanced minerals — refreshing and healthy."
              : title === "Alkaline Water"
              ? "pH-boosted water for hydration and balance."
              : "Ultra-purified water — clean taste, every refill."),
          leftDesc: leftDescriptions[title],
        };
      });
    }

    // fallback to local assets
    return [
      {
        id: "local-mineral",
        image: bannerLocal1,
        title: "Mineral Water",
        price: "",
        desc: "Naturally balanced minerals — refreshing and healthy.",
        leftDesc:
          "Natural water enriched with essential minerals for daily hydration and body balance.",
      },
      {
        id: "local-alkaline",
        image: bannerLocal2,
        title: "Alkaline Water",
        price: "",
        desc: "pH-boosted water for hydration and balance.",
        leftDesc:
          "High-pH water designed to neutralize acidity and support better overall hydration.",
      },
      {
        id: "local-purified",
        image: bannerLocal3,
        title: "Purified Water",
        price: "",
        desc: "Ultra-purified water — clean taste, every refill.",
        leftDesc:
          "Ultra-clean water filtered to remove impurities, perfect for safe everyday drinking.",
      },
    ];
  })();

  return (
    <div className="flex flex-col min-h-screen">
      {/* --- Banner Section (COLOR + FONT-focused theme only) */}
      <div className="relative w-full h-[600px] overflow-hidden bg-slate-100">
        {/* Slide track */}
        <div
          className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
          style={{
            width: `${slideData.length * 100}%`,
            transform: `translateX(-${currentSlide * (100 / slideData.length)}%)`,
          }}
        >
          {slideData.map((slide) => (
            <div
              key={slide.id}
              className="w-full relative flex-shrink-0"
              style={{ width: `${100 / slideData.length}%` }}
            >
              {/* Background image */}
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Soft white glass overlay (theme: translucent glassy white) */}
              <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />

              {/* Content (left text, right product card) */}
              <div className="relative z-10 h-full flex items-center">
                <div className="container mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-6 max-w-7xl">
                  {/* Left text column */}
                  <div className="w-full lg:w-2/3">
                    <div className="inline-block bg-white/80 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold shadow border border-white/50">
                      Premium Water Delivery
                    </div>

                    <h1 className="mt-4 text-5xl lg:text-6xl font-extrabold text-blue-900 leading-tight">
                      {slide.title}
                    </h1>

                    {/* LEFT description uses the exact provided copy */}
                    <p className="mt-4 text-lg text-slate-700 max-w-2xl">
                      {slide.leftDesc}
                    </p>

                    <div className="mt-6 flex gap-3">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        onClick={() => handleGetProductDetails(slide.id)}
                      >
                        Details
                      </Button>
                      {/* Removed Add to Cart from banner as requested */}
                    </div>
                  </div>

                  {/* Right product card */}
                  <div className="w-full lg:w-1/3">
                    <div className="rounded-2xl bg-white/50 backdrop-blur-sm p-4 shadow-2xl border border-white/20">
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-44 object-cover rounded-xl shadow-md"
                      />
                      <div className="mt-3">
                        <h3 className="text-lg font-semibold text-blue-800">{slide.title}</h3>
                        {/* RIGHT description stays the same (slide.desc) */}
                        <p className="text-sm text-slate-700 mt-1">{slide.desc}</p>
                        {slide.price ? (
                          <div className="mt-2 text-blue-600 font-bold">{`$${slide.price}`}</div>
                        ) : (
                          <div className="mt-2 text-sm text-slate-700">From ₱XX — Order Now</div>
                        )}
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" onClick={() => handleGetProductDetails(slide.id)}>
                            Details
                          </Button>
                          {/* Removed Add button here as requested */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Left Arrow */}
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCurrentSlide((prevSlide) =>
              slideData && slideData.length > 0
                ? (prevSlide - 1 + slideData.length) % slideData.length
                : 0
            )
          }
          className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/70 border-blue-300 text-blue-700 shadow"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Button>

        {/* Right Arrow */}
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCurrentSlide((prevSlide) =>
              slideData && slideData.length > 0 ? (prevSlide + 1) % slideData.length : 0
            )
          }
          className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/70 border-blue-300 text-blue-700 shadow"
          aria-label="Next slide"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </Button>

        {/* Pagination dots */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
          {slideData.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-3 h-3 rounded-full ${i === currentSlide ? "bg-blue-600" : "bg-white/60"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* --- Featured Products --- */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-blue-600">
            Featured Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
          {/* Order Now CTA removed as requested */}
        </div>
      </section>

      <ProductDetailsDialog
        open={openDetailsDialog}
        setOpen={setOpenDetailsDialog}
        productDetails={productDetails}
      />
    </div>
  );
}

export default ShoppingHome;

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
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

// Local banner assets — make sure these paths exist in your repo
import bannerLocal1 from "@/assets/pictures/banners/AquaTrack- Water Refilling this is the name (1).jpg";
import bannerLocal2 from "@/assets/pictures/banners/create me a banner web picture that promotes water refilling station.jpg";
import bannerLocal3 from "@/assets/pictures/banners/a (2).png";

function ShoppingHome() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { productList, productDetails } = useSelector((state) => state.shopProducts);
  const { featureImageList } = useSelector((state) => state.commonFeature);

  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [localProductDetails, setLocalProductDetails] = useState(null);

  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();

  // auto-advance
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

  useEffect(() => {
    // open dialog when redux productDetails or localProductDetails available
    if (productDetails !== null || localProductDetails !== null) setOpenDetailsDialog(true);
  }, [productDetails, localProductDetails]);

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
        toast({ title: "Product is added to cart" });
      }
    });
  }

  // Slide data: Mineral / Alkaline / Purified
  const slideData = useMemo(() => {
    const types = ["Mineral Water", "Alkaline Water", "Purified Water"];
    const leftDescriptions = {
      "Mineral Water": "Natural water enriched with essential minerals for daily hydration and body balance.",
      "Alkaline Water": "High-pH water designed to neutralize acidity and support better overall hydration.",
      "Purified Water": "Ultra-clean water filtered to remove impurities, perfect for safe everyday drinking.",
    };

    if (Array.isArray(productList) && productList.length >= 3) {
      return productList.slice(0, 3).map((p, i) => {
        const title = types[i];
        return {
          id: p._id,
          image: p.image || (featureImageList?.[i]?.image ?? ""),
          title,
          price: p.price ?? "",
          desc: p.shortDescription || p.description || (title === "Mineral Water" ? "Naturally balanced minerals — refreshing and healthy." : title === "Alkaline Water" ? "pH-boosted water for hydration and balance." : "Ultra-purified water — clean taste, every refill."),
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
          desc: f.caption || (title === "Mineral Water" ? "Naturally balanced minerals — refreshing and healthy." : title === "Alkaline Water" ? "pH-boosted water for hydration and balance." : "Ultra-purified water — clean taste, every refill."),
          leftDesc: leftDescriptions[title],
        };
      });
    }

    return [
      { id: "local-mineral", image: bannerLocal1, title: "Mineral Water", price: "", desc: "Naturally balanced minerals — refreshing and healthy.", leftDesc: leftDescriptions["Mineral Water"] },
      { id: "local-alkaline", image: bannerLocal2, title: "Alkaline Water", price: "", desc: "pH-boosted water for hydration and balance.", leftDesc: leftDescriptions["Alkaline Water"] },
      { id: "local-purified", image: bannerLocal3, title: "Purified Water", price: "", desc: "Ultra-purified water — clean taste, every refill.", leftDesc: leftDescriptions["Purified Water"] },
    ];
  }, [productList, featureImageList]);

  // Get details — remote if real product otherwise local slide details
  function handleGetProductDetails(getCurrentProductId) {
    // open dialog right away so user sees loading or local details
    setOpenDetailsDialog(true);

    // try find real product
    const found = Array.isArray(productList) ? productList.find((p) => p._id === getCurrentProductId) : null;
    if (found) {
      setLocalProductDetails(null);
      dispatch(fetchProductDetails(getCurrentProductId));
      return;
    }

    const slide = slideData.find((s) => s.id === getCurrentProductId);
    if (slide) {
      const smallDetails = {
        _id: slide.id,
        name: slide.title,
        title: slide.title,
        image: slide.image,
        price: slide.price || null,
        description: slide.desc || "Premium water carefully processed for excellent taste and safety.",
        features: slide.title === "Mineral Water" ? ["Rich in natural minerals (calcium, magnesium)", "Balanced electrolytes for hydration", "Great for everyday consumption"] : slide.title === "Alkaline Water" ? ["Higher pH for acid-neutralizing support", "May aid hydration after exercise", "Light, smooth taste"] : ["Advanced filtration removes impurities", "Consistent, clean taste", "Ideal for families and regular use"],
      };
      setLocalProductDetails(smallDetails);
      return;
    }

    // fallback to backend if not found
    setLocalProductDetails(null);
    dispatch(fetchProductDetails(getCurrentProductId));
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Banner */}
      <div className="relative w-full h-[600px] overflow-hidden bg-slate-100">
        <div className="absolute inset-0 flex transition-transform duration-700 ease-in-out" style={{ width: `${slideData.length * 100}%`, transform: `translateX(-${currentSlide * (100 / slideData.length)}%)` }}>
          {slideData.map((slide) => (
            <div key={slide.id} className="w-full relative flex-shrink-0" style={{ width: `${100 / slideData.length}%` }}>
              {/* background image doesn't capture pointer events so buttons work */}
              <img src={slide.image} alt={slide.title} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              <div className="absolute inset-0 bg-white/30 backdrop-blur-sm pointer-events-none" />

              {/* interactive content */}
              <div className="relative z-30 h-full flex items-center pointer-events-auto">
                <div className="container mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-6 max-w-7xl">
                  <div className="w-full lg:w-2/3">
                    <div className="inline-block bg-white/80 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold shadow border border-white/50">Acqua Amore Water Delivery</div>
                    <h1 className="mt-4 text-5xl lg:text-6xl font-extrabold text-blue-900 leading-tight">{slide.title}</h1>
                    <p className="mt-4 text-lg text-slate-700 max-w-2xl">{slide.leftDesc}</p>
                   
                  </div>

                  <div className="w-full lg:w-1/3">
                    <div className="rounded-2xl bg-white/50 backdrop-blur-sm p-4 shadow-2xl border border-white/20 z-40 pointer-events-auto relative">
                      <img src={slide.image} alt={slide.title} className="w-full h-44 object-cover rounded-xl shadow-md pointer-events-none" />
                      <div className="mt-3">
                        <h3 className="text-lg font-semibold text-blue-800">{slide.title}</h3>
                        <p className="text-sm text-slate-700 mt-1">{slide.desc}</p>
                        {slide.price ? <div className="mt-2 text-blue-600 font-bold">{`₱${slide.price}`}</div> : <div className="mt-2 text-sm text-slate-700">From ₱XX — Order Now</div>}
                        
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

        {/* arrows */}
        <Button variant="outline" size="icon" onClick={() => setCurrentSlide((prev) => (slideData && slideData.length > 0 ? (prev - 1 + slideData.length) % slideData.length : 0)) } className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/70 border-blue-300 text-blue-700 shadow" aria-label="Previous slide"><ChevronLeftIcon className="w-5 h-5" /></Button>
        <Button variant="outline" size="icon" onClick={() => setCurrentSlide((prev) => (slideData && slideData.length > 0 ? (prev + 1) % slideData.length : 0)) } className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/70 border-blue-300 text-blue-700 shadow" aria-label="Next slide"><ChevronRightIcon className="w-5 h-5" /></Button>

        {/* dots */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
          {slideData.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)} className={`w-3 h-3 rounded-full ${i === currentSlide ? "bg-blue-600" : "bg-white/60"}`} aria-label={`Go to slide ${i + 1}`} />
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-blue-600">Featured Products</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productList && productList.length > 0
              ? productList.map((productItem) => (
                  <div key={productItem._id} className="flex flex-col items-center">
                    <ShoppingProductTile
                      handleGetProductDetails={handleGetProductDetails}
                      product={productItem}
                      handleAddtoCart={handleAddtoCart}
                    />
                  </div>
                ))
              : null}
          </div>
        </div>
      </section>

      <ProductDetailsDialog
        open={openDetailsDialog}
        setOpen={(open) => {
          setOpenDetailsDialog(open);
          if (!open) setLocalProductDetails(null);
        }}
        productDetails={productDetails || localProductDetails}
      />
    </div>
  );
}

export default ShoppingHome;

// frontend/src/pages/admin-view/AdminRatings.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * AdminRatings (Option A) — calls backend mounting under /api/orders
 * - GET /api/orders/admin/ratings/products
 * - GET /api/orders/admin/ratings/drivers
 */

export default function AdminRatings() {
  const base = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const [productDataRaw, setProductDataRaw] = useState([]);
  const [productSummary, setProductSummary] = useState(null);
  const [productFeedbackList, setProductFeedbackList] = useState([]);
  const [driverRatings, setDriverRatings] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    setError(null);
    await Promise.all([fetchProductRatings(), fetchDriverRatings()]);
  }

  async function fetchProductRatings() {
    setLoadingProducts(true);
    try {
      // NOTE: use the orderRoutes-mounted path
      const resp = await axios.get(`${base}/api/orders/admin/ratings/products`);
      const data = resp?.data?.data ?? [];
      setProductDataRaw(Array.isArray(data) ? data : []);

      // backend might return either:
      //  - aggregated summary: [{ avgRating, ratingCount, sampleFeedbacks }]
      //  - or per-order list: [{ orderId, productRating, productFeedback }, ...]
      if (Array.isArray(data) && data.length > 0 && (data[0].avgRating !== undefined || data[0].ratingCount !== undefined)) {
        const summary = data[0];
        setProductSummary({
          avgRating: Number(summary.avgRating ?? 0),
          ratingCount: Number(summary.ratingCount ?? 0),
          sampleFeedbacks: Array.isArray(summary.sampleFeedbacks) ? summary.sampleFeedbacks : [],
        });
        setProductFeedbackList([]);
      } else if (Array.isArray(data) && data.length > 0 && (data[0].productRating !== undefined || data[0].orderId !== undefined)) {
        const items = data
          .map((it) => ({
            orderId: it.orderId ?? it._id ?? null,
            rating: Number(it.productRating ?? 0),
            feedback: it.productFeedback ?? "",
          }))
          .filter((it) => (it.rating || it.feedback));
        const ratingNums = items.map((i) => i.rating).filter((n) => typeof n === "number" && !Number.isNaN(n));
        const avg = ratingNums.length > 0 ? ratingNums.reduce((a, b) => a + b, 0) / ratingNums.length : 0;
        setProductSummary({
          avgRating: Number(avg.toFixed(2)),
          ratingCount: ratingNums.length,
          sampleFeedbacks: items.map((i) => i.feedback).filter(Boolean).slice(0, 10),
        });
        setProductFeedbackList(items.slice(0, 50));
      } else {
        setProductSummary(null);
        setProductFeedbackList([]);
      }
    } catch (err) {
      console.error("Fetch product ratings error:", err);
      setError("Failed to load product ratings.");
      setProductDataRaw([]);
      setProductSummary(null);
      setProductFeedbackList([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchDriverRatings() {
    setLoadingDrivers(true);
    try {
      const resp = await axios.get(`${base}/api/orders/admin/ratings/drivers`);
      const data = resp?.data?.data ?? [];
      const normalized = Array.isArray(data)
        ? data.map((d) => ({
            driverId: d.driverId ?? null,
            // prefer driverName (server should return driver.fullName or firstname+lastname)
            driverName: d.driverName ?? (d.driver && (d.driver.fullName || `${d.driver.firstname ?? ""} ${d.driver.lastname ?? ""}`)) ?? "Unknown Driver",
            avgRating: Number(d.avgRating ?? 0),
            ratingCount: Number(d.ratingCount ?? 0),
            sampleDriverFeedbacks: Array.isArray(d.sampleDriverFeedbacks) ? d.sampleDriverFeedbacks : [],
          }))
        : [];
      setDriverRatings(normalized);
    } catch (err) {
      console.error("Fetch driver ratings error:", err);
      setError("Failed to load driver ratings.");
      setDriverRatings([]);
    } finally {
      setLoadingDrivers(false);
    }
  }

  function Stars({ value = 0 }) {
    const v = Math.round(Number(value || 0));
    return (
      <div className="flex items-center gap-1 text-yellow-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className="text-lg">
            {v >= s ? "★" : "☆"}
          </span>
        ))}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Ratings & Feedback</CardTitle>
      </CardHeader>

      <CardContent>
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid grid-cols-2 gap-2 mb-4">
            <TabsTrigger value="products">Product Ratings</TabsTrigger>
            <TabsTrigger value="drivers">Driver Ratings</TabsTrigger>
          </TabsList>

          {/* PRODUCTS TAB */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Ratings (General)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <p>Loading product ratings...</p>
                ) : !productSummary ? (
                  <p className="text-gray-500">No product ratings yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Average Rating</div>
                        <div className="flex items-center gap-3">
                          <Stars value={productSummary.avgRating ?? 0} />
                          <div className="text-xl font-semibold">{productSummary.avgRating ?? 0}/5</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Total Ratings</div>
                        <div className="text-lg font-medium">{productSummary.ratingCount ?? 0}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Recent Feedback</div>
                      {productSummary.sampleFeedbacks && productSummary.sampleFeedbacks.length > 0 ? (
                        <div className="space-y-2">
                          {productSummary.sampleFeedbacks.map((fb, idx) => (
                            <div key={idx} className="p-3 border rounded text-sm text-gray-700">
                              {fb || "(no text provided)"}
                            </div>
                          ))}
                        </div>
                      ) : productFeedbackList.length > 0 ? (
                        <div className="space-y-2">
                          {productFeedbackList.map((p, i) => (
                            <div key={`${p.orderId}-${i}`} className="p-3 border rounded text-sm text-gray-700">
                              {p.feedback || `(rating ${p.rating}/5)`}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No feedback text yet.</p>
                      )}
                    </div>

                   
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DRIVERS TAB */}
          <TabsContent value="drivers">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Driver Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDrivers ? (
                  <p>Loading driver ratings...</p>
                ) : driverRatings.length === 0 ? (
                  <p className="text-gray-500">No driver ratings yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Average Rating</TableHead>
                        <TableHead>Total Ratings</TableHead>
                        <TableHead>Sample Feedbacks</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {driverRatings.map((d) => (
                        <TableRow key={String(d.driverId ?? d.driverName ?? Math.random())}>
                          <TableCell>{d.driverName ?? "Unknown Driver"}</TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stars value={d.avgRating ?? 0} />
                              <span>{d.avgRating ?? 0}/5</span>
                            </div>
                          </TableCell>

                          <TableCell>{d.ratingCount ?? 0}</TableCell>

                          <TableCell className="text-sm">
                            {d.sampleDriverFeedbacks && d.sampleDriverFeedbacks.length > 0 ? (
                              <div className="space-y-1">
                                {d.sampleDriverFeedbacks.map((f, i) => (
                                  <div key={i} className="text-gray-700">• {f || "(no text)"}</div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-500">No feedback yet</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

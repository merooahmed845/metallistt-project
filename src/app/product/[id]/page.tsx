import { createClient } from "@/utils/supabase/server";
import ProductImageCarousel from "./ProductImageCarousel";
import AddToCartButton from "./AddToCartButton";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  if (error || !product) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      >
        <h1 className="mb-2 text-2xl font-bold">عذراً، المنتج غير موجود!</h1>

        <p className="mb-6 text-gray-500">
          قد يكون تم حذف هذا المنتج أو أن الرابط غير صحيح.
        </p>

        <Link
          href="/"
          className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white"
        >
          العودة للرئيسية
        </Link>
      </main>
    );
  }

  const onSale =
    product.sale_price !== null && product.sale_price !== undefined;

  const reviewList: Review[] = reviews || [];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900"
    >
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm font-bold text-gray-600 hover:text-slate-900"
        >
          ← العودة لتصفح المنتجات
        </Link>

        <div className="grid grid-cols-1 items-center gap-10 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-2 md:p-10">
          <ProductImageCarousel images={product.images} title={product.title} />

          <div className="flex flex-col gap-6">
            <div>
              <h1 className="mb-3 text-3xl font-extrabold text-slate-900">
                {product.title}
              </h1>

              <span className="text-2xl font-black text-amber-600">
                {onSale ? product.sale_price : product.price} ج.م
              </span>

              {onSale && (
                <span className="mr-3 text-lg text-gray-400 line-through">
                  {product.price} ج.م
                </span>
              )}
            </div>

            <div className="border-y border-gray-100 py-4 text-sm leading-relaxed text-gray-600">
              <h2 className="mb-1 font-bold text-slate-900">وصف المنتج:</h2>

              <p>
                {product.description ||
                  "لا يوجد وصف تفصيلي متاح لهذا المنتج حالياً."}
              </p>
            </div>

            <AddToCartButton product={product} />

            <div className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-bold">🛡️ ضمان المتجر والتوصيل:</p>

              <p>• الدفع كاش عند الاستلام لباقي ثمن المنتج.</p>

              <p>• رسوم الشحن تُدفع مقدماً لتأكيد الطلب.</p>
            </div>
          </div>
        </div>

        <section className="mt-12 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="mb-6 border-b border-gray-100 pb-4 text-xl font-black">
            تقييمات المشترين ({reviewList.length})
          </h2>

          {reviewList.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              لا توجد تقييمات لهذا المنتج حتى الآن.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {reviewList.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-bold">
                      {review.user_name}
                    </span>

                    <span className="text-amber-400">
                      {"★".repeat(Math.max(0, review.rating))}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="mt-2 text-xs text-slate-600">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

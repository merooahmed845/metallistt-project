import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { getAbsoluteSiteUrl, getConfiguredSiteUrl } from "@/lib/seo";
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

const getProduct = cache(async (id: string) => {
  const supabase = await createClient();
  return supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data: product, error } = await getProduct(id);
  if (error || !product) {
    return {
      title: "المنتج غير موجود",
      robots: { index: false, follow: false },
    };
  }
  const description = product.description?.trim() || `تفاصيل منتج ${product.title} من Metallia.`;
  const images = Array.isArray(product.images)
    ? product.images.filter((image: unknown): image is string => typeof image === "string" && image.length > 0)
    : [];
  const configuredSiteUrl = getConfiguredSiteUrl();
  const canonical = configuredSiteUrl ? getAbsoluteSiteUrl(`/product/${id}`) : undefined;
  return {
    title: product.title,
    description,
    robots: { index: true, follow: true },
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "website",
      title: product.title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: product.title,
      description,
      ...(images.length > 0 ? { images } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  const { data: product, error } = await getProduct(id);
  const supabase = await createClient();

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
  const productImages = Array.isArray(product.images)
    ? product.images.filter((image: unknown): image is string => typeof image === "string" && image.length > 0)
    : [];
  const currentPrice = onSale ? product.sale_price : product.price;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(product.description?.trim() ? { description: product.description.trim() } : {}),
    ...(productImages.length > 0 ? { image: productImages } : {}),
    ...(typeof currentPrice === "number" && Number.isFinite(currentPrice)
      ? {
          offers: {
            "@type": "Offer",
            price: currentPrice,
            priceCurrency: "EGP",
          },
        }
      : {}),
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
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

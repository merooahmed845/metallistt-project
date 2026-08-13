"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import AdminAuthCheck from "@/components/AdminAuthCheck";

interface Product {
  id: string;
  title: string;
  price: number;
  sale_price: number | null;
  description: string | null;
  images: string[] | null;
  stock_quantity: number;
  category_id: string | null;
  is_featured: boolean | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

type StockFilter = "all" | "available" | "low" | "out";

type FormData = {
  title: string;
  price: string;
  sale_price: string;
  description: string;
  stock_quantity: string;
  category_id: string;
};

const emptyForm: FormData = {
  title: "",
  price: "",
  sale_price: "",
  description: "",
  stock_quantity: "0",
  category_id: "",
};

function validateForm(form: FormData) {
  const price = Number(form.price);
  const salePrice = form.sale_price.trim() ? Number(form.sale_price) : null;
  const stock = Number(form.stock_quantity);

  if (!form.title.trim()) {
    throw new Error("اسم المنتج مطلوب.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("السعر الأساسي يجب أن يكون أكبر من صفر.");
  }

  if (
    salePrice !== null &&
    (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price)
  ) {
    throw new Error("سعر العرض يجب أن يكون أكبر من صفر وأقل من السعر الأساسي.");
  }

  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("كمية المخزون يجب أن تكون رقماً صحيحاً لا يقل عن صفر.");
  }

  return {
    price,
    salePrice,
    stock,
  };
}

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "");
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const [formData, setFormData] = useState<FormData>(emptyForm);

  const [imageFile, setImageFile] = useState<File | null>(null);

  const [editing, setEditing] = useState<Product | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Pure data loader:
   * لا يقوم بتعديل React state.
   * هذا مهم حتى لا يظهر react-hooks/set-state-in-effect.
   */
  const loadProducts = async () => {
    const [
      { data: productData, error: productError },
      { data: categoryData, error: categoryError },
    ] = await Promise.all([
      supabase.from("products").select("*").order("id", { ascending: false }),

      supabase.from("categories").select("id,name,slug").order("name"),
    ]);

    if (productError) {
      throw new Error("تعذر تحميل المنتجات.");
    }

    if (categoryError) {
      throw new Error("تعذر تحميل التصنيفات.");
    }

    return {
      products: (productData ?? []) as Product[],
      categories: (categoryData ?? []) as Category[],
    };
  };

  /*
   * Used for manual refresh after:
   * - add
   * - edit
   * - refresh button
   */
  const fetchData = async () => {
    setLoading(true);

    try {
      const { products: loadedProducts, categories: loadedCategories } =
        await loadProducts();

      setProducts(loadedProducts);
      setCategories(loadedCategories);
    } catch (error) {
      console.error("خطأ في تحميل بيانات المنتجات:", error);

      alert(
        error instanceof Error ? error.message : "تعذر تحميل بيانات المنتجات.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Initial page load.
   *
   * The async initialization is nested inside the effect,
   * which avoids the react-hooks/set-state-in-effect warning.
   */
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const { products: loadedProducts, categories: loadedCategories } =
          await loadProducts();

        if (!cancelled) {
          setProducts(loadedProducts);
          setCategories(loadedCategories);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("خطأ في تحميل بيانات المنتجات:", error);

          alert(
            error instanceof Error
              ? error.message
              : "تعذر تحميل بيانات المنتجات.",
          );

          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const startEdit = (product: Product) => {
    setEditing(product);

    setFormData({
      title: product.title,
      price: String(product.price),
      sale_price: product.sale_price === null ? "" : String(product.sale_price),
      description: product.description ?? "",
      stock_quantity: String(product.stock_quantity),
      category_id: product.category_id ?? "",
    });

    setImageFile(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const resetForm = () => {
    setEditing(null);
    setFormData(emptyForm);
    setImageFile(null);
  };

  const uploadImage = async () => {
    if (!imageFile) {
      return null;
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile);

    if (error) {
      throw error;
    }

    return supabase.storage.from("product-images").getPublicUrl(fileName).data
      .publicUrl;
  };

  const submitProduct = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsSubmitting(true);

    try {
      const { price, salePrice, stock } = validateForm(formData);

      const uploaded = await uploadImage();

      const values = {
        title: formData.title.trim(),
        price,
        sale_price: salePrice,
        description: formData.description.trim() || null,
        stock_quantity: stock,
        category_id: formData.category_id || null,
        ...(uploaded ? { images: [uploaded] } : {}),
      };

      const result = editing
        ? await supabase.from("products").update(values).eq("id", editing.id)
        : await supabase.from("products").insert([
            {
              ...values,
              slug: `${slugify(formData.title)}-${Date.now()
                .toString()
                .slice(-5)}`,
              images: uploaded ? [uploaded] : [],
            },
          ]);

      if (result.error) {
        throw result.error;
      }

      alert(editing ? "تم تحديث المنتج بنجاح." : "تمت إضافة المنتج بنجاح.");

      resetForm();

      await fetchData();
    } catch (error: unknown) {
      alert(
        `خطأ: ${error instanceof Error ? error.message : "حدث خطأ غير معروف."}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert("فشل حذف المنتج.");
      return;
    }

    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const searchValue = search.trim().toLowerCase();

        const matchesSearch =
          !searchValue || product.title.toLowerCase().includes(searchValue);

        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "available" && product.stock_quantity > 5) ||
          (stockFilter === "low" &&
            product.stock_quantity > 0 &&
            product.stock_quantity <= 5) ||
          (stockFilter === "out" && product.stock_quantity === 0);

        return matchesSearch && matchesStock;
      }),
    [products, search, stockFilter],
  );

  const badge = (quantity: number) => (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        quantity === 0
          ? "bg-red-100 text-red-700"
          : quantity <= 5
            ? "bg-amber-100 text-amber-800"
            : "bg-green-100 text-green-700"
      }`}
    >
      {quantity === 0
        ? "نفد المخزون"
        : quantity <= 5
          ? `مخزون منخفض: ${quantity}`
          : `متوفر: ${quantity}`}
    </span>
  );

  return (
    <AdminAuthCheck>
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"
      >
        <div className="mx-auto max-w-7xl space-y-8">
          <header>
            <h1 className="text-3xl font-extrabold">إدارة المنتجات</h1>

            <p className="mt-2 text-sm text-slate-500">
              إضافة المنتجات وتعديلها ومتابعة الأسعار والمخزون والتصنيفات.
            </p>
          </header>

          <form
            onSubmit={submitProduct}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">
                  {editing ? "تعديل المنتج" : "إضافة منتج جديد"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editing
                    ? "حدّث بيانات المنتج ثم احفظ التغييرات."
                    : "أضف بيانات المنتج والصورة والمخزون."}
                </p>
              </div>

              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border px-4 py-2 text-sm font-bold"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-bold">
                اسم المنتج
                <input
                  name="title"
                  required
                  value={formData.title}
                  onChange={updateField}
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-bold">
                السعر الأساسي
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={updateField}
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-bold">
                سعر العرض
                <input
                  name="sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={updateField}
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-bold">
                كمية المخزون
                <input
                  name="stock_quantity"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={formData.stock_quantity}
                  onChange={updateField}
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-bold">
                التصنيف
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={updateField}
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                >
                  <option value="">بدون تصنيف</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-bold">
              الصورة
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] ?? null)
                }
                className="mt-1 w-full rounded-xl border bg-slate-50 px-4 py-2.5 font-normal"
              />
              {editing && !imageFile && (
                <span className="mt-2 block text-xs font-normal text-slate-500">
                  ستبقى الصورة الحالية إذا لم تختر صورة جديدة.
                </span>
              )}
            </label>

            <label className="block text-sm font-bold">
              وصف المنتج
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={updateField}
                className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {isSubmitting
                ? "جارٍ الحفظ..."
                : editing
                  ? "حفظ التعديلات"
                  : "إضافة المنتج"}
            </button>
          </form>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم المنتج..."
                className="flex-1 rounded-xl border bg-white px-4 py-3"
              />

              <select
                value={stockFilter}
                onChange={(event) =>
                  setStockFilter(event.target.value as StockFilter)
                }
                className="rounded-xl border bg-white px-4 py-3 font-bold"
              >
                <option value="all">كل المنتجات</option>

                <option value="available">متوفر</option>

                <option value="low">مخزون منخفض</option>

                <option value="out">نفد المخزون</option>
              </select>

              <button
                type="button"
                onClick={() => void fetchData()}
                className="rounded-xl border bg-white px-4 py-3 font-bold"
              >
                تحديث القائمة
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white p-12 text-center font-bold">
                جارٍ تحميل المنتجات...
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center text-slate-500">
                لا توجد منتجات مطابقة للبحث أو الفلتر.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((product) => (
                  <article
                    key={product.id}
                    className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {product.images?.[0]?.startsWith("http") ? (
                        <Image
                          src={product.images[0]}
                          alt={product.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
                          بدون صورة
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <h3 className="font-extrabold">{product.title}</h3>

                      <p className="text-sm text-slate-500">
                        {categories.find(
                          (category) => category.id === product.category_id,
                        )?.name ?? "بدون تصنيف"}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-600">
                          {product.sale_price ?? product.price} ج.م
                        </span>

                        {badge(product.stock_quantity)}
                      </div>

                      <div className="mt-auto flex gap-2 border-t pt-4">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          className="flex-1 rounded-xl bg-amber-50 py-2.5 text-xs font-extrabold text-amber-700"
                        >
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteProduct(product.id)}
                          className="flex-1 rounded-xl bg-red-50 py-2.5 text-xs font-extrabold text-red-600"
                        >
                          حذف المنتج
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminAuthCheck>
  );
}

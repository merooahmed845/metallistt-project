"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AdminAuthCheck from "@/components/AdminAuthCheck";
import { supabase } from "@/utils/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  productCount: number;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCategories = async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,image_url")
      .order("name");

    if (error) {
      throw error;
    }

    const rows = await Promise.all(
      (data ?? []).map(async (category) => {
        const { count, error: countError } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("category_id", category.id);

        if (countError) {
          throw countError;
        }

        return {
          ...category,
          productCount: count ?? 0,
        };
      }),
    );

    return rows as Category[];
  };

  const refreshCategories = async () => {
    setLoading(true);

    try {
      const rows = await loadCategories();
      setCategories(rows);
    } catch (error) {
      console.error("خطأ في تحميل التصنيفات:", error);
      alert("تعذر تحميل التصنيفات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const rows = await loadCategories();

        if (!cancelled) {
          setCategories(rows);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("خطأ في تحميل التصنيفات:", error);
          alert("تعذر تحميل التصنيفات.");
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const reset = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setImageUrl("");
    selectImageFile(null);
  };

  const startEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug);
    setImageUrl(category.image_url ?? "");
    selectImageFile(null);
  };

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, []);

  const selectImageFile = (file: File | null) => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
    }

    const nextPreviewUrl = file ? URL.createObjectURL(file) : null;
    imagePreviewUrlRef.current = nextPreviewUrl;
    setImageFile(file);
    setImagePreviewUrl(nextPreviewUrl);
  };

  const uploadImage = async () => {
    if (!imageFile) {
      return null;
    }

    if (!imageFile.type.startsWith("image/")) {
      throw new Error("يرجى اختيار ملف صورة صالح.");
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.");
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    // Filename generation runs only during the submit event, never during render.
    // eslint-disable-next-line react-hooks/purity
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanSlug = slug.trim();

    if (!cleanName) {
      alert("اسم التصنيف لا يمكن أن يكون فارغاً.");
      return;
    }

    if (!SLUG_PATTERN.test(cleanSlug)) {
      alert("الـSlug يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطة (-) فقط.");
      return;
    }

    setSaving(true);

    try {
      const { data: duplicateCategory, error: duplicateError } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", cleanSlug)
        .neq("id", editing?.id ?? "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateCategory) {
        alert("هذا الـSlug مستخدم بالفعل، اختر Slug آخر.");
        return;
      }

      const uploadedImageUrl = await uploadImage();
      const values = {
        name: cleanName,
        slug: cleanSlug,
        image_url: uploadedImageUrl || imageUrl.trim() || null,
      };

      const result = editing
        ? await supabase.from("categories").update(values).eq("id", editing.id)
        : await supabase.from("categories").insert(values);

      if (result.error) {
        alert(
          result.error.code === "23505"
            ? "هذا الـSlug مستخدم بالفعل، اختر Slug آخر."
            : "تعذر حفظ التصنيف.",
        );
        return;
      }

      alert(editing ? "تم تحديث التصنيف." : "تم إنشاء التصنيف.");

      reset();
      await refreshCategories();
    } catch (error) {
      console.error("خطأ في حفظ التصنيف:", error);
      alert("حدث خطأ أثناء حفظ التصنيف.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: Category) => {
    if (category.productCount > 0) {
      alert(
        "لا يمكن حذف هذا التصنيف لأنه مرتبط بمنتجات. قم بإعادة تعيين المنتجات إلى تصنيف آخر أولاً.",
      );
      return;
    }

    if (!confirm(`هل تريد حذف تصنيف ${category.name}؟`)) {
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      alert(
        error.code === "23503"
          ? "لا يمكن حذف هذا التصنيف لأنه مرتبط بمنتجات. قم بإعادة تعيين المنتجات إلى تصنيف آخر أولاً."
          : "تعذر حذف التصنيف.",
      );
      return;
    }

    await refreshCategories();
  };

  return (
    <AdminAuthCheck>
      <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <header>
            <h1 className="text-3xl font-extrabold">إدارة التصنيفات</h1>

            <p className="mt-2 text-sm text-slate-500">
              أنشئ التصنيفات واربط المنتجات بها من مكان واحد.
            </p>
          </header>

          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-extrabold">
              {editing ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-bold">
                اسم التصنيف
                <input
                  value={name}
                  onChange={(event) => {
                    const value = event.target.value;

                    setName(value);

                  }}
                  required
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-bold">
                الرابط المختصر
                <input
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="استخدم حروفاً إنجليزية صغيرة وأرقاماً وشرطة (-) فقط."
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-bold">
                رابط الصورة
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  type="url"
                  className="mt-1 w-full rounded-xl border px-4 py-2.5 font-normal"
                />
              </label>

              <label className="text-sm font-bold">
                رفع صورة من الجهاز
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    selectImageFile(event.target.files?.[0] ?? null)
                  }
                  className="mt-1 w-full rounded-xl border bg-slate-50 px-4 py-2.5 font-normal"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  الصور فقط، بحد أقصى 5 ميجابايت. الصورة المرفوعة تستبدل رابط الصورة عند الحفظ.
                </span>
              </label>
            </div>

            {(imagePreviewUrl || imageUrl) && (
              <div className="relative aspect-square w-40 overflow-hidden rounded-xl border bg-slate-100">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="معاينة صورة التصنيف"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image
                    src={imageUrl}
                    alt="معاينة صورة التصنيف"
                    fill
                    sizes="160px"
                    className="object-contain"
                  />
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? "جارٍ الحفظ..."
                  : editing
                    ? "حفظ التعديلات"
                    : "إنشاء التصنيف"}
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border px-5 py-3 text-sm font-bold"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>

          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-xl font-extrabold">التصنيفات الحالية</h2>
            </div>

            {loading ? (
              <p className="p-8 text-center font-bold">جارٍ التحميل...</p>
            ) : categories.length === 0 ? (
              <p className="p-8 text-center text-slate-500">
                لا توجد تصنيفات بعد.
              </p>
            ) : (
              <div className="divide-y">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-extrabold">{category.name}</h3>

                      <p className="mt-1 text-sm text-slate-500">
                        /{category.slug} · {category.productCount} منتج
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700"
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => void remove(category)}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminAuthCheck>
  );
}

import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

interface ProductStockRow {
  stock_quantity: number
}

interface OrderRow {
  status: string | null
  total_price: number | string | null
}

const ORDER_STATUSES = [
  {
    key: 'pending',
    label: 'قيد المعالجة',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    key: 'shipped',
    label: 'تم الشحن',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    key: 'delivered',
    label: 'تم التسليم',
    className: 'bg-green-50 text-green-800 border-green-200',
  },
  {
    key: 'cancelled',
    label: 'ملغي',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  {
    key: 'returned',
    label: 'مرتجع',
    className: 'bg-purple-50 text-purple-800 border-purple-200',
  },
] as const

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 2,
  }).format(value)
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [productsResult, ordersResult] = await Promise.all([
    supabase
      .from('products')
      .select('stock_quantity'),

    supabase
      .from('orders')
      .select('status, total_price'),
  ])

  if (productsResult.error) {
    console.error(
      'خطأ في جلب بيانات المنتجات للوحة التحكم:',
      productsResult.error
    )
  }

  if (ordersResult.error) {
    console.error(
      'خطأ في جلب بيانات الطلبات للوحة التحكم:',
      ordersResult.error
    )
  }

  const products = (productsResult.data || []) as ProductStockRow[]
  const orders = (ordersResult.data || []) as OrderRow[]

  const totalProducts = products.length

  const availableProducts = products.filter(
    (product) => product.stock_quantity > 5
  ).length

  const lowStockProducts = products.filter(
    (product) =>
      product.stock_quantity > 0 &&
      product.stock_quantity <= 5
  ).length

  const outOfStockProducts = products.filter(
    (product) => product.stock_quantity === 0
  ).length

  const totalOrders = orders.length

  const deliveredSales = orders
    .filter((order) => order.status === 'delivered')
    .reduce(
      (total, order) => total + Number(order.total_price || 0),
      0
    )

  const statusCounts = ORDER_STATUSES.map((status) => ({
    ...status,
    count: orders.filter(
      (order) => (order.status || 'pending') === status.key
    ).length,
  }))

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            لوحة التحكم
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            نظرة عامة على أداء المتجر والمنتجات والطلبات.
          </p>
        </header>

        {/* Main Metrics */}
        <section
          aria-label="إحصائيات المتجر"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              إجمالي المنتجات
            </p>

            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {totalProducts}
            </p>

            <p className="mt-2 text-xs font-medium text-slate-400">
              جميع المنتجات المسجلة
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              إجمالي الطلبات
            </p>

            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {totalOrders}
            </p>

            <p className="mt-2 text-xs font-medium text-slate-400">
              جميع الطلبات المسجلة
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-amber-700">
              المبيعات المحققة
            </p>

            <p className="mt-3 text-2xl font-extrabold text-amber-900">
              {formatCurrency(deliveredSales)} ج.م
            </p>

            <p className="mt-2 text-xs font-medium text-amber-700">
              الطلبات التي تم تسليمها فقط
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-red-700">
              تنبيهات المخزون
            </p>

            <p className="mt-3 text-3xl font-extrabold text-red-900">
              {lowStockProducts + outOfStockProducts}
            </p>

            <p className="mt-2 text-xs font-medium text-red-700">
              منخفض أو نافد
            </p>
          </div>
        </section>

        {/* Stock Overview */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                حالة المخزون
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                توزيع المنتجات حسب الكمية الحالية في المخزون.
              </p>
            </div>

            <Link
              href="/admin/products"
              className="text-sm font-extrabold text-amber-600 transition hover:text-amber-700"
            >
              إدارة المنتجات ←
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-700">
                متوفر
              </p>

              <p className="mt-2 text-2xl font-extrabold text-green-900">
                {availableProducts}
              </p>

              <p className="mt-1 text-xs font-medium text-green-700">
                أكثر من 5 وحدات
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-700">
                مخزون منخفض
              </p>

              <p className="mt-2 text-2xl font-extrabold text-amber-900">
                {lowStockProducts}
              </p>

              <p className="mt-1 text-xs font-medium text-amber-700">
                من 1 إلى 5 وحدات
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">
                نفد المخزون
              </p>

              <p className="mt-2 text-2xl font-extrabold text-red-900">
                {outOfStockProducts}
              </p>

              <p className="mt-1 text-xs font-medium text-red-700">
                صفر وحدات
              </p>
            </div>
          </div>
        </section>

        {/* Orders Status */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                حالة الطلبات
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                توزيع الطلبات الحالية حسب حالتها.
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="text-sm font-extrabold text-amber-600 transition hover:text-amber-700"
            >
              إدارة الطلبات ←
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {statusCounts.map((status) => (
              <div
                key={status.key}
                className={`rounded-xl border p-4 ${status.className}`}
              >
                <p className="text-sm font-bold">
                  {status.label}
                </p>

                <p className="mt-2 text-2xl font-extrabold">
                  {status.count}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold">
              إجراءات سريعة
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              الوصول السريع إلى أهم أجزاء لوحة الإدارة.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/products"
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-extrabold text-slate-900 transition hover:bg-slate-100"
            >
              إدارة المنتجات
            </Link>

            <Link
              href="/admin/orders"
              className="rounded-xl border border-slate-600 px-5 py-3 text-center text-sm font-extrabold text-white transition hover:bg-slate-800"
            >
              إدارة الطلبات
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
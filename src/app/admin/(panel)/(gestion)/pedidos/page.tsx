"use client";

import React, { useState, useEffect } from "react";
import { getOrders, updateOrderStatus } from "@/actions/admin-orders";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Screen, PageHead, CARD, INPUT, Spinner, Empty } from "@/components/admin/kit";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/25" },
  PAID: { label: "Pagado", cls: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/25" },
  SHIPPED: { label: "Enviado", cls: "bg-purple-400/10 text-purple-300 border-purple-400/25" },
  DELIVERED: { label: "Entregado", cls: "bg-green-500/10 text-green-400 border-green-500/25" },
  FAILED: { label: "Fallido", cls: "bg-red-500/10 text-red-400 border-red-500/25" },
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const data = await getOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (e: React.FormEvent<HTMLFormElement>, orderId: string) => {
    e.preventDefault();
    setUpdating(orderId);
    const formData = new FormData(e.currentTarget);
    const result = await updateOrderStatus(orderId, formData);
    if (result.success) {
      await fetchOrders();
      setOpenId(null);
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  return (
    <Screen size="lg">
      <PageHead title="Pedidos" subtitle="Despacho y estado de las ventas de la tienda." />

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Empty>Aún no hay compras en la tienda.</Empty>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const s = STATUS[order.status] ?? { label: order.status, cls: "bg-white/5 text-gray-300 border-white/10" };
            const open = openId === order.id;
            return (
              <li key={order.id} className={CARD}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${s.cls}`}>
                        {s.label}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="mt-1.5 font-semibold text-white">{order.customer.name}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(order.createdAt), "d MMM yyyy · HH:mm", { locale: es })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-brand-cyan text-lg font-black">
                      ${order.total.toLocaleString("es-CL")}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {order.shippingType === "DELIVERY" ? "Envío" : "Retiro"}
                    </div>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 text-sm">
                  {order.items.map((item: any) => (
                    <li key={item.id} className="flex justify-between text-gray-400">
                      <span>{item.quantity}× {item.product.name}</span>
                      <span className="text-gray-300">${(item.price * item.quantity).toLocaleString("es-CL")}</span>
                    </li>
                  ))}
                </ul>

                {order.shippingType === "DELIVERY" && (order.address || order.city) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {order.address}{order.city ? `, ${order.city}` : ""}
                    {order.trackingCode ? ` · Seguimiento: ${order.trackingCode}` : ""}
                  </p>
                )}

                <button
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="mt-3 text-xs font-semibold text-gray-300 bg-white/5 px-3 py-1.5 rounded-full"
                >
                  {open ? "Cerrar" : "Cambiar estado"}
                </button>

                {open && (
                  <form onSubmit={(e) => handleStatusUpdate(e, order.id)} className="mt-3 space-y-3">
                    <select name="status" defaultValue={order.status} className={INPUT}>
                      <option value="PENDING">Pendiente de pago</option>
                      <option value="PAID">Pagado / preparando</option>
                      <option value="SHIPPED">Enviado</option>
                      <option value="DELIVERED">Entregado</option>
                      <option value="FAILED">Pago fallido</option>
                    </select>
                    {order.shippingType === "DELIVERY" && (
                      <input
                        type="text"
                        name="trackingCode"
                        defaultValue={order.trackingCode || ""}
                        placeholder="Nº de seguimiento (opcional)"
                        className={INPUT}
                      />
                    )}
                    <button
                      type="submit"
                      disabled={updating === order.id}
                      className="w-full h-11 rounded-xl bg-brand-cyan text-brand-pure text-sm font-bold disabled:opacity-50"
                    >
                      {updating === order.id ? "Guardando…" : "Guardar"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}

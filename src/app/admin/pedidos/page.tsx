"use client";

import React, { useState, useEffect } from "react";
import { getOrders, updateOrderStatus } from "@/actions/admin-orders";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PedidosPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [updating, setUpdating] = useState<string | null>(null);

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
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'PAID': return 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20';
      case 'SHIPPED': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'DELIVERED': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'FAILED': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="border-b border-white/10 pb-6">
        <h2 className="text-3xl font-bold text-white uppercase tracking-widest italic">Centro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-purple-400">Pedidos</span></h2>
        <p className="text-gray-400 text-sm mt-2">Gestiona el despacho y estado de las ventas e-commerce.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">Sin Órdenes</h3>
          <p className="text-gray-400 text-sm">Aún no hay compras en la plataforma.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-brand-surface/80 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col xl:flex-row gap-8">
              
              {/* ORDER INFO */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">ID: {order.id.slice(-8).toUpperCase()}</span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(order.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Cliente</h4>
                    <p className="text-sm text-white font-bold">{order.customer.name}</p>
                    <p className="text-xs text-gray-400">{order.customer.email}</p>
                    <p className="text-xs text-gray-400">{order.customer.phone || 'Sin teléfono'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Entrega</h4>
                    <p className="text-sm text-brand-cyan font-bold mb-1">{order.shippingType === 'DELIVERY' ? 'Envío a Domicilio' : 'Retiro en Local'}</p>
                    {order.shippingType === 'DELIVERY' && (
                      <>
                        <p className="text-xs text-white">{order.address}</p>
                        <p className="text-xs text-gray-400">{order.city}</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b border-white/10 pb-2">Productos ({order.items.length})</h4>
                  <ul className="space-y-2">
                    {order.items.map((item: any) => (
                      <li key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.quantity}x {item.product.name}</span>
                        <span className="text-white font-bold">${(item.price * item.quantity).toLocaleString('es-CL')}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                    <span className="text-brand-cyan uppercase tracking-widest text-xs font-bold">Total Pagado</span>
                    <span className="text-brand-cyan text-xl font-black">${order.total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>

              {/* ACTION PANEL */}
              <div className="w-full xl:w-72 bg-black/30 border border-white/5 rounded-xl p-6 flex flex-col justify-center">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Actualizar Estado</h4>
                
                <form onSubmit={(e) => handleStatusUpdate(e, order.id)} className="space-y-4">
                  <div>
                    <select name="status" defaultValue={order.status} className="w-full bg-black/80 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan">
                      <option value="PENDING">Pendiente de Pago</option>
                      <option value="PAID">Pagado / Preparando</option>
                      <option value="SHIPPED">Enviado (Despachado)</option>
                      <option value="DELIVERED">Entregado al Cliente</option>
                      <option value="FAILED">Pago Fallido</option>
                    </select>
                  </div>
                  
                  {order.shippingType === 'DELIVERY' && (
                    <div>
                      <input 
                        type="text" 
                        name="trackingCode" 
                        defaultValue={order.trackingCode || ""}
                        placeholder="Nº Seguimiento (Opcional)" 
                        className="w-full bg-black/80 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan"
                      />
                    </div>
                  )}

                  <button 
                    disabled={updating === order.id}
                    type="submit" 
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-widest text-[10px] py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updating === order.id ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </form>

                {order.status === 'SHIPPED' && order.trackingCode && (
                  <div className="mt-4 p-3 bg-brand-cyan/10 border border-brand-cyan/20 rounded-lg">
                    <p className="text-[10px] text-brand-cyan uppercase tracking-widest mb-1 font-bold">Tracking Code</p>
                    <p className="text-sm text-white font-mono">{order.trackingCode}</p>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { updateBookingStatus, updateWorkStatus } from "@/actions/admin-bookings";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Role = "ADMIN" | "WORKER";

type BookingWithService = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  workStatus: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  vehicleMake: string;
  vehicleModel: string;
  services: { name: string; duration: number }[];
};

const WORK_STEPS: { value: string; label: string; cls: string }[] = [
  { value: "PENDING", label: "Por hacer", cls: "bg-gray-500/15 text-gray-300 border-gray-500/30" },
  { value: "IN_PROGRESS", label: "En proceso", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  { value: "DONE", label: "Terminado", cls: "bg-green-500/15 text-green-300 border-green-500/40" },
];

function statusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
    case "CONFIRMED":
      return "text-green-400 bg-green-500/10 border-green-500/30";
    case "CANCELLED":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    default:
      return "text-brand-cyan bg-brand-blue/10 border-brand-blue/30";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "CONFIRMED":
      return "Confirmada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

export default function BookingsManager({
  initialBookings,
  role,
}: {
  initialBookings: BookingWithService[];
  role: Role;
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const isAdmin = role === "ADMIN";

  const handleStatusUpdate = async (
    e: React.FormEvent<HTMLFormElement>,
    bookingId: string
  ) => {
    e.preventDefault();
    setUpdating(bookingId);
    const formData = new FormData(e.currentTarget);
    const result = await updateBookingStatus(bookingId, formData);

    if (result.success) {
      setExpandedRow(null);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: String(formData.get("status")),
                paymentStatus: String(formData.get("paymentStatus")),
              }
            : b
        )
      );
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const handleWorkStatus = async (bookingId: string, workStatus: string) => {
    setUpdating(bookingId);
    const result = await updateWorkStatus(bookingId, workStatus);
    if (result.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, workStatus } : b))
      );
    } else {
      alert(result.error);
    }
    setUpdating(null);
  };

  const colSpan = isAdmin ? 7 : 6;

  return (
    <div className="bg-brand-surface/50 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-black/50 text-gray-400 uppercase tracking-widest text-[10px] md:text-xs border-b border-white/10">
            <tr>
              <th className="px-4 py-3 md:px-6 md:py-4 font-bold">Cliente</th>
              <th className="px-4 py-3 md:px-6 md:py-4 font-bold">Vehículo</th>
              <th className="px-4 py-3 md:px-6 md:py-4 font-bold">Servicio</th>
              <th className="px-4 py-3 md:px-6 md:py-4 font-bold">Fecha y Hora</th>
              {isAdmin && <th className="px-4 py-3 md:px-6 md:py-4 font-bold">Estado</th>}
              <th className="px-4 py-3 md:px-6 md:py-4 font-bold">Trabajo</th>
              {isAdmin && (
                <th className="px-4 py-3 md:px-6 md:py-4 font-bold text-center">Acción</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bookings.map((booking) => (
              <React.Fragment key={booking.id}>
                <tr className="hover:bg-white/5 transition-colors duration-200">
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="font-bold text-white text-xs md:text-sm">
                      {booking.customerName}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 mt-1">
                      <a href={`tel:${booking.customerPhone}`} className="hover:text-brand-cyan">
                        {booking.customerPhone}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="text-gray-300 text-xs md:text-sm">{booking.vehicleMake}</div>
                    <div className="text-[10px] md:text-xs text-brand-cyan uppercase tracking-wider mt-1">
                      {booking.vehicleModel}
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="text-gray-300 text-xs md:text-sm">
                      {booking.services.map((s) => s.name).join(" + ")}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 mt-1">
                      {booking.services.reduce((acc, s) => acc + s.duration, 0) / 60} hrs
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="text-white font-medium text-xs md:text-sm">
                      {format(new Date(booking.date), "dd MMM yyyy", { locale: es })}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-400 mt-1">
                      {booking.startTime} - {booking.endTime}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span
                        className={`px-2 md:px-3 py-1 text-[9px] md:text-[10px] uppercase tracking-widest font-bold rounded-full border ${statusColor(
                          booking.status
                        )}`}
                      >
                        {statusLabel(booking.status)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="flex gap-1">
                      {WORK_STEPS.map((step) => {
                        const active = booking.workStatus === step.value;
                        return (
                          <button
                            key={step.value}
                            type="button"
                            disabled={updating === booking.id}
                            onClick={() => handleWorkStatus(booking.id, step.value)}
                            className={`px-2.5 py-1 text-[9px] md:text-[10px] uppercase tracking-widest font-bold rounded border transition-colors disabled:opacity-40 ${
                              active
                                ? step.cls
                                : "bg-transparent text-gray-500 border-white/10 hover:border-white/30 hover:text-gray-300"
                            }`}
                          >
                            {step.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                      <button
                        onClick={() =>
                          setExpandedRow(expandedRow === booking.id ? null : booking.id)
                        }
                        className="text-[10px] uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white font-bold py-1 px-3 rounded transition-colors"
                      >
                        {expandedRow === booking.id ? "Cerrar" : "Editar"}
                      </button>
                    </td>
                  )}
                </tr>
                {isAdmin && expandedRow === booking.id && (
                  <tr className="bg-black/30 border-l-2 border-brand-cyan">
                    <td colSpan={colSpan} className="px-6 py-4">
                      <form
                        onSubmit={(e) => handleStatusUpdate(e, booking.id)}
                        className="flex flex-col md:flex-row items-center gap-4"
                      >
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                              Estado de la Reserva
                            </label>
                            <select
                              name="status"
                              defaultValue={booking.status}
                              className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan"
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="CONFIRMED">Confirmada</option>
                              <option value="CANCELLED">Cancelada</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                              Estado del Pago
                            </label>
                            <select
                              name="paymentStatus"
                              defaultValue={booking.paymentStatus}
                              className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan"
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="PAID_RESERVATION">Reserva Pagada (Abono)</option>
                              <option value="PAID_FULL">Pago Completo</option>
                              <option value="REFUNDED">Reembolsado (Cancelación)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                              Fecha
                            </label>
                            <input
                              type="date"
                              name="newDate"
                              defaultValue={format(new Date(booking.date), "yyyy-MM-dd")}
                              className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                              Hora
                            </label>
                            <input
                              type="time"
                              name="newTime"
                              defaultValue={booking.startTime}
                              className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                        </div>
                        <div className="flex items-end mt-4 md:mt-0">
                          <button
                            disabled={updating === booking.id}
                            type="submit"
                            className="bg-brand-cyan hover:bg-brand-blue text-black font-bold uppercase tracking-widest text-xs py-2 px-6 rounded transition-colors disabled:opacity-50"
                          >
                            {updating === booking.id ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-6 py-12 text-center text-gray-500">
                  No hay reservas registradas en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

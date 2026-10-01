"use client";

// Campos de contacto con formato chileno forzado. Se usan en el ingreso de
// vehículos y en la ficha de cliente. El servidor revalida todo lo mismo
// (src/lib/contact.ts), esto solo evita errores de tipeo en el momento.

import React, { useState } from "react";
import { formatRut, isValidRut, titleCase } from "@/lib/contact";

type BaseProps = { name: string; className: string; required?: boolean };

/** Nombre: se capitaliza ("Nombre Apellido") al salir del campo. */
export function NameInput({ name, className, required, defaultValue = "", placeholder }: BaseProps & { defaultValue?: string; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue ? titleCase(defaultValue) : "");
  return (
    <input
      name={name}
      required={required}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => setValue(titleCase(value))}
      autoCapitalize="words"
      placeholder={placeholder}
      className={className}
    />
  );
}

/** Los 8 dígitos tras el "9" de un celular chileno, si los hay. */
function mobileDigits(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const nine = digits.length >= 9 ? digits.slice(-9) : "";
  return nine.startsWith("9") ? nine.slice(1) : "";
}

/**
 * Celular: "+56 9" fijo; solo se escriben los 8 dígitos restantes. Envía
 * "+56 9 XXXX XXXX" en un campo oculto con el `name` dado.
 */
export function PhoneInput({ name, className, required, defaultValue }: BaseProps & { defaultValue?: string | null }) {
  const [digits, setDigits] = useState(mobileDigits(defaultValue));
  const shown = digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
  const full = digits ? `+56 9 ${digits.slice(0, 4)} ${digits.slice(4)}` : "";
  return (
    <div className={`${className} flex items-center gap-2 focus-within:border-brand-cyan`}>
      <span className="text-gray-400 font-semibold shrink-0 select-none">+56 9</span>
      <input
        value={shown}
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 8))}
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="1234 5678"
        required={required}
        pattern="\d{4} \d{4}"
        title="Ingresa los 8 dígitos del celular"
        className="w-full min-w-0 bg-transparent outline-none text-white placeholder-gray-600"
      />
      <input type="hidden" name={name} value={full} />
    </div>
  );
}

/** RUT: se formatea mientras se escribe ("12.345.678-9") y valida el dígito verificador. */
export function RutInput({ name, className, required, defaultValue }: BaseProps & { defaultValue?: string | null }) {
  const [value, setValue] = useState(formatRut(defaultValue));
  const [touched, setTouched] = useState(false);
  const invalid = value !== "" && !isValidRut(value);
  return (
    <div>
      <input
        name={name}
        value={value}
        onChange={(e) => {
          setValue(formatRut(e.target.value));
          // Bloquea el envío del formulario mientras el RUT no cuadre.
          e.target.setCustomValidity(e.target.value && !isValidRut(e.target.value) ? "RUT inválido" : "");
        }}
        onBlur={() => setTouched(true)}
        required={required}
        inputMode="text"
        autoCapitalize="characters"
        placeholder="12.345.678-9"
        className={`${className} ${touched && invalid ? "border-red-500/60" : ""}`}
      />
      {touched && invalid && <p className="text-[11px] text-red-400 mt-1">RUT inválido: revisa el dígito verificador.</p>}
    </div>
  );
}

const km = (n: number) => n.toLocaleString("es-CL");

/**
 * Kilometraje con separador de miles. Muestra el último registro del
 * vehículo y la diferencia; si el valor es menor al anterior lo marca (el
 * formulario pide confirmación antes de enviar).
 */
export function OdometerInput({
  name,
  className,
  last,
  onLowerChange,
}: BaseProps & {
  last?: { km: number; date: string } | null;
  onLowerChange?: (lower: boolean) => void;
}) {
  const [digits, setDigits] = useState("");
  const value = digits ? Number(digits) : null;
  const lower = !!last && value !== null && value < last.km;

  return (
    <div>
      <input
        value={value === null ? "" : km(value)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").slice(0, 7);
          setDigits(d);
          onLowerChange?.(!!last && d !== "" && Number(d) < last.km);
        }}
        inputMode="numeric"
        placeholder={last ? `Último: ${km(last.km)}` : "Opcional"}
        className={`${className} ${lower ? "border-amber-500/60" : ""}`}
      />
      <input type="hidden" name={name} value={digits} />
      {last && (
        <p className={`text-[11px] mt-1 ${lower ? "text-amber-400" : "text-gray-500"}`}>
          {value === null
            ? `Último registro: ${km(last.km)} km (${new Date(last.date).toLocaleDateString("es-CL", { timeZone: "America/Santiago" })})`
            : lower
              ? `Menor al último registro (${km(last.km)} km). ¿Error de tipeo o cambio de odómetro?`
              : `+${km(value - last.km)} km desde la última visita`}
        </p>
      )}
    </div>
  );
}

"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { setCustomerSessionCookie, getCustomerIdFromSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-session";
import { loginCustomerSchema, registerCustomerSchema, flattenZodError } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function loginCustomer(formData: FormData) {
  try {
    const ip = await getClientIp();
    const limit = checkRateLimit(`customer-login:${ip}`, 8, 5 * 60 * 1000);
    if (!limit.allowed) {
      return { success: false, error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s antes de volver a intentar.` };
    }

    const parsed = loginCustomerSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const { email, password } = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { email },
      include: { membership: true }
    });

    if (!customer) {
      return { success: false, error: "Credenciales incorrectas." };
    }

    const validPassword = await bcrypt.compare(password, customer.password);
    if (!validPassword) {
      return { success: false, error: "Credenciales incorrectas." };
    }

    await setCustomerSessionCookie(customer.id);

    return { success: true };
  } catch (error) {
    console.error("Error en loginCustomer:", error);
    return { success: false, error: "No pudimos iniciar tu sesión. Intenta de nuevo." };
  }
}

export async function registerCustomer(formData: FormData) {
  try {
    const ip = await getClientIp();
    const limit = checkRateLimit(`customer-register:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { success: false, error: `Demasiados registros desde tu conexión. Intenta en ${Math.ceil((limit.retryAfterSeconds ?? 0) / 60)} min.` };
    }

    const parsed = registerCustomerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "El correo electrónico ya está registrado." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        password: hashedPassword,
      }
    });

    // Auto login
    await setCustomerSessionCookie(customer.id);

    return { success: true };
  } catch (error) {
    console.error("Error en registerCustomer:", error);
    return { success: false, error: "No pudimos crear tu cuenta. Intenta de nuevo." };
  }
}

export async function logoutCustomer() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
  revalidatePath("/");
  return { success: true };
}

export async function getSessionCustomer() {
  const customerId = await getCustomerIdFromSession();
  if (!customerId) return null;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { membership: true }
    });

    if (customer) {
      // Hide password hash
      const { password, ...safeCustomer } = customer;
      return safeCustomer;
    }
    return null;
  } catch (error) {
    return null;
  }
}

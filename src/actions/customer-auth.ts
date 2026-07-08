"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// Importamos JWT simple (opcional, o podemos usar la misma cookie cruda como en admin por ahora,
// pero para clientes es mejor tener el ID en la cookie).
// Usaremos bcrypt para la contraseña, y el ID del customer en la cookie cruda por simplicidad extrema
// (En prod ideal usar JWT, pero NextAuth es gigante. Usaremos la sesión cruda o un JWT ligero después si es necesario).

export async function loginCustomer(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { success: false, error: "Credenciales incompletas." };
    }

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

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("lubrimax_customer_session", customer.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerCustomer(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
      return { success: false, error: "Faltan campos obligatorios." };
    }

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
    const cookieStore = await cookies();
    cookieStore.set("lubrimax_customer_session", customer.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logoutCustomer() {
  const cookieStore = await cookies();
  cookieStore.delete("lubrimax_customer_session");
  revalidatePath("/");
  return { success: true };
}

export async function getSessionCustomer() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("lubrimax_customer_session")?.value;
  if (!sessionId) return null;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: sessionId },
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

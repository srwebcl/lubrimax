"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSessionToken } from "@/lib/admin-session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1 semana

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const validUser = process.env.ADMIN_USER || "admin";
  const validPwd = process.env.ADMIN_PASSWORD || "lubrimax123";

  if (username === validUser && password === validPwd) {
    const token = await createAdminSessionToken(SESSION_MAX_AGE);
    const cookieStore = await cookies();
    cookieStore.set("lubrimax_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  } else {
    return { error: "Credenciales incorrectas. Acceso denegado." };
  }

  redirect("/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("lubrimax_admin_session");
  redirect("/admin/login");
}

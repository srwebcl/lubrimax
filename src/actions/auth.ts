"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const validUser = process.env.ADMIN_USER || "admin";
  const validPwd = process.env.ADMIN_PASSWORD || "lubrimax123";

  if (username === validUser && password === validPwd) {
    const cookieStore = await cookies();
    cookieStore.set("lubrimax_admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    
    // Check if the cookie was set successfully
    // redirect to /admin
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

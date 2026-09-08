"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  requireStaff,
  setStaffSessionCookie,
} from "@/lib/staff-session";
import {
  createStaffSchema,
  updateStaffSchema,
  resetStaffPasswordSchema,
  flattenZodError,
} from "@/lib/validation";

const BCRYPT_ROUNDS = 12;

function fail(error: string) {
  return { success: false as const, error };
}
function ok() {
  return { success: true as const };
}

/** Lista de cuentas del panel. Nunca devuelve el hash de contraseña. */
export async function getStaffUsers() {
  try {
    await requireRole("ADMIN");
    return await prisma.staffUser.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("getStaffUsers:", error);
    return [];
  }
}

export async function createStaffUser(formData: FormData) {
  try {
    await requireRole("ADMIN");

    const parsed = createStaffSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    });
    if (!parsed.success) return fail(flattenZodError(parsed.error));

    const email = parsed.data.email.toLowerCase().trim();
    const exists = await prisma.staffUser.findUnique({ where: { email } });
    if (exists) return fail("Ya existe una cuenta con ese correo.");

    await prisma.staffUser.create({
      data: {
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        password: await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS),
      },
    });

    revalidatePath("/admin/usuarios");
    return ok();
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("createStaffUser:", error);
    return fail("No se pudo crear la cuenta.");
  }
}

export async function updateStaffUser(id: string, formData: FormData) {
  try {
    const session = await requireRole("ADMIN");

    const parsed = updateStaffSchema.safeParse({
      name: formData.get("name"),
      role: formData.get("role"),
      isActive: formData.get("isActive") === "true",
    });
    if (!parsed.success) return fail(flattenZodError(parsed.error));

    const target = await prisma.staffUser.findUnique({ where: { id } });
    if (!target) return fail("Usuario no encontrado.");

    const losingAdmin =
      target.role === "ADMIN" && (parsed.data.role !== "ADMIN" || !parsed.data.isActive);
    if (losingAdmin) {
      if (target.id === session.userId) {
        return fail("No puedes quitarte a ti mismo el rol de administrador.");
      }
      const activeAdmins = await prisma.staffUser.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdmins <= 1) {
        return fail("Debe quedar al menos un administrador activo.");
      }
    }

    const roleOrStateChanged =
      target.role !== parsed.data.role || target.isActive !== parsed.data.isActive;

    await prisma.staffUser.update({
      where: { id },
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        // Cambiar rol o desactivar invalida las sesiones abiertas de ese
        // usuario de inmediato.
        ...(roleOrStateChanged ? { sessionEpoch: { increment: 1 } } : {}),
      },
    });

    revalidatePath("/admin/usuarios");
    return ok();
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("updateStaffUser:", error);
    return fail("No se pudo actualizar la cuenta.");
  }
}

export async function resetStaffPassword(id: string, formData: FormData) {
  try {
    await requireRole("ADMIN");

    const parsed = resetStaffPasswordSchema.safeParse({
      password: formData.get("password"),
    });
    if (!parsed.success) return fail(flattenZodError(parsed.error));

    const target = await prisma.staffUser.findUnique({ where: { id } });
    if (!target) return fail("Usuario no encontrado.");

    await prisma.staffUser.update({
      where: { id },
      data: {
        password: await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS),
        sessionEpoch: { increment: 1 },
      },
    });

    revalidatePath("/admin/usuarios");
    return ok();
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("resetStaffPassword:", error);
    return fail("No se pudo cambiar la contraseña.");
  }
}

/** "Forzar cierre de sesión": invalida todas las sesiones abiertas del usuario. */
export async function forceLogoutStaff(id: string) {
  try {
    await requireRole("ADMIN");
    await prisma.staffUser.update({
      where: { id },
      data: { sessionEpoch: { increment: 1 } },
    });
    revalidatePath("/admin/usuarios");
    return ok();
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("forceLogoutStaff:", error);
    return fail("No se pudo forzar el cierre de sesión.");
  }
}

export async function deleteStaffUser(id: string) {
  try {
    const session = await requireRole("ADMIN");
    if (id === session.userId) return fail("No puedes eliminar tu propia cuenta.");

    const target = await prisma.staffUser.findUnique({ where: { id } });
    if (!target) return fail("Usuario no encontrado.");

    if (target.role === "ADMIN") {
      const activeAdmins = await prisma.staffUser.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdmins <= 1) return fail("Debe quedar al menos un administrador activo.");
    }

    await prisma.staffUser.delete({ where: { id } });
    revalidatePath("/admin/usuarios");
    return ok();
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("deleteStaffUser:", error);
    return fail("No se pudo eliminar la cuenta.");
  }
}

/**
 * Cambio de contraseña de la propia cuenta (admin o trabajador). Exige la
 * contraseña actual. Al terminar re-emite la cookie con el nuevo epoch para
 * no cerrar la sesión de quien la cambió.
 */
export async function changeMyPassword(formData: FormData) {
  try {
    const session = await requireStaff();

    const currentPassword = String(formData.get("currentPassword") ?? "");
    const parsed = resetStaffPasswordSchema.safeParse({
      password: formData.get("newPassword"),
    });
    if (!parsed.success) return fail(flattenZodError(parsed.error));

    const user = await prisma.staffUser.findUnique({ where: { id: session.userId } });
    if (!user) return fail("Sesión inválida.");

    const currentOk = await bcrypt.compare(currentPassword, user.password);
    if (!currentOk) return fail("La contraseña actual no es correcta.");

    const updated = await prisma.staffUser.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS),
        sessionEpoch: { increment: 1 },
      },
      select: { id: true, role: true, sessionEpoch: true },
    });

    await setStaffSessionCookie(updated);
    return ok();
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("changeMyPassword:", error);
    return fail("No se pudo cambiar la contraseña.");
  }
}

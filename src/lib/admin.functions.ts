import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().min(2).max(100),
  phone: z.string().max(30).optional().nullable(),
  roles: z
    .array(
      z.enum([
        "super_admin",
        "admin",
        "finance_officer",
        "attendance_officer",
        "welfare_officer",
        "secretary",
        "branch_leader",
        "department_leader",
        "member",
      ]),
    )
    .min(1),
  departmentId: z.string().uuid().optional().nullable(),
  departmentIds: z.array(z.string().uuid()).optional(),
  branchId: z.string().uuid().optional().nullable(),
});


async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const [{ data: isSuper }, { data: isAdmin }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
  ]);
  if (!isSuper && !isAdmin) throw new Error("Forbidden");
  return { isSuper: !!isSuper };
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { isSuper } = await assertAdmin(context);
    if (data.roles.includes("super_admin") && !isSuper) {
      throw new Error("Only Super Admin can create another Super Admin");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { data: { full_name: data.fullName } },
    );
    if (error) throw new Error(error.message);
    const newUserId = invited.user!.id;

    // Ensure profile exists (trigger runs but be defensive)
    await supabaseAdmin.from("profiles").upsert(
      {
        id: newUserId,
        email: data.email,
        full_name: data.fullName,
        phone: data.phone ?? null,
        department_id: data.departmentId ?? null,
        branch_id: data.branchId ?? null,
        status: "pending_verification",
        created_by: context.userId,
      },
      { onConflict: "id" },
    );

    // Replace default role set with the chosen roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    await supabaseAdmin
      .from("user_roles")
      .insert(data.roles.map((role) => ({ user_id: newUserId, role })));

    if (data.departmentIds?.length) {
      await supabaseAdmin
        .from("user_departments")
        .insert(data.departmentIds.map((department_id) => ({ user_id: newUserId, department_id })));
    }

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "user.invite",
      module: "Users",
      target_type: "user",
      target_id: newUserId,
      metadata: { email: data.email, roles: data.roles },
    });


    return { userId: newUserId };
  });

const roleEnum = z.enum([
  "super_admin",
  "admin",
  "finance_officer",
  "attendance_officer",
  "welfare_officer",
  "secretary",
  "branch_leader",
  "department_leader",
  "member",
]);

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  roles: z.array(roleEnum).min(1).optional(),
  status: z
    .enum(["active", "inactive", "suspended", "locked", "pending_verification", "archived"])
    .optional(),
  phone: z.string().max(30).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  departmentIds: z.array(z.string().uuid()).optional(),
  branchId: z.string().uuid().nullable().optional(),
});

export const updateUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { isSuper } = await assertAdmin(context);
    if (data.roles?.includes("super_admin") && !isSuper) {
      throw new Error("Only Super Admin can grant the Super Admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (
      data.status ||
      data.phone !== undefined ||
      data.departmentId !== undefined ||
      data.branchId !== undefined
    ) {
      const patch: {
        status?: typeof data.status;
        phone?: string | null;
        department_id?: string | null;
        branch_id?: string | null;
      } = {};
      if (data.status) patch.status = data.status;
      if (data.phone !== undefined) patch.phone = data.phone;
      if (data.departmentId !== undefined) patch.department_id = data.departmentId;
      if (data.branchId !== undefined) patch.branch_id = data.branchId;
      await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    }

    if (data.roles) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
      await supabaseAdmin
        .from("user_roles")
        .insert(data.roles.map((role) => ({ user_id: data.userId, role })));
    }

    if (data.departmentIds) {
      await supabaseAdmin.from("user_departments").delete().eq("user_id", data.userId);
      if (data.departmentIds.length) {
        await supabaseAdmin
          .from("user_departments")
          .insert(
            data.departmentIds.map((department_id) => ({ user_id: data.userId, department_id })),
          );
      }
    }

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "user.update",
      module: "Users",
      target_type: "user",
      target_id: data.userId,
      metadata: data,
    });

    return { ok: true };
  });


const resetSchema = z.object({ userId: z.string().uuid() });
export const forceResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target?.email) throw new Error("User email not found");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: target.email,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "user.force_password_reset",
      module: "Users",
      target_type: "user",
      target_id: data.userId,
    });
    return { ok: true };
  });

const loginRecordSchema = z.object({
  success: z.boolean(),
  email: z.string().email().optional(),
  userAgent: z.string().optional(),
});
export const recordLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginRecordSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string | null = null;
    if (data.success && data.email) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();
      userId = p?.id ?? null;
    }
    await supabaseAdmin.from("login_history").insert({
      user_id: userId,
      email: data.email ?? null,
      success: data.success,
      user_agent: data.userAgent ?? null,
    });
    if (userId && data.success) {
      await supabaseAdmin
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", userId);
    }
    return { ok: true };
  });

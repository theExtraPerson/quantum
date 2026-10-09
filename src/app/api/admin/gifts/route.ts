import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/admin-auth";

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error || !admin) return jsonError(error ?? "Forbidden", error === "Unauthorized" ? 401 : 403);

  const { data, error: queryError } = await admin
    .from("gift_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (queryError) return jsonError(queryError.message, 500);
  return NextResponse.json({ codes: data ?? [] });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error || !admin) return jsonError(error ?? "Forbidden", error === "Unauthorized" ? 401 : 403);

  const body = (await request.json().catch(() => ({}))) as {
    amount?: unknown;
    code?: string;
    max_uses?: unknown;
    note?: string;
  };
  const amount = Number(body.amount);
  const maxUses = Number(body.max_uses ?? 1);
  if (!Number.isFinite(amount) || amount <= 0) return jsonError("Enter a gift amount");
  if (!Number.isFinite(maxUses) || maxUses < 1) return jsonError("Uses must be at least 1");

  const { data, error: rpcError } = await admin.rpc("admin_create_gift_code", {
    _amount: Math.round(amount),
    _code: body.code?.trim() || null,
    _max_uses: Math.round(maxUses),
    _note: body.note?.trim() || null,
  });
  if (rpcError) return jsonError(rpcError.message.replace(/^.*?:\s*/, ""), 400);
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error || !admin) return jsonError(error ?? "Forbidden", error === "Unauthorized" ? 401 : 403);

  const body = (await request.json().catch(() => ({}))) as { id?: string; active?: boolean };
  if (!body.id) return jsonError("Missing gift code");

  const { error: updateError } = await admin
    .from("gift_codes")
    .update({ active: Boolean(body.active) })
    .eq("id", body.id);
  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json({ ok: true });
}

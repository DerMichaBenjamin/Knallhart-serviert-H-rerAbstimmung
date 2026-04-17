import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const formData = await request.formData();

  const roundId = String(formData.get("round_id") ?? "").trim();
  const roundSlug = String(formData.get("round_slug") ?? "").trim();
  const adminUrl = "/admin/release-voting";

  if (!roundId) {
    return NextResponse.redirect(
      new URL(`${adminUrl}?error=${encodeURIComponent("Keine Runde übergeben.")}`, request.url),
    );
  }

  await supabase.from("release_voting_rounds").update({ is_current: false }).eq("is_current", true);

  const { error } = await supabase
    .from("release_voting_rounds")
    .update({
      is_current: true,
      status: "live",
      ended_at: null,
    })
    .eq("id", roundId);

  if (error) {
    return NextResponse.redirect(
      new URL(`${adminUrl}?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  revalidatePath("/admin/release-voting");
  revalidatePath("/release-voting");
  if (roundSlug) revalidatePath(`/release-voting/${roundSlug}`);

  return NextResponse.redirect(
    new URL(`${adminUrl}?success=${encodeURIComponent("Runde ist jetzt live.")}`, request.url),
  );
}

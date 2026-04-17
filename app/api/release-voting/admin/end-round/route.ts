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

  const { error } = await supabase
    .from("release_voting_rounds")
    .update({
      status: "ended",
      is_current: false,
      ended_at: new Date().toISOString().slice(0, 19).replace("T", " "),
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
    new URL(`${adminUrl}?success=${encodeURIComponent("Runde wurde beendet.")}`, request.url),
  );
}

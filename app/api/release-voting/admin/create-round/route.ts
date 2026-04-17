import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeSlug, parseSonglist } from "@/lib/releaseVoting";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const formData = await request.formData();

  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "live").trim();
  const startAt = String(formData.get("start_at") ?? "").trim();
  const endAt = String(formData.get("end_at") ?? "").trim();
  const placesCount = Number(formData.get("places_count") ?? 12);
  const songlistRaw = String(formData.get("songlist") ?? "");
  const adminUrl = "/admin/release-voting";

  if (!title) {
    return NextResponse.redirect(new URL(`${adminUrl}?error=${encodeURIComponent("Bitte einen Titel eingeben.")}`, request.url));
  }

  const slug = normalizeSlug(slugInput || title);
  const songs = parseSonglist(songlistRaw);

  if (!slug) {
    return NextResponse.redirect(new URL(`${adminUrl}?error=${encodeURIComponent("Bitte einen gültigen Slug eingeben.")}`, request.url));
  }

  if (!["draft", "live", "ended"].includes(status)) {
    return NextResponse.redirect(new URL(`${adminUrl}?error=${encodeURIComponent("Ungültiger Status.")}`, request.url));
  }

  if (!Number.isInteger(placesCount) || placesCount < 1 || placesCount > 50) {
    return NextResponse.redirect(new URL(`${adminUrl}?error=${encodeURIComponent("Die Platzanzahl muss zwischen 1 und 50 liegen.")}`, request.url));
  }

  if (songs.length === 0) {
    return NextResponse.redirect(new URL(`${adminUrl}?error=${encodeURIComponent("Bitte mindestens einen Song eintragen.")}`, request.url));
  }

  if (songs.length < placesCount) {
    return NextResponse.redirect(
      new URL(
        `${adminUrl}?error=${encodeURIComponent(`Es sind nur ${songs.length} Songs eingetragen, aber ${placesCount} Plätze ausgewählt.`)}`,
        request.url,
      ),
    );
  }

  const { data: slugExists } = await supabase
    .from("release_voting_rounds")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugExists) {
    return NextResponse.redirect(
      new URL(
        `${adminUrl}?error=${encodeURIComponent("Dieser Slug existiert schon. Bitte ein anderes URL-Kürzel verwenden.")}`,
        request.url,
      ),
    );
  }

  if (status === "live") {
    await supabase
      .from("release_voting_rounds")
      .update({ is_current: false })
      .eq("is_current", true);
  }

  const payload = {
    title,
    slug,
    description: description || null,
    status,
    start_at: startAt || null,
    end_at: endAt || null,
    places_count: placesCount,
    is_current: status === "live",
    songs_json: songs,
    ended_at: status === "ended" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
  };

  const { error } = await supabase.from("release_voting_rounds").insert(payload);

  if (error) {
    return NextResponse.redirect(
      new URL(`${adminUrl}?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  revalidatePath("/admin/release-voting");
  revalidatePath("/release-voting");
  revalidatePath(`/release-voting/${slug}`);

  return NextResponse.redirect(
    new URL(`${adminUrl}?success=${encodeURIComponent("Runde erfolgreich angelegt.")}`, request.url),
  );
}

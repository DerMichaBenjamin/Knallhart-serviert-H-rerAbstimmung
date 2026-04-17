import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildRankingFromSelections,
  normalizeEmail,
} from "@/lib/releaseVoting";

type SubmitBody = {
  roundId?: string;
  roundSlug?: string;
  voterName?: string;
  voterEmail?: string;
  voterInstagram?: string;
  selections?: string[];
};

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = (await request.json()) as SubmitBody;

  const roundId = String(body.roundId ?? "").trim();
  const roundSlug = String(body.roundSlug ?? "").trim();
  const voterName = String(body.voterName ?? "").trim();
  const voterEmail = String(body.voterEmail ?? "").trim();
  const voterInstagram = String(body.voterInstagram ?? "").trim();
  const selections = Array.isArray(body.selections)
    ? body.selections.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  if (!roundId) {
    return NextResponse.json({ error: "Keine Runde angegeben." }, { status: 400 });
  }

  if (!voterEmail) {
    return NextResponse.json({ error: "Bitte eine E-Mail angeben." }, { status: 400 });
  }

  const { data: round } = await supabase
    .from("release_voting_rounds")
    .select("*")
    .eq("id", roundId)
    .maybeSingle();

  if (!round) {
    return NextResponse.json({ error: "Runde wurde nicht gefunden." }, { status: 404 });
  }

  if (round.status !== "live") {
    return NextResponse.json({ error: "Diese Runde ist aktuell nicht live." }, { status: 400 });
  }

  const songs = Array.isArray(round.songs_json) ? round.songs_json : [];
  const placesCount = Number(round.places_count ?? 12);
  const uniqueSelections = new Set(selections);

  if (selections.length !== placesCount) {
    return NextResponse.json(
      { error: `Bitte wähle genau ${placesCount} Songs aus.` },
      { status: 400 },
    );
  }

  if (uniqueSelections.size !== selections.length) {
    return NextResponse.json(
      { error: "Jeder Song darf nur einmal gewählt werden." },
      { status: 400 },
    );
  }

  const invalidSong = selections.find((song) => !songs.includes(song));
  if (invalidSong) {
    return NextResponse.json(
      { error: `Ungültiger Song: ${invalidSong}` },
      { status: 400 },
    );
  }

  const voterEmailNorm = normalizeEmail(voterEmail);
  const ranking = buildRankingFromSelections(selections, placesCount);

  const { error } = await supabase.from("release_voting_votes").insert({
    round_id: roundId,
    voter_name: voterName || null,
    voter_email: voterEmail,
    voter_email_norm: voterEmailNorm,
    voter_instagram: voterInstagram || null,
    ranking_json: ranking,
  });

  if (error) {
    const lowered = error.message.toLowerCase();
    if (lowered.includes("duplicate") || lowered.includes("unique")) {
      return NextResponse.json(
        { error: "Für diese E-Mail wurde in dieser Runde bereits abgestimmt." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/admin/release-voting");
  revalidatePath("/release-voting");
  if (roundSlug) revalidatePath(`/release-voting/${roundSlug}`);

  return NextResponse.json({ ok: true });
}

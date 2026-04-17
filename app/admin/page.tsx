import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type RoundRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "live" | "ended";
  start_at: string;
  end_at: string;
  places_count: number;
  is_current: boolean;
  songs_json: string[] | null;
  created_at: string;
  ended_at: string | null;
};

type VoteItem = {
  song?: string;
  points?: number;
};

type VoteRow = {
  id: string;
  juror_name: string | null;
  juror_email: string | null;
  juror_instagram: string | null;
  created_at: string;
  ranking_json: VoteItem[] | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Fehlende ENV-Variablen: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function parseSonglist(raw: string) {
  const seen = new Set<string>();

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace("T", " ").slice(0, 16);
}

function statusLabel(status: RoundRow["status"]) {
  if (status === "live") return "Live";
  if (status === "ended") return "Beendet";
  return "Entwurf";
}

function statusClass(status: RoundRow["status"]) {
  if (status === "live") {
    return "bg-green-100 text-green-800 border-green-200";
  }
  if (status === "ended") {
    return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
  return "bg-amber-100 text-amber-800 border-amber-200";
}

function buildResults(songs: string[], votes: VoteRow[]) {
  const map = new Map<
    string,
    { song: string; totalPoints: number; voteCount: number; averagePoints: number }
  >();

  for (const song of songs) {
    map.set(song, {
      song,
      totalPoints: 0,
      voteCount: 0,
      averagePoints: 0,
    });
  }

  for (const vote of votes) {
    const ranking = Array.isArray(vote.ranking_json) ? vote.ranking_json : [];

    for (const item of ranking) {
      const song = typeof item?.song === "string" ? item.song.trim() : "";
      const points = Number(item?.points ?? 0);

      if (!song || !map.has(song) || !Number.isFinite(points)) continue;

      const entry = map.get(song)!;
      entry.totalPoints += points;
      entry.voteCount += 1;
    }
  }

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      averagePoints:
        entry.voteCount > 0 ? Number((entry.totalPoints / entry.voteCount).toFixed(2)) : 0,
    }))
    .sort((a, b) => {
      if (b.averagePoints !== a.averagePoints) return b.averagePoints - a.averagePoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.song.localeCompare(b.song, "de");
    })
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
}

export default async function ReleaseVotingAdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const ok = typeof params.ok === "string" ? params.ok : "";
  const errorMessage = typeof params.error === "string" ? params.error : "";

  async function createRoundAction(formData: FormData) {
    "use server";

    const supabase = getSupabaseAdmin();

    try {
      const title = String(formData.get("title") ?? "").trim();
      const slugInput = String(formData.get("slug") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const status = String(formData.get("status") ?? "live").trim() as
        | "draft"
        | "live"
        | "ended";
      const startAt = String(formData.get("start_at") ?? "").trim();
      const endAt = String(formData.get("end_at") ?? "").trim();
      const placesCount = Number(formData.get("places_count") ?? 12);
      const songlistRaw = String(formData.get("songlist") ?? "");

      const slug = normalizeSlug(slugInput || title);
      const songs = parseSonglist(songlistRaw);

      if (!title) {
        redirect("/admin/release-voting?error=Bitte%20einen%20Titel%20eingeben.");
      }

      if (!slug) {
        redirect("/admin/release-voting?error=Bitte%20einen%20gültigen%20Slug%20eingeben.");
      }

      if (!["draft", "live", "ended"].includes(status)) {
        redirect("/admin/release-voting?error=Ungültiger%20Status.");
      }

      if (!startAt || !endAt) {
        redirect("/admin/release-voting?error=Bitte%20Start%20und%20Ende%20ausfüllen.");
      }

      if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
        redirect("/admin/release-voting?error=Das%20Ende%20muss%20nach%20dem%20Start%20liegen.");
      }

      if (!Number.isInteger(placesCount) || placesCount < 1 || placesCount > 50) {
        redirect("/admin/release-voting?error=Die%20Platzanzahl%20muss%20zwischen%201%20und%2050%20liegen.");
      }

      if (songs.length === 0) {
        redirect("/admin/release-voting?error=Bitte%20mindestens%20einen%20Song%20eintragen.");
      }

      if (songs.length < placesCount) {
        redirect(
          `/admin/release-voting?error=${encodeURIComponent(
            `Es sind nur ${songs.length} Songs eingetragen, aber ${placesCount} Plätze ausgewählt.`,
          )}`,
        );
      }

      const { data: slugExists, error: slugCheckError } = await supabase
        .from("release_voting_rounds")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugCheckError) {
        redirect(
          `/admin/release-voting?error=${encodeURIComponent(slugCheckError.message)}`,
        );
      }

      if (slugExists) {
        redirect(
          `/admin/release-voting?error=${encodeURIComponent(
            "Dieser Slug existiert schon. Bitte ein anderes URL-Kürzel verwenden.",
          )}`,
        );
      }

      if (status === "live") {
        const { error: unsetCurrentError } = await supabase
          .from("release_voting_rounds")
          .update({ is_current: false })
          .eq("is_current", true);

        if (unsetCurrentError) {
          redirect(
            `/admin/release-voting?error=${encodeURIComponent(unsetCurrentError.message)}`,
          );
        }
      }

      const payload = {
        title,
        slug,
        description: description || null,
        status,
        start_at: startAt,
        end_at: endAt,
        places_count: placesCount,
        is_current: status === "live",
        songs_json: songs,
        ended_at: status === "ended" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      };

      const { error: insertError } = await supabase
        .from("release_voting_rounds")
        .insert(payload);

      if (insertError) {
        let message = insertError.message;

        if (message.toLowerCase().includes("duplicate")) {
          message = "Dieser Slug existiert schon. Bitte ein anderes URL-Kürzel verwenden.";
        }

        redirect(`/admin/release-voting?error=${encodeURIComponent(message)}`);
      }

      revalidatePath("/admin/release-voting");
      redirect("/admin/release-voting?ok=created");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unbekannter Fehler beim Anlegen der Runde.";
      redirect(`/admin/release-voting?error=${encodeURIComponent(message)}`);
    }
  }

  async function endRoundAction(formData: FormData) {
    "use server";

    const supabase = getSupabaseAdmin();
    const roundId = String(formData.get("round_id") ?? "").trim();

    if (!roundId) {
      redirect("/admin/release-voting?error=Keine%20Runde%20übergeben.");
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
      redirect(`/admin/release-voting?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/admin/release-voting");
    redirect("/admin/release-voting?ok=ended");
  }

  const supabase = getSupabaseAdmin();

  const { data: currentRoundRaw, error: currentRoundError } = await supabase
    .from("release_voting_rounds")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (currentRoundError) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          Fehler beim Laden der Runden: {currentRoundError.message}
          <div className="mt-3 text-sm text-red-700">
            Falls du das SQL-Script oben noch nicht ausgeführt hast, mach das zuerst.
          </div>
        </div>
      </main>
    );
  }

  let currentRound = currentRoundRaw as RoundRow | null;

  if (!currentRound) {
    const { data: latestLiveRound } = await supabase
      .from("release_voting_rounds")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    currentRound = (latestLiveRound as RoundRow | null) ?? null;
  }

  const { data: lastRoundsRaw } = await supabase
    .from("release_voting_rounds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const lastRounds = (lastRoundsRaw ?? []) as RoundRow[];

  let currentVotes: VoteRow[] = [];
  let recentVotes: VoteRow[] = [];

  if (currentRound) {
    const { data: votesRaw } = await supabase
      .from("release_voting_votes")
      .select("id, juror_name, juror_email, juror_instagram, created_at, ranking_json")
      .eq("round_id", currentRound.id)
      .order("created_at", { ascending: false });

    currentVotes = (votesRaw ?? []) as VoteRow[];
    recentVotes = currentVotes.slice(0, 10);
  }

  const currentSongs = Array.isArray(currentRound?.songs_json) ? currentRound!.songs_json : [];
  const results = currentRound ? buildResults(currentSongs, currentVotes) : [];

  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-zinc-500">Admin-Dashboard</div>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-zinc-900">
              Release-Voting verwalten
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-600">
              Hier legst du neue Runden an, setzt automatisch die aktuelle Runde,
              beendest Runden manuell und siehst die laufenden Ergebnisse.
            </p>
          </div>
        </div>

        {ok === "created" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            Neue Abstimmungsrunde wurde erfolgreich angelegt.
          </div>
        )}

        {ok === "ended" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            Die aktuelle Runde wurde beendet.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {decodeURIComponent(errorMessage)}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Aktuelle Runde</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">
              {currentRound?.title ?? "—"}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Status</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">
              {currentRound ? statusLabel(currentRound.status) : "—"}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Abgegebene Stimmen</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">
              {currentVotes.length}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Songs in aktueller Runde</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">
              {currentSongs.length}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-zinc-900">
              Neue Abstimmungsrunde anlegen
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Format für die Songliste: pro Zeile <strong>Songtitel – Interpret</strong>.
              Sobald du den Status auf <strong>Live</strong> setzt, wird diese Runde automatisch
              die aktuelle Runde.
            </p>

            <form action={createRoundAction} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Titel der Runde
                </label>
                <input
                  name="title"
                  required
                  defaultValue={`Neue Songs der Woche ${new Date().toLocaleDateString("de-DE")}`}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-[2fr,1fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Slug / URL-Kürzel
                  </label>
                  <input
                    name="slug"
                    required
                    placeholder="neue-songs-17-04-2026"
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Platzanzahl
                  </label>
                  <input
                    name="places_count"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={12}
                    required
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Beschreibung
                </label>
                <input
                  name="description"
                  defaultValue="Wähle deine Top 12 der Woche."
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Status</label>
                  <select
                    name="status"
                    defaultValue="live"
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                  >
                    <option value="live">Live</option>
                    <option value="draft">Entwurf</option>
                    <option value="ended">Beendet</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Start</label>
                  <input
                    name="start_at"
                    type="datetime-local"
                    required
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Ende</label>
                  <input
                    name="end_at"
                    type="datetime-local"
                    required
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Songliste</label>
                <textarea
                  name="songlist"
                  required
                  rows={14}
                  placeholder={`Songtitel – Interpret\nSongtitel – Interpret\nSongtitel – Interpret`}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0 transition focus:border-zinc-900"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800"
              >
                Neue Runde anlegen
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-zinc-900">Letzte Runden</h2>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Titel</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Start</th>
                  </tr>
                </thead>
                <tbody>
                  {lastRounds.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-zinc-500">
                        Noch keine Runden vorhanden.
                      </td>
                    </tr>
                  )}

                  {lastRounds.map((round) => (
                    <tr key={round.id} className="border-b border-zinc-100 align-top">
                      <td className="py-4 pr-4">
                        <div className="font-medium text-zinc-900">{round.title}</div>
                        <div className="text-xs text-zinc-500">{round.slug}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            round.status,
                          )}`}
                        >
                          {statusLabel(round.status)}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-zinc-700">{formatDateTime(round.start_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {currentRound && (
              <form action={endRoundAction} className="mt-6">
                <input type="hidden" name="round_id" value={currentRound.id} />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-300 px-5 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Aktuelle Runde beenden
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-zinc-900">
            Ergebnisse der aktuellen Runde
          </h2>

          {!currentRound && (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center text-zinc-500">
              Es gibt noch keine aktuelle Runde.
            </div>
          )}

          {currentRound && (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">#</th>
                    <th className="pb-3 pr-4 font-medium">Song</th>
                    <th className="pb-3 pr-4 font-medium">Ø Punkte</th>
                    <th className="pb-3 pr-4 font-medium">Gesamt</th>
                    <th className="pb-3 pr-4 font-medium">Wertungen</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-zinc-500">
                        Noch keine Ergebnisse vorhanden.
                      </td>
                    </tr>
                  )}

                  {results.map((row) => (
                    <tr key={row.song} className="border-b border-zinc-100 align-top">
                      <td className="py-4 pr-4 font-semibold text-zinc-900">{row.rank}</td>
                      <td className="py-4 pr-4 text-zinc-900">{row.song}</td>
                      <td className="py-4 pr-4 text-zinc-700">{row.averagePoints.toFixed(2)}</td>
                      <td className="py-4 pr-4 text-zinc-700">{row.totalPoints}</td>
                      <td className="py-4 pr-4 text-zinc-700">{row.voteCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-zinc-900">Letzte abgegebene Stimmen</h2>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">E-Mail</th>
                  <th className="pb-3 pr-4 font-medium">Instagram</th>
                  <th className="pb-3 pr-4 font-medium">Zeitpunkt</th>
                </tr>
              </thead>
              <tbody>
                {recentVotes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-zinc-500">
                      Noch keine Stimmen vorhanden.
                    </td>
                  </tr>
                )}

                {recentVotes.map((vote) => (
                  <tr key={vote.id} className="border-b border-zinc-100">
                    <td className="py-4 pr-4 text-zinc-900">{vote.juror_name || "—"}</td>
                    <td className="py-4 pr-4 text-zinc-700">{vote.juror_email || "—"}</td>
                    <td className="py-4 pr-4 text-zinc-700">{vote.juror_instagram || "—"}</td>
                    <td className="py-4 pr-4 text-zinc-700">{formatDateTime(vote.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

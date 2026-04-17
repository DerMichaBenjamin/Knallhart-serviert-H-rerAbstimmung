"use client";

import { useMemo, useState } from "react";

type Props = {
  roundId: string;
  roundSlug: string;
  placesCount: number;
  songs: string[];
};

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function PublicVotingForm({
  roundId,
  roundSlug,
  placesCount,
  songs,
}: Props) {
  const [voterName, setVoterName] = useState("");
  const [voterEmail, setVoterEmail] = useState("");
  const [voterInstagram, setVoterInstagram] = useState("");
  const [selections, setSelections] = useState<string[]>(Array.from({ length: placesCount }, () => ""));
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const pointsPerRank = useMemo(
    () => Array.from({ length: placesCount }, (_, index) => placesCount - index),
    [placesCount],
  );

  function updateSelection(index: number, value: string) {
    setSelections((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function availableSongsForIndex(index: number) {
    const chosenElsewhere = new Set(
      selections.filter((song, i) => i !== index && song.trim() !== ""),
    );

    return songs.filter((song) => !chosenElsewhere.has(song) || selections[index] === song);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/release-voting/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roundId,
          roundSlug,
          voterName,
          voterEmail,
          voterInstagram,
          selections,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Stimme konnte nicht gespeichert werden.");
      }

      setSubmitState("success");
      setMessage("Deine Stimme wurde erfolgreich gespeichert.");
      setSelections(Array.from({ length: placesCount }, () => ""));
      setVoterName("");
      setVoterEmail("");
      setVoterInstagram("");
    } catch (error) {
      setSubmitState("error");
      setMessage(error instanceof Error ? error.message : "Unbekannter Fehler.");
    }
  }

  const filledCount = selections.filter(Boolean).length;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Jetzt abstimmen
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-600">
            Wähle deine komplette Top {placesCount}. Platz 1 bekommt {placesCount} Punkte,
            der letzte Platz noch 1 Punkt. Pro E-Mail ist nur eine Stimme pro Runde erlaubt.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Ausgewählt: <span className="font-semibold">{filledCount}/{placesCount}</span>
        </div>
      </div>

      {message && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            submitState === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Name
            </label>
            <input
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder="Dein Name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              E-Mail *
            </label>
            <input
              value={voterEmail}
              onChange={(e) => setVoterEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Instagram
            </label>
            <input
              value={voterInstagram}
              onChange={(e) => setVoterInstagram(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-900"
              placeholder="@deinname"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {Array.from({ length: placesCount }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[140px,1fr]"
            >
              <div className="text-sm font-medium text-zinc-700">
                Platz {index + 1}
                <div className="mt-1 text-xs text-zinc-500">
                  {pointsPerRank[index]} Punkte
                </div>
              </div>

              <select
                required
                value={selections[index]}
                onChange={(e) => updateSelection(index, e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none transition focus:border-zinc-900"
              >
                <option value="">Song auswählen</option>
                {availableSongsForIndex(index).map((song) => (
                  <option key={song} value={song}>
                    {song}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitState === "submitting" ? "Stimme wird gespeichert..." : "Stimme absenden"}
        </button>
      </form>
    </div>
  );
}

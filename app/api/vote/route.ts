import { NextResponse } from 'next/server';
import { submitVote } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pollSlug = typeof body.pollSlug === 'string' ? body.pollSlug : '';
    const email = typeof body.email === 'string' ? body.email : '';
    const instagram = typeof body.instagram === 'string' ? body.instagram : '';
    const ranking = Array.isArray(body.ranking) ? body.ranking.map(String) : [];

    const result = await submitVote({ pollSlug, email, instagram, ranking });
    return NextResponse.json({ message: result.message }, { status: result.status });
  } catch {
    return NextResponse.json({ message: 'Ungültige Anfrage.' }, { status: 400 });
  }
}

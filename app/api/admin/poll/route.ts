import { NextResponse } from 'next/server';
import { createPoll } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: 'Nicht autorisiert.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title : '';
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const description = typeof body.description === 'string' ? body.description : '';
    const songsText = typeof body.songsText === 'string' ? body.songsText : '';
    const rankingSize = Number(body.rankingSize || 12);

    const poll = await createPoll({ title, slug, description, songsText, rankingSize });
    return NextResponse.json({ ok: true, poll });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Abstimmung konnte nicht angelegt werden.' },
      { status: 400 }
    );
  }
}

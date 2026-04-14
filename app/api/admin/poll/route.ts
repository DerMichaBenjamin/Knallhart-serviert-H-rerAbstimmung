import { NextResponse } from 'next/server';
import { createPoll, setCurrentPollStatus, updateCurrentPoll } from '@/lib/db';
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
    const status = typeof body.status === 'string' ? body.status : 'live';
    const startsAt = typeof body.startsAt === 'string' || body.startsAt === null ? body.startsAt : null;
    const endsAt = typeof body.endsAt === 'string' || body.endsAt === null ? body.endsAt : null;

    const poll = await createPoll({ title, slug, description, songsText, rankingSize, status, startsAt, endsAt });
    return NextResponse.json({ ok: true, poll });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Abstimmung konnte nicht angelegt werden.' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: 'Nicht autorisiert.' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === 'setStatus') {
      const status = typeof body.status === 'string' ? body.status : 'live';
      const poll = await setCurrentPollStatus(status);
      return NextResponse.json({ ok: true, poll });
    }

    const title = typeof body.title === 'string' ? body.title : '';
    const description = typeof body.description === 'string' ? body.description : '';
    const status = typeof body.status === 'string' ? body.status : 'live';
    const startsAt = typeof body.startsAt === 'string' || body.startsAt === null ? body.startsAt : null;
    const endsAt = typeof body.endsAt === 'string' || body.endsAt === null ? body.endsAt : null;

    const poll = await updateCurrentPoll({ title, description, status, startsAt, endsAt });
    return NextResponse.json({ ok: true, poll });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Aktuelle Runde konnte nicht aktualisiert werden.' },
      { status: 400 }
    );
  }
}

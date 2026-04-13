import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminOverview } from '@/lib/db';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: 'Nicht autorisiert.' }, { status: 401 });
  }

  try {
    const overview = await getAdminOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Dashboard-Daten konnten nicht geladen werden.' },
      { status: 500 }
    );
  }
}

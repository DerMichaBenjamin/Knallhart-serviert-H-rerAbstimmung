import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { exportActivePollCsv } from '@/lib/db';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: 'Nicht autorisiert.' }, { status: 401 });
  }

  try {
    const csv = await exportActivePollCsv();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="release-voting-results.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'CSV konnte nicht erstellt werden.' },
      { status: 500 }
    );
  }
}

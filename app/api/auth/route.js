import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "Hello@123";

    if (password === adminPassword) {
      return NextResponse.json({ authorized: true });
    }
    return NextResponse.json({ authorized: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

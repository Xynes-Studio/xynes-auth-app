
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const report = await req.json();
    // Log the violation (in a real app, send to logging service)
    console.warn('CSP Violation Report:', JSON.stringify(report, null, 2));
    
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ status: 'error' }, { status: 400 });
  }
}

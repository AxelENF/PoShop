import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // process.cwd() points to apps/web directory
    const authPath = path.join(process.cwd(), '../../.bridge_auth.json');
    
    if (!fs.existsSync(authPath)) {
      return NextResponse.json({
        token: null,
        status: 'offline',
        message: 'Bridge is offline or .bridge_auth.json was not generated yet'
      });
    }
    
    const fileContent = fs.readFileSync(authPath, 'utf-8');
    const authData = JSON.parse(fileContent);
    
    return NextResponse.json({ token: authData.token });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to read hardware token: ${err.message}` },
      { status: 500 }
    );
  }
}

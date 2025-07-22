import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    service: 'DinoAir Free Tier',
    timestamp: new Date().toISOString()
  })
}
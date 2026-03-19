import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { signToken, setSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const baseURL = url.origin;

  if (!code) {
    return NextResponse.redirect(`${baseURL}/login?error=OAuthCodeMissing`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseURL}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseURL}/login?error=OAuthServerError`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
       return NextResponse.redirect(`${baseURL}/login?error=OAuthTokenError`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const googleUser = await userRes.json();

    if (!googleUser.email) {
       return NextResponse.redirect(`${baseURL}/login?error=OAuthEmailMissing`);
    }

    await connectToDatabase();
    
    let user = await User.findOne({ email: googleUser.email.toLowerCase() });
    
    if (!user) {
      const randomPass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        password: hashedPassword,
      });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    };
    
    const token = await signToken(tokenPayload);
    await setSession(token);

    return NextResponse.redirect(`${baseURL}/`);
  } catch (error) {
    return NextResponse.redirect(`${baseURL}/login?error=OAuthServerError`);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ==========================================
// POST /api/admin/products/upload
// Accepts multipart/form-data with:
//   - file: the image
//   - productId: optional (used for filename)
//
// Uploads to Supabase Storage bucket 'product-images'
// and returns the public URL.
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const productId = (formData.get('productId') as string) || 'general';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // --- Validate file type ---
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, or WebP images are allowed' },
        { status: 400 }
      );
    }

    // --- Validate size (5MB max) ---
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must be under 5MB' },
        { status: 400 }
      );
    }

    // --- Build a unique filename ---
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${productId}-${timestamp}-${random}.${ext}`;

    // --- Upload to Supabase Storage ---
    const supabase = getServiceClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr);
      return NextResponse.json(
        { error: 'Could not upload image. Please try again.' },
        { status: 500 }
      );
    }

    // --- Get public URL ---
    const { data: publicData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filename);

    if (!publicData?.publicUrl) {
      return NextResponse.json(
        { error: 'Could not generate public URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image_url: publicData.publicUrl,
      filename,
    });
  } catch (err: any) {
    console.error('Upload endpoint error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

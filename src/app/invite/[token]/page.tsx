'use client';

import { useParams } from 'next/navigation';
import { InvitePreview } from '@/components/invite/InvitePreview';

export default function InvitePreviewPage() {
  const { token } = useParams<{ token: string }>();

  return <InvitePreview token={token} />;
}
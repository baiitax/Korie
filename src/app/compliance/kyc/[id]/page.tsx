'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { KycReviewWorkspace } from '@/components/compliance/workspaces/KycReviewWorkspace';

export default function KycReviewPage() {
  const params = useParams();
  return <KycReviewWorkspace id={String(params?.id ?? '')} />;
}

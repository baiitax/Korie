'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { KybReviewWorkspace } from '@/components/compliance/workspaces/KybReviewWorkspace';

export default function KybReviewPage() {
  const params = useParams();
  return <KybReviewWorkspace id={String(params?.id ?? '')} />;
}

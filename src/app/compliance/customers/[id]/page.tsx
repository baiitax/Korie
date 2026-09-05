'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { CustomerWorkspace } from '@/components/compliance/workspaces/CustomerWorkspace';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  return <CustomerWorkspace id={id} />;
}

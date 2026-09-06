import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const ALLOWED_CATEGORIES = ['TRANSACTION_DISPUTE', 'SETTLEMENT_ISSUE', 'TECHNICAL', 'COMPLIANCE', 'MERCHANT_ISSUE', 'OTHER'];
const ALLOWED_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL'];

/**
 * GET /api/v1/merchant/support/tickets — this merchant's own real support
 * tickets from the shared public.support_tickets table (customer_type =
 * 'MERCHANT'), same reuse pattern as the aggregator portal.
 *
 * POST /api/v1/merchant/support/tickets — opens a new ticket using the
 * shared next_support_ticket_number() sequence and SLA defaults.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('support_tickets')
    .select('id, ticket_number, subject, description, category, priority, status, channel, created_at, updated_at, resolved_at, first_response_due_at, resolution_due_at')
    .eq('customer_type', 'MERCHANT')
    .eq('customer_id', staff.merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'TICKETS_LOOKUP_FAILED', message: 'Could not load support tickets.', requestId: staff.requestId, httpStatus: 500 });
  }

  return createSuccessResponse({ tickets: data || [] }, { code: 'TICKETS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const category = ALLOWED_CATEGORIES.includes(body.category) ? body.category : 'OTHER';
  const priority = ALLOWED_PRIORITIES.includes(body.priority) ? body.priority : 'NORMAL';
  const subject = String(body.subject || '').trim();
  const description = String(body.description || '').trim();

  if (!subject || !description) {
    return createErrorResponse({ code: 'MISSING_FIELDS', message: 'Subject and description are required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: merchant } = await admin.from('merchant_profiles').select('business_name, email, phone, country').eq('id', staff.merchantId).single();

  const { data: ticketNumberData } = await admin.rpc('next_support_ticket_number');
  const now = new Date();
  const firstResponseDueMinutes = priority === 'CRITICAL' ? 30 : priority === 'URGENT' ? 60 : priority === 'HIGH' ? 240 : 1440;
  const resolutionDueHours = priority === 'CRITICAL' ? 4 : priority === 'URGENT' ? 12 : priority === 'HIGH' ? 24 : 72;

  const { data, error } = await admin
    .from('support_tickets')
    .insert({
      ticket_number: ticketNumberData || `TCK-${Date.now()}`,
      subject,
      description,
      category,
      priority,
      status: 'NEW',
      customer_type: 'MERCHANT',
      customer_id: staff.merchantId,
      customer_name: merchant?.business_name || staff.fullName,
      customer_email: merchant?.email || staff.email,
      customer_phone: merchant?.phone || null,
      jurisdiction: merchant?.country === 'NE' ? 'NE' : 'NG',
      channel: 'IN_APP',
      first_response_due_at: new Date(now.getTime() + firstResponseDueMinutes * 60000).toISOString(),
      resolution_due_at: new Date(now.getTime() + resolutionDueHours * 3600000).toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    return createErrorResponse({ code: 'TICKET_CREATE_FAILED', message: 'Could not open ticket.', requestId: staff.requestId, httpStatus: 500 });
  }

  await admin.from('support_ticket_messages').insert({
    ticket_id: data.id,
    sender_type: 'CUSTOMER',
    sender_id: staff.staffId,
    sender_name: staff.fullName,
    content: description,
  });

  return createSuccessResponse(
    { id: data.id, ticketNumber: data.ticket_number, status: data.status, createdAt: data.created_at },
    { code: 'TICKET_CREATED', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 },
  );
}

export type CmeRequestStatus = 'pending' | 'issued' | 'declined';

export interface CmeCertificateRequest {
  id: string;
  institution_id: string;
  user_id: string;
  program_label: string | null;
  status: CmeRequestStatus;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
}

/** A request joined to the requester's identity (admin views). */
export interface CmeCertificateRequestWithUser extends CmeCertificateRequest {
  user: { full_name: string | null; email: string | null } | null;
}

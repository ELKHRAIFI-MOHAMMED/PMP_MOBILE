export type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type TenderMarket = {
  id: number;
  reference?: string;
  objet?: string;
  title?: string;
  administration?: string;
  maitre_ouvrage?: string;
  ville?: string;
  region?: string;
  date_limite?: string | null;
  estimation?: string | null;
  detail_url?: string | null;
};

export type AnalysisStatus = {
  id?: number;
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | string;
  progress?: number;
  current_step?: string;
};

export type CompanyProfile = {
  id: number;
  legal_name: string;
  legal_form?: string;
  ice?: string | null;
  if_number?: string | null;
  rc_number?: string | null;
  rc_city?: string;
  verification_status?: string;
  is_verified?: boolean;
};

export type SubmissionRequirement = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  moment?: string;
  status?: string;
  source?: string | { document?: string; page?: number; section?: string };
  location?: string;
  quote?: string;
  document_ids?: string[];
  ready?: boolean;
  expired?: boolean;
};

export type PreparationDocument = {
  id: string;
  kind: string;
  kind_label?: string;
  original_name: string;
  status: string;
  reviewed_at?: string | null;
  current_version?: string | null;
};

export type ApplicationDossier = {
  id: number;
  title: string;
  reference?: string;
  marche: number;
  revision: number;
  is_demo?: boolean;
  is_test_session?: boolean;
  job_status?: string;
  job_progress?: number;
  job_message?: string;
  documents?: PreparationDocument[];
  submission_requirements?: SubmissionRequirement[];
  missing_required_documents?: unknown[];
  package_available?: boolean;
};

export type SavedEstimate = {
  id: number;
  title?: string;
  status?: string;
  market_reference?: string;
  updated_at?: string;
};

export type BackendNotification = {
  id: number;
  title?: string;
  message?: string;
  read_at?: string | null;
  created_at?: string;
};

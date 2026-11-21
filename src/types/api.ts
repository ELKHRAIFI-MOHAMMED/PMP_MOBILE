export type DRFPage<T> = { count: number; next: string | null; previous: string | null; results: T[] };

/** Shape returned by /marches/ (MarcheSerializer). Legacy aliases kept optional for older records. */
export type TenderMarket = {
  id: number;
  reference?: string;
  objet?: string;
  title?: string;
  categorie?: string;
  procedure?: string;
  procedure_complete?: string;
  acheteur_public?: string;
  lieu_execution?: string;
  date_publication?: string | null;
  date_limite?: string | null;
  detail_url?: string | null;
  source?: string;
  documents_zip?: string | null;
  lots?: { id: number; numero?: string | number; objet?: string; estimation?: string | number | null }[];
  raw_data?: {
    estimation?: number | string | null;
    caution_provisoire?: number | string | null;
    document_links?: { title?: string; url?: string }[];
    [k: string]: unknown;
  };
  created_at?: string;
  /** legacy */
  administration?: string;
  estimation?: string | null;
};

/** Record returned by POST /marches/search-portal/ (scraper via Django, signed provenance). */
export type PortalRecord = {
  reference: string;
  objet?: string;
  acheteur_public?: string;
  lieu_execution?: string;
  categorie?: string;
  procedure_complete?: string;
  date_limite?: string | null;
  estimation?: number | string | null;
  detail_url?: string;
  provenance: string;
};

export type AnalysisStatus = {
  analysis_id?: number;
  marche?: number;
  status?: string;
  progress?: number;
  current_step?: string;
  summary?: string;
  public_error?: string;
  documents_count?: number;
  finished_at?: string | null;
};

export type MarketAnalysis = AnalysisStatus & {
  id: number;
  analysis_result?: Record<string, unknown>;
  sources?: unknown[];
  dossier_documents?: { id: number; original_name: string; size?: number; processing_status?: string }[];
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
  label?: string;
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
  size?: number;
};

export type ApplicationDossier = {
  id: number;
  title: string;
  reference?: string;
  marche: number;
  revision: number;
  status?: string;
  is_demo?: boolean;
  is_test_session?: boolean;
  job_status?: string;
  job_progress?: number;
  job_message?: string;
  documents?: PreparationDocument[];
  submission_requirements?: SubmissionRequirement[];
  missing_required_documents?: unknown[];
  package_available?: boolean;
  market_summary?: { objet?: string; reference?: string; date_limite?: string | null; acheteur_public?: string };
  updated_at?: string;
};

export type SavedEstimate = {
  id: number;
  title?: string;
  name?: string;
  status?: string;
  market_reference?: string;
  total_ttc?: string | number;
  updated_at?: string;
};

export type BackendNotification = {
  id: number;
  title?: string;
  message?: string;
  notification_type?: string;
  is_read?: boolean;
  read_at?: string | null;
  created_at?: string;
};

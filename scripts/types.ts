/**
 * Types partagés par les scripts d'outillage sous back/scripts/.
 * Recopiés depuis docs/specs/la-plupart-des-features-du-projet-cardegall-sont-en-staging-.track.md
 * (section "Arch · 2026-06-21", point 2 — interfaces et types principaux).
 */

export type SpecStatus =
  | 'backlog'
  | 'spec'
  | 'arch'
  | 'dev'
  | 'qa'
  | 'staging'
  | 'done'
  | 'archived';

export interface DeploiementLogEntry {
  date: string; // ISO 8601
  environnement: 'staging' | 'prod';
  composants: Array<'back' | 'front'>;
  methode: 'manuel-az-cli' | 'ci-cd-github-actions';
  commitOuVersion?: string;
  urls?: { back?: string; front?: string };
  notes?: string;
}

export interface SpecFrontmatter {
  title: string;
  status: SpecStatus;
  complexity: 'low' | 'medium' | 'high' | 'small' | 'large';
  domains: string[];
  source: string;
}

export type AuditClassification =
  | 'candidate-sure-staging'
  | 'ambigue-verification-requise'
  | 'exclue';

export interface AuditRow {
  specFile: string;
  statusActuel: SpecFrontmatter['status'];
  derniereDateQA?: string;
  classification: AuditClassification;
  motifExclusion?: string;
  dernierDeploiementReference?: string;
}

export interface AuditReport {
  genereLe: string;
  dernierDeploiementStaging: string;
  lignes: AuditRow[];
}

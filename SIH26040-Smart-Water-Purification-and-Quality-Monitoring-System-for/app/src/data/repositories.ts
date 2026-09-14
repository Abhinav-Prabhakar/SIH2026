// Typed repository boundaries. The local seeded implementation backs the
// demo; a real deployment swaps these for edge-gateway/backend clients
// with zero UI changes.

import {
  LabReport,
  LiveReading,
  ParameterCode,
  PlantSnapshot,
  ScenarioId,
  WorkOrderStatus,
} from "@/domain/types";

export interface TelemetryRepository {
  latest(): Promise<LiveReading[]>;
  history(code: ParameterCode, spanTicks: number): Promise<LiveReading[]>;
}

export interface LabEvidenceRepository {
  list(): Promise<LabReport[]>;
  submit(report: Omit<LabReport, "id" | "reportedAt">): Promise<void>;
}

export interface WorkOrderRepository {
  setStatus(id: string, status: WorkOrderStatus): Promise<void>;
}

export interface IncidentRepository {
  acknowledge(id: string): Promise<void>;
}

export interface ScenarioRepository {
  current(): Promise<ScenarioId>;
  select(id: ScenarioId): Promise<void>;
  reset(): Promise<void>;
}

export interface MaintenanceRepository {
  setHold(hold: boolean): Promise<void>;
}

export interface PlantDataSource {
  snapshot(): Promise<PlantSnapshot>;
  telemetry: TelemetryRepository;
  labEvidence: LabEvidenceRepository;
  workOrders: WorkOrderRepository;
  incidents: IncidentRepository;
  scenarios: ScenarioRepository;
  maintenance: MaintenanceRepository;
}

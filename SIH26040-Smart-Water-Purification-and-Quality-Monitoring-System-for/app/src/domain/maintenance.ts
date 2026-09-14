// Asset health: transparent consumption model. Inputs are shown, not hidden.

import { AssetHealth } from "./types";

export interface AssetDef {
  assetId: string;
  kind: AssetHealth["kind"];
  name: string;
  ratedKL: number;
  backwashWear?: number;
}

export const ASSET_DEFS: AssetDef[] = [
  { assetId: "MEDIA_FE_MN", kind: "MEDIA", name: "FE/MN MEDIA", ratedKL: 6000, backwashWear: 0.004 },
  { assetId: "CARBON", kind: "CARBON", name: "CARBON BED", ratedKL: 4000, backwashWear: 0.002 },
  { assetId: "ADAPTIVE_MEDIA", kind: "MEMBRANE", name: "ADAPTIVE STAGE", ratedKL: 2500, backwashWear: 0.006 },
  { assetId: "UV_LAMP", kind: "LAMP", name: "UV LAMP", ratedKL: 0 },
  { assetId: "CL2_DOSE", kind: "DOSE", name: "HYPOCHLORITE STOCK", ratedKL: 0 },
];

export function computeAssetHealth(
  def: AssetDef,
  treatedKL: number,
  loadFactor: number,
  backwashes: number,
  extras: { lampHours?: number; lampRatedHours?: number; dosePct?: number }
): AssetHealth {
  let remaining: number;
  const basis: string[] = [];
  if (def.kind === "LAMP") {
    const used = (extras.lampHours ?? 0) / (extras.lampRatedHours ?? 9000);
    remaining = 1 - used;
    basis.push(`${(extras.lampHours ?? 0).toFixed(0)} H / ${extras.lampRatedHours ?? 9000} H RATED`);
  } else if (def.kind === "DOSE") {
    remaining = extras.dosePct ?? 1;
    basis.push(`${Math.round(remaining * 100)}% STOCK REMAINING`);
  } else {
    const volumeWear = (treatedKL / def.ratedKL) * loadFactor;
    const bwWear = (def.backwashWear ?? 0) * backwashes;
    remaining = 1 - volumeWear - bwWear;
    basis.push(`${treatedKL.toFixed(0)} KL / ${def.ratedKL} KL RATED`);
    basis.push(`${backwashes} BACKWASH CYCLES`);
    if (loadFactor !== 1) basis.push(`LOAD FACTOR ×${loadFactor.toFixed(2)}`);
  }
  return {
    assetId: def.assetId,
    kind: def.kind,
    name: def.name,
    remainingFraction: Math.max(0, Math.min(1, remaining)),
    basis,
  };
}

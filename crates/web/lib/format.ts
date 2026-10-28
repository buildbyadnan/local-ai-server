/**
 * Pure text formatting shared by the sidebar, the system dialog and the
 * model picker. Deliberately dependency-free: this module loads on either
 * side of the wire and every function here is unit-tested.
 */

/**
 * Bytes → human size, decimal units the way disk tools report them
 * (`4.9 GB`, `812 MB`, `12 KB`). Non-finite or negative input renders an
 * em dash rather than a lie.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  if (bytes >= 1e3) return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  return `${Math.round(bytes)} B`;
}

/**
 * Seconds → the largest two units a person reads at a glance
 * (`12m 23s`, `4h 7m`, `3d 2h`). Sub-minute values keep seconds.
 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * `1.2.3` vs `1.10.0`: numeric per segment, missing segments count as 0,
 * pre-release/build suffixes ignored (they're not comparable across the
 * two strings we compare — installed vs. latest release tag).
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".");
  const pb = b.replace(/^v/, "").split(".");
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i++) {
    const na = Number.parseInt(pa[i] ?? "0", 10);
    const nb = Number.parseInt(pb[i] ?? "0", 10);
    const va = Number.isFinite(na) ? na : 0;
    const vb = Number.isFinite(nb) ? nb : 0;
    if (va !== vb) return va < vb ? -1 : 1;
  }
  return 0;
}

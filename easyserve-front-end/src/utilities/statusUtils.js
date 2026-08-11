export const statuses = ["To Prepare", "Preparing", "Prepared", "Served"];

export function getNextStatus(current) {
  const idx = statuses.indexOf(current);
  return statuses[Math.min(idx + 1, statuses.length - 1)];
}

export function getPrevStatus(current) {
  const idx = statuses.indexOf(current);
  return statuses[Math.max(idx - 1, 0)];
}

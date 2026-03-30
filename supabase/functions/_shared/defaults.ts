export const defaultPipelineStages = [
  { name: "New", slug: "new", position: 0, color: "#2563eb", winProbability: 5, isDefault: true },
  { name: "Contacted", slug: "contacted", position: 1, color: "#0891b2", winProbability: 15, isDefault: false },
  { name: "Qualified", slug: "qualified", position: 2, color: "#ea580c", winProbability: 35, isDefault: false },
  { name: "Appointment", slug: "appointment", position: 3, color: "#7c3aed", winProbability: 60, isDefault: false },
  { name: "Won", slug: "won", position: 4, color: "#16a34a", winProbability: 100, isDefault: false },
  { name: "Lost", slug: "lost", position: 5, color: "#dc2626", winProbability: 0, isDefault: false },
] as const;

export const defaultSources = [
  { name: "Manual", type: "manual" },
  { name: "Website Form", type: "website" },
  { name: "Referral", type: "referral" },
  { name: "CSV Import", type: "import" },
] as const;

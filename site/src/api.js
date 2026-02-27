const BASE = import.meta.env.BASE_URL + "data";

export async function fetchSummary() {
  const res = await fetch(`${BASE}/summary.json`);
  if (!res.ok) throw new Error(`Failed to load summary: ${res.status}`);
  return res.json();
}

export async function fetchAthlete(id) {
  const res = await fetch(`${BASE}/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load athlete: ${res.status}`);
  return res.json();
}

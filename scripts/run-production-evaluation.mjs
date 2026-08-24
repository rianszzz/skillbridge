import { readFile, writeFile } from "node:fs/promises";

const baseUrl = process.env.TEST_BASE_URL ?? "https://skillbridge-6ndn.vercel.app";
const token = process.env.TEST_TOKEN;
if (!token) throw new Error("TEST_TOKEN wajib diisi");

const descriptions = JSON.parse(await readFile("fixtures/design/descriptions.json", "utf8"));
const cases = [
  ...Array.from({ length: 3 }, (_, index) => ({ id: "INF-SMOKE", run: index + 1, field: "informatics", sourceUrl: "https://github.com/octocat/Hello-World" })),
  { id: "DKV-01", run: 1, field: "design", file: "fixtures/design/weak.png", description: descriptions["DKV-01"] },
  ...Array.from({ length: 3 }, (_, index) => ({ id: "DKV-02", run: index + 1, field: "design", file: "fixtures/design/medium.png", description: descriptions["DKV-02"] })),
  { id: "DKV-03", run: 1, field: "design", file: "fixtures/design/strong.png", description: descriptions["DKV-03"] },
  { id: "MKT-01", run: 1, field: "marketing", file: "fixtures/marketing/weak.pdf" },
  ...Array.from({ length: 3 }, (_, index) => ({ id: "MKT-02", run: index + 1, field: "marketing", file: "fixtures/marketing/medium.pdf" })),
  { id: "MKT-03", run: 1, field: "marketing", file: "fixtures/marketing/strong.pdf" },
];

const results = [];
for (const testCase of cases) {
  const started = performance.now();
  let response;
  if (testCase.field === "informatics") {
    response = await fetch(`${baseUrl}/api/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: "Junior Web Developer", sourceUrl: testCase.sourceUrl, consent: true }),
    });
  } else {
    const bytes = await readFile(testCase.file);
    const form = new FormData();
    form.set("field", testCase.field);
    form.set("consent", "true");
    form.set("description", testCase.description ?? "");
    form.set("file", new File([bytes], testCase.file.split("/").at(-1), { type: testCase.field === "design" ? "image/png" : "application/pdf" }));
    response = await fetch(`${baseUrl}/api/assess`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  }
  const body = await response.json().catch(() => ({}));
  const record = {
    sample_id: testCase.id,
    field: testCase.field,
    run: testCase.run,
    http_status: response.status,
    latency_ms: Math.round(performance.now() - started),
    assessment_id: body.id ?? null,
    role: body.role ?? null,
    evidence_sufficiency: body.evidence_sufficiency ?? null,
    final_score: body.finalScore ?? null,
    criteria: Array.isArray(body.criteria) ? body.criteria.map((item) => ({ id: item.criterion_id, score: item.score, sufficiency: item.evidence_sufficiency, refs: item.evidence_refs?.length ?? 0 })) : [],
    error: response.ok ? null : body.error ?? "unknown",
  };
  results.push(record);
  console.log(`${record.sample_id} run ${record.run}: HTTP ${record.http_status}, ${record.latency_ms} ms, score=${record.final_score}`);
}

await writeFile("docs/validation/PRODUCTION_MODEL_RUNS.json", JSON.stringify({ generated_at: new Date().toISOString(), base_url: baseUrl, results }, null, 2));


import { useState } from "react";

const API_BASE = "http://localhost:8080/api/v1";

type PatientReportProps = {
  patientId: string;
};

export default function PatientReport({
  patientId,
}: PatientReportProps) {
  const [report, setReport] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateReport() {
    if (!patientId.trim()) {
      setError("Please select a patient first.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch(
        `${API_BASE}/ai/patient-report/${encodeURIComponent(patientId)}`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) {
        throw new Error(`Request failed: HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      setReport(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate the patient report."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="patient-report">
      <h2>AI-Assisted Patient Report</h2>
      <p>Generate a summary from the patient's saved records.</p>

      <button onClick={generateReport} disabled={loading}>
        {loading ? "Generating..." : "Generate Patient Report"}
      </button>

      {error && <p role="alert">{error}</p>}

      {report !== null && (
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {JSON.stringify(report, null, 2)}
        </pre>
      )}

      <small>
        Demo assistance only. A qualified clinician must review the report.
      </small>
    </section>
  );
}

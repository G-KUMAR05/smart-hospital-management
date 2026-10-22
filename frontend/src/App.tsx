import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, BedDouble, CalendarDays, Check, ChevronDown, ClipboardList, Database,
  FileText, LayoutDashboard, Menu, Package, Plus, RefreshCw, Search, Stethoscope,
  Users, UserRound, X, Trash2, Pencil, Sparkles, AlertTriangle, HeartPulse, LoaderCircle
} from 'lucide-react'

const API = 'http://localhost:8080/api/v1'
type Row = Record<string, any>
type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; placeholder?: string; wide?: boolean }
type ModuleKey = 'dashboard' | 'patients' | 'doctors' | 'appointments' | 'consultations' | 'beds' | 'medicines' | 'ai'

const modules: { key: ModuleKey; label: string; icon: any; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { key: 'patients', label: 'Patients', icon: Users, group: 'Clinical' },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope, group: 'Clinical' },
  { key: 'appointments', label: 'Appointments', icon: CalendarDays, group: 'Clinical' },
  { key: 'consultations', label: 'Consultations', icon: ClipboardList, group: 'Clinical' },
  { key: 'beds', label: 'Rooms & Beds', icon: BedDouble, group: 'Resources' },
  { key: 'medicines', label: 'Medicine Inventory', icon: Package, group: 'Resources' },
  { key: 'ai', label: 'AI Care Assistant', icon: Sparkles, group: 'Intelligence' },
]

const fields: Record<string, Field[]> = {
  patients: [
    { key: 'patient_number', label: 'Patient number', placeholder: 'Auto-generated if empty' },
    { key: 'full_name', label: 'Full name', required: true },
    { key: 'date_of_birth', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender', options: ['Female', 'Male', 'Other', 'Prefer not to say'] },
    { key: 'blood_group', label: 'Blood group', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'allergies', label: 'Allergies', wide: true },
    { key: 'medical_history', label: 'Medical history', type: 'textarea', wide: true },
  ],
  doctors: [
    { key: 'doctor_number', label: 'Doctor number', placeholder: 'Auto-generated if empty' },
    { key: 'full_name', label: 'Full name', required: true },
    { key: 'specialization', label: 'Specialization', required: true, options: ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Pulmonology', 'Gastroenterology', 'Endocrinology', 'Gynecology', 'Other'] },
    { key: 'department', label: 'Department' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'availability', label: 'Availability', options: ['Available', 'Busy', 'On Leave'] },
  ],
  appointments: [
    { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
    { key: 'doctor_id', label: 'Doctor', type: 'doctor', required: true },
    { key: 'appointment_date', label: 'Date', type: 'date', required: true },
    { key: 'appointment_time', label: 'Time', type: 'time', required: true },
    { key: 'reason', label: 'Reason for visit', required: true, wide: true },
    { key: 'status', label: 'Status', options: ['Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No Show'] },
    { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ],
  consultations: [
    { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
    { key: 'doctor_id', label: 'Doctor', type: 'doctor', required: true },
    { key: 'appointment_id', label: 'Linked appointment', type: 'appointment' },
    { key: 'consultation_date', label: 'Consultation date', type: 'date', required: true },
    { key: 'symptoms', label: 'Symptoms', type: 'textarea', required: true, wide: true },
    { key: 'findings', label: 'Clinical findings', type: 'textarea', wide: true },
    { key: 'assessment', label: 'Doctor assessment', type: 'textarea', wide: true },
    { key: 'treatment_plan', label: 'Plan documented by doctor', type: 'textarea', wide: true },
    { key: 'follow_up_date', label: 'Follow-up date', type: 'date' },
  ],
  beds: [
    { key: 'room_number', label: 'Room number', required: true },
    { key: 'bed_number', label: 'Bed number', required: true },
    { key: 'ward', label: 'Ward', required: true, options: ['General', 'ICU', 'Pediatrics', 'Maternity', 'Emergency', 'Private'] },
    { key: 'bed_type', label: 'Bed type', options: ['General', 'ICU', 'Private', 'Isolation', 'Pediatric'] },
    { key: 'status', label: 'Status', options: ['Available', 'Occupied', 'Maintenance'] },
    { key: 'patient_id', label: 'Allocated patient', type: 'patient' },
    { key: 'notes', label: 'Notes', wide: true },
  ],
  medicines: [
    { key: 'medicine_name', label: 'Medicine name', required: true },
    { key: 'category', label: 'Category', options: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Other'] },
    { key: 'batch_number', label: 'Batch number' },
    { key: 'quantity', label: 'Quantity in stock', type: 'number', required: true },
    { key: 'reorder_level', label: 'Low-stock threshold', type: 'number', required: true },
    { key: 'unit', label: 'Unit', options: ['units', 'strips', 'bottles', 'boxes', 'vials'] },
    { key: 'expiry_date', label: 'Expiry date', type: 'date' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'notes', label: 'Notes', wide: true },
  ],
}

const labels: Record<string, string> = {
  patient_number: 'Patient ID', doctor_number: 'Doctor ID', full_name: 'Full name',
  date_of_birth: 'Date of birth', blood_group: 'Blood group', medical_history: 'Medical history',
  created_at: 'Created', updated_at: 'Updated', patient_id: 'Patient', doctor_id: 'Doctor',
  appointment_id: 'Appointment', appointment_date: 'Date', appointment_time: 'Time',
  consultation_date: 'Consultation date', follow_up_date: 'Follow-up', treatment_plan: 'Plan',
  symptoms: 'Symptoms', findings: 'Findings', assessment: 'Assessment', reason: 'Reason',
  room_number: 'Room', bed_number: 'Bed', ward: 'Ward', bed_type: 'Type',
  medicine_name: 'Medicine', quantity: 'Stock', reorder_level: 'Alert at', expiry_date: 'Expiry',
  batch_number: 'Batch', supplier: 'Supplier', availability: 'Availability', status: 'Status',
  specialization: 'Specialization', department: 'Department', email: 'Email', phone: 'Phone',
  gender: 'Gender', allergies: 'Allergies', notes: 'Notes', category: 'Category', unit: 'Unit',
}
const titleCase = (s: string) => labels[s] || s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
const human = (v: any) => v === null || v === undefined || v === '' ? '—' : String(v).replace('T', ' ').replace(/\.0$/, '')
const today = () => new Date().toISOString().slice(0, 10)

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || body.error || `Request failed (${response.status})`)
  return body
}

function App() {
  const [active, setActive] = useState<ModuleKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [health, setHealth] = useState<'checking' | 'connected' | 'offline'>('checking')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [summary, setSummary] = useState<Row>({})
  const [rows, setRows] = useState<Row[]>([])
  const [patients, setPatients] = useState<Row[]>([])
  const [doctors, setDoctors] = useState<Row[]>([])
  const [appointments, setAppointments] = useState<Row[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<Row>({})
  const [reportPatient, setReportPatient] = useState('')
  const [report, setReport] = useState<Row | null>(null)
  const [referral, setReferral] = useState<Row | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [referralContext, setReferralContext] = useState('')

  const activeModule = modules.find(m => m.key === active)!
  const resource = active === 'ai' || active === 'dashboard' ? '' : active
  const moduleFields = fields[resource] || []

  const loadLookups = useCallback(async () => {
    try {
      const [p, d, a] = await Promise.all([
        request('/patients'), request('/doctors'), request('/appointments')
      ])
      setPatients(p); setDoctors(d); setAppointments(a)
    } catch { /* health indicator reports the connection state */ }
  }, [])

  const load = useCallback(async () => {
    setError('')
    if (active === 'dashboard') {
      try {
        const [s, h] = await Promise.all([request('/dashboard/summary'), request('/health')])
        setSummary(s); setHealth(h.status === 'UP' ? 'connected' : 'offline')
        await loadLookups()
      } catch (e: any) { setHealth('offline'); setError(e.message) }
      return
    }
    if (active === 'ai') {
      await loadLookups()
      return
    }
    setLoading(true)
    try {
      const data = await request(`/${resource}${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`)
      setRows(Array.isArray(data) ? data : [])
      setHealth('connected')
      await loadLookups()
    } catch (e: any) {
      setHealth('offline')
      setError(e.message || 'Could not load records')
      setRows([])
    } finally { setLoading(false) }
  }, [active, resource, search, loadLookups])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  const displayRows = useMemo(() => rows, [rows])
  const openCreate = () => {
    setEditing(null)
    const initial: Row = {}
    moduleFields.forEach(f => {
      if (f.key === 'status') initial[f.key] = active === 'beds' ? 'Available' : active === 'appointments' ? 'Scheduled' : ''
      else if (f.key === 'availability') initial[f.key] = 'Available'
      else if (f.key === 'quantity') initial[f.key] = 0
      else if (f.key === 'reorder_level') initial[f.key] = 10
      else if (f.key === 'unit') initial[f.key] = 'units'
      else if (f.key === 'appointment_date' || f.key === 'consultation_date') initial[f.key] = today()
      else if (f.key === 'appointment_time') initial[f.key] = '09:00'
      else initial[f.key] = ''
    })
    setForm(initial); setModal(true)
  }
  const openEdit = (row: Row) => {
    setEditing(row)
    const initial: Row = {}
    moduleFields.forEach(f => {
      let value = row[f.key]
      if (value && typeof value === 'string' && (f.type === 'date' || f.key.endsWith('_date'))) value = value.slice(0, 10)
      if (value && typeof value === 'string' && f.type === 'time') value = value.slice(0, 5)
      initial[f.key] = value ?? ''
    })
    setForm(initial); setModal(true)
  }
  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const payload: Row = {}
      moduleFields.forEach(f => {
        const value = form[f.key]
        if (value !== '' && value !== undefined) payload[f.key] = f.type === 'number' ? Number(value) : value
        else if (f.key === 'patient_id' || f.key === 'appointment_id' || f.key === 'follow_up_date') payload[f.key] = null
      })
      if (active === 'beds' && payload.status === 'Available') payload.patient_id = null
      const path = `/${resource}${editing ? `/${editing.id}` : ''}`
      await request(path, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) })
      setModal(false); setToast(`${activeModule.label.slice(0, -1) || activeModule.label} ${editing ? 'updated' : 'created'} successfully`)
      await load()
    } catch (e: any) { setError(e.message || 'Could not save record') }
  }
  const remove = async (row: Row) => {
    const noun = activeModule.label.toLowerCase().replace(/s$/, '')
    if (!window.confirm(`Delete this ${noun}? This cannot be undone.`)) return
    try {
      await request(`/${resource}/${row.id}`, { method: 'DELETE' })
      setToast('Record deleted'); await load()
    } catch (e: any) { setError(e.message) }
  }
  const updateStatus = async (row: Row, status: string) => {
    try { await request(`/appointments/${row.id}`, { method: 'PUT', body: JSON.stringify({ status }) }); setToast('Appointment status updated'); await load() }
    catch (e: any) { setError(e.message) }
  }
  const getName = (id: string, list: Row[], fallback: string) => list.find(x => x.id === id)?.full_name || fallback

const loadReport = async (patientId: string) => {
  setReportPatient(patientId);
  setReport(null);
  setReferral(null);
  setError("");

  if (!patientId) {
    setReportLoading(false);
    return;
  }

  setReportLoading(true);

  try {
    const data = await request(
      `/ai/patient-report/${encodeURIComponent(patientId)}`
    );

    console.log("Patient report API response:", data);

    if (!data || !data.patient) {
      throw new Error(
        "The API returned a response without patient details."
      );
    }

    setReport(data);
  } catch (e) {
    setReport(null);
    setError(
      e instanceof Error
        ? e.message
        : "Unable to load the patient report."
    );
  } finally {
    setReportLoading(false);
  }
};


const getReferral = async () => {
  if (!reportPatient) {
    setError('Choose a patient first')
    return
  }

  setError('')
  setReferral(null)

  try {
    const data = await request(
      `/ai/referral-suggestions/${encodeURIComponent(reportPatient)}`,
      {
        method: 'POST',
        body: JSON.stringify({ context: referralContext }),
      }
    )

    setReferral(data)

    if (data.aiStatus === 'UNAVAILABLE') {
      setError(
        'Gemini is temporarily unavailable. Showing a fallback suggestion.'
      )
    }
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : 'Unable to generate referral suggestions.'
    )
  }
}


  const renderCell = (key: string, row: Row) => {
    if (key === 'patient_id') return getName(row[key], patients, row[key])
    if (key === 'doctor_id') return getName(row[key], doctors, row[key])
    if (key === 'appointment_id') return appointments.find(a => a.id === row[key])?.reason || (row[key] ? String(row[key]).slice(0, 8) : '—')
    if (key === 'status' || key === 'availability') return <span className={`pill ${String(row[key] || '').toLowerCase().replaceAll(' ', '-')}`}>{human(row[key])}</span>
    if (key === 'quantity' && Number(row.quantity) <= Number(row.reorder_level)) return <span className="stock-alert"><AlertTriangle size={14} /> {row.quantity}</span>
    if (key === 'id') return <span className="mono">{String(row[key]).slice(0, 8)}</span>
    if (key === 'created_at' || key === 'updated_at') return human(row[key]).slice(0, 16)
    return human(row[key])
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><HeartPulse size={23} /></div><div><strong>CareSync</strong><span>Smart Hospital</span></div><button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
      <div className="nav-label">WORKSPACE</div>
      {['Overview', 'Clinical', 'Resources', 'Intelligence'].map(group => <div className="nav-group" key={group}>
        <div className="group-label">{group}</div>
        {modules.filter(m => m.group === group).map(m => {
          const Icon = m.icon
          return <button key={m.key} className={`nav-item ${active === m.key ? 'active' : ''}`} onClick={() => { setActive(m.key); setSearch(''); setError(''); setSidebarOpen(false) }}>
            <Icon size={18} strokeWidth={1.8} /><span>{m.label}</span>{m.key === 'ai' && <span className="nav-new">AI</span>}
          </button>
        })}
      </div>)}
      <div className="sidebar-bottom">
        <div className="local-card"><div className="local-icon"><Database size={17} /></div><div><strong>Local workspace</strong><span>Data stored in MySQL</span></div><span className={`status-dot ${health}`} /></div>
        <div className="profile"><div className="avatar">SH</div><div><strong>Hospital Admin</strong><span>Local administrator</span></div><ChevronDown size={16} className="muted-icon" /></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
        <div className="breadcrumbs"><span>Workspace</span><span className="slash">/</span><strong>{activeModule.label}</strong></div>
        <div className="topbar-right"><span className={`connection ${health}`}><span className="status-dot" />{health === 'connected' ? 'Database connected' : health === 'offline' ? 'Backend unavailable' : 'Checking connection'}</span><button className="icon-btn" title="Refresh data" onClick={() => void load()}><RefreshCw size={17} /></button><div className="top-avatar">HA</div></div>
      </header>

      <div className="page-content">
        {error && <div className="alert error"><AlertTriangle size={17} /><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}
        {active === 'dashboard' && <Dashboard summary={summary} health={health} patients={patients} appointments={appointments} beds={summary.availableBeds ?? 0} lowStock={summary.lowStockMedicines ?? 0} setActive={setActive} />}
        {active !== 'dashboard' && active !== 'ai' && <section>
          <div className="page-heading"><div><div className="eyebrow">HOSPITAL OPERATIONS</div><h1>{activeModule.label}</h1><p>{moduleDescription(active)}</p></div><button className="primary-btn" onClick={openCreate}><Plus size={17} /> Add {singular(active)}</button></div>
          <div className="table-card">
            <div className="table-toolbar"><div className="table-title"><strong>{activeModule.label} records</strong><span>{displayRows.length} shown</span></div><div className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeModule.label.toLowerCase()}...`} /><kbd>⌕</kbd></div></div>
            {loading ? <div className="loading"><LoaderCircle className="spin" size={22} /> Loading records…</div> : displayRows.length === 0 ? <div className="empty"><div className="empty-icon"><FileText size={24} /></div><strong>No records found</strong><p>{search ? 'Try a different search term.' : `Add your first ${singular(active).toLowerCase()} record to get started.`}</p><button className="secondary-btn" onClick={openCreate}><Plus size={16} /> Add {singular(active)}</button></div> :
            <div className="table-scroll"><table><thead><tr>{tableColumns(active).map(c => <th key={c}>{titleCase(c)}</th>)}<th className="actions-head">Actions</th></tr></thead><tbody>
              {displayRows.map(row => <tr key={row.id}>{tableColumns(active).map(c => <td key={c} title={typeof row[c] === 'string' ? row[c] : undefined}>{renderCell(c, row)}</td>)}<td><div className="row-actions">
                {active === 'appointments' && <select className="mini-select" value={row.status} onChange={e => void updateStatus(row, e.target.value)} aria-label="Update appointment status">{['Scheduled','Checked In','Completed','Cancelled','No Show'].map(s => <option key={s}>{s}</option>)}</select>}
                <button className="icon-btn small" title="Edit record" onClick={() => openEdit(row)}><Pencil size={15} /></button><button className="icon-btn small danger-hover" title="Delete record" onClick={() => void remove(row)}><Trash2 size={15} /></button>
              </div></td></tr>)}
            </tbody></table></div>}
            {active === 'medicines' && <div className="table-footnote"><AlertTriangle size={15} /> Items at or below their reorder threshold are highlighted as low stock.</div>}
            {active === 'beds' && <div className="table-footnote"><BedDouble size={15} /> Set a bed to Occupied and choose a patient to allocate it. Setting it to Available clears the allocation.</div>}
          </div>
        </section>}
        {active === 'ai' && <section>
          <div className="page-heading"><div><div className="eyebrow">CLINICAL DECISION SUPPORT</div><h1>AI Care Assistant</h1><p>Review a patient's saved consultation history and generate a draft summary.</p></div><div className="ai-badge"><Sparkles size={16} /> Assisted insights</div></div>
          <div className="notice"><AlertTriangle size={18} /><div><strong>Doctor review required</strong><p>This is a local, rule-based demonstration—not a medical AI model. Summaries and referral suggestions are drafts, not diagnoses or treatment instructions.</p></div></div>
          <div className="ai-layout">
            <div className="panel report-panel"><div className="panel-heading"><div className="panel-icon purple"><FileText size={19} /></div><div><h2>Patient progress report</h2><p>Based on consultation records stored in the database</p></div></div>

<label className="field-label">Select patient</label>

<select
  className="input"
  value={reportPatient}
  onChange={e => {
    setReportPatient(e.target.value);
    setReport(null);
    setReferral(null);
    setError("");
  }}
>
  <option value="">Choose a patient…</option>
  {patients.map(p => (
    <option value={p.id} key={p.id}>
      {p.full_name} ({p.patient_number})
    </option>
  ))}
</select>

<button
  className="primary-btn full"
  disabled={!reportPatient || loading}
  onClick={() => void loadReport(reportPatient)}
>
  <FileText size={16} />
  Generate Patient Report
</button>


{reportLoading ? (
  <div className="loading">
    <LoaderCircle className="spin" size={22} />
    Loading patient report…
  </div>
) : !report ? (
  <div className="ai-placeholder">
    <div className="sparkle-circle">
      <Sparkles size={24} />
    </div>
    <strong>Your report will appear here</strong>
    <p>
      Select a patient to summarize the consultation
      history recorded in the system.
    </p>
  </div>
) : null}

              {report && <div className="report-content"><div className="report-patient"><div className="avatar large">{String(report.patient?.full_name || 'P').split(' ').map((x: string) => x[0]).slice(0,2).join('').toUpperCase()}</div><div><strong>{report.patient?.full_name}</strong><span>{report.patient?.patient_number} · {report.consultationCount} consultation(s)</span></div><span className="draft-tag">DRAFT</span></div>
                <h3>Progress observations</h3><ul className="insight-list">{(report.observations || []).map((x: string, i: number) => <li key={i}><Check size={15} />{x}</li>)}</ul>
                <div className="latest-assessment"><span>Latest documented assessment</span><p>{human(report.latestAssessment)}</p></div>

<div className="latest-assessment">
  <span>Latest documented assessment</span>
  <p>{human(report.latestAssessment)}</p>
</div>

{/* AI-generated summary — add this block */}
{report.aiSummary && (
  <div className="latest-assessment">
    <span>AI-generated report summary</span>
    <p style={{ whiteSpace: 'pre-wrap' }}>
      {report.aiSummary}
    </p>
    <small>{report.generatedBy}</small>
  </div>
)}

{/* Existing consultation history continues below */}
{report.consultations?.length > 0 && (
  <>
    <h3>Recent consultation history</h3>
    <div className="history-list">
      {report.consultations.slice(0, 5).map((c: Row) => (
        <div className="history-item" key={c.id}>
          <span className="history-date">
            {human(c.consultation_date)}
          </span>
          <div>
            <strong>{c.doctor_name || 'Doctor'}</strong>
            <p>{human(c.symptoms)}</p>
            {c.assessment && (
              <small>Assessment: {c.assessment}</small>
            )}
          </div>
        </div>
      ))}
    </div>
  </>
)}

                {report.consultations?.length > 0 && <><h3>Recent consultation history</h3><div className="history-list">{report.consultations.slice(0,5).map((c: Row) => <div className="history-item" key={c.id}><span className="history-date">{human(c.consultation_date)}</span><div><strong>{c.doctor_name || 'Doctor'}</strong><p>{human(c.symptoms)}</p>{c.assessment && <small>Assessment: {c.assessment}</small>}</div></div>)}</div></>}
                <div className="review-disclaimer">{report.reviewNotice}</div>
              </div>}
            </div>
            <div className="panel referral-panel"><div className="panel-heading"><div className="panel-icon blue"><Stethoscope size={19} /></div><div><h2>Specialty referral suggestions</h2><p>Gemini AI suggestions for clinician review</p></div></div>
              <label className="field-label">Additional context (optional)</label><textarea className="input textarea" rows={4} value={referralContext} onChange={e => setReferralContext(e.target.value)} placeholder="Add relevant symptoms or context for this demo..." />
              <button className="primary-btn full" onClick={() => void getReferral()} disabled={!reportPatient}><Sparkles size={16} /> Suggest specialties</button>
              {referral && <div className="referral-result"><span className="eyebrow">
                                                              {referral.aiStatus === 'SUCCESS'
                                                                ? 'GEMINI AI SUGGESTIONS'
                                                                : 'FALLBACK SUGGESTION'}
                                                            </span><span className="eyebrow">SUGGESTED SPECIALTIES</span><div className="specialty-list">{referral.suggestedSpecialties?.map((s: string) => <span className="specialty-chip" key={s}><Stethoscope size={14} />{s}</span>)}</div><p className="muted-text">{referral.basis}</p><div className="review-disclaimer">{referral.reviewNotice}</div></div>}
              <div className="referral-hint"><Activity size={17} /><p>Suggestions are generated from text keywords in recent notes. They may be incomplete or incorrect and must never replace clinical judgment.</p></div>
            </div>
          </div>
        </section>}
      </div>
      <footer className="footer"><span>CareSync · Smart Hospital Management</span><span><span className={`status-dot ${health}`} /> Local development environment</span></footer>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false) }}><div className="modal">
      <div className="modal-header"><div><span className="eyebrow">{editing ? 'UPDATE RECORD' : 'NEW RECORD'}</span><h2>{editing ? 'Edit' : 'Add'} {singular(active)}</h2></div><button className="icon-btn" onClick={() => setModal(false)}><X size={19} /></button></div>
      <form onSubmit={save}><div className="form-grid">{moduleFields.map(f => <div className={`form-field ${f.wide || f.type === 'textarea' ? 'wide' : ''}`} key={f.key}><label className="field-label" htmlFor={f.key}>{f.label}{f.required && <span className="required"> *</span>}</label>
        {f.type === 'textarea' ? <textarea id={f.key} className="input textarea" value={form[f.key] ?? ''} required={f.required} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`} rows={3} /> :
        f.options ? <select id={f.key} className="input" value={form[f.key] ?? ''} required={f.required} onChange={e => setForm({ ...form, [f.key]: e.target.value })}><option value="">Select {f.label.toLowerCase()}</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select> :
        ['patient','doctor','appointment'].includes(f.type || '') ? <select id={f.key} className="input" value={form[f.key] ?? ''} required={f.required} onChange={e => setForm({ ...form, [f.key]: e.target.value })}><option value="">Select {f.label.toLowerCase()}</option>{(f.type === 'patient' ? patients : f.type === 'doctor' ? doctors : appointments).map((o: Row) => <option key={o.id} value={o.id}>{f.type === 'patient' ? `${o.full_name} (${o.patient_number})` : f.type === 'doctor' ? `${o.full_name} — ${o.specialization}` : `${human(o.appointment_date)} ${human(o.appointment_time)} — ${o.reason}`}</option>)}</select> :
        <input id={f.key} className="input" type={f.type || 'text'} value={form[f.key] ?? ''} required={f.required} min={f.type === 'number' ? 0 : undefined} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`} />}</div>)}</div>
        <div className="modal-footer"><button type="button" className="secondary-btn" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="primary-btn"><Check size={16} /> {editing ? 'Save changes' : 'Create record'}</button></div>
      </form>
    </div></div>}
    {toast && <div className="toast"><Check size={17} />{toast}<button onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>
}

function Dashboard({ summary, health, patients, appointments, beds, lowStock, setActive }: { summary: Row; health: string; patients: Row[]; appointments: Row[]; beds: any; lowStock: any; setActive: (m: ModuleKey) => void }) {
  const stats = [
    { label: 'Registered patients', value: summary.totalPatients ?? '—', icon: Users, color: 'blue', change: 'Patient records' },
    { label: 'Medical staff', value: summary.totalDoctors ?? '—', icon: Stethoscope, color: 'violet', change: 'Doctor directory' },
    { label: "Today's appointments", value: summary.todayAppointments ?? '—', icon: CalendarDays, color: 'orange', change: 'Scheduled visits' },
    { label: 'Available beds', value: beds, icon: BedDouble, color: 'green', change: `${summary.occupiedBeds ?? 0} currently occupied` },
  ]
  const upcoming = [...appointments].filter(a => a.status !== 'Cancelled' && a.status !== 'Completed').sort((a,b) => String(a.appointment_date).localeCompare(String(b.appointment_date))).slice(0,5)
  return <section>
    <div className="welcome-row"><div><div className="eyebrow">WEDNESDAY · HOSPITAL OVERVIEW</div><h1>Good day, Hospital Admin <span className="wave">✦</span></h1><p>Here's what's happening across your hospital today.</p></div><div className="date-chip"><CalendarDays size={16} />{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
    <div className={`system-banner ${health === 'connected' ? 'online' : 'offline'}`}><div className="banner-icon"><Activity size={19} /></div><div><strong>{health === 'connected' ? 'Hospital systems operational' : 'Backend connection needs attention'}</strong><p>{health === 'connected' ? 'The application is connected to the local API and MySQL database.' : 'Start the Spring Boot backend and confirm your MySQL connection.'}</p></div><span className="banner-state"><span className="status-dot" />{health === 'connected' ? 'ONLINE' : 'OFFLINE'}</span></div>
    <div className="stats-grid">{stats.map(s => { const Icon = s.icon; return <div className="stat-card" key={s.label}><div className={`stat-icon ${s.color}`}><Icon size={20} /></div><span className="stat-label">{s.label}</span><strong className="stat-value">{s.value}</strong><span className="stat-change">{s.change}</span></div> })}</div>
    <div className="dashboard-grid">
      <div className="panel upcoming-panel"><div className="panel-heading"><div><h2>Upcoming appointments</h2><p>Latest scheduled visits in your system</p></div><button className="text-btn" onClick={() => setActive('appointments')}>View all <span>→</span></button></div>
        {upcoming.length ? <div className="appointment-list">{upcoming.map(a => <div className="appointment-row" key={a.id}><div className="appointment-date"><strong>{String(a.appointment_date || '').slice(8,10) || '—'}</strong><span>{a.appointment_date ? new Date(`${a.appointment_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' }) : ''}</span></div><div className="appointment-info"><strong>{patients.find(p => p.id === a.patient_id)?.full_name || 'Patient record'}</strong><span>{a.reason}</span><small>{String(a.appointment_time || '').slice(0,5)} · Doctor ID {String(a.doctor_id || '').slice(0,8)}</small></div><span className={`pill ${String(a.status || '').toLowerCase().replaceAll(' ','-')}`}>{a.status}</span></div>)}</div> : <div className="small-empty"><CalendarDays size={24} /><strong>No upcoming appointments</strong><p>New scheduled visits will appear here.</p><button className="secondary-btn" onClick={() => setActive('appointments')}><Plus size={15} /> Schedule appointment</button></div>}
      </div>
      <div className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common hospital tasks</p></div></div><div className="quick-actions">
        <button onClick={() => setActive('patients')}><span className="quick-icon q-blue"><UserRound size={18} /></span><span><strong>Register patient</strong><small>Add a new patient record</small></span><span className="quick-arrow">→</span></button>
        <button onClick={() => setActive('appointments')}><span className="quick-icon q-orange"><CalendarDays size={18} /></span><span><strong>Book appointment</strong><small>Schedule a doctor visit</small></span><span className="quick-arrow">→</span></button>
        <button onClick={() => setActive('beds')}><span className="quick-icon q-green"><BedDouble size={18} /></span><span><strong>Manage beds</strong><small>Allocate rooms and beds</small></span><span className="quick-arrow">→</span></button>
        <button onClick={() => setActive('medicines')}><span className="quick-icon q-purple"><Package size={18} /></span><span><strong>Medicine inventory</strong><small>{lowStock} low-stock item(s)</small></span><span className="quick-arrow">→</span></button>
      </div></div>
    </div>
    <div className="bottom-cards"><div className="mini-card"><div className="mini-icon mint"><Package size={19} /></div><div><span>Medicine stock alerts</span><strong>{lowStock} item(s) need attention</strong><button className="text-btn" onClick={() => setActive('medicines')}>Review inventory →</button></div></div><div className="mini-card"><div className="mini-icon lilac"><Sparkles size={19} /></div><div><span>AI-assisted patient care</span><strong>Summaries & referral drafts</strong><button className="text-btn" onClick={() => setActive('ai')}>Open care assistant →</button></div></div></div>
  </section>
}

function tableColumns(key: string) {
  const map: Record<string, string[]> = {
    patients: ['patient_number','full_name','date_of_birth','gender','phone','blood_group'],
    doctors: ['doctor_number','full_name','specialization','department','phone','availability'],
    appointments: ['appointment_date','appointment_time','patient_id','doctor_id','reason','status'],
    consultations: ['consultation_date','patient_id','doctor_id','symptoms','assessment','follow_up_date'],
    beds: ['room_number','bed_number','ward','bed_type','status','patient_id'],
    medicines: ['medicine_name','category','batch_number','quantity','reorder_level','expiry_date','supplier'],
  }
  return map[key] || ['id']
}
function singular(key: string) {
  const map: Record<string, string> = { patients: 'Patient', doctors: 'Doctor', appointments: 'Appointment', consultations: 'Consultation', beds: 'Bed', medicines: 'Medicine' }
  return map[key] || 'Record'
}
function moduleDescription(key: ModuleKey) {
  const map: Record<string, string> = {
    patients: 'Maintain patient demographics and medical history in one place.',
    doctors: 'Manage clinicians, specialties, departments, and availability.',
    appointments: 'Schedule and track patient visits with your medical team.',
    consultations: 'Keep a longitudinal record of symptoms, findings, assessment, and follow-up.',
    beds: 'Track room availability and manually allocate beds to patients.',
    medicines: 'Monitor stock quantities, expiry dates, and replenishment thresholds.',
  }
  return map[key] || ''
}

export default App

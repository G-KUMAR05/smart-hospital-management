package com.smarthospital.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class ApiController {
    private final JdbcTemplate jdbc;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public ApiController(
            JdbcTemplate jdbc,
            GeminiService geminiService,
            ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper;
    }

    private record Resource(String table, List<String> columns, List<String> search, List<String> required) {}

    private static final Map<String, Resource> RESOURCES = Map.of(
        "patients", new Resource("patients",
            List.of("patient_number","full_name","date_of_birth","gender","email","phone","blood_group","allergies","medical_history"),
            List.of("full_name","patient_number","phone"), List.of("full_name")),
        "doctors", new Resource("doctors",
            List.of("doctor_number","full_name","specialization","department","email","phone","availability"),
            List.of("full_name","specialization","department"), List.of("full_name","specialization")),
        "appointments", new Resource("appointments",
            List.of("patient_id","doctor_id","appointment_date","appointment_time","reason","status","notes"),
            List.of("reason","status"), List.of("patient_id","doctor_id","appointment_date","appointment_time","reason")),
        "consultations", new Resource("consultations",
            List.of("patient_id","doctor_id","appointment_id","consultation_date","symptoms","findings","assessment","treatment_plan","follow_up_date"),
            List.of("symptoms","assessment","treatment_plan"), List.of("patient_id","doctor_id","consultation_date","symptoms")),
        "beds", new Resource("beds",
            List.of("room_number","bed_number","ward","bed_type","status","patient_id","notes"),
            List.of("room_number","bed_number","ward","status"), List.of("room_number","bed_number","ward")),
        "medicines", new Resource("medicines",
            List.of("medicine_name","category","batch_number","quantity","reorder_level","unit","expiry_date","supplier","notes"),
            List.of("medicine_name","category","batch_number","supplier"), List.of("medicine_name"))
    );

    @GetMapping("/health")
    public Map<String, Object> health() {
        Integer one = jdbc.queryForObject("SELECT 1", Integer.class);
        return Map.of("status", "UP", "database", one != null && one == 1 ? "CONNECTED" : "UNKNOWN",
            "application", "Smart Hospital API");
    }

    @GetMapping("/dashboard/summary")
    public Map<String, Object> dashboard() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalPatients", count("patients"));
        result.put("totalDoctors", count("doctors"));
        result.put("todayAppointments", jdbc.queryForObject("SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE AND status <> 'Cancelled'", Integer.class));
        result.put("availableBeds", jdbc.queryForObject("SELECT COUNT(*) FROM beds WHERE status = 'Available'", Integer.class));
        result.put("occupiedBeds", jdbc.queryForObject("SELECT COUNT(*) FROM beds WHERE status = 'Occupied'", Integer.class));
        result.put("lowStockMedicines", jdbc.queryForObject("SELECT COUNT(*) FROM medicines WHERE quantity <= reorder_level", Integer.class));
        result.put("upcomingAppointments", jdbc.queryForObject("SELECT COUNT(*) FROM appointments WHERE appointment_date >= CURRENT_DATE AND status = 'Scheduled'", Integer.class));
        return result;
    }

    @GetMapping("/{resource}")
    public List<Map<String, Object>> list(@PathVariable String resource,
                                          @RequestParam(required = false) String search) {
        Resource spec = spec(resource);
        String sql = "SELECT * FROM " + spec.table();
        Object[] args = new Object[0];
        if (search != null && !search.isBlank() && !spec.search().isEmpty()) {
            String where = spec.search().stream().map(c -> c + " LIKE ?").collect(Collectors.joining(" OR "));
            sql += " WHERE " + where;
            args = spec.search().stream().map(c -> "%" + search.trim() + "%").toArray();
        }
        sql += switch (resource) {
            case "appointments" -> " ORDER BY appointment_date DESC, appointment_time DESC";
            case "consultations" -> " ORDER BY consultation_date DESC, created_at DESC";
            case "medicines" -> " ORDER BY medicine_name ASC";
            case "beds" -> " ORDER BY ward ASC, room_number ASC, bed_number ASC";
            default -> " ORDER BY created_at DESC";
        };
        return jdbc.queryForList(sql, args);
    }

    @GetMapping("/{resource}/{id}")
    public Map<String, Object> getOne(@PathVariable String resource, @PathVariable String id) {
        Resource spec = spec(resource);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM " + spec.table() + " WHERE id = ?", id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found");
        return rows.get(0);
    }

    @PostMapping("/{resource}")
    public ResponseEntity<Map<String, Object>> create(@PathVariable String resource, @RequestBody Map<String, Object> body) {
        Resource spec = spec(resource);
        Map<String, Object> values = sanitize(resource, body, spec, true);
        for (String required : spec.required()) {
            if (values.get(required) == null || values.get(required).toString().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, required.replace('_', ' ') + " is required");
            }
        }
        String id = UUID.randomUUID().toString();
        if (resource.equals("patients") && blank(values.get("patient_number"))) values.put("patient_number", "PAT-" + id.substring(0, 8).toUpperCase());
        if (resource.equals("doctors") && blank(values.get("doctor_number"))) values.put("doctor_number", "DOC-" + id.substring(0, 8).toUpperCase());
        if (resource.equals("appointments") && blank(values.get("status"))) values.put("status", "Scheduled");
        if (resource.equals("beds") && blank(values.get("status"))) values.put("status", "Available");
        if (resource.equals("beds") && "Occupied".equals(values.get("status")) && blank(values.get("patient_id"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a patient before marking a bed occupied");
        }
        if (resource.equals("beds") && "Available".equals(values.get("status"))) values.put("patient_id", null);
        if (resource.equals("medicines")) {
            values.putIfAbsent("quantity", 0);
            values.putIfAbsent("reorder_level", 10);
            values.putIfAbsent("unit", "units");
        }
        List<String> columns = new ArrayList<>();
        columns.add("id");

        Map<String, Object> insertValues = new LinkedHashMap<>(values);
        insertValues.remove("id");
        columns.addAll(insertValues.keySet());

        String sql = "INSERT INTO " + spec.table() + " (" +
                String.join(",", columns) + ") VALUES (" +
                columns.stream().map(c -> "?").collect(Collectors.joining(",")) + ")";

        try {
            List<Object> params = new ArrayList<>();
            params.add(id);
            params.addAll(insertValues.values());
            jdbc.update(sql, params.toArray());
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Could not save record. Check duplicate values and linked patient/doctor IDs.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(getOne(resource, id));
    }

    @PutMapping("/{resource}/{id}")
    public Map<String, Object> update(@PathVariable String resource, @PathVariable String id, @RequestBody Map<String, Object> body) {
        Resource spec = spec(resource);
        getOne(resource, id);
        Map<String, Object> values = sanitize(resource, body, spec, false);
        if (values.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No editable fields supplied");
        if (resource.equals("beds")) {
            Object status = values.get("status");
            if ("Occupied".equals(status) && blank(values.getOrDefault("patient_id", getOne(resource, id).get("patient_id")))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a patient before marking a bed occupied");
            }
            if ("Available".equals(status)) values.put("patient_id", null);
        }
        String assignments = values.keySet().stream().map(c -> c + " = ?").collect(Collectors.joining(","));
        List<Object> args = new ArrayList<>(values.values());
        args.add(id);
        try {
            jdbc.update("UPDATE " + spec.table() + " SET " + assignments + " WHERE id = ?", args.toArray());
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Could not update record. Check duplicate values and linked patient/doctor IDs.");
        }
        return getOne(resource, id);
    }

    @DeleteMapping("/{resource}/{id}")
    public Map<String, Object> delete(@PathVariable String resource, @PathVariable String id) {
        Resource spec = spec(resource);
        getOne(resource, id);
        try {
            jdbc.update("DELETE FROM " + spec.table() + " WHERE id = ?", id);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This record is linked to other records and cannot be deleted yet.");
        }
        return Map.of("deleted", true, "id", id);
    }

    @GetMapping("/alerts/low-stock")
    public List<Map<String, Object>> lowStock() {
        return jdbc.queryForList("SELECT * FROM medicines WHERE quantity <= reorder_level ORDER BY quantity ASC, medicine_name ASC");
    }

    @GetMapping("/ai/patient-report/{patientId}")
    public Map<String, Object> patientReport(@PathVariable String patientId) {
        List<Map<String, Object>> patientRows = jdbc.queryForList("SELECT * FROM patients WHERE id = ?", patientId);
        if (patientRows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found");
        Map<String, Object> patient = patientRows.get(0);
        List<Map<String, Object>> visits = jdbc.queryForList(
            "SELECT c.*, d.full_name AS doctor_name FROM consultations c JOIN doctors d ON d.id=c.doctor_id WHERE c.patient_id=? ORDER BY c.consultation_date DESC, c.created_at DESC",
            patientId);
        String latest = visits.isEmpty() ? "No consultation notes have been recorded yet." :
            String.valueOf(visits.get(0).getOrDefault("assessment", "Assessment not recorded"));
        List<String> observations = new ArrayList<>();
        if (visits.isEmpty()) observations.add("Add a consultation record before generating a meaningful progress summary.");
        else {
            observations.add("Consultation records reviewed: " + visits.size() + ".");
            observations.add("Most recent documented assessment: " + (latest == null || latest.equals("null") || latest.isBlank() ? "Not recorded" : latest) + ".");
            if (visits.size() >= 2) observations.add("Earlier consultation notes are available for comparison; a clinician should verify whether the documented condition is improving or worsening.");
            else observations.add("Only one consultation is available; a reliable trend cannot yet be established.");
        }

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("patient", patient);
        result.put("consultationCount", visits.size());
        result.put("latestAssessment", latest);
        result.put("observations", observations);
        result.put("consultations", visits);

        try {
            Map<String, Object> clinicalData = new LinkedHashMap<>();
            clinicalData.put("patient", Map.of(
                    "patient_number", String.valueOf(patient.getOrDefault(
                            "patient_number", "Not recorded")),
                    "full_name", String.valueOf(patient.getOrDefault(
                            "full_name", "Not recorded")),
                    "medical_history", String.valueOf(patient.getOrDefault(
                            "medical_history", "Not recorded")),
                    "allergies", String.valueOf(patient.getOrDefault(
                            "allergies", "Not recorded"))
            ));
            clinicalData.put("consultations", visits);

            String clinicalJson = objectMapper.writeValueAsString(clinicalData);
            String aiSummary = geminiService.generatePatientSummary(clinicalJson);

            result.put("aiSummary", aiSummary);
            result.put("generatedBy", "Google Gemini");
            result.put("aiStatus", "SUCCESS");

        } catch (Exception ex) {
            // Do not silently label a rule-based report as AI-generated.
            result.put("aiSummary", null);
            result.put("generatedBy", "Rule-based demo assistant");
            result.put("aiStatus", "UNAVAILABLE");
            result.put("aiError",
                    "AI summary could not be generated. Please retry later.");
        }

        result.put("reviewNotice",
                "Draft only. A qualified doctor must review and approve this summary. "
                        + "It is not a diagnosis or treatment recommendation.");

        return result;

    }


    @PostMapping("/ai/referral-suggestions/{patientId}")
    public Map<String, Object> referralSuggestions(
            @PathVariable String patientId,
            @RequestBody(required = false) Map<String, Object> body) {

        List<Map<String, Object>> patients = jdbc.queryForList(
                "SELECT id, full_name FROM patients WHERE id = ?",
                patientId
        );

        if (patients.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Patient not found");
        }

        List<Map<String, Object>> visits = jdbc.queryForList(
                """
                SELECT symptoms, findings, assessment
                FROM consultations
                WHERE patient_id = ?
                ORDER BY consultation_date DESC, created_at DESC
                LIMIT 3
                """,
                patientId
        );

        String additionalContext = body == null
                ? ""
                : String.valueOf(body.getOrDefault("context", ""));

        try {
            Map<String, Object> clinicalData = new LinkedHashMap<>();
            clinicalData.put("patient", patients.get(0));
            clinicalData.put("consultations", visits);

            String clinicalJson =
                    objectMapper.writeValueAsString(clinicalData);

            String aiJson = geminiService.generateReferralSuggestions(
                    clinicalJson,
                    additionalContext
            );

            JsonNode aiResult = objectMapper.readTree(aiJson);

            List<String> suggestions = new ArrayList<>();
            JsonNode specialties = aiResult.path("suggestedSpecialties");

            if (specialties.isArray()) {
                for (JsonNode specialty : specialties) {
                    if (specialty.isTextual()
                            && !specialty.asText().isBlank()
                            && suggestions.size() < 3) {
                        suggestions.add(specialty.asText());
                    }
                }
            }

            if (suggestions.isEmpty()) {
                suggestions.add(
                        "General Medicine (clinician assessment required)");
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("patient", patients.get(0));
            result.put("suggestedSpecialties", suggestions);
            result.put("basis", aiResult.path("basis").asText(
                    "Suggestions based on the supplied consultation records."));
            result.put("generatedBy", "Google Gemini");
            result.put("aiStatus", "SUCCESS");
            result.put("reviewNotice", aiResult.path("reviewNotice").asText(
                    "Draft suggestions only. A qualified clinician must review and approve any referral."));
            return result;

        } catch (Exception ex) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("patient", patients.get(0));
            fallback.put("suggestedSpecialties", List.of(
                    "General Medicine (clinician assessment required)"));
            fallback.put("basis",
                    "AI suggestions are temporarily unavailable. Please review the documented notes manually.");
            fallback.put("generatedBy", "Fallback");
            fallback.put("aiStatus", "UNAVAILABLE");
            fallback.put("reviewNotice",
                    "Draft only. A qualified clinician must assess and approve any referral.");
            return fallback;
        }
    }


    private boolean containsAny(String text, String... terms) {
        for (String term : terms) if (text.contains(term)) return true;
        return false;
    }

    private int count(String table) {
        if (!Set.of("patients", "doctors").contains(table)) throw new IllegalArgumentException("Invalid table");
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    private Resource spec(String resource) {
        Resource value = RESOURCES.get(resource);
        if (value == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown module: " + resource);
        return value;
    }

    private Map<String, Object> sanitize(String resource, Map<String, Object> body, Resource spec, boolean creating) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (String column : spec.columns()) {
            if (body.containsKey(column)) {
                Object value = body.get(column);
                if (value instanceof String s && s.isBlank()) value = null;
                if (value != null && (column.endsWith("_date") || column.equals("date_of_birth") || column.equals("appointment_date") || column.equals("consultation_date") || column.equals("follow_up_date") || column.equals("expiry_date"))) {
                    value = Date.valueOf(value.toString());
                }
                if (value != null && column.equals("appointment_time")) value = Time.valueOf(value.toString().length() == 5 ? value + ":00" : value.toString());
                if (value != null && (column.equals("quantity") || column.equals("reorder_level"))) {
                    try { value = Integer.parseInt(value.toString()); }
                    catch (NumberFormatException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, column + " must be a whole number"); }
                    if ((Integer)value < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, column + " cannot be negative");
                }
                result.put(column, value);
            }
        }
        if (creating && resource.equals("patients") && blank(result.get("patient_number"))) result.remove("patient_number");
        if (creating && resource.equals("doctors") && blank(result.get("doctor_number"))) result.remove("doctor_number");
        return result;
    }

    private boolean blank(Object value) {
        return value == null || value.toString().isBlank();
    }
}

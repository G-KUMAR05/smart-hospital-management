CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(36) PRIMARY KEY,
  patient_number VARCHAR(24) NOT NULL UNIQUE,
  full_name VARCHAR(140) NOT NULL,
  date_of_birth DATE NULL,
  gender VARCHAR(30) NULL,
  email VARCHAR(160) NULL,
  phone VARCHAR(40) NULL,
  blood_group VARCHAR(8) NULL,
  allergies TEXT NULL,
  medical_history TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_name (full_name)
);

CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(36) PRIMARY KEY,
  doctor_number VARCHAR(24) NOT NULL UNIQUE,
  full_name VARCHAR(140) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  department VARCHAR(100) NULL,
  email VARCHAR(160) NULL,
  phone VARCHAR(40) NULL,
  availability VARCHAR(40) NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doctor_name (full_name),
  INDEX idx_doctor_specialization (specialization)
);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  doctor_id VARCHAR(36) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
  INDEX idx_appointment_date (appointment_date)
);

CREATE TABLE IF NOT EXISTS consultations (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  doctor_id VARCHAR(36) NOT NULL,
  appointment_id VARCHAR(36) NULL,
  consultation_date DATE NOT NULL,
  symptoms TEXT NOT NULL,
  findings TEXT NULL,
  assessment TEXT NULL,
  treatment_plan TEXT NULL,
  follow_up_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consult_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_consult_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_consult_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX idx_consult_patient_date (patient_id, consultation_date)
);

CREATE TABLE IF NOT EXISTS beds (
  id VARCHAR(36) PRIMARY KEY,
  room_number VARCHAR(30) NOT NULL,
  bed_number VARCHAR(30) NOT NULL,
  ward VARCHAR(80) NOT NULL,
  bed_type VARCHAR(40) NOT NULL DEFAULT 'General',
  status VARCHAR(30) NOT NULL DEFAULT 'Available',
  patient_id VARCHAR(36) NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bed_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  UNIQUE KEY uq_bed_room_number (room_number, bed_number),
  INDEX idx_bed_status (status)
);

CREATE TABLE IF NOT EXISTS medicines (
  id VARCHAR(36) PRIMARY KEY,
  medicine_name VARCHAR(140) NOT NULL,
  category VARCHAR(80) NULL,
  batch_number VARCHAR(80) NULL,
  quantity INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 10,
  unit VARCHAR(30) NOT NULL DEFAULT 'units',
  expiry_date DATE NULL,
  supplier VARCHAR(140) NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_medicine_name (medicine_name)
);

// ====================================
// BIS Admin Panel - Enhanced Version
// ====================================



// Global State
let currentUser = null;
let currentCourseId = null;
let currentSubjectId = null;
let currentDoctorIndex = null;
let coursesData = [];
let scheduleData = {};
let activeLevel = 1; // Default to Level 1
let hasUnsavedChanges = false;

// Time Slots Configuration
const TIME_SLOTS = [
  { id: 1, label: "8:00 AM - 10:00 AM" },
  { id: 2, label: "10:00 AM - 12:00 AM" },
  { id: 3, label: "12:00 AM - 2:00 PM" },
  { id: 4, label: "2:00 PM - 4:00 PM" },
  { id: 5, label: "4:00 PM - 6:00 PM" },
  { id: 6, label: "6:00 PM - 8:00 PM" },
];

const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

function normalizeSlot(slot) {
  return {
    ...slot,
    teamsCode: slot?.teamsCode || "",
  };
}

function normalizeProvider(provider) {
  return {
    ...provider,
    whatsappLink: provider?.whatsappLink || "",
    schedule: (provider?.schedule || []).map((dayItem) => ({
      ...dayItem,
      slots: (dayItem?.slots || []).map(normalizeSlot),
    })),
  };
}

function normalizeSubject(subject) {
  return {
    ...subject,
    doctors: (subject?.doctors || []).map(normalizeProvider),
    sections: (subject?.sections || []).map(normalizeProvider),
  };
}

function normalizeScheduleData(rawSchedule) {
  if (Array.isArray(rawSchedule)) {
    const normalized = [...rawSchedule];
    for (let level = 1; level <= 4; level++) {
      normalized[level] = (normalized[level] || []).map(normalizeSubject);
    }
    return normalized;
  }

  const normalized = { 1: [], 2: [], 3: [], 4: [] };
  for (let level = 1; level <= 4; level++) {
    normalized[level] = (rawSchedule?.[level] || []).map(normalizeSubject);
  }
  return normalized;
}

function sanitizeForFirebase(value) {
  if (Array.isArray(value)) {
    const cleanArray = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      cleanArray[i] =
        item === undefined || item === null ? "" : sanitizeForFirebase(item);
    }
    return cleanArray;
  }
  if (value && typeof value === "object") {
    const clean = {};
    Object.keys(value).forEach((key) => {
      const next = value[key];
      if (next === undefined || next === null) {
        clean[key] = "";
      } else {
        clean[key] = sanitizeForFirebase(next);
      }
    });
    return clean;
  }
  return value === undefined || value === null ? "" : value;
}

function getCurrentSlotMode() {
  if (window.currentEditingDoctor) {
    return window.currentEditingDoctor.providerKey === "sections"
      ? "section"
      : "doctor";
  }
  if (currentBuildingDoctorIndex !== null) {
    const doctorEntry =
      document.querySelectorAll(".doctor-entry")[currentBuildingDoctorIndex];
    if (doctorEntry) {
      return (
        doctorEntry.querySelector(".provider-type-input")?.value || "doctor"
      );
    }
  }
  return "doctor";
}

function toggleSectionHourFields() {
  const slotMode = getCurrentSlotMode();
  document.querySelectorAll(".time-slot-row").forEach((row) => {
    const halfSelect = row.querySelector(".slot-half");
    if (!halfSelect) return;
    const isSection = slotMode === "section";
    halfSelect.disabled = !isSection;
    halfSelect.style.display = isSection ? "" : "none";
    if (!isSection) {
      halfSelect.value = "";
    }
  });
}

// ====================================
// Authentication Functions
// ====================================

// Check Auth State
supabase.auth.onAuthStateChange((event, session) => {
  hideLoading();
  if (session) {
    currentUser = session.user;
    showDashboard();
    loadAllData();
  } else {
    showLogin();
  }
});

// Initial session check
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    hideLoading();
    showLogin();
  }
});

// Login Handler
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  showLoading();
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    showToast("Login successful!", "success");
  } catch (error) {
    hideLoading();
    showToast(error.message, "error");
  }
});

// Logout Handler
document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (hasUnsavedChanges) {
    if (
      !confirm("You have unsaved changes. Are you sure you want to logout?")
    ) {
      return;
    }
  }
  if (confirm("Are you sure you want to logout?")) {
    showLoading();
    await supabase.auth.signOut();
    showToast("Logged out successfully", "success");
  }
});

// ====================================
// UI Functions
// ====================================

function showLogin() {
  document.getElementById("loginView").classList.remove("hidden");
  document.getElementById("dashboardView").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");
  document.getElementById("adminEmail").textContent = currentUser.email;
}

function showLoading() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const icon = toast.querySelector(".toast-icon");
  const msg = toast.querySelector(".toast-message");

  toast.className = `toast ${type} show`;
  icon.textContent = type === "success" ? "✓" : "✗";
  msg.textContent = message;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function showFloatingSaveBtn() {
  document.getElementById("floatingSaveBtn").classList.remove("hidden");
  hasUnsavedChanges = true;
}

function hideFloatingSaveBtn() {
  document.getElementById("floatingSaveBtn").classList.add("hidden");
  hasUnsavedChanges = false;
}

// ====================================
// Navigation
// ====================================

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", function () {
    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Continue anyway?")) {
        return;
      }
    }

    const view = this.getAttribute("data-view");
    switchView(view);
  });
});

function switchView(viewName) {
  // Update nav buttons
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-view") === viewName) {
      btn.classList.add("active");
    }
  });

  // Hide all views
  document.querySelectorAll(".content-view").forEach((v) => {
    v.classList.add("hidden");
  });

  // Show selected view
  const viewMap = {
    courses: { view: "coursesView", title: "GPA Courses Management" },
    schedule: { view: "scheduleView", title: "Schedule Data Management" },
    settings: { view: "settingsView", title: "Settings" },
  };

  const selected = viewMap[viewName];
  document.getElementById(selected.view).classList.remove("hidden");
  document.getElementById("pageTitle").textContent = selected.title;

  if (viewName === "schedule") {
    loadScheduleForLevel(document.getElementById("scheduleLevel").value);
  } else if (viewName === "courses") {
    renderCoursesForLevel(activeLevel);
  }

  hideFloatingSaveBtn();
}

// ====================================
// Data Loading
// ====================================

async function loadAllData() {
  showLoading();
  try {
    // Load courses
    const { data: coursesDataFromDb, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .order("code");
    if (coursesError) throw coursesError;

    coursesData = (coursesDataFromDb || []).map((c) => ({
      code: c.code,
      name: c.name,
      hours: c.hours,
      level: c.level,
      semester: c.semester,
      elective: c.is_elective,
      chooseOne: c.choose_one,
    }));

    renderCoursesForLevel(activeLevel);
    updateCourseCounts();

    // Load schedule
    const { data: schedulesData, error: schedulesError } = await supabase
      .from("course_schedules")
      .select("*, doctors(*, doctor_slots(*))");

    if (schedulesError) throw schedulesError;

    const courseLevelMap = {};
    coursesData.forEach((c) => {
      courseLevelMap[c.name] = c.level;
    });

    const newScheduleData = { 1: [], 2: [], 3: [], 4: [] };
    if (schedulesData) {
      schedulesData.forEach((schedule) => {
        const level = courseLevelMap[schedule.name] || 2;
        const doctors = [];
        const sections = [];

        (schedule.doctors || []).forEach((doc) => {
          const scheduleByDay = {};
          (doc.doctor_slots || []).forEach((slot) => {
            if (!scheduleByDay[slot.day]) scheduleByDay[slot.day] = [];
            scheduleByDay[slot.day].push({
              id: slot.slot_number,
              g: slot.group_name,
              teamsCode: slot.teams_code || "",
            });
          });

          const formattedSchedule = Object.keys(scheduleByDay).map((day) => ({
            day,
            slots: scheduleByDay[day],
          }));

          const provider = {
            id: doc.id,
            name: doc.name,
            whatsappLink: doc.whatsapp_link || "",
            schedule: formattedSchedule,
          };

          if (doc.name.toLowerCase().includes("sec")) {
            sections.push(provider);
          } else {
            doctors.push(provider);
          }
        });

        newScheduleData[level].push({
          id: schedule.id, // Store id to help with saving
          name: schedule.name,
          color: schedule.color,
          doctors: doctors,
          sections: sections,
        });
      });
    }

    scheduleData = normalizeScheduleData(newScheduleData);
    loadScheduleForLevel(2);

    // Update settings
    document.getElementById("dbUrl").value = "Supabase PostgreSQL";
    document.getElementById("lastSync").value = new Date().toLocaleString();

    hideLoading();
  } catch (error) {
    hideLoading();
    showToast("Error loading data: " + error.message, "error");
  }
}

// ====================================
// Level Tabs for Courses
// ====================================

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    const level = parseInt(this.getAttribute("data-level"));
    switchToLevel(level);
  });
});

function switchToLevel(level) {
  activeLevel = level;

  // Update tab UI
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (parseInt(btn.getAttribute("data-level")) === level) {
      btn.classList.add("active");
    }
  });

  // Render courses for this level
  renderCoursesForLevel(level);
}

function updateCourseCounts() {
  for (let level = 1; level <= 4; level++) {
    const count = coursesData.filter((c) => c.level === level).length;
    const countEl = document.getElementById(`count-level-${level}`);
    if (countEl) {
      countEl.textContent = count;
    }
  }
}

// ====================================
// Courses CRUD with Level Filtering
// ====================================

function renderCoursesForLevel(level) {
  const tbody = document.getElementById("coursesTableBody");
  const searchTerm = document
    .getElementById("courseSearch")
    .value.toLowerCase();

  // Filter by level and search
  let filtered = coursesData.filter((course) => course.level === level);

  if (searchTerm) {
    filtered = filtered.filter(
      (course) =>
        course.code.toLowerCase().includes(searchTerm) ||
        course.name.toLowerCase().includes(searchTerm),
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr class="empty-state"><td colspan="5">No courses found for this level</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((course, originalIndex) => {
      // Find the original index in coursesData
      const globalIndex = coursesData.findIndex(
        (c) =>
          c.code === course.code &&
          c.level === course.level &&
          c.semester === course.semester,
      );

      return `
        <tr>
            <td><strong>${course.code}</strong></td>
            <td>${course.name}</td>
            <td>${course.hours}</td>
            <td>Semester ${course.semester}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon btn-edit" onclick="editCourse(${globalIndex})" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteCourse(${globalIndex})" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
    })
    .join("");
}

// Real-time Search
document.getElementById("courseSearch").addEventListener("input", function () {
  renderCoursesForLevel(activeLevel);
});

// Add Course - Smart Pre-fill with Active Level
document.getElementById("addCourseBtn").addEventListener("click", () => {
  currentCourseId = null;
  document.getElementById("courseModalTitle").textContent = "Add Course";
  document.getElementById("courseForm").reset();

  // Smart pre-fill: Set level to active tab
  document.getElementById("courseLevel").value = activeLevel;

  document.getElementById("courseModal").classList.add("show");
});

// Course Form Submit
document.getElementById("courseForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const courseData = {
    code: document.getElementById("courseCode").value.trim(),
    name: document.getElementById("courseName").value.trim(),
    hours: parseInt(document.getElementById("courseHours").value),
    level: parseInt(document.getElementById("courseLevel").value),
    semester: parseInt(document.getElementById("courseSemester").value),
  };

  showLoading();
  try {
    let oldCode = null;
    if (currentCourseId !== null) {
      oldCode = coursesData[currentCourseId].code;
      // Update local state
      coursesData[currentCourseId] = courseData;
    } else {
      // Add new local state
      coursesData.push(courseData);
    }

    // If code changed, we need to delete the old one first, because code is PK
    if (oldCode && oldCode !== courseData.code) {
      const { error: deleteError } = await supabase
        .from("courses")
        .delete()
        .eq("code", oldCode);
      if (deleteError) throw deleteError;
    }

    const { error: upsertError } = await supabase.from("courses").upsert({
      code: courseData.code,
      name: courseData.name,
      hours: courseData.hours,
      level: courseData.level,
      semester: courseData.semester,
      is_elective: courseData.elective || false,
      choose_one: courseData.chooseOne || false,
    });
    if (upsertError) throw upsertError;

    renderCoursesForLevel(activeLevel);
    updateCourseCounts();
    closeCourseModal();
    showToast(
      `Course ${currentCourseId !== null ? "updated" : "added"} successfully!`,
      "success",
    );
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast("Error saving course: " + error.message, "error");
  }
});

function editCourse(index) {
  currentCourseId = index;
  const course = coursesData[index];

  document.getElementById("courseModalTitle").textContent = "Edit Course";
  document.getElementById("courseCode").value = course.code;
  document.getElementById("courseName").value = course.name;
  document.getElementById("courseHours").value = course.hours;
  document.getElementById("courseLevel").value = course.level;
  document.getElementById("courseSemester").value = course.semester;

  document.getElementById("courseModal").classList.add("show");
}

async function deleteCourse(index) {
  const course = coursesData[index];
  if (!confirm(`Delete course "${course.name}" (${course.code})?`)) return;

  showLoading();
  try {
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("code", course.code);
    if (error) throw error;

    coursesData.splice(index, 1);
    renderCoursesForLevel(activeLevel);
    updateCourseCounts();
    showToast("Course deleted successfully!", "success");
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast("Error deleting course: " + error.message, "error");
  }
}

function closeCourseModal() {
  document.getElementById("courseModal").classList.remove("show");
}

// ====================================
// Schedule Management with Smart Forms
// ====================================

document
  .getElementById("scheduleLevel")
  .addEventListener("change", function () {
    loadScheduleForLevel(this.value);
  });

// Real-time Schedule Search
document
  .getElementById("scheduleSearch")
  .addEventListener("input", function () {
    loadScheduleForLevel(document.getElementById("scheduleLevel").value);
  });

function loadScheduleForLevel(level) {
  const grid = document.getElementById("scheduleGrid");
  const searchTerm = document
    .getElementById("scheduleSearch")
    .value.toLowerCase();
  const filterMode = document.getElementById("scheduleFilter")?.value || "all";
  let subjects = scheduleData[level] || [];

  // Filter by search
  if (searchTerm) {
    subjects = subjects.filter(
      (subject) =>
        subject.name.toLowerCase().includes(searchTerm) ||
        [...(subject.doctors || []), ...(subject.sections || [])].some((d) =>
          d.name.toLowerCase().includes(searchTerm),
        ),
    );
  }

  // Filter by type (lectures/sections)
  if (filterMode === "lectures") {
    subjects = subjects.filter((subject) => (subject.doctors || []).length > 0);
  } else if (filterMode === "sections") {
    subjects = subjects.filter(
      (subject) => (subject.sections || []).length > 0,
    );
  }

  if (subjects.length === 0) {
    grid.innerHTML = `
            <div class="empty-state-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>No subjects for this level</p>
                <button class="btn-secondary" onclick="document.getElementById('addScheduleBtn').click()">Add Subject</button>
            </div>
        `;
    return;
  }

  grid.innerHTML = subjects
    .map(
      (subject, index) => `
        <div class="schedule-card" style="border-left-color: ${subject.color}">
            <div class="schedule-card-header">
                <h3 style="color: ${subject.color}">${subject.name}</h3>
                <div class="table-actions">
                    <button class="btn-icon btn-edit" onclick="editSubject(${level}, ${index})" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteSubject(${level}, ${index})" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="doctor-accordion">
                ${renderProviderList(subject, level, index, "doctors", "Lectures")}
                ${renderProviderList(subject, level, index, "sections", "Sections")}
            </div>
        </div>
    `,
    )
    .join("");
}

function renderProviderList(subject, level, subjectIndex, key, label) {
  const providers = subject[key] || [];
  if (providers.length === 0) return "";
  const isSection = key === "sections";

  return `
        <div class="provider-section-title ${isSection ? "provider-sections" : "provider-lectures"}">${label}</div>
        ${providers
          .map(
            (provider, providerIndex) => `
            <div class="doctor-card ${isSection ? "provider-card-section" : "provider-card-lecture"}">
                <div class="doctor-header" onclick="toggleDoctorCard(this)">
                    <div class="doctor-info">
                        <span class="doctor-name">${provider.name} ${isSection ? '<span class="provider-badge">SEC</span>' : '<span class="provider-badge lecture">LEC</span>'}</span>
                        <span class="slot-summary">${getDoctorSlotSummary(provider)}</span>
                    </div>
                    <div class="doctor-actions">
                        <button class="btn-icon btn-edit" onclick="event.stopPropagation(); editDoctorSchedule(${level}, ${subjectIndex}, ${providerIndex}, '${key}')" title="Edit Schedule">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </button>
                        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                </div>
                <div class="doctor-details">
                    ${formatDoctorSchedule(provider)}
                </div>
            </div>
        `,
          )
          .join("")}
    `;
}

function getDoctorSlotSummary(doctor) {
  const totalSlots = doctor.schedule.reduce(
    (sum, day) => sum + day.slots.length,
    0,
  );
  const days = doctor.schedule.length;
  return `${totalSlots} slots across ${days} days`;
}

function formatDoctorSchedule(doctor) {
  return doctor.schedule
    .map(
      (day) => `
        <div class="day-schedule">
            <strong>${day.day}:</strong> ${day.slots.map((s) => `${s.g}${s.teamsCode ? ` [${s.teamsCode}]` : ""}`).join(", ")}
        </div>
    `,
    )
    .join("");
}

function toggleDoctorCard(header) {
  const card = header.closest(".doctor-card");
  card.classList.toggle("expanded");
}

// Add Subject
document.getElementById("addScheduleBtn").addEventListener("click", () => {
  currentSubjectId = null;
  document.getElementById("scheduleModalTitle").textContent = "Add Subject";
  document.getElementById("scheduleForm").reset();
  document.getElementById("subjectLevel").value =
    document.getElementById("scheduleLevel").value;
  document.getElementById("doctorsContainer").innerHTML = "";
  addDoctorEntry();
  document.getElementById("scheduleModal").classList.add("show");
});

// Dynamic Doctor Entry (Simplified - just name, schedule built in separate modal)
function addDoctorEntry(targetType) {
  const container = document.getElementById("doctorsContainer");
  const index = container.children.length;

  const doctorDiv = document.createElement("div");
  doctorDiv.className = "doctor-entry";
  doctorDiv.innerHTML = `
        <div class="doctor-entry-header">
            <select class="provider-type-input">
                <option value="doctor">Lecture</option>
                <option value="section">Section</option>
            </select>
            <input type="text" class="doctor-name-input" required placeholder="Name (e.g., Dr. Ahmed Hassan)">
            <input type="url" class="doctor-whatsapp-input" placeholder="WhatsApp Link (per doctor/section)">
            <button type="button" class="btn-icon btn-delete" onclick="this.parentElement.parentElement.remove()" title="Remove Doctor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="doctor-schedule-preview" data-doctor-index="${index}">
            <span class="schedule-summary">No schedule added yet</span>
            <button type="button" class="btn-secondary btn-small" onclick="openScheduleBuilder(${index})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                Build Schedule
            </button>
        </div>
        <input type="hidden" class="doctor-schedule-data" value="[]">
    `;

  container.appendChild(doctorDiv);

  // When provider type changes, re-apply tab visibility (data is preserved in hidden inputs)
  const typeSelect = doctorDiv.querySelector(".provider-type-input");
  typeSelect.addEventListener("change", () => {
    if (typeof activeProviderTab !== "undefined") {
      switchProviderTab(activeProviderTab);
    }
  });
}

// Open Schedule Builder Modal
let currentBuildingDoctorIndex = null;

function openScheduleBuilder(doctorIndex) {
  currentBuildingDoctorIndex = doctorIndex;
  const doctorEntry = document.querySelectorAll(".doctor-entry")[doctorIndex];
  const doctorName =
    doctorEntry.querySelector(".doctor-name-input").value || "Doctor";
  const scheduleData = doctorEntry.querySelector(".doctor-schedule-data").value;
  const providerType = doctorEntry.querySelector(".provider-type-input").value;

  document.getElementById("doctorNameDisplay").value = doctorName;
  document.getElementById("doctorModalTitle").textContent =
    `Edit ${providerType === "section" ? "Section" : "Lecture"} Schedule: ${doctorName}`;

  // Load existing schedule
  const schedule = scheduleData ? JSON.parse(scheduleData) : [];
  renderTimeSlots(schedule);
  toggleSectionHourFields();

  document.getElementById("doctorModal").classList.add("show");
}

// ====================================
// Time Slot Management (Smart Forms)
// ====================================

function renderTimeSlots(schedule) {
  const container = document.getElementById("timeSlotsContainer");
  container.innerHTML = "";

  if (schedule.length === 0) {
    addTimeSlot();
    return;
  }

  // Convert schedule to flat slots
  schedule.forEach((dayObj) => {
    dayObj.slots.forEach((slot) => {
      addTimeSlot(
        dayObj.day,
        slot.id,
        slot.g,
        slot.teamsCode || "",
        slot.h || "",
      );
    });
  });

  checkScheduleConflicts();
  toggleSectionHourFields();
}

function addTimeSlot(
  day = "",
  timeId = "",
  groupId = "",
  teamsCode = "",
  half = "",
) {
  const container = document.getElementById("timeSlotsContainer");
  const slotDiv = document.createElement("div");
  slotDiv.className = "time-slot-row";
  slotDiv.innerHTML = `
        <select class="slot-day" onchange="checkScheduleConflicts()" required>
            <option value="">Select Day</option>
            ${DAYS.map((d) => `<option value="${d}" ${d === day ? "selected" : ""}>${d}</option>`).join("")}
        </select>
        <select class="slot-time" onchange="checkScheduleConflicts()" required>
            <option value="">Select Time</option>
            ${TIME_SLOTS.map((t) => `<option value="${t.id}" ${t.id == timeId ? "selected" : ""}>${t.label}</option>`).join("")}
        </select>
        <select class="slot-half" title="For sections: choose the exact 1-hour interval">
            <option value="" ${half === "" ? "selected" : ""}>Full 2h (Lecture)</option>
            <option value="1" ${String(half) === "1" ? "selected" : ""}>First hour (e.g., 12:00-1:00)</option>
            <option value="2" ${String(half) === "2" ? "selected" : ""}>Second hour (e.g., 1:00-2:00)</option>
        </select>
        <input type="text" class="slot-group" placeholder="Group (e.g., G1)" value="${groupId}" required>
        <input type="text" class="slot-teams" placeholder="Teams Code (per group)" value="${teamsCode || ""}">
        <button type="button" class="btn-icon btn-delete" onclick="this.parentElement.remove(); checkScheduleConflicts();" title="Remove Slot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

  container.appendChild(slotDiv);
  toggleSectionHourFields();
}

// Conflict Detection
function checkScheduleConflicts() {
  const slots = document.querySelectorAll(".time-slot-row");
  const conflicts = new Map();
  const warning = document.getElementById("conflictWarning");

  // Clear previous conflicts
  slots.forEach((slot) => slot.classList.remove("conflict"));

  const slotMode = getCurrentSlotMode();

  // Check for duplicates
  slots.forEach((slot, index) => {
    const day = slot.querySelector(".slot-day").value;
    const time = slot.querySelector(".slot-time").value;
    const half = slot.querySelector(".slot-half")?.value || "";

    if (!day || !time) return;

    const key =
      slotMode === "section"
        ? `${day}-${time}-${half || "full"}`
        : `${day}-${time}`;

    if (conflicts.has(key)) {
      // Mark both as conflict
      slot.classList.add("conflict");
      conflicts.get(key).classList.add("conflict");
      warning.classList.remove("hidden");
    } else {
      conflicts.set(key, slot);
    }
  });

  // Hide warning if no conflicts
  if (document.querySelectorAll(".time-slot-row.conflict").length === 0) {
    warning.classList.add("hidden");
  }
}

// Save Doctor Schedule (Auto-JSON Conversion)
function saveDoctorSchedule() {
  // Check for conflicts
  if (document.querySelectorAll(".time-slot-row.conflict").length > 0) {
    if (!confirm("Schedule conflicts detected! Save anyway?")) {
      return;
    }
  }

  const slots = document.querySelectorAll(".time-slot-row");
  const scheduleByDay = {};
  const slotMode = getCurrentSlotMode();
  let hasSectionHalfError = false;

  // Group slots by day
  slots.forEach((slot) => {
    const day = slot.querySelector(".slot-day").value;
    const timeId = parseInt(slot.querySelector(".slot-time").value);
    const groupId = slot.querySelector(".slot-group").value.trim();
    const teamsCode = slot.querySelector(".slot-teams").value.trim();
    const half = slot.querySelector(".slot-half")?.value;

    if (!day || !timeId || !groupId) return;

    if (!scheduleByDay[day]) {
      scheduleByDay[day] = [];
    }

    const slotData = {
      id: timeId,
      g: groupId || "",
      teamsCode: teamsCode || "",
    };
    if (slotMode === "section") {
      if (!half) {
        hasSectionHalfError = true;
        return;
      }
      slotData.h = parseInt(half, 10);
    }
    scheduleByDay[day].push(slotData);
  });

  if (hasSectionHalfError) {
    alert(
      "For sections, please choose First hour or Second hour for every slot.",
    );
    return;
  }

  // Convert to schedule array format
  const schedule = Object.keys(scheduleByDay).map((day) => ({
    day: day,
    slots: scheduleByDay[day],
  }));

  // Save to hidden input in doctor entry
  const doctorEntry =
    document.querySelectorAll(".doctor-entry")[currentBuildingDoctorIndex];
  doctorEntry.querySelector(".doctor-schedule-data").value =
    JSON.stringify(schedule);

  // Update preview
  const preview = doctorEntry.querySelector(".schedule-summary");
  const totalSlots = schedule.reduce((sum, day) => sum + day.slots.length, 0);
  preview.textContent = `${totalSlots} slots across ${schedule.length} days`;

  closeDoctorModal();
  showToast("Schedule saved!", "success");
}

function closeDoctorModal() {
  document.getElementById("doctorModal").classList.remove("show");
  currentBuildingDoctorIndex = null;
}

// Schedule Form Submit (Auto-JSON Conversion)
document
  .getElementById("scheduleForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const level = parseInt(document.getElementById("subjectLevel").value);
    const subjectData = {
      name: document.getElementById("subjectName").value.trim(),
      color: document.getElementById("subjectColor").value,
      doctors: [],
      sections: [],
    };

    // Build doctors array from entries
    const doctorEntries = document.querySelectorAll(".doctor-entry");
    doctorEntries.forEach((entry) => {
      const name = entry.querySelector(".doctor-name-input").value.trim();
      const scheduleJSON = entry.querySelector(".doctor-schedule-data").value;
      const whatsappLink = entry
        .querySelector(".doctor-whatsapp-input")
        .value.trim();
      const providerType = entry.querySelector(".provider-type-input").value;

      if (!name) return;

      const schedule = scheduleJSON ? JSON.parse(scheduleJSON) : [];
      const provider = {
        name: name || "",
        whatsappLink: whatsappLink || "",
        schedule: schedule || [],
      };
      if (providerType === "section") {
        subjectData.sections.push(provider);
      } else {
        subjectData.doctors.push(provider);
      }
    });

    if (subjectData.doctors.length === 0 && subjectData.sections.length === 0) {
      showToast("Please add at least one lecture or section", "error");
      return;
    }

    showLoading();
    try {
      if (!scheduleData[level]) scheduleData[level] = [];

      let scheduleDbId = null;
      if (
        currentSubjectId !== null &&
        scheduleData[level][currentSubjectId].id
      ) {
        scheduleDbId = scheduleData[level][currentSubjectId].id;
      }

      const { data: savedSchedule, error: schedError } = await supabase
        .from("course_schedules")
        .upsert({
          ...(scheduleDbId ? { id: scheduleDbId } : {}),
          name: subjectData.name,
          color: subjectData.color,
        })
        .select()
        .single();

      if (schedError) throw schedError;

      scheduleDbId = savedSchedule.id;

      // Delete old doctors
      await supabase
        .from("doctors")
        .delete()
        .eq("course_schedule_id", scheduleDbId);

      // Insert new doctors and sections
      const allProviders = [...subjectData.doctors, ...subjectData.sections];

      for (const provider of allProviders) {
        const { data: savedDoc, error: docError } = await supabase
          .from("doctors")
          .insert({
            course_schedule_id: scheduleDbId,
            name: provider.name,
            whatsapp_link: provider.whatsappLink || "",
          })
          .select()
          .single();

        if (docError) throw docError;

        const docId = savedDoc.id;

        const slotsToInsert = [];
        provider.schedule.forEach((dayInfo) => {
          dayInfo.slots.forEach((slot) => {
            slotsToInsert.push({
              doctor_id: docId,
              day: dayInfo.day,
              group_name: slot.g,
              slot_number: slot.id,
              teams_code: slot.teamsCode || "",
            });
          });
        });

        if (slotsToInsert.length > 0) {
          const { error: slotsError } = await supabase
            .from("doctor_slots")
            .insert(slotsToInsert);
          if (slotsError) throw slotsError;
        }
      }

      // Update local state
      subjectData.id = scheduleDbId;
      if (currentSubjectId !== null) {
        scheduleData[level][currentSubjectId] = subjectData;
      } else {
        scheduleData[level].push(subjectData);
      }

      loadScheduleForLevel(level);
      closeScheduleModal();
      showToast(
        `Subject ${currentSubjectId !== null ? "updated" : "added"} successfully!`,
        "success",
      );
      hideLoading();
    } catch (error) {
      hideLoading();
      showToast("Error saving subject: " + error.message, "error");
    }
  });

// Track active tab state for the edit modal
let activeProviderTab = "doctors"; // 'doctors' | 'sections'

function switchProviderTab(tab) {
  activeProviderTab = tab;
  // Update tab button styles
  document.querySelectorAll(".provider-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  // Show/hide entries without losing unsaved input data
  document.querySelectorAll(".doctor-entry").forEach((entry) => {
    const entryType = entry.querySelector(".provider-type-input").value;
    const matchesTab =
      (tab === "doctors" && entryType === "doctor") ||
      (tab === "sections" && entryType === "section");
    entry.style.display = matchesTab ? "" : "none";
  });
}

function editSubject(level, index) {
  currentSubjectId = index;
  activeProviderTab = "doctors"; // reset to lectures tab
  const subject = scheduleData[level][index];

  document.getElementById("scheduleModalTitle").textContent = "Edit Subject";
  document.getElementById("subjectName").value = subject.name;
  document.getElementById("subjectColor").value = subject.color;
  document.getElementById("subjectLevel").value = level;

  // Inject the tab UI if not already present
  let tabBar = document.getElementById("providerTabBar");
  if (!tabBar) {
    tabBar = document.createElement("div");
    tabBar.id = "providerTabBar";
    tabBar.style.cssText =
      "display:flex;gap:0.5rem;margin-bottom:1rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.5rem;";
    tabBar.innerHTML = `
            <button type="button" class="provider-tab-btn active" data-tab="doctors"
                style="padding:0.5rem 1.25rem;border:none;border-radius:8px 8px 0 0;font-weight:700;cursor:pointer;background:#1e3a5f;color:#fff;font-size:0.9rem;"
                onclick="switchProviderTab('doctors')">📚 Manage Lectures</button>
            <button type="button" class="provider-tab-btn" data-tab="sections"
                style="padding:0.5rem 1.25rem;border:none;border-radius:8px 8px 0 0;font-weight:700;cursor:pointer;background:#e2e8f0;color:#1e3a5f;font-size:0.9rem;"
                onclick="switchProviderTab('sections')">📋 Manage Sections</button>
        `;
    const doctorsContainer = document.getElementById("doctorsContainer");
    doctorsContainer.parentElement.insertBefore(tabBar, doctorsContainer);
  }
  // Style tab buttons on switch
  document.addEventListener(
    "click",
    function (e) {
      if (e.target.classList.contains("provider-tab-btn")) {
        document.querySelectorAll(".provider-tab-btn").forEach((btn) => {
          btn.style.background =
            btn.dataset.tab === e.target.dataset.tab ? "#1e3a5f" : "#e2e8f0";
          btn.style.color =
            btn.dataset.tab === e.target.dataset.tab ? "#fff" : "#1e3a5f";
        });
      }
    },
    { once: false },
  );

  const container = document.getElementById("doctorsContainer");
  container.innerHTML = "";

  const allProviders = [
    ...(subject.doctors || []).map((item) => ({ ...item, _type: "doctor" })),
    ...(subject.sections || []).map((item) => ({ ...item, _type: "section" })),
  ];

  allProviders.forEach((doctor) => {
    addDoctorEntry();
    const lastEntry = container.lastElementChild;
    lastEntry.querySelector(".provider-type-input").value = doctor._type;
    lastEntry.querySelector(".doctor-name-input").value = doctor.name;
    lastEntry.querySelector(".doctor-whatsapp-input").value =
      doctor.whatsappLink || "";
    lastEntry.querySelector(".doctor-schedule-data").value = JSON.stringify(
      doctor.schedule,
    );

    const totalSlots = doctor.schedule.reduce(
      (sum, day) => sum + day.slots.length,
      0,
    );
    lastEntry.querySelector(".schedule-summary").textContent =
      `${totalSlots} slots across ${doctor.schedule.length} days`;
  });

  // Apply initial tab visibility - without losing data
  switchProviderTab("doctors");

  document.getElementById("scheduleModal").classList.add("show");
}

function editDoctorSchedule(
  level,
  subjectIndex,
  doctorIndex,
  providerKey = "doctors",
) {
  const subject = scheduleData[level][subjectIndex];
  const doctor = (subject[providerKey] || [])[doctorIndex];

  document.getElementById("doctorNameDisplay").value = doctor.name;
  document.getElementById("doctorModalTitle").textContent =
    `Edit ${providerKey === "sections" ? "Section" : "Lecture"} Schedule: ${doctor.name}`;

  renderTimeSlots(doctor.schedule);
  toggleSectionHourFields();

  // Store reference for saving
  window.currentEditingDoctor = {
    level,
    subjectIndex,
    doctorIndex,
    providerKey,
  };

  document.getElementById("doctorModal").classList.add("show");
}

// Override save function when editing existing doctor
const originalSaveDoctorSchedule = saveDoctorSchedule;
window.saveDoctorSchedule = function () {
  if (window.currentEditingDoctor) {
    // Editing existing doctor in schedule
    const { level, subjectIndex, doctorIndex, providerKey } =
      window.currentEditingDoctor;

    // Check conflicts
    if (document.querySelectorAll(".time-slot-row.conflict").length > 0) {
      if (!confirm("Schedule conflicts detected! Save anyway?")) {
        return;
      }
    }

    const slots = document.querySelectorAll(".time-slot-row");
    const scheduleByDay = {};
    let hasSectionHalfError = false;

    slots.forEach((slot) => {
      const day = slot.querySelector(".slot-day").value;
      const timeId = parseInt(slot.querySelector(".slot-time").value);
      const groupId = slot.querySelector(".slot-group").value.trim();
      const teamsCode = slot.querySelector(".slot-teams").value.trim();
      const half = slot.querySelector(".slot-half")?.value;

      if (!day || !timeId || !groupId) return;

      if (!scheduleByDay[day]) {
        scheduleByDay[day] = [];
      }

      const slotData = {
        id: timeId,
        g: groupId || "",
        teamsCode: teamsCode || "",
      };
      if (providerKey === "sections") {
        if (!half) {
          hasSectionHalfError = true;
          return;
        }
        slotData.h = parseInt(half, 10);
      }
      scheduleByDay[day].push(slotData);
    });

    if (hasSectionHalfError) {
      alert(
        "For sections, please choose First hour or Second hour for every slot.",
      );
      return;
    }

    const schedule = Object.keys(scheduleByDay).map((day) => ({
      day: day,
      slots: scheduleByDay[day],
    }));

    // Update in scheduleData
    // Update in scheduleData
    const provider =
      scheduleData[level][subjectIndex][providerKey][doctorIndex];
    provider.schedule = schedule;

    // Save to Supabase (if the doctor has an ID in the DB)
    if (provider.id) {
      // Delete old slots
      supabase
        .from("doctor_slots")
        .delete()
        .eq("doctor_id", provider.id)
        .then(({ error: delError }) => {
          if (delError) {
            console.error(delError);
            showToast("Error updating doctor schedule", "error");
            return;
          }
          const slotsToInsert = [];
          provider.schedule.forEach((dayInfo) => {
            dayInfo.slots.forEach((slot) => {
              slotsToInsert.push({
                doctor_id: provider.id,
                day: dayInfo.day,
                group_name: slot.g,
                slot_number: slot.id,
                teams_code: slot.teamsCode || "",
              });
            });
          });

          if (slotsToInsert.length > 0) {
            supabase
              .from("doctor_slots")
              .insert(slotsToInsert)
              .then(({ error: insError }) => {
                if (insError) {
                  console.error(insError);
                  showToast("Error inserting slots", "error");
                  return;
                }
                loadScheduleForLevel(level);
                closeDoctorModal();
                showToast("Doctor schedule updated!", "success");
                window.currentEditingDoctor = null;
              });
          } else {
            loadScheduleForLevel(level);
            closeDoctorModal();
            showToast("Doctor schedule updated!", "success");
            window.currentEditingDoctor = null;
          }
        });
    } else {
      // Not in DB yet, just update local state
      loadScheduleForLevel(level);
      closeDoctorModal();
      showToast(
        "Doctor schedule updated locally (save subject to persist)",
        "success",
      );
      window.currentEditingDoctor = null;
    }
  } else {
    // Building new doctor schedule
    originalSaveDoctorSchedule();
  }
};

async function deleteSubject(level, index) {
  const subject = scheduleData[level][index];
  if (!confirm(`Delete subject "${subject.name}"?`)) return;

  showLoading();
  try {
    if (subject.id) {
      const { error } = await supabase
        .from("course_schedules")
        .delete()
        .eq("id", subject.id);
      if (error) throw error;
    }

    scheduleData[level].splice(index, 1);
    loadScheduleForLevel(level);
    showToast("Subject deleted successfully!", "success");
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast("Error deleting subject: " + error.message, "error");
  }
}

function closeScheduleModal() {
  document.getElementById("scheduleModal").classList.remove("show");
  // Remove injected tab bar so it rebuilds cleanly on next open
  const tabBar = document.getElementById("providerTabBar");
  if (tabBar) tabBar.remove();
  activeProviderTab = "doctors";
}

// ====================================
// Floating Save Button
// ====================================

document
  .getElementById("floatingSaveBtn")
  .addEventListener("click", async () => {
    // We already save immediately in forms, so we can just reload or do nothing
    hideFloatingSaveBtn();
    showToast("Changes are already saved!", "success");
  });

// Sync Data
document.getElementById("syncDataBtn").addEventListener("click", () => {
  loadAllData();
  showToast("Data synced successfully!", "success");
});

// Initialize
console.log("BIS Admin Panel Loaded");

// Expose functions to window for inline HTML handlers
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.closeCourseModal = closeCourseModal;

window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.closeScheduleModal = closeScheduleModal;

window.switchProviderTab = switchProviderTab;

window.toggleDoctorCard = toggleDoctorCard;
window.editDoctorSchedule = editDoctorSchedule;
window.openScheduleBuilder = openScheduleBuilder;
window.closeDoctorModal = closeDoctorModal;
window.addDoctorEntry = addDoctorEntry;

window.addTimeSlot = addTimeSlot;
window.checkScheduleConflicts = checkScheduleConflicts;

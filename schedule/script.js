// Dark Mode Toggle Function
function toggleTheme() {
  const body = document.body;
  body.classList.toggle("dark-mode");

  // Save preference to localStorage
  const isDarkMode = body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDarkMode ? "enabled" : "disabled");
}

// Load saved theme preference on page load
function loadTheme() {
  const darkMode = localStorage.getItem("darkMode");
  if (darkMode === "enabled") {
    document.body.classList.add("dark-mode");
  }
}

import { supabase } from "../supabaseClient.js";

// Initialize theme when DOM loads
document.addEventListener("DOMContentLoaded", function () {
  loadTheme();

  // Load schedule from Supabase
  loadScheduleFromSupabase();
});

let siteSettings = {
  maintenance_mode: false,
  sections_renewal_pending: false,
  courses_renewal_pending: false,
  is_semester_2_active: false,
};

// Load schedule from Supabase
async function loadScheduleFromSupabase() {
  try {
    // Fetch site settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("site_settings")
      .select("*");
    if (!settingsError && settingsData) {
      settingsData.forEach((setting) => {
        if (siteSettings.hasOwnProperty(setting.key)) {
          siteSettings[setting.key] = setting.value;
        }
      });
    }

    if (siteSettings.maintenance_mode) {
      document.querySelector(".main-card").innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; text-align: center; color: var(--text-secondary);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; margin-bottom: 1rem; color: #f59e0b;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <h2 style="color: var(--text-primary); margin-bottom: 0.5rem;">Under Maintenance</h2>
          <p>⚠️ The schedule is currently under maintenance. Data is being updated.</p>
        </div>
      `;
      return;
    }

    // Fetch course schedules with nested relations (now embedding courses via fkey)
    const { data: schedulesData, error: schedulesError } = await supabase
      .from("course_schedules")
      .select(
        "*, courses!course_schedules_course_code_fkey(code, name, level, semester), doctors(*, doctor_slots(*)), sections(*, section_slots(*))",
      );

    if (schedulesError) throw schedulesError;

    if (schedulesData && schedulesData.length > 0) {
      const newScheduleData = { 1: [], 2: [], 3: [], 4: [] };

      schedulesData.forEach((schedule) => {
        if (!schedule.courses) {
          console.error(
            `course_schedules id ${schedule.id} has no linked course`,
          );
          return;
        }
        const activeSemester = siteSettings.is_semester_2_active ? 2 : 1;
        if (schedule.courses.semester !== activeSemester) return; // not the active semester — skip
        const level = schedule.courses.level;

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

          doctors.push({
            name: doc.name,
            whatsappLink: doc.whatsapp_link || "",
            schedule: formattedSchedule,
          });
        });

        (schedule.sections || []).forEach((sec) => {
          const scheduleByDay = {};
          (sec.section_slots || []).forEach((slot) => {
            if (!scheduleByDay[slot.day]) scheduleByDay[slot.day] = [];
            scheduleByDay[slot.day].push({
              id: slot.slot_number,
              g: slot.group_name,
              teamsCode: slot.teams_code || "",
              h: slot.h || undefined,
            });
          });

          const formattedSchedule = Object.keys(scheduleByDay).map((day) => ({
            day,
            slots: scheduleByDay[day],
          }));

          sections.push({
            name: sec.name,
            whatsappLink: sec.whatsapp_link || "",
            schedule: formattedSchedule,
          });
        });

        newScheduleData[level].push({
          name: schedule.name,
          color: schedule.color,
          doctors: doctors,
          sections: sections,
        });
      });

      // Update updatedCoursesData with Supabase data
      Object.keys(newScheduleData).forEach((level) => {
        if (newScheduleData[level].length > 0) {
          updatedCoursesData[level] =
            newScheduleData[level].map(normalizeSubjectData);
        }
      });
      console.log("Schedule data loaded successfully from Supabase");

      // Refresh subjects if a year is already selected
      if (selectedYear) {
        loadSubjects(selectedYear);
      }
    }
  } catch (error) {
    console.log("Using local schedule data:", error.message);
  }
}

function normalizeSlotData(slot) {
  return {
    ...slot,
    teamsCode: slot?.teamsCode || "",
  };
}

function normalizeProviderData(provider) {
  return {
    ...provider,
    whatsappLink: provider?.whatsappLink || "",
    schedule: (provider?.schedule || []).map((dayItem) => ({
      ...dayItem,
      slots: (dayItem?.slots || []).map(normalizeSlotData),
    })),
  };
}

function normalizeSubjectData(subject) {
  return {
    ...subject,
    doctors: (subject?.doctors || []).map(normalizeProviderData),
    sections: (subject?.sections || []).map(normalizeProviderData),
  };
}

// 1. Time Slots & Days Configuration
const timeSlots = [
  { id: 1, display: "8:00 - 10:00" },
  { id: 2, display: "10:00 - 12:00" },
  { id: 3, display: "12:00 - 2:00" },
  { id: 4, display: "2:00 - 4:00" },
  { id: 5, display: "4:00 - 6:00" },
  { id: 6, display: "6:00 - 8:00" },
];

const days = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

// 2. Data - UPDATED: No 'code' property, only 'name'
const updatedCoursesData = {
  1: [
    // Coming Soon - Level 1 data will be added here later
    {
      name: "⚠️ Coming Soon",
      color: "#94a3b8",
      doctors: [
        {
          name: "Level 1 courses will be added soon",
          schedule: [{ day: "Saturday", slots: [{ id: 1, g: "INFO" }] }],
        },
      ],
    },
  ],
  2: [
    {
      name: "Money and Banking",
      color: "#ef4444",
      doctors: [
        {
          name: "Dr. Mahmoud Eltony",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 2, g: "G18" },
                { id: 3, g: "G19" },
              ],
            },
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G20" },
                { id: 2, g: "G21" },
                { id: 3, g: "G22" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mohamed Abdel Wahid",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
                { id: 3, g: "G3" },
              ],
            },
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G4" },
                { id: 2, g: "G5" },
                { id: 3, g: "G6" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G7" },
                { id: 2, g: "G8" },
                { id: 3, g: "G9" },
              ],
            },
          ],
        },
        {
          name: "Dr. Gaber Abdel Gawad",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G10" },
                { id: 2, g: "G11" },
                { id: 3, g: "G12" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G13" },
                { id: 2, g: "G14" },
                { id: 3, g: "G15" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G16" },
                { id: 2, g: "G17" },
              ],
            },
          ],
        },
        {
          name: "Dr. Thoraya",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G24" },
                { id: 2, g: "G25" },
                { id: 3, g: "G26" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Accounting for Corporations",
      color: "#3b82f6",
      doctors: [
        {
          name: "Dr. Amr Hassan",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G10" },
                { id: 2, g: "G11" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G12" },
                { id: 2, g: "G13" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mohamed El Ardy",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
              ],
            },
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G3" },
                { id: 2, g: "G4" },
                { id: 4, g: "G5" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G6" },
                { id: 2, g: "G7" },
              ],
            },
          ],
        },
        {
          name: "Dr. Ahmed Ibrahim",
          schedule: [
            { day: "Saturday", slots: [{ id: 3, g: "G14" }] },
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G15" },
                { id: 2, g: "G16" },
                { id: 4, g: "G17" },
              ],
            },
          ],
        },
        {
          name: "Dr. Soha Samir",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G18" },
                { id: 2, g: "G19" },
                { id: 3, g: "G20" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G21" },
                { id: 2, g: "G22" },
                { id: 3, g: "G23" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G24" },
                { id: 2, g: "G25" },
                { id: 3, g: "G26" },
              ],
            },
          ],
        },
        {
          name: "Dr. Yasmeen Abdel Aal",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G8" },
                { id: 2, g: "G9" },
              ],
            },
          ],
        },
        {
          name: "Dr. Hamdy Habl",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G22" },
                { id: 2, g: "G23" },
                { id: 3, g: "G24" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "System Analysis 2",
      color: "#8b5cf6",
      sections: [],
      doctors: [
        {
          name: "Dr. Menna Ibrahim",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G8" },
                { id: 2, g: "G9" },
                { id: 3, g: "G10" },
              ],
            },
          ],
        },
        {
          name: "Dr. Wael Karam",
          schedule: [
            { day: "Saturday", slots: [{ id: 4, g: "G1" }] },
            {
              day: "Thursday",
              slots: [
                { id: 2, g: "G2" },
                { id: 3, g: "G3" },
                { id: 4, g: "G4" },
              ],
            },
          ],
        },
        {
          name: "Dr. Ashraf Said",
          schedule: [
            { day: "Saturday", slots: [{ id: 1, g: "G22" }] },
            { day: "Sunday", slots: [{ id: 2, g: "G15" }] },
          ],
        },
        {
          name: "Dr. Amr Galal",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 2, g: "G5" },
                { id: 3, g: "G6" },
                { id: 4, g: "G7" },
              ],
            },
          ],
        },
        {
          name: "Dr. Antony",
          schedule: [
            {
              day: "Tuesday",
              slots: [
                { id: 1, g: "G11" },
                { id: 2, g: "G12" },
                { id: 3, g: "G13" },
              ],
            },
            { day: "Wednesday", slots: [{ id: 1, g: "G14" }] },
          ],
        },
        {
          name: "Dr. Walaa Mohamed",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G19" },
                { id: 2, g: "G20" },
                { id: 3, g: "G21" },
              ],
            },
          ],
        },
        {
          name: "Dr. Sara Naeem",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 2, g: "G15" },
                { id: 3, g: "G16" },
                { id: 4, g: "G17" },
              ],
            },
          ],
        },
        {
          name: "Dr. Amira Mohie",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G23" },
                { id: 2, g: "G24" },
                { id: 3, g: "G25" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Programming 2",
      color: "#f59e0b",
      sections: [],
      doctors: [
        {
          name: "Dr. Mahmoud Bahlol",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G25" },
                { id: 2, g: "G26" },
              ],
            },
          ],
        },
        {
          name: "Dr. Amr Mansour",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 4, g: "G21" },
                { id: 5, g: "G22" },
              ],
            },
            {
              day: "Tuesday",
              slots: [
                { id: 2, g: "G23" },
                { id: 3, g: "G24" },
              ],
            },
          ],
        },
        {
          name: "Dr. Wael Haider",
          schedule: [
            { day: "Tuesday", slots: [{ id: 3, g: "G17" }] },
            {
              day: "Thursday",
              slots: [
                { id: 2, g: "G18" },
                { id: 3, g: "G19" },
                { id: 4, g: "G20" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mahmoud Halawa",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G9" },
                { id: 2, g: "G10" },
                { id: 3, g: "G11" },
              ],
            },
            { day: "Wednesday", slots: [{ id: 1, g: "G12" }] },
          ],
        },
        {
          name: "Dr. Mohamed Atteya",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 4, g: "G5" },
                { id: 5, g: "G6" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 4, g: "G7" },
                { id: 5, g: "G8" },
              ],
            },
          ],
        },
        {
          name: "Dr. Amr Ibrahim",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G13" },
                { id: 2, g: "G15" },
                { id: 3, g: "G16" },
              ],
            },
          ],
        },
        {
          name: "Dr. Heba Mohsen",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
                { id: 3, g: "G3" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Marketing",
      color: "#ec4899",
      doctors: [
        {
          name: "Dr. Wafaa Abdel Samie",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
                { id: 3, g: "G3" },
              ],
            },
            { day: "Tuesday", slots: [{ id: 1, g: "G4" }] },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G5" },
                { id: 2, g: "G6" },
                { id: 3, g: "G7" },
              ],
            },
          ],
        },
        {
          name: "Dr. Rasha El Naggar",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G8" },
                { id: 2, g: "G9" },
                { id: 3, g: "G10" },
              ],
            },
          ],
        },
        {
          name: "Dr. Amira Moussa",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G11" },
                { id: 2, g: "G12" },
                { id: 3, g: "G13" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mohamed Ramadan",
          schedule: [
            {
              day: "Tuesday",
              slots: [
                { id: 2, g: "G14" },
                { id: 4, g: "G15" },
                { id: 5, g: "G16" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G17" },
                { id: 2, g: "G18" },
                { id: 4, g: "G19" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mostafa Youssef",
          schedule: [
            {
              day: "Tuesday",
              slots: [
                { id: 2, g: "G20" },
                { id: 4, g: "G21" },
                { id: 5, g: "G22" },
              ],
            },
            { day: "Thursday", slots: [{ id: 3, g: "G23" }] },
          ],
        },
        {
          name: "Dr. Sarah Hashem",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G25" },
                { id: 2, g: "G26" },
                { id: 3, g: "G24" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Creative Thinking",
      color: "#14b8a6",
      doctors: [
        {
          name: "Dr. Mohamed El Tayar",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 2, g: "G17" },
                { id: 3, g: "G18" },
                { id: 4, g: "G19" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mai Qenawi",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G14" },
                { id: 2, g: "G15" },
                { id: 3, g: "G16" },
              ],
            },
          ],
        },
        {
          name: "Dr. Hanan Morsi",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 4, g: "G10" },
                { id: 5, g: "G11" },
              ],
            },
          ],
        },
        {
          name: "Dr. Abeer El Ghandour",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
                { id: 3, g: "G3" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mohamed Obeid",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G24" },
                { id: 3, g: "G25" },
                { id: 4, g: "G26" },
              ],
            },
          ],
        },
        {
          name: "Dr. Marwa El Badry",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 4, g: "G4" },
                { id: 5, g: "G5" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mona Zaghloul",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G20" },
                { id: 2, g: "G21" },
              ],
            },
          ],
        },
        {
          name: "Dr. Nahla El Shourbagy",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 3, g: "G22" },
                { id: 4, g: "G23" },
              ],
            },
          ],
        },
      ],
    },
  ],
  3: [
    {
      name: "Economics of Information",
      color: "#6366f1",
      doctors: [
        {
          name: "Dr. Somaya Abdel Mawla",
          schedule: [
            { day: "Saturday", slots: [{ id: 4, g: "G4" }] },
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G5" },
                { id: 2, g: "G6" },
                { id: 3, g: "G7" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G8" },
                { id: 2, g: "G9" },
                { id: 3, g: "G10" },
              ],
            },
          ],
        },
        {
          name: "Dr. Shaimaa Wehbe",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 1, g: "G17" },
                { id: 2, g: "G18" },
                { id: 3, g: "G19" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G20" },
                { id: 2, g: "G21" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G22" },
                { id: 2, g: "G23" },
                { id: 3, g: "G24" },
              ],
            },
          ],
        },
        {
          name: "Dr. Rasha El Kordi",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G11" },
                { id: 2, g: "G12" },
                { id: 3, g: "G13" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G14" },
                { id: 2, g: "G15" },
                { id: 3, g: "G16" },
              ],
            },
          ],
        },
        {
          name: "Dr. Omar Salman",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
                { id: 3, g: "G3" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Auditing",
      color: "#06b6d4",
      doctors: [
        {
          name: "Dr. Eman Saad El Din",
          schedule: [
            { day: "Saturday", slots: [{ id: 5, g: "G18" }] },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G19" },
                { id: 2, g: "G20" },
                { id: 3, g: "G21" },
              ],
            },
          ],
        },
        {
          name: "Dr. Ashraf Mansour",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 1, g: "G9" },
                { id: 2, g: "G10" },
                { id: 3, g: "G11" },
              ],
            },
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G12" },
                { id: 2, g: "G13" },
                { id: 3, g: "G14" },
              ],
            },
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G15" },
                { id: 2, g: "G16" },
                { id: 3, g: "G17" },
              ],
            },
          ],
        },
        {
          name: "Dr. Hanan Jaber",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G3" },
                { id: 2, g: "G4" },
                { id: 3, g: "G5" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G6" },
                { id: 2, g: "G7" },
                { id: 3, g: "G8" },
              ],
            },
          ],
        },
        {
          name: "Dr. Hamdy Habl",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G22" },
                { id: 2, g: "G23" },
                { id: 3, g: "G24" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Management Information Systems",
      color: "#84cc16",
      doctors: [
        {
          name: "Dr. Ahmed Mounir",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 1, g: "G11" },
                { id: 2, g: "G12" },
                { id: 3, g: "G13" },
              ],
            },
            { day: "Monday", slots: [{ id: 1, g: "G10" }] },
          ],
        },
        {
          name: "Dr. Bishoy",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 1, g: "G17" },
                { id: 2, g: "G18" },
                { id: 3, g: "G19" },
              ],
            },
          ],
        },
        {
          name: "Dr. Christina Albert",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G4" },
                { id: 2, g: "G5" },
                { id: 3, g: "G6" },
              ],
            },
          ],
        },
        {
          name: "Dr. Shirin Tayea",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G7" },
                { id: 2, g: "G8" },
                { id: 3, g: "G9" },
              ],
            },
          ],
        },
        {
          name: "Dr. Yehia Helmy",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 2, g: "G1" },
                { id: 3, g: "G2" },
                { id: 4, g: "G3" },
              ],
            },
          ],
        },
        {
          name: "Dr. Dalia Magdy",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G14" },
                { id: 2, g: "G15" },
                { id: 3, g: "G16" },
              ],
            },
          ],
        },
        {
          name: "Dr. Dina Helal",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G20" },
                { id: 2, g: "G21" },
                { id: 3, g: "G22" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Internet Application",
      color: "#f43f5e",
      doctors: [
        {
          name: "Dr. Amani Ahmed",
          schedule: [
            { day: "Saturday", slots: [{ id: 3, g: "G7" }] },
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G8" },
                { id: 2, g: "G9" },
                { id: 3, g: "G10" },
              ],
            },
          ],
        },
        {
          name: "Dr. Iman Hanafi",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 1, g: "G22" },
                { id: 2, g: "G23" },
                { id: 3, g: "G24" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mortada Salah El Din",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
                { id: 4, g: "G3" },
              ],
            },
          ],
        },
        {
          name: "Dr. Ibrahim Zaghloul",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 2, g: "G4" },
                { id: 3, g: "G5" },
                { id: 4, g: "G6" },
              ],
            },
          ],
        },
        {
          name: "Dr. Nanis Nabil",
          schedule: [
            {
              day: "Tuesday",
              slots: [
                { id: 1, g: "G15" },
                { id: 2, g: "G16" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G17" },
                { id: 2, g: "G18" },
              ],
            },
          ],
        },
        {
          name: "Dr. Thanaa Mohamed",
          schedule: [
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G11" },
                { id: 2, g: "G12" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G13" },
                { id: 2, g: "G14" },
              ],
            },
          ],
        },
        {
          name: "Dr. Noura Shoaib",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 2, g: "G19" },
                { id: 3, g: "G20" },
                { id: 4, g: "G21" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Advanced Database",
      color: "#a855f7",
      doctors: [
        {
          name: "Dr. Mohamed Hassan",
          schedule: [
            {
              day: "Saturday",
              slots: [
                { id: 4, g: "G9" },
                { id: 5, g: "G10" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G11" },
                { id: 2, g: "G12" },
              ],
            },
          ],
        },
        {
          name: "Dr. Menna Mamdouh",
          schedule: [
            { day: "Sunday", slots: [{ id: 1, g: "G23" }] },
            { day: "Wednesday", slots: [{ id: 1, g: "G24" }] },
          ],
        },
        {
          name: "Dr. Ibrahim El Desouki",
          schedule: [
            { day: "Monday", slots: [{ id: 1, g: "G5" }] },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G6" },
                { id: 2, g: "G7" },
                { id: 3, g: "G8" },
              ],
            },
          ],
        },
        {
          name: "Dr. Ahmed El Sidawy",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 4, g: "G1" },
                { id: 5, g: "G2" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 3, g: "G3" },
                { id: 4, g: "G4" },
              ],
            },
          ],
        },
        {
          name: "Dr. Yasser El Gedawy",
          schedule: [
            { day: "Monday", slots: [{ id: 1, g: "G19" }] },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G20" },
                { id: 4, g: "G21" },
                { id: 5, g: "G22" },
              ],
            },
          ],
        },
        {
          name: "Dr. Mira Tamer",
          schedule: [
            {
              day: "Tuesday",
              slots: [
                { id: 1, g: "G16" },
                { id: 2, g: "G17" },
                { id: 3, g: "G18" },
              ],
            },
          ],
        },
        {
          name: "Dr. Hany Gouda",
          schedule: [
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G13" },
                { id: 2, g: "G14" },
                { id: 3, g: "G15" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Operation Research",
      color: "#fbbf24",
      doctors: [
        {
          name: "Dr. Ghada Taha",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G15" },
                { id: 2, g: "G16" },
                { id: 3, g: "G17" },
              ],
            },
            { day: "Wednesday", slots: [{ id: 1, g: "G18" }] },
          ],
        },
        {
          name: "Dr. Mahmoud Sadeq",
          schedule: [
            {
              day: "Sunday",
              slots: [
                { id: 1, g: "G11" },
                { id: 2, g: "G12" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G13" },
                { id: 2, g: "G14" },
              ],
            },
          ],
        },
        {
          name: "Dr. Ahmed Abdel Hadi",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G1" },
                { id: 2, g: "G2" },
                { id: 5, g: "G3" },
              ],
            },
            {
              day: "Wednesday",
              slots: [
                { id: 1, g: "G4" },
                { id: 3, g: "G5" },
              ],
            },
          ],
        },
        {
          name: "Dr. Khaled Mohamed",
          schedule: [
            {
              day: "Monday",
              slots: [
                { id: 1, g: "G19" },
                { id: 1, g: "G21" },
                { id: 4, g: "G20" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G22" },
                { id: 2, g: "G23" },
                { id: 4, g: "G24" },
              ],
            },
          ],
        },
        {
          name: "Dr. Hend Atteya",
          schedule: [
            {
              day: "Tuesday",
              slots: [
                { id: 2, g: "G6" },
                { id: 3, g: "G7" },
              ],
            },
            {
              day: "Thursday",
              slots: [
                { id: 1, g: "G8" },
                { id: 2, g: "G9" },
                { id: 3, g: "G10" },
              ],
            },
          ],
        },
      ],
    },
  ],
  4: [
    // Coming Soon - Level 4 data will be added here later
    {
      name: "⚠️ Coming Soon",
      color: "#94a3b8",
      doctors: [
        {
          name: "Level 4 courses will be added soon",
          schedule: [{ day: "Saturday", slots: [{ id: 1, g: "INFO" }] }],
        },
      ],
    },
  ],
};

Object.keys(updatedCoursesData).forEach((level) => {
  updatedCoursesData[level] = (updatedCoursesData[level] || []).map(
    normalizeSubjectData,
  );
});

// 3. Logic & State Management
let selectedYear = null;
let scheduleData = {};
let previewData = null;
let draggedSlot = null;
let selectionMode = "lectures";
let quickActionsState = null;

function getCellEntries(key) {
  if (Array.isArray(scheduleData[key])) return scheduleData[key];
  if (scheduleData[key] && typeof scheduleData[key] === "object") {
    const legacy = { ...scheduleData[key] };
    if (!legacy.entryId) legacy.entryId = makeEntryId();
    if (!legacy.type) legacy.type = "lecture";
    if (!legacy.teamsCode) legacy.teamsCode = "";
    scheduleData[key] = [legacy];
    return scheduleData[key];
  }
  return [];
}

function addEntryToCell(key, entry) {
  const entries = Array.isArray(scheduleData[key]) ? scheduleData[key] : [];
  entries.push(entry);
  scheduleData[key] = entries;
}

function removeEntryById(entryId) {
  Object.keys(scheduleData).forEach((key) => {
    const filtered = getCellEntries(key).filter(
      (entry) => entry.entryId !== entryId,
    );
    if (filtered.length === 0) {
      delete scheduleData[key];
      return;
    }
    scheduleData[key] = filtered;
  });
}

function makeEntryId() {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getSelectionType() {
  return selectionMode === "sections" ? "section" : "lecture";
}

function getCourseByName(subjectName) {
  const courses = updatedCoursesData[selectedYear] || [];
  return courses.find((c) => c.name === subjectName);
}

function getSectionList(course) {
  if (Array.isArray(course.sections) && course.sections.length > 0) {
    return course.sections;
  }
  return (course.doctors || [])
    .filter((doctor) => /sec/i.test(doctor.name))
    .map((section) => ({
      name: section.name,
      whatsappLink: section.whatsappLink || "",
      schedule: section.schedule,
    }));
}

function getCourseOptions(course, mode) {
  if (mode === "sections") {
    return getSectionList(course);
  }
  return course.doctors || [];
}

function isSubjectLocked(subjectName, type = "lecture") {
  return Object.values(scheduleData).some((slotEntries) =>
    (slotEntries || []).some(
      (entry) => entry.name === subjectName && entry.type === type,
    ),
  );
}

function initScheduleTable() {
  const tbody = document.getElementById("scheduleBody");
  tbody.innerHTML = "";
  days.forEach((day) => {
    const row = document.createElement("tr");
    const dayCell = document.createElement("td");
    dayCell.className = "day-column";
    dayCell.textContent = day;
    row.appendChild(dayCell);
    timeSlots.forEach((slot) => {
      const cell = document.createElement("td");
      cell.id = `${day}-${slot.id}`;
      cell.className = "schedule-cell";
      cell.setAttribute("data-day", day);
      cell.setAttribute("data-slot", slot.id);
      cell.innerHTML = '<div class="slot-content slot-empty">Free</div>';

      // Events for Deletion & Selection
      cell.addEventListener("click", () => handleSlotClick(day, slot.id));
      cell.addEventListener("dragover", (e) => e.preventDefault());
      cell.addEventListener("drop", (e) => handleDrop(e, day, slot.id));

      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
}

// Updates the .active class on the static toggle buttons to match selectionMode.
// Never touches innerHTML — zero DOM cost.
function syncToggleUI() {
  document.querySelectorAll(".selector-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-mode") === selectionMode,
    );
  });
}

function selectYear(year) {
  selectedYear = year;
  document
    .querySelectorAll(".year-card")
    .forEach((c) => c.classList.remove("active"));
  if (window.event)
    window.event.currentTarget.closest(".year-card").classList.add("active");

  // Reset mode first so loadSubjects renders the correct tab immediately
  selectionMode = "lectures";
  syncToggleUI();

  loadSubjects(year);
  document.getElementById("subjectSection").style.display = "block";
  document.getElementById("scheduleSection").style.display = "block";
  initScheduleTable();
  scheduleData = {};
  previewData = null;
  closeQuickActions();
}

function loadSubjects(year) {
  const container = document.getElementById("subjectsContainer");
  container.innerHTML = "";

  const allCourses = updatedCoursesData[year] || [];

  // Strictly filter by mode
  const courses =
    selectionMode === "sections"
      ? allCourses.filter((course) => getSectionList(course).length > 0)
      : allCourses.filter((course) => (course.doctors || []).length > 0);

  if (courses.length === 0) {
    container.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);"><p>No courses available for this year.</p></div>';
    return;
  }

  // Render subject cards only — toggle buttons live statically in index.html
  let html = "";

  if (selectionMode === "sections" && siteSettings.sections_renewal_pending) {
    html += `
      <div style="grid-column: 1/-1; background: #fff3cd; border-left: 4px solid #f59e0b; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; color: #856404; font-size: 0.9rem;">
        📌 <strong>Notice:</strong> Previous section schedules have ended. New section schedules will be announced during registration for the upcoming academic year.
      </div>
    `;
  } else if (
    selectionMode === "lectures" &&
    siteSettings.courses_renewal_pending
  ) {
    html += `
      <div style="grid-column: 1/-1; background: #fff3cd; border-left: 4px solid #f59e0b; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; color: #856404; font-size: 0.9rem;">
        📌 <strong>Notice:</strong> Previous lecture schedules have ended. New lecture schedules will be announced during registration for the upcoming academic year.
      </div>
    `;
  }

  html += courses
    .map((course) => {
      const type = getSelectionType();
      const options = getCourseOptions(course, selectionMode);
      const isLocked = isSubjectLocked(course.name, type);
      const isRenewalPending =
        (type === "section" && siteSettings.sections_renewal_pending) ||
        (type === "lecture" && siteSettings.courses_renewal_pending);
      const isDisabled = isLocked || isRenewalPending;
      const lockedClass = isLocked ? "subject-locked" : "";
      const lockedBadge = isLocked
        ? '<span class="locked-badge">\uD83D\uDD12 Enrolled</span>'
        : "";
      const emptyStateText =
        selectionMode === "sections"
          ? "No sections available yet."
          : "No lectures available yet.";

      return `
            <div class="subject-card ${lockedClass}">
                <div class="subject-header">
                    <div class="subject-color" style="background: ${course.color};"></div>
                    <div class="subject-name">${course.name}</div>
                    ${lockedBadge}
                </div>
                <div class="doctor-list">
                    ${
                      options.length === 0
                        ? `<div class="doctor-item disabled">${emptyStateText}</div>`
                        : options
                            .map(
                              (option, idx) => `
                        <div class="doctor-item ${isDisabled ? "disabled" : ""}"
                             data-subject-name="${course.name}"
                             data-doctor-name="${option.name}"
                             data-color="${course.color}"
                             data-doctor-index="${idx}"
                             data-type="${type}">
                            <div class="doctor-name">${type === "section" ? "" : "👨‍🏫"} ${option.name}</div>
                            <div class="doctor-schedule" ${isRenewalPending ? 'style="white-space: normal; line-height: 1.4;"' : ""}>${formatSchedule(option.schedule, type)}</div>
                        </div>`,
                            )
                            .join("")
                    }
                </div>
            </div>`;
    })
    .join("");

  container.innerHTML = html;

  // Single delegated handler — replacing .onclick avoids listener accumulation
  // across repeated loadSubjects calls without needing removeEventListener.
  container.onclick = function (e) {
    const item = e.target.closest(".doctor-item:not(.disabled)");
    if (!item) return;

    const subjectName = item.getAttribute("data-subject-name");
    const doctorName = item.getAttribute("data-doctor-name");
    const color = item.getAttribute("data-color");
    const doctorIndex = parseInt(item.getAttribute("data-doctor-index"), 10);
    const type = item.getAttribute("data-type");
    const course = allCourses.find((c) => c.name === subjectName);
    const options = getCourseOptions(course, selectionMode);
    const selectedOption = options[doctorIndex];

    previewDoctor(
      {
        subjectName,
        doctorName,
        color,
        schedule: selectedOption.schedule,
        type,
        whatsappLink: selectedOption.whatsappLink || "#",
      },
      item,
    );
  };
}
function formatSchedule(schedule, type) {
  if (type === "section" && siteSettings.sections_renewal_pending) {
    return "📌 Notice: Previous section schedules have ended. New section schedules will be announced during registration for the upcoming academic year.";
  }
  if (type === "lecture" && siteSettings.courses_renewal_pending) {
    return "📌 Notice: Previous lecture schedules have ended. New lecture schedules will be announced during registration for the upcoming academic year.";
  }
  return schedule
    .map((item) => `${item.day}: ${item.slots.map((s) => s.g).join(", ")}`)
    .join(" | ");
}

function previewDoctor(previewItem, selectedElement) {
  clearPreview();
  previewData = {
    entryId: makeEntryId(),
    name: previewItem.subjectName,
    doctor: previewItem.doctorName,
    color: previewItem.color,
    schedule: previewItem.schedule,
    type: previewItem.type,
    whatsappLink: previewItem.whatsappLink,
  };
  document
    .querySelectorAll(".doctor-item")
    .forEach((i) => i.classList.remove("selected"));
  selectedElement.classList.add("selected");

  // Group slots by cell key so we can render a combined preview per cell
  // (a TA may have two half-slots in the same 2-hour block: h=1 and h=2)
  const cellSlotMap = new Map(); // key → [slotData, ...]
  previewData.schedule.forEach((item) => {
    item.slots.forEach((slotData) => {
      const key = `${item.day}-${slotData.id}`;
      if (!cellSlotMap.has(key)) cellSlotMap.set(key, []);
      cellSlotMap.get(key).push({ day: item.day, slotData });
    });
  });

  cellSlotMap.forEach((daySlots, key) => {
    const cell = document.getElementById(key);
    if (!cell) return;

    const entries = getCellEntries(key);
    const hasLecture = entries.some((e) => e.type === "lecture");
    const sectionEntries = entries.filter((e) => e.type === "section");
    const occupiedHalves = new Set(
      sectionEntries.map((e) => e.half).filter(Boolean),
    );

    if (previewData.type === "lecture") {
      // Lectures need the cell completely empty
      if (entries.length > 0) return;
      const slotData = daySlots[0].slotData;
      cell.classList.add("preview-highlight");
      cell.innerHTML = `
                <div class="slot-content slot-preview" style="background:${previewData.color};opacity:0.5;">
                    <div class="slot-subject">${previewData.name}</div>
                    <div class="slot-doctor">${previewData.doctor}</div>
                    <div class="slot-group">${slotData.g}</div>
                    <div class="slot-hint">Click to add</div>
                </div>`;
      return;
    }

    // Section: collect only the half-slots that are actually free
    const validSlots = daySlots.filter(({ slotData }) => {
      if (hasLecture) return false;
      const requestedHalf = slotData.h || null;
      // If no h value, check if there's a free half at all
      if (!requestedHalf) return sectionEntries.length < 2;
      // If h value exists, only allow if that specific half is free
      return !occupiedHalves.has(requestedHalf);
    });

    if (validSlots.length === 0) return;

    cell.classList.add("preview-highlight");

    // Build preview HTML — show each valid half-slot as its own strip
    const previewParts = validSlots.map(({ slotData }) => {
      const halfClass = slotData.h
        ? `slot-half-height slot-half-${slotData.h}`
        : "";
      return `
                <div class="slot-content slot-preview slot-section ${halfClass}"
                     style="background:${previewData.color};opacity:0.5;"
                     data-preview-h="${slotData.h || ""}"
                     data-preview-g="${slotData.g}">
                    <div class="slot-subject">${previewData.name}</div>
                    <div class="slot-doctor">${previewData.doctor}</div>
                    <div class="slot-group">${slotData.g}</div>
                    <div class="slot-hint">Click to add</div>
                </div>`;
    });

    const wrapClass =
      validSlots.length > 1 ? "slot-stack slot-split" : "slot-stack";
    cell.innerHTML = `<div class="${wrapClass}">${previewParts.join("")}</div>`;
  });
}

// ✅ 2. Feature: Individual Slot Management
function handleSlotClick(day, slotId) {
  const key = `${day}-${slotId}`;
  if (!previewData) return;

  // Collect all of this TA's slots for this day+period
  const matchingSlots = [];
  previewData.schedule.forEach((item) => {
    if (item.day === day) {
      item.slots.forEach((s) => {
        if (s.id === slotId) matchingSlots.push(s);
      });
    }
  });

  if (matchingSlots.length === 0)
    return alert("⚠️ This slot is not available for the selected doctor.");

  const existing = getCellEntries(key);
  const hasLecture = existing.some((entry) => entry.type === "lecture");
  const sectionEntries = existing.filter((entry) => entry.type === "section");
  const occupiedHalves = new Set(
    sectionEntries.map((entry) => entry.half).filter(Boolean),
  );

  if (previewData.type === "section" && hasLecture) {
    return alert(
      "⚠️ Conflict: You already have a lecture scheduled at this time.",
    );
  }
  if (previewData.type === "lecture" && existing.length > 0) {
    return alert("⚠️ Conflict: This time slot already has sections assigned.");
  }

  if (previewData.type === "section") {
    // ── Determine which single slot to place ────────────────────────────
    // If the student clicked directly on a specific preview strip (half-slot),
    // that strip carries data-preview-h so we honor exactly that half.
    // If they clicked the cell container itself, we pick the best free slot.
    const cell = document.getElementById(key);
    const clickedStrip = cell && cell.querySelector("[data-preview-h]");
    const clickedHalfStr = clickedStrip
      ? clickedStrip.getAttribute("data-preview-h")
      : null;
    const clickedHalf = clickedHalfStr ? parseInt(clickedHalfStr, 10) : null;

    // Pick the ONE slot to place:
    // Priority 1 — slot matching the strip the student actually clicked
    // Priority 2 — first placeable slot (cell had only one visible strip anyway)
    let chosenSlot = null;
    if (clickedHalf) {
      chosenSlot = matchingSlots.find((s) => s.h === clickedHalf) || null;
    }
    if (!chosenSlot) {
      // Fall back to the first slot whose half is free
      chosenSlot =
        matchingSlots.find((s) => {
          const h = s.h || null;
          if (!h) return occupiedHalves.size < 2;
          return !occupiedHalves.has(h);
        }) || null;
    }

    if (!chosenSlot) {
      return occupiedHalves.size >= 2
        ? alert("⚠️ This 2-hour block already has sections in both hours.")
        : alert(
            "⚠️ Conflict: The required hour for this section is already taken.",
          );
    }

    // Determine the half to assign
    const requestedHalf = chosenSlot.h || null;
    let assignedHalf;
    if (requestedHalf && !occupiedHalves.has(requestedHalf)) {
      assignedHalf = requestedHalf;
    } else if (!requestedHalf) {
      assignedHalf = occupiedHalves.has(1) ? 2 : 1;
    } else {
      return alert(
        "⚠️ Conflict: The required hour for this section is already taken.",
      );
    }

    if (getCellEntries(key).filter((e) => e.type === "section").length >= 2) {
      return alert("⚠️ This 2-hour block already has sections in both hours.");
    }

    // Add exactly ONE entry
    addEntryToCell(key, {
      ...previewData,
      entryId: makeEntryId(), // fresh ID for this single placement
      group: chosenSlot.g,
      teamsCode: chosenSlot.teamsCode || "",
      half: assignedHalf,
    });
  } else {
    // Lecture — always a single slot
    const slotData = matchingSlots[0];
    addEntryToCell(key, {
      ...previewData,
      group: slotData.g,
      teamsCode: slotData.teamsCode || "",
      half: null,
    });
  }

  clearPreview();
  previewData = null;
  document
    .querySelectorAll(".doctor-item")
    .forEach((i) => i.classList.remove("selected"));
  renderSchedule();
  loadSubjects(selectedYear);
}

// ✅ 3. Feature: ENHANCED Drag and Drop with Valid Slot Highlighting
function highlightValidDropTargets(entryData) {
  // Clear any existing highlights
  clearDragHighlights();

  // Find the course and doctor
  const course = updatedCoursesData[selectedYear].find(
    (c) => c.name === entryData.name,
  );
  if (!course) return;

  const options =
    entryData.type === "section" ? getSectionList(course) : course.doctors;
  const option = options.find((d) => d.name === entryData.doctor);
  if (!option) return;

  // Highlight all valid slots for this doctor with the course color at 30% opacity
  option.schedule.forEach((item) => {
    item.slots.forEach((slotData) => {
      const cellKey = `${item.day}-${slotData.id}`;
      const cell = document.getElementById(cellKey);
      const entries = getCellEntries(cellKey);
      const hasLecture = entries.some((entry) => entry.type === "lecture");
      const sectionEntries = entries.filter(
        (entry) => entry.type === "section",
      );
      const occupiedHalves = new Set(
        sectionEntries.map((entry) => entry.half).filter(Boolean),
      );

      let validByType;
      if (entryData.type === "lecture") {
        validByType = entries.length === 0;
      } else {
        if (hasLecture) {
          validByType = false;
        } else {
          const requestedHalf = slotData.h || null;
          if (!requestedHalf) {
            validByType = occupiedHalves.size < 2;
          } else {
            validByType = !occupiedHalves.has(requestedHalf);
          }
        }
      }

      if (cell && validByType) {
        cell.classList.add("drag-target-highlight");
        cell.style.backgroundColor = `${entryData.color}30`;
        cell.style.border = `2px dashed ${entryData.color}`;
      }
    });
  });
}

function clearDragHighlights() {
  document.querySelectorAll(".drag-target-highlight").forEach((cell) => {
    cell.classList.remove("drag-target-highlight");
    cell.style.backgroundColor = "";
    cell.style.border = "";
  });
}

function handleDragStart(e, day, slotId, entryId) {
  const key = `${day}-${slotId}`;
  const entry = getCellEntries(key).find((item) => item.entryId === entryId);
  if (!entry) return;
  draggedSlot = { key, data: entry };
  e.currentTarget.style.opacity = "0.5";
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", entryId);

  highlightValidDropTargets(draggedSlot.data);
}

function handleDragEnd(e) {
  e.currentTarget.style.opacity = "1";
  clearDragHighlights();
  draggedSlot = null;
}

function findSlotInProviderSchedule(entryData, targetDay, targetSlotId) {
  const course = getCourseByName(entryData.name);
  if (!course) return null;
  const options =
    entryData.type === "section" ? getSectionList(course) : course.doctors;
  const option = (options || []).find((d) => d.name === entryData.doctor);
  if (!option) return null;

  for (const dayItem of option.schedule || []) {
    if (dayItem.day !== targetDay) continue;
    const found = (dayItem.slots || []).find((s) => s.id === targetSlotId);
    if (found) return found;
  }
  return null;
}

function handleDrop(e, targetDay, targetSlotId) {
  e.preventDefault();
  if (!draggedSlot) return;

  const targetKey = `${targetDay}-${targetSlotId}`;

  // ── Build a clean picture of the target cell that EXCLUDES the dragged
  // entry. This is essential for both same-cell repositioning (where the
  // entry is still present in scheduleData) and cross-cell moves (where
  // the entry is absent but its entryId is still distinct).
  const allTargetEntries = getCellEntries(targetKey);
  const targetEntries = allTargetEntries.filter(
    (e) => e.entryId !== draggedSlot.data.entryId,
  );
  const hasLecture = targetEntries.some((entry) => entry.type === "lecture");
  const targetSections = targetEntries.filter(
    (entry) => entry.type === "section",
  );
  const occupiedHalves = new Set(
    targetSections.map((e) => e.half).filter(Boolean),
  );

  // Guard: lecture into occupied cell (not counting itself)
  if (draggedSlot.data.type === "lecture" && targetEntries.length > 0) {
    clearDragHighlights();
    return alert("⚠️ Target slot is already occupied!");
  }
  // Guard: section into a cell that has a lecture
  if (draggedSlot.data.type === "section" && hasLecture) {
    clearDragHighlights();
    return alert("⚠️ Conflict: You have a lecture at this time!");
  }

  // Helper: remove the dragged entry from its source cell
  function removeFromSource() {
    const sourceEntries = getCellEntries(draggedSlot.key).filter(
      (entry) => entry.entryId !== draggedSlot.data.entryId,
    );
    if (sourceEntries.length === 0) delete scheduleData[draggedSlot.key];
    else scheduleData[draggedSlot.key] = sourceEntries;
  }

  if (draggedSlot.data.type === "section") {
    // Find the provider-schedule slot for the target cell.
    // Prefer an exact half-match so TAs with two slots in the same period
    // (e.g. h=1 and h=2 both on Tuesday P1) resolve to the right one.
    const draggedHalf = draggedSlot.data.half || null;
    let resolvedSlot = null;

    const course = getCourseByName(draggedSlot.data.name);
    const options = course ? getSectionList(course) : [];
    const option = options.find((d) => d.name === draggedSlot.data.doctor);

    if (option) {
      for (const dayItem of option.schedule || []) {
        if (dayItem.day !== targetDay) continue;
        const exactMatch = (dayItem.slots || []).find(
          (s) => s.id === targetSlotId && (s.h || null) === draggedHalf,
        );
        const anyMatch = (dayItem.slots || []).find(
          (s) => s.id === targetSlotId,
        );
        resolvedSlot = exactMatch || anyMatch || null;
        if (resolvedSlot) break;
      }
    }

    if (!resolvedSlot) {
      clearDragHighlights();
      return alert("⚠️ Not available in provider schedule!");
    }

    // Determine the half to assign:
    // 1. Use the resolved slot's h if it is free.
    // 2. Fall back to the dragged entry's stored half if different and free.
    // 3. Auto-pick the remaining free half if neither is specified.
    const requestedHalf = resolvedSlot.h || null;
    let assignedHalf;

    if (requestedHalf && !occupiedHalves.has(requestedHalf)) {
      assignedHalf = requestedHalf;
    } else if (
      !requestedHalf &&
      draggedHalf &&
      !occupiedHalves.has(draggedHalf)
    ) {
      // No h in schedule but the dragged entry already has a half — keep it
      assignedHalf = draggedHalf;
    } else if (!requestedHalf && !draggedHalf && occupiedHalves.size < 2) {
      // Neither source has a half preference — auto-pick the free one
      assignedHalf = occupiedHalves.has(1) ? 2 : 1;
    } else {
      clearDragHighlights();
      return occupiedHalves.size >= 2
        ? alert("⚠️ This 2-hour block already has sections in both hours.")
        : alert(
            "⚠️ Conflict: The required hour for this section is already taken.",
          );
    }

    removeFromSource();
    addEntryToCell(targetKey, {
      ...draggedSlot.data,
      group: resolvedSlot.g,
      teamsCode: resolvedSlot.teamsCode || "",
      half: assignedHalf,
    });
  } else {
    // Lecture drop
    const slotAvailability = findSlotInProviderSchedule(
      draggedSlot.data,
      targetDay,
      targetSlotId,
    );
    if (!slotAvailability) {
      clearDragHighlights();
      return alert("⚠️ Not available in provider schedule!");
    }
    removeFromSource();
    addEntryToCell(targetKey, {
      ...draggedSlot.data,
      group: slotAvailability.g,
      teamsCode: slotAvailability.teamsCode || "",
      half: null,
    });
  }

  clearDragHighlights();
  draggedSlot = null;
  renderSchedule();
}

function openQuickActions(entry, event) {
  closeQuickActions();
  quickActionsState = { entryId: entry.entryId };

  const menu = document.createElement("div");
  menu.className = "quick-actions-menu";
  menu.id = "quickActionsMenu";
  menu.innerHTML = `
        <div class="quick-title">${entry.name} - ${entry.group}${entry.type === "section" ? ' <span class="sec-pill">SEC</span>' : ""}</div>
        <div class="quick-sub">${entry.doctor}</div>
        <button type="button" class="quick-btn" data-action="copy">Copy Teams Code</button>
        <button type="button" class="quick-btn" data-action="whatsapp">Go to WhatsApp Group</button>
        <button type="button" class="quick-btn danger" data-action="remove">Remove from Schedule</button>
    `;
  document.body.appendChild(menu);

  const x = Math.min(event.clientX + 10, window.innerWidth - 260);
  const y = Math.min(event.clientY + 10, window.innerHeight - 230);
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  menu
    .querySelector('[data-action="copy"]')
    .addEventListener("click", async () => {
      const teamsCode = entry.teamsCode || "Coming Soon";
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(teamsCode);
          alert("Teams code copied.");
        } else {
          alert(`Teams Code: ${teamsCode}`);
        }
      } catch (error) {
        alert(`Teams Code: ${teamsCode}`);
      }
    });

  menu
    .querySelector('[data-action="whatsapp"]')
    .addEventListener("click", () => {
      if (!entry.whatsappLink || entry.whatsappLink === "#") {
        alert("Contact link will be available soon.");
        return;
      }
      window.open(entry.whatsappLink, "_blank");
    });

  menu.querySelector('[data-action="remove"]').addEventListener("click", () => {
    removeEntryById(entry.entryId);
    closeQuickActions();
    renderSchedule();
    loadSubjects(selectedYear);
  });
}

function closeQuickActions() {
  const menu = document.getElementById("quickActionsMenu");
  if (menu) menu.remove();
  quickActionsState = null;
}

function renderSchedule() {
  days.forEach((day) => {
    timeSlots.forEach((slot) => {
      const cell = document.getElementById(`${day}-${slot.id}`);
      const key = `${day}-${slot.id}`;
      const entries = getCellEntries(key);

      if (entries.length > 0) {
        const sortedEntries = [...entries].sort((a, b) => {
          if (a.type === b.type) {
            if (a.type === "section") {
              return (a.half || 0) - (b.half || 0);
            }
            return 0;
          }
          return a.type === "lecture" ? -1 : 1;
        });
        const isSplit = sortedEntries.every(
          (entry) => entry.type === "section",
        );
        cell.innerHTML = `
                    <div class="slot-stack ${isSplit ? "slot-split" : ""}">
                        ${sortedEntries
                          .map(
                            (entry) => `
                            <div class="slot-content slot-confirmed ${entry.type === "section" ? `slot-section slot-half-height slot-half-${entry.half || ""}` : ""}" 
                                 data-entry-id="${entry.entryId}" 
                                 draggable="true"
                                 style="background: ${entry.color}; color: white; cursor: move;">
                                ${entry.type === "section" ? '<span class="sec-badge">SEC</span>' : ""}
                                <div class="slot-subject">${entry.name}</div>
                                <div class="slot-doctor">${entry.doctor}</div>
                                <div class="slot-group">${entry.group}</div>
                                <div class="slot-delete-hint">Click for actions</div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>`;

        cell.querySelectorAll(".slot-confirmed").forEach((div) => {
          const entryId = div.getAttribute("data-entry-id");
          div.setAttribute("draggable", "true");
          div.addEventListener("dragstart", (e) =>
            handleDragStart(e, day, slot.id, entryId),
          );
          div.addEventListener("dragend", handleDragEnd);
          div.addEventListener("click", (e) => {
            e.stopPropagation();
            const entry = getCellEntries(key).find(
              (item) => item.entryId === entryId,
            );
            if (!entry) return;
            openQuickActions(entry, e);
          });
        });
      } else {
        cell.innerHTML = '<div class="slot-content slot-empty">Free</div>';
      }
    });
  });
}

function clearPreview() {
  document.querySelectorAll(".preview-highlight").forEach((cell) => {
    cell.classList.remove("preview-highlight");
    const key = `${cell.dataset.day}-${cell.dataset.slot}`;
    const entries = getCellEntries(key);
    if (entries.length === 0) {
      cell.innerHTML = '<div class="slot-content slot-empty">Free</div>';
    }
  });
}

function resetSchedule() {
  if (confirm("Are you sure you want to reset your schedule?")) {
    selectedYear = null;
    scheduleData = {};
    previewData = null;
    draggedSlot = null;
    closeQuickActions();

    document.getElementById("subjectSection").style.display = "none";
    document.getElementById("scheduleSection").style.display = "none";

    document.querySelectorAll(".year-card").forEach((card) => {
      card.classList.remove("active");
    });
  }
}

// ✅ 4. Feature: Export Functionality FIXED
async function downloadAsImage() {
  const table = document.getElementById("scheduleTableContainer");
  if (!table) {
    alert("⚠️ Schedule table not found!");
    return;
  }

  if (!window.html2canvas) {
    alert("⚠️ html2canvas library not loaded. Please refresh the page.");
    return;
  }

  try {
    clearPreview();
    clearDragHighlights();
    closeQuickActions();

    const canvas = await html2canvas(table, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split("T")[0];
    link.download = `BIS_Schedule_Year${selectedYear}_${timestamp}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    console.log(" Schedule exported as image successfully");
  } catch (error) {
    alert(" Error creating image: " + error.message);
    console.error("Export error:", error);
  }
}

async function downloadAsPDF() {
  const table = document.getElementById("scheduleTableContainer");

  if (!table) {
    alert("⚠️ Schedule table not found!");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("⚠️ jsPDF library not loaded. Please refresh the page.");
    return;
  }

  try {
    clearPreview();
    clearDragHighlights();
    closeQuickActions();

    const canvas = await html2canvas(table, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 280;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const x = (297 - imgWidth) / 2;

    pdf.addImage(imgData, "PNG", x, 10, imgWidth, imgHeight);

    const timestamp = new Date().toISOString().split("T")[0];
    pdf.save(`BIS_Schedule_Year${selectedYear}_${timestamp}.pdf`);

    console.log("Schedule exported as PDF successfully");
  } catch (error) {
    alert(" Error creating PDF: " + error.message);
    console.error("PDF export error:", error);
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  // ── Close quick-actions menu on outside click ──────────────────────────
  document.addEventListener("click", function (event) {
    const menu = document.getElementById("quickActionsMenu");
    if (menu && !menu.contains(event.target)) {
      closeQuickActions();
    }
  });

  // ── Static toggle buttons (Lectures / Sections) ────────────────────────
  // Buttons live permanently in index.html; only their .active class and
  // the subject list need to change — no DOM recreation on every toggle.
  document.querySelectorAll(".selector-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const mode = this.getAttribute("data-mode");
      if (mode === selectionMode || !selectedYear) return;
      selectionMode = mode;
      syncToggleUI();
      previewData = null;
      clearPreview();
      loadSubjects(selectedYear);
    });
  });
});

// Expose functions to window for inline HTML handlers
window.selectYear = selectYear;
window.resetSchedule = resetSchedule;
window.downloadAsImage = downloadAsImage;
window.downloadAsPDF = downloadAsPDF;

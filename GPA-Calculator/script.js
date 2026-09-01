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
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();

  // Load courses from Supabase
  loadCoursesFromSupabase();
});

// Load courses from Supabase
async function loadCoursesFromSupabase() {
  try {
    const { data: supabaseCourses, error } = await supabase
      .from("courses")
      .select("*");

    if (error) {
      console.error("Error fetching courses from Supabase:", error.message);
      return;
    }

    if (supabaseCourses && supabaseCourses.length > 0) {
      // Map the snake_case from DB to camelCase if needed,
      // but wait, the DB schema is code, name, hours, level, semester, is_elective, choose_one.
      // The frontend expects code, name, hours, level, semester, elective, chooseOne.
      const mappedCourses = supabaseCourses.map((c) => ({
        code: c.code,
        name: c.name,
        hours: c.hours,
        level: c.level,
        semester: c.semester,
        elective: c.is_elective,
        chooseOne: c.choose_one,
      }));

      coursesDatabase.length = 0; // Clear existing
      coursesDatabase.push(...mappedCourses);
      console.log("Courses loaded successfully from Supabase");
    }
  } catch (error) {
    console.log("Using local courses data:", error.message);
  }
}

// Course Database with Level and Semester
const coursesDatabase = [
  // Level One - Semester 1 (First Year - Fall)
  {
    code: "ACC101",
    name: "Principles of Accounting 1",
    hours: 3,
    level: 1,
    semester: 1,
  },
  {
    code: "BIS101",
    name: "Introduction to Computer",
    hours: 3,
    level: 1,
    semester: 1,
  },
  {
    code: "Eco101",
    name: "Principles of Economics",
    hours: 3,
    level: 1,
    semester: 1,
  },
  {
    code: "Man101",
    name: "Principles of Management",
    hours: 3,
    level: 1,
    semester: 1,
  },
  { code: "Mat101", name: "Business Math", hours: 3, level: 1, semester: 1 },

  // Level One - Semester 2 (First Year - Spring)
  {
    code: "BIS103",
    name: "Operating Systems",
    hours: 3,
    level: 1,
    semester: 2,
  },
  { code: "HU111", name: "English 1", hours: 2, level: 1, semester: 2 },
  {
    code: "BIS201",
    name: "Information Systems",
    hours: 3,
    level: 1,
    semester: 2,
  },
  { code: "HU313", name: "Societal Issues", hours: 2, level: 1, semester: 2 },
  {
    code: "ACC102",
    name: "Principles of Accounting 2",
    hours: 3,
    level: 1,
    semester: 2,
  },
  {
    code: "Man102",
    name: "Behavior Management",
    hours: 3,
    level: 1,
    semester: 2,
  },

  // Level Two - Semester 1 (Second Year - Fall)
  {
    code: "Acc201",
    name: "Accounting for Partnerships",
    hours: 3,
    level: 2,
    semester: 1,
  },
  { code: "BIS202", name: "Programming 1", hours: 3, level: 2, semester: 1 },
  {
    code: "BIS302",
    name: "System Analysis 1",
    hours: 3,
    level: 2,
    semester: 1,
  },
  { code: "HU112", name: "English 2", hours: 2, level: 2, semester: 1 },
  {
    code: "Man201",
    name: "Production and Operations Management",
    hours: 3,
    level: 2,
    semester: 1,
  },
  { code: "Sta201", name: "Statistics", hours: 3, level: 2, semester: 1 },

  // Level Two - Semester 2 (Second Year - Spring)
  {
    code: "Acc202",
    name: "Accounting for Corporations",
    hours: 3,
    level: 2,
    semester: 2,
  },
  {
    code: "BIS303",
    name: "System Analysis 2",
    hours: 3,
    level: 2,
    semester: 2,
  },
  { code: "BIS307", name: "Programming 2", hours: 3, level: 2, semester: 2 },
  {
    code: "Eco201",
    name: "Economics of Money and Banking",
    hours: 3,
    level: 2,
    semester: 2,
  },
  {
    code: "Man202",
    name: "Management of Marketing",
    hours: 3,
    level: 2,
    semester: 2,
  },

  // Level Two - Semester 2 - Electives (Choose ONE only)
  {
    code: "HU120",
    name: "Principle of Law",
    hours: 3,
    level: 2,
    semester: 2,
    elective: true,
    chooseOne: true,
  },
  {
    code: "HU332",
    name: "Creative Thinking",
    hours: 3,
    level: 2,
    semester: 2,
    elective: true,
    chooseOne: true,
  },
  {
    code: "HU333",
    name: "Media",
    hours: 3,
    level: 2,
    semester: 2,
    elective: true,
    chooseOne: true,
  },

  // Level Three - Semester 1 (Third Year - Fall)
  { code: "BIS305", name: "E-Commerce", hours: 3, level: 3, semester: 1 },
  { code: "Acc301", name: "Cost Accounting", hours: 3, level: 3, semester: 1 },
  { code: "BIS301", name: "Databases", hours: 3, level: 3, semester: 1 },
  {
    code: "Man302",
    name: "Human Resources Management",
    hours: 3,
    level: 3,
    semester: 1,
  },
  {
    code: "Man301",
    name: "Financial Management and Investment",
    hours: 3,
    level: 3,
    semester: 1,
  },

  // Level Three - Semester 1 - Elective
  {
    code: "HU331",
    name: "Communication & Negotiation",
    hours: 3,
    level: 3,
    semester: 1,
    elective: true,
  },

  // Level Three - Semester 2 (Third Year - Spring)
  {
    code: "Acc302",
    name: "Auditing - Principles of Auditing",
    hours: 3,
    level: 3,
    semester: 2,
  },
  {
    code: "BIS306",
    name: "Management Information Systems",
    hours: 3,
    level: 3,
    semester: 2,
  },
  {
    code: "BIS408",
    name: "Advanced Database",
    hours: 3,
    level: 3,
    semester: 2,
  },
  {
    code: "BIS304",
    name: "Operations Research",
    hours: 3,
    level: 3,
    semester: 2,
  },

  // Level Three - Semester 2 - Electives
  {
    code: "BIS401",
    name: "Internet Applications",
    hours: 3,
    level: 3,
    semester: 2,
    elective: true,
  },
  {
    code: "Eco401",
    name: "Economics of Information",
    hours: 3,
    level: 3,
    semester: 2,
    elective: true,
  },

  // Level Four - Semester 1 (Fourth Year - Fall)

  // Level Four - Semester 1 - Electives (Choose ONE from each group for registration)
  {
    code: "Eco202",
    name: "Foreign Trade",
    hours: 3,
    level: 4,
    semester: 1,
    elective: true,
  },
  {
    code: "BIS410",
    name: "Project Management",
    hours: 3,
    level: 4,
    semester: 1,
    elective: true,
  },
  {
    code: "BIS407",
    name: "Accounting Information Systems",
    hours: 3,
    level: 4,
    semester: 1,
    elective: true,
  },

  // Level Four - Semester 2 (Fourth Year - Spring)
  { code: "BIS405", name: "Data Security", hours: 3, level: 4, semester: 2 },
  {
    code: "BIS403",
    name: "Computer Networks",
    hours: 3,
    level: 4,
    semester: 2,
  },
  { code: "BIS412", name: "Project 1", hours: 3, level: 4, semester: 2 },
  { code: "BIS413", name: "Project 2", hours: 3, level: 4, semester: 2 },
  {
    code: "Acc401",
    name: "Managerial Accounting",
    hours: 3,
    level: 4,
    semester: 2,
  },

  // Level Four - Semester 2 - Electives (Choose ONE from the first two)
  {
    code: "Man303",
    name: "Material Management",
    hours: 3,
    level: 4,
    semester: 2,
    elective: true,
    chooseOne: true,
  },
  {
    code: "Eco302",
    name: "Public Finance",
    hours: 3,
    level: 4,
    semester: 2,
    elective: true,
    chooseOne: true,
  },
  {
    code: "BIS402",
    name: "Decision Support Systems",
    hours: 3,
    level: 4,
    semester: 2,
    elective: true,
  },
];

// Grading Scale
const gradePoints = {
  "A+": 4.0,
  A: 3.75,
  "B+": 3.4,
  B: 3.1,
  "C+": 2.8,
  C: 2.5,
  "D+": 2.25,
  D: 2.0,
  F: 0.0,
};

const grades = ["A+", "A", "B+", "B", "C+", "C", "D+", "D", "F"];

function loadCourses() {
  const level = document.getElementById("levelSelect").value;
  const semester = document.getElementById("semesterSelect").value;

  if (!level || !semester) {
    alert("⚠️ Please select both level and semester");
    return;
  }

  // Get core courses for selected level and semester
  const coreCourses = coursesDatabase.filter(
    (course) =>
      course.level == level && course.semester == semester && !course.elective,
  );

  // Get elective courses for selected level and semester
  const electiveCourses = coursesDatabase.filter(
    (course) =>
      course.level == level && course.semester == semester && course.elective,
  );

  if (coreCourses.length === 0 && electiveCourses.length === 0) {
    alert("⚠️ No courses found for this level and semester.");
    return;
  }

  const container = document.getElementById("coursesContainer");
  container.innerHTML = "";

  let rowIndex = 1;

  // Add core courses
  if (coreCourses.length > 0) {
    const coreHeader = document.createElement("div");
    coreHeader.className = "section-header core-header";
    coreHeader.textContent = " Core Courses (Required)";
    container.appendChild(coreHeader);

    coreCourses.forEach((course) => {
      container.appendChild(createCourseRow(course, rowIndex++));
    });
  }

  // Add elective courses
  if (electiveCourses.length > 0) {
    const electiveHeader = document.createElement("div");
    electiveHeader.className = "section-header elective-header";

    // Check if this is a "choose one" group
    const isChooseOne = electiveCourses.some((c) => c.chooseOne);
    electiveHeader.textContent = isChooseOne
      ? "Elective Courses (Choose ONE Only)"
      : "Elective Courses (Choose as needed)";

    container.appendChild(electiveHeader);

    electiveCourses.forEach((course) => {
      container.appendChild(createCourseRow(course, rowIndex++, true));
    });
  }

  // Reset results when loading new courses
  document.getElementById("resultsSection").style.display = "none";

  // Show action controls (Calculate & Reset buttons)
  document.getElementById("actionControls").style.display = "flex";
}

function createCourseRow(course, index, isElective = false) {
  const row = document.createElement("div");
  row.className = "course-row";
  row.id = `row-${course.code}`;

  const electiveBadge = isElective
    ? '<span class="elective-badge">✓ Elective</span>'
    : "";

  row.innerHTML = `
        <div class="row-number">${index}</div>
        <div class="course-code">${course.code}</div>
        <div class="course-name">${course.name}${electiveBadge}</div>
        <div class="course-hours">${course.hours} hrs</div>
        <div>
            <select class="form-control" id="grade-${course.code}" data-hours="${course.hours}" data-elective="${isElective}" data-choose-one="${course.chooseOne || false}">
                <option value="">Select Grade</option>
                ${grades.map((grade) => `<option value="${grade}">${grade} (${gradePoints[grade]})</option>`).join("")}
            </select>
        </div>
    `;

  return row;
}

function calculateGPA() {
  let totalPoints = 0;
  let totalHours = 0;
  let coursesWithGrades = 0;

  const allGradeSelects = document.querySelectorAll('[id^="grade-"]');

  // Check "choose one" elective validation
  const chooseOneSelects = Array.from(allGradeSelects).filter(
    (select) => select.getAttribute("data-choose-one") === "true",
  );

  if (chooseOneSelects.length > 0) {
    const selectedElectives = chooseOneSelects.filter(
      (select) => select.value !== "",
    );
    if (selectedElectives.length > 1) {
      alert(
        "⚠️ You can only choose ONE elective course from the elective group!",
      );
      return;
    }
  }

  allGradeSelects.forEach((select) => {
    if (select.value) {
      const hours = parseFloat(select.getAttribute("data-hours"));
      const gradePoint = gradePoints[select.value];

      totalPoints += hours * gradePoint;
      totalHours += hours;
      coursesWithGrades++;
    }
  });

  if (coursesWithGrades === 0) {
    alert("⚠️ Please enter grades for at least one course");
    return;
  }

  // Calculate semester GPA
  const semesterGPA = totalPoints / totalHours;

  // Get previous GPA data if provided
  const previousGPA =
    parseFloat(document.getElementById("previousGPA").value) || 0;

  // Calculate cumulative GPA if previous data exists
  let cumulativeGPA = semesterGPA;
  let totalCumulativeHours = totalHours;
  let hasPreviousGPA = false;
  let estimatedPreviousHours = 0;

  if (previousGPA > 0) {
    // Auto-estimate previous hours based on typical semester credit hours
    const currentLevel = parseInt(document.getElementById("levelSelect").value);
    const currentSemester = parseInt(
      document.getElementById("semesterSelect").value,
    );

    // Calculate completed semesters before current one
    const completedSemesters = (currentLevel - 1) * 2 + (currentSemester - 1);
    estimatedPreviousHours = completedSemesters * 17; // Estimate 17 hours per semester

    if (estimatedPreviousHours > 0) {
      const previousTotalPoints = previousGPA * estimatedPreviousHours;
      const newTotalPoints = previousTotalPoints + totalPoints;
      totalCumulativeHours = estimatedPreviousHours + totalHours;
      cumulativeGPA = newTotalPoints / totalCumulativeHours;
      hasPreviousGPA = true;
    }
  }

  // Display results
  document.getElementById("gpaValue").textContent = semesterGPA.toFixed(2);
  document.getElementById("totalHours").textContent = totalHours;

  // Add cumulative GPA display if applicable
  const resultsGrid = document.querySelector(".results-grid");

  // Remove old cumulative card if exists
  const oldCumulativeCard = document.getElementById("cumulativeCard");
  if (oldCumulativeCard) {
    oldCumulativeCard.remove();
  }

  if (hasPreviousGPA) {
    const cumulativeCard = document.createElement("div");
    cumulativeCard.id = "cumulativeCard";
    cumulativeCard.className = "result-card";
    cumulativeCard.style.cssText =
      "background: rgba(251, 191, 36, 0.3); border: 2px solid rgba(251, 191, 36, 0.5);";
    cumulativeCard.innerHTML = `
            <div class="result-label">🎯 New Cumulative GPA</div>
            <div class="result-value">${cumulativeGPA.toFixed(2)}</div>
            <div style="font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.95; font-weight: 500;">
                Est. Total Hours: ~${totalCumulativeHours}
            </div>
        `;
    resultsGrid.appendChild(cumulativeCard);
  }

  // Update rating based on the final GPA (cumulative if available, otherwise semester)
  const finalGPA = hasPreviousGPA ? cumulativeGPA : semesterGPA;
  updateRating(finalGPA, hasPreviousGPA);

  document.getElementById("resultsSection").style.display = "block";

  // Scroll to results
  document
    .getElementById("resultsSection")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearPreviousGPA() {
  document.getElementById("previousGPA").value = "";

  // Recalculate if results are showing
  if (document.getElementById("resultsSection").style.display === "block") {
    calculateGPA();
  }
}

function updateRating(gpa, isCumulative = false) {
  const ratingBadge = document.getElementById("ratingBadge");
  let rating, className;

  if (gpa >= 3.4) {
    rating = "Excellent";
    className = "rating-excellent";
  } else if (gpa >= 2.8) {
    rating = "Very Good";
    className = "rating-very-good";
  } else if (gpa >= 2.4) {
    rating = "Good";
    className = "rating-good";
  } else if (gpa >= 2.0) {
    rating = "Pass";
    className = "rating-pass";
  } else {
    rating = "Weak";
    className = "rating-weak";
  }

  const ratingType = isCumulative ? "(Cumulative)" : "(Semester)";
  ratingBadge.textContent = `${rating} ${ratingType}`;
  ratingBadge.className = `rating-badge ${className}`;
}

function resetCalculator() {
  if (confirm("Are you sure you want to reset? All data will be cleared.")) {
    document.getElementById("levelSelect").value = "";
    document.getElementById("semesterSelect").value = "";
    document.getElementById("previousGPA").value = "";
    document.getElementById("coursesContainer").innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                <p>Select your level and semester to load courses</p>
            </div>
        `;
    document.getElementById("resultsSection").style.display = "none";
    document.getElementById("actionControls").style.display = "none";
  }
}

async function downloadAsImage() {
  const resultContent = document.getElementById("resultContent");

  try {
    const canvas = await html2canvas(resultContent, {
      backgroundColor: "#1e3a5f",
      scale: 2,
    });

    const link = document.createElement("a");
    link.download = `BIS_GPA_Result_${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch (error) {
    alert("Error creating image. Please try again.");
    console.error(error);
  }
}

async function downloadAsPDF() {
  const resultContent = document.getElementById("resultContent");

  try {
    const canvas = await html2canvas(resultContent, {
      backgroundColor: "#1e3a5f",
      scale: 2,
    });

    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`BIS_GPA_Result_${new Date().toISOString().split("T")[0]}.pdf`);
  } catch (error) {
    alert("Error creating PDF. Please try again.");
    console.error(error);
  }
}

// Expose functions to window for inline HTML handlers
window.clearPreviousGPA = clearPreviousGPA;
window.loadCourses = loadCourses;
window.calculateGPA = calculateGPA;
window.resetCalculator = resetCalculator;
window.downloadAsImage = downloadAsImage;
window.downloadAsPDF = downloadAsPDF;

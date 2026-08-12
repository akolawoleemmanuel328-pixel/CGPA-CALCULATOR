/**
 * ==========================================================================
 * Student CGPA Calculator - JavaScript
 * Handles dynamic course addition, deletion, GPA calculation, scale changes,
 * grading scale breakdown, semester history persistence, and cumulative CGPA.
 * ==========================================================================
 */

// Wait for the DOM to be fully loaded before attaching events
document.addEventListener("DOMContentLoaded", function () {
  // ------------------------------------------------------------------------
  // 1. Grade Scale Mappings & Storage Keys
  // ------------------------------------------------------------------------
  const STORAGE_KEY = "student_cgpa_history_records";
  const CUSTOM_SCALES_KEY = "student_cgpa_custom_scales";

  let GRADE_SCALES = {
    "5.0": { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0, P: null, W: null, I: null },
    "4.0": { A: 4, B: 3, C: 2, D: 1, E: 0, F: 0, P: null, W: null, I: null },
    "7.0": { A: 7, B: 6, C: 5, D: 4, E: 3, F: 0, P: null, W: null, I: null },
    "10.0": { A: 10, B: 8, C: 6, D: 4, E: 2, F: 0, P: null, W: null, I: null },
    "4.33": { "A+": 4.33, A: 4.0, "A-": 3.67, "B+": 3.33, B: 3.0, "B-": 2.67, "C+": 2.33, C: 2.0, "D": 1.0, F: 0, P: null, W: null, I: null },
  };

  // ------------------------------------------------------------------------
  // 2. DOM Element Selectors
  // ------------------------------------------------------------------------
  const coursesTbody = document.getElementById("courses-tbody");
  const addCourseBtn = document.getElementById("add-course-btn");
  const calculateBtn = document.getElementById("calculate-btn");
  const resetBtn = document.getElementById("reset-btn");
  const saveHistoryBtn = document.getElementById("save-history-btn");
  const clearHistoryBtn = document.getElementById("btn-clear-history");
  const scaleSelect = document.getElementById("grading-scale-select");
  const semesterNameInput = document.getElementById("semester-name-input");

  // Add Other & Modal Selectors
  const addOtherBtn = document.getElementById("add-other-btn");
  const addOtherMenu = document.getElementById("add-other-menu");
  const itemAddPassfail = document.getElementById("item-add-passfail");
  const itemAddWithdrawn = document.getElementById("item-add-withdrawn");
  const itemToggleCarryover = document.getElementById("item-toggle-carryover");
  const itemOpenCustomScale = document.getElementById("item-open-custom-scale");
  const btnOpenCustomScale = document.getElementById("btn-open-custom-scale");

  const customScaleModal = document.getElementById("custom-scale-modal");
  const modalOverlay = document.getElementById("modal-overlay");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const btnCancelCustomScale = document.getElementById("btn-cancel-custom-scale");
  const btnSaveCustomScale = document.getElementById("btn-save-custom-scale");
  const customScaleName = document.getElementById("custom-scale-name");
  const customPtsA = document.getElementById("custom-pts-a");
  const customPtsB = document.getElementById("custom-pts-b");
  const customPtsC = document.getElementById("custom-pts-c");
  const customPtsD = document.getElementById("custom-pts-d");
  const customPtsE = document.getElementById("custom-pts-e");
  const customPtsF = document.getElementById("custom-pts-f");

  // Batch & Bulk Add Selectors
  const add5CoursesBtn = document.getElementById("add-5-courses-btn");
  const openBulkAddBtn = document.getElementById("open-bulk-add-btn");
  const itemAdd5Courses = document.getElementById("item-add-5-courses");
  const itemAdd10Courses = document.getElementById("item-add-10-courses");
  const itemOpenBulkAdd = document.getElementById("item-open-bulk-add");

  const bulkAddModal = document.getElementById("bulk-add-modal");
  const bulkModalOverlay = document.getElementById("bulk-modal-overlay");
  const bulkModalCloseBtn = document.getElementById("bulk-modal-close-btn");
  const btnCancelBulkAdd = document.getElementById("btn-cancel-bulk-add");
  const btnSubmitBulkAdd = document.getElementById("btn-submit-bulk-add");

  const tabQuickQuantity = document.getElementById("tab-quick-quantity");
  const tabPasteList = document.getElementById("tab-paste-list");
  const panelQuickQuantity = document.getElementById("panel-quick-quantity");
  const panelPasteList = document.getElementById("panel-paste-list");

  const bulkCourseCount = document.getElementById("bulk-course-count");
  const bulkDefaultUnits = document.getElementById("bulk-default-units");
  const bulkPasteTextarea = document.getElementById("bulk-paste-textarea");

  // Previous CGPA Carryover Selectors
  const carryoverCard = document.getElementById("carryover-card");
  const btnCloseCarryover = document.getElementById("btn-close-carryover");
  const prevTotalUnitsInput = document.getElementById("prev-total-units");
  const prevTotalPointsInput = document.getElementById("prev-total-points");
  const prevCgpaCalcDisplay = document.getElementById("prev-cgpa-calc");

  const cgpaValueDisplay = document.getElementById("cgpa-value");
  const totalUnitsDisplay = document.getElementById("total-units-value");
  const totalPointsDisplay = document.getElementById("total-points-value");
  const standingDisplay = document.getElementById("standing-value");

  const historySection = document.getElementById("history-section");
  const historyList = document.getElementById("history-list");
  const historyCountBadge = document.getElementById("history-count-badge");
  const historyEmptyState = document.getElementById("history-empty-state");
  const cumulativeSummaryCard = document.getElementById("cumulative-summary-card");
  const cumulativeCgpaScore = document.getElementById("cumulative-cgpa-score");
  const cumulativeStanding = document.getElementById("cumulative-standing");
  const cumulativeTotalUnits = document.getElementById("cumulative-total-units");
  const cumulativeTotalPoints = document.getElementById("cumulative-total-points");
  const cumulativeSemestersCount = document.getElementById("cumulative-semesters-count");

  const toastNotification = document.getElementById("toast-notification");
  let toastTimeout = null;

  // ------------------------------------------------------------------------
  // 3. Helper: Toast Notification
  // ------------------------------------------------------------------------
  function showToast(message, type = "success") {
    if (!toastNotification) return;
    if (toastTimeout) clearTimeout(toastTimeout);

    toastNotification.innerHTML = message;
    toastNotification.className = `toast-notification show ${type}`;

    toastTimeout = setTimeout(function () {
      toastNotification.classList.remove("show");
    }, 3200);
  }

  // ------------------------------------------------------------------------
  // 4. Helper: Update Grade Select Dropdown Color Styling
  // ------------------------------------------------------------------------
  function updateGradeColor(selectElement) {
    if (!selectElement) return;
    const grade = (selectElement.value || "A").toLowerCase();
    selectElement.classList.remove("grade-a", "grade-b", "grade-c", "grade-d", "grade-e", "grade-f");
    selectElement.classList.add(`grade-${grade}`);
  }

  // ------------------------------------------------------------------------
  // 5. Helper: Update Breakdown Cards (Scale Points, Course Count & Highlights)
  // ------------------------------------------------------------------------
  function updateGradingBreakdown() {
    const selectedScale = scaleSelect.value;
    const scaleBadge = document.getElementById("legend-scale-badge");
    if (scaleBadge) {
      scaleBadge.textContent = `${selectedScale} Scale Active`;
    }

    // Update point labels in breakdown cards
    const ptsMap5 = { A: "5.0 Points", B: "4.0 Points", C: "3.0 Points", D: "2.0 Points", E: "1.0 Points", F: "0.0 Points" };
    const ptsMap4 = { A: "4.0 Points", B: "3.0 Points", C: "2.0 Points", D: "1.0 Points", E: "0.0 Points", F: "0.0 Points" };
    const ptsMap = selectedScale === "4.0" ? ptsMap4 : ptsMap5;

    ["a", "b", "c", "d", "e", "f"].forEach(function (letter) {
      const ptsEl = document.getElementById(`pts-${letter}`);
      const upper = letter.toUpperCase();
      if (ptsEl && ptsMap[upper]) {
        ptsEl.textContent = ptsMap[upper];
      }
    });

    // Count distribution of grades across table rows
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    const rows = coursesTbody.querySelectorAll(".course-row");
    rows.forEach(function (row) {
      const gradeSelect = row.querySelector(".course-grade-select");
      if (gradeSelect && gradeSelect.value && counts[gradeSelect.value] !== undefined) {
        counts[gradeSelect.value]++;
      }
    });

    // Update count labels and activate card styles
    ["a", "b", "c", "d", "e", "f"].forEach(function (letter) {
      const upper = letter.toUpperCase();
      const count = counts[upper] || 0;
      const countEl = document.getElementById(`count-${letter}`);
      const cardEl = document.getElementById(`legend-card-${letter}`);

      if (countEl) {
        countEl.textContent = count === 1 ? "1 in list" : `${count} in list`;
      }

      if (cardEl) {
        if (count > 0) {
          cardEl.classList.add("active");
        } else {
          cardEl.classList.remove("active");
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // 6. Helper: Convert Score (0 - 100) to Corresponding Letter Grade
  // ------------------------------------------------------------------------
  function getGradeFromScore(score) {
    if (score === "" || isNaN(score)) return null;
    const num = parseFloat(score);
    if (num >= 70) return "A";
    if (num >= 60) return "B";
    if (num >= 50) return "C";
    if (num >= 45) return "D";
    if (num >= 40) return "E";
    return "F";
  }

  // ------------------------------------------------------------------------
  // 7. Helper: Update Row Numbers (1, 2, 3...)
  // ------------------------------------------------------------------------
  function updateRowIndices() {
    const rows = coursesTbody.querySelectorAll(".course-row");
    rows.forEach(function (row, index) {
      const indexCell = row.querySelector(".row-index");
      if (indexCell) {
        indexCell.textContent = (index + 1).toString();
      }

      // Update aria-labels for accessibility
      const nameInput = row.querySelector(".course-name-input");
      const unitsInput = row.querySelector(".course-units-input");
      const scoreInput = row.querySelector(".course-score-input");
      const gradeSelect = row.querySelector(".course-grade-select");
      const removeBtn = row.querySelector(".btn-remove-row");

      if (nameInput) nameInput.setAttribute("aria-label", `Course Name ${index + 1}`);
      if (unitsInput) unitsInput.setAttribute("aria-label", `Credit Units ${index + 1}`);
      if (scoreInput) scoreInput.setAttribute("aria-label", `Score ${index + 1}`);
      if (gradeSelect) gradeSelect.setAttribute("aria-label", `Grade ${index + 1}`);
      if (removeBtn) removeBtn.setAttribute("aria-label", `Remove Course ${index + 1}`);
    });
  }

  // ------------------------------------------------------------------------
  // 8. Function: Add a New Course Row
  // ------------------------------------------------------------------------
  function addCourseRow(name = "", units = 3, score = 70, grade = "A") {
    const currentCount = coursesTbody.querySelectorAll(".course-row").length;
    const newIndex = currentCount + 1;

    // Create the <tr> element
    const tr = document.createElement("tr");
    tr.className = "course-row";
    tr.id = `course-row-${newIndex}`;

    // Auto-compute grade if score is supplied
    let initialGrade = grade;
    const autoComputed = getGradeFromScore(score);
    if (autoComputed) {
      initialGrade = autoComputed;
    }

    // Populate row inner HTML with inputs and remove button
    tr.innerHTML = `
      <td class="row-index">${newIndex}</td>
      <td>
        <input 
          type="text" 
          class="course-name-input" 
          placeholder="e.g. Course ${newIndex}" 
          value="${name}" 
          aria-label="Course Name ${newIndex}"
        />
      </td>
      <td>
        <input 
          type="number" 
          class="course-units-input" 
          min="1" 
          max="10" 
          value="${units}" 
          placeholder="Units" 
          aria-label="Credit Units ${newIndex}"
        />
      </td>
      <td>
        <input 
          type="number" 
          class="course-score-input" 
          min="0" 
          max="100" 
          value="${score !== null && score !== undefined ? score : ''}" 
          placeholder="0-100" 
          aria-label="Score ${newIndex}"
        />
      </td>
      <td>
        <select class="course-grade-select" aria-label="Grade ${newIndex}">
          <option value="A" ${initialGrade === "A" ? "selected" : ""}>A (Excellent)</option>
          <option value="B" ${initialGrade === "B" ? "selected" : ""}>B (Very Good)</option>
          <option value="C" ${initialGrade === "C" ? "selected" : ""}>C (Good)</option>
          <option value="D" ${initialGrade === "D" ? "selected" : ""}>D (Fair)</option>
          <option value="E" ${initialGrade === "E" ? "selected" : ""}>E (Pass)</option>
          <option value="F" ${initialGrade === "F" ? "selected" : ""}>F (Fail)</option>
          <option value="P" ${initialGrade === "P" ? "selected" : ""}>P (Pass - Non GPA)</option>
          <option value="W" ${initialGrade === "W" ? "selected" : ""}>W (Withdrawn)</option>
          <option value="I" ${initialGrade === "I" ? "selected" : ""}>I (Incomplete)</option>
        </select>
      </td>
      <td>
        <button 
          type="button" 
          class="btn-remove-row" 
          title="Remove course" 
          aria-label="Remove Course ${newIndex}"
        >&times;</button>
      </td>
    `;

    // Connect Score input to automatically update the Grade dropdown
    const scoreInput = tr.querySelector(".course-score-input");
    const gradeSelect = tr.querySelector(".course-grade-select");

    if (gradeSelect) {
      updateGradeColor(gradeSelect);
      gradeSelect.addEventListener("change", function () {
        updateGradeColor(gradeSelect);
        updateGradingBreakdown();
      });
    }

    if (scoreInput && gradeSelect) {
      scoreInput.addEventListener("input", function () {
        const calculatedGrade = getGradeFromScore(scoreInput.value);
        if (calculatedGrade) {
          gradeSelect.value = calculatedGrade;
          updateGradeColor(gradeSelect);
          updateGradingBreakdown();
        }
      });
    }

    // Attach click event for the newly created remove button
    const removeBtn = tr.querySelector(".btn-remove-row");
    removeBtn.addEventListener("click", function () {
      removeCourseRow(tr);
    });

    // Append to tbody
    coursesTbody.appendChild(tr);

    // Update all row indices and reactive breakdown
    updateRowIndices();
    updateGradingBreakdown();

    // Focus the course name input for the newly added row
    const nameInput = tr.querySelector(".course-name-input");
    if (nameInput) {
      nameInput.focus();
    }
  }

  // ------------------------------------------------------------------------
  // 9. Function: Remove a Course Row
  // ------------------------------------------------------------------------
  function removeCourseRow(rowElement) {
    const allRows = coursesTbody.querySelectorAll(".course-row");
    
    // Maintain at least 1 course row in the table
    if (allRows.length <= 1) {
      // Clear inputs instead of removing the last remaining row
      const nameInput = rowElement.querySelector(".course-name-input");
      const unitsInput = rowElement.querySelector(".course-units-input");
      const scoreInput = rowElement.querySelector(".course-score-input");
      const gradeSelect = rowElement.querySelector(".course-grade-select");
      if (nameInput) nameInput.value = "";
      if (unitsInput) unitsInput.value = "3";
      if (scoreInput) scoreInput.value = "70";
      if (gradeSelect) {
        gradeSelect.value = "A";
        updateGradeColor(gradeSelect);
      }
      updateGradingBreakdown();
      return;
    }

    // Remove the row from the DOM
    rowElement.remove();

    // Renumber the remaining rows and update breakdown
    updateRowIndices();
    updateGradingBreakdown();
  }

  // ------------------------------------------------------------------------
  // 10. Function: Determine Academic Standing / Class of Degree
  // ------------------------------------------------------------------------
  function getAcademicStanding(cgpa, scale) {
    if (scale === "7.0") {
      if (cgpa >= 6.00) return { text: "First Class", className: "first-class" };
      if (cgpa >= 4.60) return { text: "Second Class Upper (2:1)", className: "second-upper" };
      if (cgpa >= 3.00) return { text: "Second Class Lower (2:2)", className: "second-lower" };
      if (cgpa >= 2.00) return { text: "Third Class", className: "third-class" };
      if (cgpa >= 1.00) return { text: "Pass", className: "pass" };
      return { text: "Fail", className: "fail" };
    } else if (scale === "10.0") {
      if (cgpa >= 8.50) return { text: "Outstanding / First Distinction", className: "first-class" };
      if (cgpa >= 7.00) return { text: "First Class", className: "second-upper" };
      if (cgpa >= 6.00) return { text: "Second Class", className: "second-lower" };
      if (cgpa >= 5.00) return { text: "Pass", className: "pass" };
      return { text: "Fail", className: "fail" };
    } else if (scale === "4.33" || scale === "4.0") {
      if (cgpa >= 3.50) return { text: "Distinction / First Class", className: "first-class" };
      if (cgpa >= 3.00) return { text: "Honors (2:1)", className: "second-upper" };
      if (cgpa >= 2.00) return { text: "Satisfactory (2:2)", className: "second-lower" };
      if (cgpa >= 1.00) return { text: "Pass", className: "pass" };
      return { text: "Fail", className: "fail" };
    } else if (scale === "5.0") {
      if (cgpa >= 4.50) return { text: "First Class", className: "first-class" };
      if (cgpa >= 3.50) return { text: "Second Class Upper (2:1)", className: "second-upper" };
      if (cgpa >= 2.40) return { text: "Second Class Lower (2:2)", className: "second-lower" };
      if (cgpa >= 1.50) return { text: "Third Class", className: "third-class" };
      if (cgpa >= 1.00) return { text: "Pass", className: "pass" };
      return { text: "Fail", className: "fail" };
    } else {
      // Custom Scale estimation based on ratio of max point
      const scaleMap = GRADE_SCALES[scale];
      const maxPts = scaleMap && scaleMap.A ? scaleMap.A : 5.0;
      const ratio = maxPts > 0 ? cgpa / maxPts : 0;
      if (ratio >= 0.85) return { text: "First Class / Excellent", className: "first-class" };
      if (ratio >= 0.70) return { text: "Second Upper / Very Good", className: "second-upper" };
      if (ratio >= 0.50) return { text: "Second Lower / Good", className: "second-lower" };
      if (ratio >= 0.30) return { text: "Pass / Fair", className: "pass" };
      return { text: "Fail", className: "fail" };
    }
  }

  // ------------------------------------------------------------------------
  // 11. Function: Calculate CGPA / GPA (Returns state object when requested)
  // ------------------------------------------------------------------------
  function calculateCGPA(returnState = false) {
    const selectedScale = scaleSelect.value;
    const gradePointsTable = GRADE_SCALES[selectedScale] || GRADE_SCALES["5.0"];

    const rows = coursesTbody.querySelectorAll(".course-row");
    let totalUnits = 0;
    let totalQualityPoints = 0;
    let validRowsCount = 0;
    const courseDataList = [];

    rows.forEach(function (row) {
      const nameInput = row.querySelector(".course-name-input");
      const unitsInput = row.querySelector(".course-units-input");
      const scoreInput = row.querySelector(".course-score-input");
      const gradeSelect = row.querySelector(".course-grade-select");

      const name = nameInput ? nameInput.value.trim() : "";
      const units = parseFloat(unitsInput ? unitsInput.value : 0);
      const score = scoreInput && scoreInput.value !== "" ? parseFloat(scoreInput.value) : null;
      const grade = gradeSelect ? gradeSelect.value : "F";

      if (!isNaN(units) && units > 0) {
        // Special Non-GPA grades: P (Pass), W (Withdrawn), I (Incomplete)
        if (grade === "W" || grade === "I") {
          // Excluded completely from GPA calculation
          courseDataList.push({
            name: name || `Course ${courseDataList.length + 1}`,
            units: units,
            score: score,
            grade: grade,
            points: 0,
          });
        } else if (grade === "P") {
          // Pass: Credit units counted, 0 points added to quality points, non-penalizing
          validRowsCount++;
          courseDataList.push({
            name: name || `Course ${courseDataList.length + 1}`,
            units: units,
            score: score,
            grade: grade,
            points: 0,
          });
        } else {
          // Standard Grade
          const pointPerUnit = gradePointsTable[grade] !== undefined && gradePointsTable[grade] !== null ? gradePointsTable[grade] : 0;
          const qualityPoint = units * pointPerUnit;

          totalUnits += units;
          totalQualityPoints += qualityPoint;
          validRowsCount++;

          courseDataList.push({
            name: name || `Course ${courseDataList.length + 1}`,
            units: units,
            score: score,
            grade: grade,
            points: qualityPoint,
          });
        }
      }
    });

    // Handle Previous Semester Carryover if active
    let prevUnits = 0;
    let prevPoints = 0;
    if (carryoverCard && carryoverCard.style.display !== "none") {
      prevUnits = parseFloat(prevTotalUnitsInput.value) || 0;
      prevPoints = parseFloat(prevTotalPointsInput.value) || 0;
      if (prevUnits > 0) {
        prevCgpaCalcDisplay.value = (prevPoints / prevUnits).toFixed(2);
      } else {
        prevCgpaCalcDisplay.value = "0.00";
      }
    }

    const combinedTotalUnits = totalUnits + prevUnits;
    const combinedTotalPoints = totalQualityPoints + prevPoints;

    // Handle edge case when total units is 0
    if (combinedTotalUnits === 0 || (validRowsCount === 0 && prevUnits === 0)) {
      cgpaValueDisplay.textContent = "0.00";
      totalUnitsDisplay.textContent = "0";
      totalPointsDisplay.textContent = "0";
      standingDisplay.textContent = "--";
      standingDisplay.className = "result-value standing-badge";

      if (returnState) {
        return {
          scale: selectedScale,
          cgpa: 0,
          formattedCGPA: "0.00",
          totalUnits: 0,
          totalPoints: 0,
          standing: { text: "--", className: "" },
          courses: courseDataList,
        };
      }
      return null;
    }

    const calculatedCGPA = combinedTotalPoints / combinedTotalUnits;
    const formattedCGPA = calculatedCGPA.toFixed(2);

    // Update Result Cards
    cgpaValueDisplay.textContent = formattedCGPA;
    totalUnitsDisplay.textContent = combinedTotalUnits.toString();
    totalPointsDisplay.textContent = combinedTotalPoints.toFixed(1);

    // Update Standing Remark
    const standing = getAcademicStanding(calculatedCGPA, selectedScale);
    standingDisplay.textContent = standing.text;
    standingDisplay.className = `result-value standing-badge ${standing.className}`;

    if (returnState) {
      return {
        scale: selectedScale,
        cgpa: calculatedCGPA,
        formattedCGPA: formattedCGPA,
        totalUnits: combinedTotalUnits,
        totalPoints: combinedTotalPoints,
        standing: standing,
        courses: courseDataList,
      };
    }
    return null;
  }

  // ------------------------------------------------------------------------
  // 12. Function: Reset All Rows to Initial State
  // ------------------------------------------------------------------------
  function resetAll() {
    // Clear all existing rows
    coursesTbody.innerHTML = "";

    // Re-create default 3 starter rows
    addCourseRow("MTH 101", 3, 75, "A");
    addCourseRow("PHY 101", 3, 65, "B");
    addCourseRow("CHM 101", 2, 82, "A");

    // Reset summary displays
    cgpaValueDisplay.textContent = "0.00";
    totalUnitsDisplay.textContent = "0";
    totalPointsDisplay.textContent = "0";
    standingDisplay.textContent = "--";
    standingDisplay.className = "result-value standing-badge";

    // Reset semester input
    const history = getHistoryRecords();
    if (semesterNameInput) {
      semesterNameInput.value = `Semester ${history.length + 1}`;
    }

    // Refresh breakdown
    updateGradingBreakdown();
  }

  // ------------------------------------------------------------------------
  // 13. History Management & LocalStorage Persistence
  // ------------------------------------------------------------------------
  function getHistoryRecords() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load calculation history from localStorage", e);
      return [];
    }
  }

  function saveHistoryRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error("Failed to save calculation history to localStorage", e);
    }
  }

  function formatDateTime(isoString) {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "Recently";
    }
  }

  // Render the History section cards and Cumulative Summary
  function renderHistory() {
    const history = getHistoryRecords();
    if (historyCountBadge) {
      historyCountBadge.textContent = `${history.length} Saved`;
    }

    // Handle Empty State
    if (history.length === 0) {
      if (historyEmptyState) historyEmptyState.style.display = "flex";
      if (historyList) historyList.innerHTML = "";
      if (cumulativeSummaryCard) cumulativeSummaryCard.style.display = "none";
      return;
    }

    if (historyEmptyState) historyEmptyState.style.display = "none";

    // Calculate Overall Cumulative Summary across all saved records
    let cumUnits = 0;
    let cumPoints = 0;
    history.forEach(function (item) {
      cumUnits += item.totalUnits || 0;
      cumPoints += item.totalPoints || 0;
    });

    if (cumUnits > 0) {
      const cumCGPA = cumPoints / cumUnits;
      const primaryScale = history[0].scale || "5.0";
      const cumStanding = getAcademicStanding(cumCGPA, primaryScale);

      if (cumulativeSummaryCard) {
        cumulativeSummaryCard.style.display = "flex";
        if (cumulativeCgpaScore) cumulativeCgpaScore.textContent = cumCGPA.toFixed(2);
        if (cumulativeStanding) {
          cumulativeStanding.textContent = cumStanding.text;
          cumulativeStanding.className = `cumulative-standing standing-badge ${cumStanding.className}`;
        }
        if (cumulativeTotalUnits) cumulativeTotalUnits.textContent = cumUnits.toString();
        if (cumulativeTotalPoints) cumulativeTotalPoints.textContent = cumPoints.toFixed(1);
        if (cumulativeSemestersCount) cumulativeSemestersCount.textContent = history.length.toString();
      }
    } else {
      if (cumulativeSummaryCard) cumulativeSummaryCard.style.display = "none";
    }

    // Build Cards HTML
    if (historyList) {
      historyList.innerHTML = "";
      history.forEach(function (record, index) {
        const card = document.createElement("div");
        card.className = "history-card";
        card.id = `history-card-${record.id}`;

        const formattedDate = formatDateTime(record.timestamp);
        const coursesCount = (record.courses || []).length;

        // Mini Table Rows for Course Breakdown
        let coursesRowsHtml = "";
        (record.courses || []).forEach(function (c) {
          const gradeLetter = (c.grade || "A").toLowerCase();
          const scoreDisplay = c.score !== null && c.score !== undefined ? `${c.score}%` : "--";
          coursesRowsHtml += `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td>${c.units} unit${c.units > 1 ? "s" : ""}</td>
              <td>${scoreDisplay}</td>
              <td><span class="mini-grade-badge badge-${gradeLetter}">${c.grade}</span></td>
            </tr>
          `;
        });

        card.innerHTML = `
          <div class="history-card-header">
            <div class="history-title-badge-group">
              <span class="history-card-name">${record.semesterName}</span>
              <span class="history-scale-tag">${record.scale} Scale</span>
              <span class="history-date">${formattedDate}</span>
            </div>
            <div class="history-card-actions">
              <button type="button" class="btn-history-load" data-id="${record.id}" title="Load this semester into calculator">&#8635; Load</button>
              <button type="button" class="btn-history-delete" data-id="${record.id}" title="Delete this semester record">&times;</button>
            </div>
          </div>

          <div class="history-card-stats">
            <div class="history-stat-box">
              <span class="history-stat-label">CGPA / GPA</span>
              <span class="history-stat-val score">${record.formattedCGPA || record.cgpa.toFixed(2)}</span>
            </div>
            <div class="history-stat-box">
              <span class="history-stat-label">Credit Units</span>
              <span class="history-stat-val">${record.totalUnits}</span>
            </div>
            <div class="history-stat-box">
              <span class="history-stat-label">Grade Points</span>
              <span class="history-stat-val">${record.totalPoints.toFixed(1)}</span>
            </div>
            <div class="history-stat-box">
              <span class="history-stat-label">Remark</span>
              <span class="standing-badge ${record.standing.className}">${record.standing.text}</span>
            </div>
          </div>

          <div class="history-card-details">
            <button type="button" class="history-courses-toggle" data-toggle="${record.id}">
              &#9656; View ${coursesCount} Course${coursesCount !== 1 ? "s" : ""}
            </button>
            <div class="history-courses-panel" id="panel-${record.id}">
              <table class="history-mini-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Units</th>
                    <th>Score</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  ${coursesRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;

        // Attach listeners for Load, Delete, and Toggle inside the card
        const loadBtn = card.querySelector(".btn-history-load");
        if (loadBtn) {
          loadBtn.addEventListener("click", function () {
            loadHistoryRecordIntoCalculator(record.id);
          });
        }

        const deleteBtn = card.querySelector(".btn-history-delete");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", function () {
            deleteHistoryRecord(record.id);
          });
        }

        const toggleBtn = card.querySelector(".history-courses-toggle");
        const panel = card.querySelector(`#panel-${record.id}`);
        if (toggleBtn && panel) {
          toggleBtn.addEventListener("click", function () {
            const isOpen = panel.classList.toggle("open");
            toggleBtn.innerHTML = isOpen
              ? `&#9662; Hide ${coursesCount} Course${coursesCount !== 1 ? "s" : ""}`
              : `&#9656; View ${coursesCount} Course${coursesCount !== 1 ? "s" : ""}`;
          });
        }

        historyList.appendChild(card);
      });
    }
  }

  // Save current calculation state into History
  function saveCurrentToHistory() {
    const calcState = calculateCGPA(true);

    if (!calcState || calcState.totalUnits === 0) {
      showToast("&#9888; Please enter valid course units before saving.", "info");
      return;
    }

    const history = getHistoryRecords();
    const enteredSemesterName = semesterNameInput ? semesterNameInput.value.trim() : "";
    const semesterName = enteredSemesterName || `Semester ${history.length + 1}`;

    const newRecord = {
      id: "sem_" + Date.now(),
      semesterName: semesterName,
      timestamp: new Date().toISOString(),
      scale: calcState.scale,
      cgpa: calcState.cgpa,
      formattedCGPA: calcState.formattedCGPA,
      totalUnits: calcState.totalUnits,
      totalPoints: calcState.totalPoints,
      standing: calcState.standing,
      courses: calcState.courses,
    };

    // Prepend to history list
    history.unshift(newRecord);
    saveHistoryRecords(history);

    // Refresh UI
    renderHistory();
    showToast(`&#10004; Saved <strong>${semesterName}</strong> to Calculation History!`, "success");

    // Suggest next semester name in input
    if (semesterNameInput) {
      semesterNameInput.value = `Semester ${history.length + 1}`;
    }
  }

  // Load a saved record back into the interactive calculator table
  function loadHistoryRecordIntoCalculator(recordId) {
    const history = getHistoryRecords();
    const record = history.find(function (item) {
      return item.id === recordId;
    });

    if (!record) return;

    // Set scale dropdown
    if (scaleSelect && record.scale) {
      scaleSelect.value = record.scale;
    }

    // Set semester label
    if (semesterNameInput && record.semesterName) {
      semesterNameInput.value = record.semesterName;
    }

    // Populate rows
    coursesTbody.innerHTML = "";
    (record.courses || []).forEach(function (course) {
      addCourseRow(course.name, course.units, course.score, course.grade);
    });

    // Re-calculate & update breakdown
    calculateCGPA();
    updateGradingBreakdown();

    // Smooth scroll back to table
    const tableElement = document.querySelector(".table-responsive");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    showToast(`&#8635; Loaded <strong>${record.semesterName}</strong> into Calculator!`, "info");
  }

  // Delete a single history entry
  function deleteHistoryRecord(recordId) {
    let history = getHistoryRecords();
    const target = history.find(function (item) {
      return item.id === recordId;
    });
    const targetName = target ? target.semesterName : "Semester";

    history = history.filter(function (item) {
      return item.id !== recordId;
    });

    saveHistoryRecords(history);
    renderHistory();
    showToast(`Deleted ${targetName} from history.`, "info");
  }

  // Clear all history
  function clearAllHistory() {
    const history = getHistoryRecords();
    if (history.length === 0) {
      showToast("History is already empty.", "info");
      return;
    }

    if (confirm("Are you sure you want to clear all saved calculation history?")) {
      saveHistoryRecords([]);
      renderHistory();
      showToast("All calculation history cleared.", "info");
    }
  }

  // ------------------------------------------------------------------------
  // 14. Custom Scales & Add Other Dropdown Logic
  // ------------------------------------------------------------------------
  function loadCustomScalesFromStorage() {
    try {
      const stored = localStorage.getItem(CUSTOM_SCALES_KEY);
      if (!stored) return;
      const customScales = JSON.parse(stored);
      customScales.forEach(function (cs) {
        GRADE_SCALES[cs.id] = cs.points;
        // Check if option already exists in select
        if (!scaleSelect.querySelector(`option[value="${cs.id}"]`)) {
          const opt = document.createElement("option");
          opt.value = cs.id;
          opt.textContent = `${cs.name} (Custom Scale)`;
          // Insert before CUSTOM_ADD option
          const addOpt = scaleSelect.querySelector('option[value="CUSTOM_ADD"]');
          if (addOpt) {
            scaleSelect.insertBefore(opt, addOpt);
          } else {
            scaleSelect.appendChild(opt);
          }
        }
      });
    } catch (e) {
      console.error("Failed to load custom scales", e);
    }
  }

  function openCustomScaleModal() {
    if (customScaleModal) customScaleModal.style.display = "flex";
  }

  function closeCustomScaleModal() {
    if (customScaleModal) customScaleModal.style.display = "none";
    if (scaleSelect.value === "CUSTOM_ADD") {
      scaleSelect.value = "5.0";
    }
  }

  function saveCustomScale() {
    const name = customScaleName ? customScaleName.value.trim() : "";
    const scaleName = name || "Custom Scale";
    const scaleId = "CUSTOM_" + Date.now();

    const ptsA = parseFloat(customPtsA ? customPtsA.value : 5.0) || 0;
    const ptsB = parseFloat(customPtsB ? customPtsB.value : 4.0) || 0;
    const ptsC = parseFloat(customPtsC ? customPtsC.value : 3.0) || 0;
    const ptsD = parseFloat(customPtsD ? customPtsD.value : 2.0) || 0;
    const ptsE = parseFloat(customPtsE ? customPtsE.value : 1.0) || 0;
    const ptsF = parseFloat(customPtsF ? customPtsF.value : 0.0) || 0;

    const pointsObj = {
      A: ptsA, B: ptsB, C: ptsC, D: ptsD, E: ptsE, F: ptsF, P: null, W: null, I: null
    };

    GRADE_SCALES[scaleId] = pointsObj;

    // Save to localStorage
    try {
      const stored = localStorage.getItem(CUSTOM_SCALES_KEY);
      const list = stored ? JSON.parse(stored) : [];
      list.push({ id: scaleId, name: scaleName, points: pointsObj });
      localStorage.setItem(CUSTOM_SCALES_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to save custom scale to localStorage", e);
    }

    // Add option to scale select and select it
    const opt = document.createElement("option");
    opt.value = scaleId;
    opt.textContent = `${scaleName} (${ptsA} Max)`;
    const addOpt = scaleSelect.querySelector('option[value="CUSTOM_ADD"]');
    if (addOpt) {
      scaleSelect.insertBefore(opt, addOpt);
    } else {
      scaleSelect.appendChild(opt);
    }

    scaleSelect.value = scaleId;
    closeCustomScaleModal();
    updateGradingBreakdown();
    calculateCGPA();
    showToast(`&#9881; Custom Scale <strong>${scaleName}</strong> saved &amp; applied!`, "success");
  }

  // ------------------------------------------------------------------------
  // 15. Bulk Add Courses Modal & Batch Addition Logic
  // ------------------------------------------------------------------------
  function addMultipleCourseRows(count = 5, defaultUnits = 3) {
    const num = Math.min(Math.max(parseInt(count) || 1, 1), 50);
    for (let i = 0; i < num; i++) {
      addCourseRow("", defaultUnits, "", "A");
    }
    showToast(`Successfully added <strong>${num}</strong> course rows!`, "success");
  }

  function openBulkModal() {
    if (bulkAddModal) bulkAddModal.style.display = "flex";
  }

  function closeBulkModal() {
    if (bulkAddModal) bulkAddModal.style.display = "none";
  }

  function submitBulkAdd() {
    const isQuickTab = tabQuickQuantity && tabQuickQuantity.classList.contains("active");

    if (isQuickTab) {
      const count = parseInt(bulkCourseCount ? bulkCourseCount.value : 5) || 5;
      const units = parseInt(bulkDefaultUnits ? bulkDefaultUnits.value : 3) || 3;
      addMultipleCourseRows(count, units);
    } else {
      // Paste Course List Tab
      const text = bulkPasteTextarea ? bulkPasteTextarea.value.trim() : "";
      if (!text) {
        showToast("Please paste or type course lines first.", "error");
        return;
      }

      const lines = text.split("\n");
      let addedCount = 0;

      lines.forEach(function (line) {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        // Parse line: "CSC 101, 3, 75" or "CSC 101, 3" or "CSC 101"
        const parts = cleanLine.split(",").map(p => p.trim());
        const courseName = parts[0] || "";
        const units = parts[1] ? (parseInt(parts[1]) || 3) : 3;
        const scoreOrGrade = parts[2] || "";

        let score = "";
        let grade = "A";

        if (scoreOrGrade) {
          if (!isNaN(scoreOrGrade)) {
            score = parseFloat(scoreOrGrade);
          } else {
            grade = scoreOrGrade.toUpperCase();
          }
        }

        addCourseRow(courseName, units, score, grade);
        addedCount++;
      });

      if (addedCount > 0) {
        showToast(`Imported &amp; added <strong>${addedCount}</strong> courses!`, "success");
        if (bulkPasteTextarea) bulkPasteTextarea.value = "";
      }
    }

    closeBulkModal();
    calculateCGPA();
  }

  // ------------------------------------------------------------------------
  // 16. Attach Initial Event Listeners
  // ------------------------------------------------------------------------
  loadCustomScalesFromStorage();

  // Add Course button click
  addCourseBtn.addEventListener("click", function () {
    addCourseRow();
  });

  // Batch +5 & +Bulk buttons
  if (add5CoursesBtn) {
    add5CoursesBtn.addEventListener("click", function () {
      addMultipleCourseRows(5, 3);
    });
  }

  if (openBulkAddBtn) {
    openBulkAddBtn.addEventListener("click", openBulkModal);
  }

  if (itemAdd5Courses) {
    itemAdd5Courses.addEventListener("click", function () {
      if (addOtherMenu) addOtherMenu.style.display = "none";
      addMultipleCourseRows(5, 3);
    });
  }

  if (itemAdd10Courses) {
    itemAdd10Courses.addEventListener("click", function () {
      if (addOtherMenu) addOtherMenu.style.display = "none";
      addMultipleCourseRows(10, 3);
    });
  }

  if (itemOpenBulkAdd) {
    itemOpenBulkAdd.addEventListener("click", function () {
      if (addOtherMenu) addOtherMenu.style.display = "none";
      openBulkModal();
    });
  }

  // Bulk Modal tab switching
  if (tabQuickQuantity && tabPasteList) {
    tabQuickQuantity.addEventListener("click", function () {
      tabQuickQuantity.classList.add("active");
      tabPasteList.classList.remove("active");
      if (panelQuickQuantity) panelQuickQuantity.style.display = "block";
      if (panelPasteList) panelPasteList.style.display = "none";
    });

    tabPasteList.addEventListener("click", function () {
      tabPasteList.classList.add("active");
      tabQuickQuantity.classList.remove("active");
      if (panelPasteList) panelPasteList.style.display = "block";
      if (panelQuickQuantity) panelQuickQuantity.style.display = "none";
    });
  }

  // Quantity preset pills
  const presetPills = document.querySelectorAll(".btn-preset-pill");
  presetPills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      const count = pill.getAttribute("data-count");
      if (count && bulkCourseCount) {
        bulkCourseCount.value = count;
      }
    });
  });

  if (bulkModalOverlay) bulkModalOverlay.addEventListener("click", closeBulkModal);
  if (bulkModalCloseBtn) bulkModalCloseBtn.addEventListener("click", closeBulkModal);
  if (btnCancelBulkAdd) btnCancelBulkAdd.addEventListener("click", closeBulkModal);
  if (btnSubmitBulkAdd) btnSubmitBulkAdd.addEventListener("click", submitBulkAdd);

  // Add Other Dropdown Toggle
  if (addOtherBtn && addOtherMenu) {
    addOtherBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isVisible = addOtherMenu.style.display === "flex";
      addOtherMenu.style.display = isVisible ? "none" : "flex";
    });

    document.addEventListener("click", function (e) {
      if (!addOtherBtn.contains(e.target) && !addOtherMenu.contains(e.target)) {
        addOtherMenu.style.display = "none";
      }
    });
  }

  // Add Other Dropdown Items
  if (itemAddPassfail) {
    itemAddPassfail.addEventListener("click", function () {
      if (addOtherMenu) addOtherMenu.style.display = "none";
      addCourseRow("GST Pass/Fail", 2, "", "P");
      showToast("Added Pass/Fail Course (Non-GPA Credit)", "info");
    });
  }

  if (itemAddWithdrawn) {
    itemAddWithdrawn.addEventListener("click", function () {
      if (addOtherMenu) addOtherMenu.style.display = "none";
      addCourseRow("Course Withdrawn", 3, "", "W");
      showToast("Added Withdrawn Course (Excluded from GPA)", "info");
    });
  }

  if (itemToggleCarryover) {
    itemToggleCarryover.addEventListener("click", function () {
      if (addOtherMenu) addOtherMenu.style.display = "none";
      if (carryoverCard) {
        const isHidden = carryoverCard.style.display === "none";
        carryoverCard.style.display = isHidden ? "flex" : "none";
        if (isHidden) {
          carryoverCard.scrollIntoView({ behavior: "smooth", block: "center" });
          showToast("Previous Cumulative CGPA Carryover enabled", "info");
        }
        calculateCGPA();
      }
    });
  }

  if (btnCloseCarryover) {
    btnCloseCarryover.addEventListener("click", function () {
      if (carryoverCard) carryoverCard.style.display = "none";
      calculateCGPA();
    });
  }

  if (prevTotalUnitsInput) {
    prevTotalUnitsInput.addEventListener("input", function () {
      calculateCGPA();
    });
  }

  if (prevTotalPointsInput) {
    prevTotalPointsInput.addEventListener("input", function () {
      calculateCGPA();
    });
  }

  if (itemOpenCustomScale) {
    itemOpenCustomScale.addEventListener("click", function () {
      if (addOtherMenu) addOtherMenu.style.display = "none";
      openCustomScaleModal();
    });
  }

  if (btnOpenCustomScale) {
    btnOpenCustomScale.addEventListener("click", function () {
      openCustomScaleModal();
    });
  }

  if (modalOverlay) modalOverlay.addEventListener("click", closeCustomScaleModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeCustomScaleModal);
  if (btnCancelCustomScale) btnCancelCustomScale.addEventListener("click", closeCustomScaleModal);
  if (btnSaveCustomScale) btnSaveCustomScale.addEventListener("click", saveCustomScale);

  // Calculate CGPA button click
  calculateBtn.addEventListener("click", function () {
    calculateCGPA();
  });

  // Save to History button click
  if (saveHistoryBtn) {
    saveHistoryBtn.addEventListener("click", function () {
      saveCurrentToHistory();
    });
  }

  // Clear All History button click
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", function () {
      clearAllHistory();
    });
  }

  // Reset All button click
  resetBtn.addEventListener("click", function () {
    if (carryoverCard) carryoverCard.style.display = "none";
    if (prevTotalUnitsInput) prevTotalUnitsInput.value = "0";
    if (prevTotalPointsInput) prevTotalPointsInput.value = "0";
    if (prevCgpaCalcDisplay) prevCgpaCalcDisplay.value = "0.00";
    resetAll();
  });

  // Scale change listener
  scaleSelect.addEventListener("change", function () {
    if (scaleSelect.value === "CUSTOM_ADD") {
      openCustomScaleModal();
      return;
    }
    updateGradingBreakdown();
    calculateCGPA();
  });

  // Attach score-to-grade sync, dynamic color, and delete handlers for existing static rows in HTML
  const initialRows = coursesTbody.querySelectorAll(".course-row");
  initialRows.forEach(function (row) {
    const scoreInput = row.querySelector(".course-score-input");
    const gradeSelect = row.querySelector(".course-grade-select");
    const removeBtn = row.querySelector(".btn-remove-row");

    if (gradeSelect) {
      updateGradeColor(gradeSelect);
      gradeSelect.addEventListener("change", function () {
        updateGradeColor(gradeSelect);
        updateGradingBreakdown();
      });
    }

    if (scoreInput && gradeSelect) {
      scoreInput.addEventListener("input", function () {
        const calculatedGrade = getGradeFromScore(scoreInput.value);
        if (calculatedGrade) {
          gradeSelect.value = calculatedGrade;
          updateGradeColor(gradeSelect);
          updateGradingBreakdown();
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        removeCourseRow(row);
      });
    }
  });

  // Initial update of breakdown cards & render existing saved history
  updateGradingBreakdown();
  renderHistory();
});


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
  // 1. Grade Scale Mappings & Storage Key
  // ------------------------------------------------------------------------
  const STORAGE_KEY = "student_cgpa_history_records";

  const GRADE_SCALES = {
    "5.0": {
      A: 5,
      B: 4,
      C: 3,
      D: 2,
      E: 1,
      F: 0,
    },
    "4.0": {
      A: 4,
      B: 3,
      C: 2,
      D: 1,
      E: 0,
      F: 0,
    },
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
    if (scale === "5.0") {
      if (cgpa >= 4.50) return { text: "First Class", className: "first-class" };
      if (cgpa >= 3.50) return { text: "Second Class Upper (2:1)", className: "second-upper" };
      if (cgpa >= 2.40) return { text: "Second Class Lower (2:2)", className: "second-lower" };
      if (cgpa >= 1.50) return { text: "Third Class", className: "third-class" };
      if (cgpa >= 1.00) return { text: "Pass", className: "pass" };
      return { text: "Fail", className: "fail" };
    } else {
      // 4.0 Scale
      if (cgpa >= 3.50) return { text: "Distinction / First Class", className: "first-class" };
      if (cgpa >= 3.00) return { text: "Honors (2:1)", className: "second-upper" };
      if (cgpa >= 2.00) return { text: "Satisfactory (2:2)", className: "second-lower" };
      if (cgpa >= 1.00) return { text: "Pass", className: "pass" };
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
        const pointPerUnit = gradePointsTable[grade] !== undefined ? gradePointsTable[grade] : 0;
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
    });

    // Handle edge case when total units is 0
    if (totalUnits === 0 || validRowsCount === 0) {
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

    const calculatedCGPA = totalQualityPoints / totalUnits;
    const formattedCGPA = calculatedCGPA.toFixed(2);

    // Update Result Cards
    cgpaValueDisplay.textContent = formattedCGPA;
    totalUnitsDisplay.textContent = totalUnits.toString();
    totalPointsDisplay.textContent = totalQualityPoints.toFixed(1);

    // Update Standing Remark
    const standing = getAcademicStanding(calculatedCGPA, selectedScale);
    standingDisplay.textContent = standing.text;
    standingDisplay.className = `result-value standing-badge ${standing.className}`;

    if (returnState) {
      return {
        scale: selectedScale,
        cgpa: calculatedCGPA,
        formattedCGPA: formattedCGPA,
        totalUnits: totalUnits,
        totalPoints: totalQualityPoints,
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
  // 14. Attach Initial Event Listeners
  // ------------------------------------------------------------------------
  // Add Course button click
  addCourseBtn.addEventListener("click", function () {
    addCourseRow();
  });

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
    resetAll();
  });

  // Scale change listener
  scaleSelect.addEventListener("change", function () {
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


const BASE_URL = "https://app.vbo.co.in";

const citySelect = document.getElementById("citySelect");
const daySelect = document.getElementById("daySelect");
const refreshBtn = document.getElementById("refreshBtn");
const slotTableBody = document.getElementById("slotTableBody");
const tableTitle = document.getElementById("tableTitle");
const lastSync = document.getElementById("lastSync");
const totalSlots = document.getElementById("totalSlots");
const heldSlots = document.getElementById("heldSlots");
const availableSlots = document.getElementById("availableSlots");
const totalCard = document.getElementById("totalCard");
const heldCard = document.getElementById("heldCard");
const availableCard = document.getElementById("availableCard");
const toast = document.getElementById("toast");
const serverState = document.getElementById("serverState");

let allSlots = [];
let toastTimer = null;
let activeMetricFilter = "all";

function setServerState(label, state = "ready") {
    serverState.classList.toggle("is-busy", state === "busy");
    serverState.classList.toggle("is-error", state === "error");
    serverState.querySelector("strong").textContent = label;
}

function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeSlotPayload(data) {
    const rows = [];
    for (const dayType of ["today", "tomorrow"]) {
        const dayRows = Array.isArray(data?.[dayType]) ? data[dayType] : [];
        dayRows.forEach((slot) => rows.push({ ...slot, day_type: slot.day_type || dayType }));
    }
    return rows.sort((a, b) => {
        const dayCompare = String(a.day_type).localeCompare(String(b.day_type));
        if (dayCompare !== 0) return dayCompare;
        return Number(a.slot_order || 0) - Number(b.slot_order || 0);
    });
}

function filteredSlots() {
    const selectedDay = daySelect.value;
    const dayRows = selectedDay === "all"
        ? allSlots
        : allSlots.filter((slot) => String(slot.day_type).toLowerCase() === selectedDay);

    if (activeMetricFilter === "held") {
        return dayRows.filter((slot) => Number(slot.manual_hold || 0) === 1);
    }

    if (activeMetricFilter === "available") {
        return dayRows.filter((slot) => Number(slot.manual_hold || 0) !== 1);
    }

    return dayRows;
}

function rowsForSelectedDay() {
    const selectedDay = daySelect.value;
    if (selectedDay === "all") return allSlots;
    return allSlots.filter((slot) => String(slot.day_type).toLowerCase() === selectedDay);
}

function updateSummary(baseRows) {
    const held = baseRows.filter((slot) => Number(slot.manual_hold || 0) === 1).length;
    totalSlots.textContent = baseRows.length;
    heldSlots.textContent = held;
    availableSlots.textContent = baseRows.length - held;
    heldCard.classList.toggle("is-alert", held > 0);
    heldCard.classList.toggle("is-blinking", held > 0);
    totalCard.classList.toggle("is-active", activeMetricFilter === "all");
    heldCard.classList.toggle("is-active", activeMetricFilter === "held");
    availableCard.classList.toggle("is-active", activeMetricFilter === "available");
}

function statusClass(status) {
    const value = String(status || "").toLowerCase();
    if (value === "full") return "is-full";
    if (value.includes("available")) return "is-open";
    return "";
}

function renderSlots() {
    const baseRows = rowsForSelectedDay();
    const rows = filteredSlots();
    updateSummary(baseRows);
    tableTitle.textContent = `${citySelect.value} slots`;

    if (!rows.length) {
        slotTableBody.innerHTML = `<tr><td colspan="9" class="empty">No slots found for this filter.</td></tr>`;
        return;
    }

    slotTableBody.innerHTML = rows.map((slot, index) => {
        const rowId = `slot-${index}`;
        const isHeld = Number(slot.manual_hold || 0) === 1;
        return `
            <tr data-city="${escapeHtml(slot.city)}" data-day="${escapeHtml(slot.day_type)}" data-slot="${escapeHtml(slot.slot_name)}">
                <td class="readonly">${escapeHtml(slot.city)}</td>
                <td class="readonly">${escapeHtml(slot.day_type)}</td>
                <td class="readonly">${escapeHtml(slot.slot_name)}</td>
                <td class="readonly">${escapeHtml(slot.slot_order)}</td>
                <td><span class="status-pill ${statusClass(slot.status)}">${escapeHtml(slot.status)}</span></td>
                <td class="readonly">${escapeHtml(slot.effective_units)}</td>
                <td>
                    <select class="hold-select" id="${rowId}-hold">
                        <option value="1" ${isHeld ? "selected" : ""}>Hold</option>
                        <option value="0" ${!isHeld ? "selected" : ""}>Available</option>
                    </select>
                </td>
                <td>
                    <input class="reason-input" id="${rowId}-reason" type="text" value="${escapeHtml(slot.hold_reason)}" placeholder="Reason">
                </td>
                <td>
                    <button class="btn btn-save" type="button" data-row="${rowId}">Save</button>
                    <span class="row-message" id="${rowId}-message"></span>
                </td>
            </tr>
        `;
    }).join("");

    slotTableBody.querySelectorAll(".btn-save").forEach((button) => {
        button.addEventListener("click", () => saveRow(button));
    });
}

async function loadSlots() {
    const city = citySelect.value;
    refreshBtn.disabled = true;
    setServerState("Loading", "busy");
    slotTableBody.innerHTML = `<tr><td colspan="9" class="empty">Loading slots...</td></tr>`;

    try {
        const response = await fetch(`${BASE_URL}/kwikkwash/slots?city=${encodeURIComponent(city)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        allSlots = normalizeSlotPayload(data);
        activeMetricFilter = "all";
        renderSlots();
        lastSync.textContent = `Last sync: ${new Date().toLocaleString()}`;
        setServerState("Live", "ready");
    } catch (error) {
        allSlots = [];
        renderSlots();
        setServerState("Error", "error");
        showToast(`Slots load nahi hue: ${error.message}`, true);
    } finally {
        refreshBtn.disabled = false;
    }
}

async function saveRow(button) {
    const row = button.closest("tr");
    const rowId = button.dataset.row;
    const message = document.getElementById(`${rowId}-message`);
    const payload = {
        city: row.dataset.city,
        day_type: row.dataset.day,
        slot_name: row.dataset.slot,
        manual_hold: Number(document.getElementById(`${rowId}-hold`).value),
        hold_reason: document.getElementById(`${rowId}-reason`).value.trim()
    };

    button.disabled = true;
    message.textContent = "Saving...";
    message.className = "row-message";
    setServerState("Saving", "busy");

    try {
        const response = await fetch(`${BASE_URL}/kwikkwash/slots/hold`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.status === "error") {
            throw new Error(result.message || `HTTP ${response.status}`);
        }
        message.textContent = "Saved";
        message.classList.add("is-success");
        showToast(`${payload.city} ${payload.day_type} ${payload.slot_name} saved`);
        await loadSlots();
    } catch (error) {
        message.textContent = error.message;
        message.classList.add("is-error");
        setServerState("Error", "error");
        showToast(`Save failed: ${error.message}`, true);
    } finally {
        button.disabled = false;
    }
}

refreshBtn.addEventListener("click", loadSlots);
citySelect.addEventListener("change", loadSlots);
daySelect.addEventListener("change", () => {
    activeMetricFilter = "all";
    renderSlots();
});
totalCard.addEventListener("click", () => {
    activeMetricFilter = "all";
    renderSlots();
});
heldCard.addEventListener("click", () => {
    activeMetricFilter = activeMetricFilter === "held" ? "all" : "held";
    renderSlots();
});
availableCard.addEventListener("click", () => {
    activeMetricFilter = activeMetricFilter === "available" ? "all" : "available";
    renderSlots();
});

loadSlots();

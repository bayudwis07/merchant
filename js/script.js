const Blow_Job = "aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWN";
const Hand_Job = "yb3Mvcy9BS2Z5Y2J6cDZYQ3AtSlhUbHZPYnBqYz";
const Sakura = "VRbUlUN0JHNTZWSjNqanRYSV9tQ1dmdDZrZVlFbzJ";
const Open_BO = "2R1hBWGtYeXZwbC00Z3VUUGMvZXhlYz90b2tlbj1CbHVlcmltMzIxISE=";
const API_URL = atob(Blow_Job + Hand_Job + Sakura + Open_BO);

const SECRET_TOKEN = "Bluerim321!!";
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 menit
let sessionInterval;

let merchantData = [];
let selectedMerchants = [];
let prevTotalTrx = 0;
let prevTotalSv = 0;

let pagination = {
  Result: { current: 1, itemsPerPage: 10 },
  Top25: { current: 1, itemsPerPage: 10 },
  Selected: { current: 1, itemsPerPage: 10 },
};
let sortConfigs = {
  top25: { key: "deltaSv", direction: "asc" },
  result: { key: null, direction: "asc" },
  selected: { key: null, direction: "asc" },
};

let branchChartInstance,
  productivityChartInstance,
  overallProductivityChartInstance;
Chart.register(ChartDataLabels);

// TOAST NOTIFICATION LOGIC

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");

  const isSuccess = type === "success";
  const bgColor = isSuccess
    ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50"
    : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50";
  const textColor = isSuccess
    ? "text-emerald-800 dark:text-emerald-300"
    : "text-red-800 dark:text-red-300";
  const icon = isSuccess
    ? `<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
    : `<svg class="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${bgColor} ${textColor} transform transition-all duration-300 translate-y-[-100%] opacity-0`;
  toast.innerHTML = `${icon} <span class="text-sm font-medium">${message}</span>`;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-[-100%]", "opacity-0");
  });

  // Remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-x-[100%]");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// DARK MODE LOGIC

const themeToggleBtn = document.getElementById("themeToggleBtn");
function updateThemeIcons() {
  if (document.documentElement.classList.contains("dark")) {
    document.getElementById("themeToggleDarkIcon").classList.add("hidden");
    document.getElementById("themeToggleLightIcon").classList.remove("hidden");
  } else {
    document.getElementById("themeToggleLightIcon").classList.add("hidden");
    document.getElementById("themeToggleDarkIcon").classList.remove("hidden");
  }
}
themeToggleBtn.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(
    "color-theme",
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  updateThemeIcons();
  updateChartsTheme();
});
updateThemeIcons();

// SIDEBAR TOGGLE (RESPONSIVE)

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  if (window.innerWidth < 1024) {
    // Mode Mobile: Toggle transformasi dan backdrop
    sidebar.classList.toggle("-translate-x-full");
    backdrop.classList.toggle("hidden");
  } else {
    // Mode Desktop: Toggle hidden
    sidebar.classList.toggle("lg:hidden");
  }
}

// AUTHENTICATION & LOGOUT MODAL

function checkSession() {
  const userData = localStorage.getItem("mms_user");
  const loginTime = localStorage.getItem("mms_login_time");
  if (!userData || !loginTime) {
    showLogin();
    return null;
  }
  const now = new Date().getTime();
  if (now - parseInt(loginTime) > SESSION_TIMEOUT) {
    showToast("Sesi Anda telah berakhir. Silakan login kembali.", "error");
    handleLogout();
    return null;
  }
  localStorage.setItem("mms_login_time", now.toString()); // Refresh
  return JSON.parse(userData);
}

function startSessionTimer() {
  if (sessionInterval) clearInterval(sessionInterval);
  sessionInterval = setInterval(() => checkSession(), 60000); // Check per 1 min
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("loginBtn");
  const loader = document.getElementById("loginLoader");
  const errorEl = document.getElementById("loginError");

  btn.disabled = true;
  loader.classList.remove("hidden");
  errorEl.classList.add("hidden");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "login", email, password }),
    });
    const res = await response.json();

    if (res.status === "success") {
      localStorage.setItem("mms_user", JSON.stringify(res.user));
      localStorage.setItem("mms_login_time", new Date().getTime().toString());
      initApp(res.user);
      addActivityLog(`${res.user.nama} berhasil login.`);

      // Trigger Success Toast
      setTimeout(() => {
        showToast("Login berhasil! Selamat datang di sistem.", "success");
      }, 300);
    } else {
      errorEl.textContent = res.message;
      errorEl.classList.remove("hidden");
    }
  } catch (err) {
    errorEl.textContent = "Gagal terhubung ke server.";
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    loader.classList.add("hidden");
  }
}

function promptLogout() {
  const modal = document.getElementById("logoutModal");
  const content = document.getElementById("logoutModalContent");

  modal.classList.remove("hidden");
  // Small delay for CSS transition to kick in
  setTimeout(() => {
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  }, 10);
}

function closeLogoutModal() {
  const modal = document.getElementById("logoutModal");
  const content = document.getElementById("logoutModalContent");

  content.classList.remove("scale-100", "opacity-100");
  content.classList.add("scale-95", "opacity-0");

  setTimeout(() => {
    modal.classList.add("hidden");
  }, 200); // match duration
}

function confirmLogout() {
  closeLogoutModal();
  handleLogout();
  // Beri jeda sedikit sebelum menampilkan toast logout (karena kembali ke layar login)
  setTimeout(() => {
    showToast("Anda telah berhasil keluar.", "success");
  }, 300);
}

function handleLogout() {
  const user = JSON.parse(localStorage.getItem("mms_user"));
  if (user) addActivityLog(`${user.nama} telah logout.`);
  localStorage.removeItem("mms_user");
  localStorage.removeItem("mms_login_time");
  if (sessionInterval) clearInterval(sessionInterval);
  showLogin();
}

function showLogin() {
  document.getElementById("loginContainer").classList.remove("hidden");
  document.getElementById("appContainer").classList.add("hidden");
  document.getElementById("loginPassword").value = "";
}

// APP INIT & RBAC ROUTING

function initApp(user) {
  document.getElementById("loginContainer").classList.add("hidden");
  document.getElementById("appContainer").classList.remove("hidden");

  document.getElementById("userGreetingNama").textContent = user.nama;
  document.getElementById("userGreetingRole").textContent = user.role;
  document.getElementById("userInitial").textContent = user.nama
    .charAt(0)
    .toUpperCase();

  const navDataBtn = document.getElementById("navData");
  if (user.role === "admin") navDataBtn.classList.remove("hidden");
  else navDataBtn.classList.add("hidden");

  startSessionTimer();
  switchView("dashboard");
  fetchSheetData();
}

function switchView(viewName) {
  const dashView = document.getElementById("viewDashboard");
  const dataView = document.getElementById("viewData");
  const navDash = document.getElementById("navDashboard");
  const navData = document.getElementById("navData");
  const title = document.getElementById("pageTitle");

  navDash.classList.replace("bg-white/10", "hover:bg-white/5");
  navDash.classList.replace("text-white", "text-slate-300");
  navData.classList.replace("bg-white/10", "hover:bg-white/5");
  navData.classList.replace("text-white", "text-slate-300");

  if (viewName === "dashboard") {
    dashView.classList.remove("hidden");
    dataView.classList.add("hidden");
    navDash.classList.replace("hover:bg-white/5", "bg-white/10");
    navDash.classList.replace("text-slate-300", "text-white");
    title.textContent = "Dashboard Rekapitulasi";
    // Trigger chart resize
    setTimeout(() => {
      if (branchChartInstance) branchChartInstance.resize();
    }, 100);
  } else if (viewName === "data") {
    dashView.classList.add("hidden");
    dataView.classList.remove("hidden");
    navData.classList.replace("hover:bg-white/5", "bg-white/10");
    navData.classList.replace("text-slate-300", "text-white");
    title.textContent = "Master Data & Filter";
  }

  // Tutup sidebar otomatis di mobile saat menu diklik
  if (window.innerWidth < 1024) {
    document.getElementById("sidebar").classList.add("-translate-x-full");
    document.getElementById("sidebarBackdrop").classList.add("hidden");
  }
}

// UTILITY FUNCTIONS

function formatCurrency(num) {
  return "Rp " + num.toLocaleString("id-ID");
}
function formatNumber(num) {
  return num.toLocaleString("id-ID");
}
function getDeltaPrefix(delta) {
  return delta > 0 ? "+" : "";
}
function animateValue(obj, start, end, duration, formatter, prefix = "") {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentVal = start + (end - start) * (1 - Math.pow(1 - progress, 4));
    obj.textContent = prefix + formatter(Math.round(currentVal));
    if (progress < 1) window.requestAnimationFrame(step);
    else obj.textContent = prefix + formatter(end);
  };
  window.requestAnimationFrame(step);
}

// LOGGING LOGIC

async function getUserIP() {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    return d.ip;
  } catch (e) {
    return "Unknown";
  }
}
function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve("Not Supported");
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve(
          `https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}`,
        ),
      (e) => resolve("Denied"),
    );
  });
}

async function addActivityLog(message) {
  // Hanya mengirim log ke backend (Google Sheet) untuk keperluan rekap. Tidak ditampilkan ke layar user (sesuai request).
  try {
    const ip = await getUserIP();
    const device = navigator.userAgent;
    const location = await getUserLocation();
    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "log",
        message,
        ip,
        device,
        location,
      }),
    });
  } catch (e) {}
}

// FETCH DATA

async function fetchSheetData() {
  const tbody = document.getElementById("resultBody");
  const emptyStateText = document.getElementById("emptyStateText");
  const statusText = document.getElementById("statusText");
  const statusIndicator = document.getElementById("statusIndicator");

  tbody.innerHTML = "";
  document.getElementById("emptyState").classList.remove("hidden");
  emptyStateText.innerHTML =
    '<span class="loader"></span> <span class="ml-2">Memuat Data Server...</span>';

  statusText.textContent = "CONNECTING";
  statusIndicator.className =
    "w-1.5 h-1.5 rounded-full bg-amber-500 pulse-badge";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "get_data", token: SECRET_TOKEN }),
    });
    const res = await response.json();

    if (res.status === "error") throw new Error(res.message);

    const rawData = res.data || [];
    merchantData = rawData.map((item) => {
      const trxLalu = Number(item.trxLast || 0);
      const svLalu = Number(item.svLast || 0);
      const trxUpdate = Number(item.trxUpdate || 0);
      const svUpdate = Number(item.svUpdate || 0);
      return {
        kodeKanca: String(item.kodeKanca || "-"),
        namaKanca: String(item.namaKanca || "-"),
        kodeUker: String(item.kodeUker || "-"),
        uker: String(item.namaUker || "-"),
        tid: String(item.tid || "-"),
        mid: String(item.mid || "-"),
        nama: String(item.namaMerchant || "-"),
        pemrakarsa: String(item.pemrakarsa || "-"),
        trxLalu,
        svLalu,
        trxUpdate,
        svUpdate,
        deltaTrx: trxUpdate - trxLalu,
        deltaSv: svUpdate - svLalu,
      };
    });

    statusText.textContent = "LIVE";
    statusIndicator.className =
      "w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-badge";

    if (res.currentDate) {
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      document.getElementById("dataTanggal").textContent = new Date(
        res.currentDate,
      ).toLocaleDateString("id-ID", options);
    }

    pagination.Result.current = 1;
    pagination.Top25.current = 1;
    renderResultTable(getFilteredData());
    renderCharts(getBaseFilteredData());
    renderTop25Table();
  } catch (error) {
    emptyStateText.innerHTML =
      '<span class="text-red-500">Gagal mengambil data. Server tidak merespon.</span>';
    statusText.textContent = "OFFLINE";
    statusIndicator.className = "w-1.5 h-1.5 rounded-full bg-red-500";
  }
}

function handleRefresh() {
  addActivityLog("Memperbarui data dari server (Refresh)");
  fetchSheetData();
}

// TABLE RENDERING & LOGIC

function generateTableRowHTML(item, rowNo, isSelected, showActionBtn) {
  const dTrx = item.deltaTrx;
  const dSv = item.deltaSv;
  let actionBtnHTML = "";

  if (showActionBtn === "Select") {
    actionBtnHTML = `<button onclick="selectMerchant('${item.tid}')" class="px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors ${isSelected ? "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-brand-500 text-white hover:bg-brand-600"}" ${isSelected ? "disabled" : ""}>${isSelected ? "Added" : "Select"}</button>`;
  } else if (showActionBtn === "Remove") {
    actionBtnHTML = `<button onclick="removeMerchant('${item.tid}')" class="px-3 py-1.5 bg-red-500 text-white rounded text-[10px] font-bold uppercase hover:bg-red-600">Remove</button>`;
  } else if (showActionBtn === "Top25") {
    actionBtnHTML = `<span class="inline-flex px-2 py-1 rounded text-xs font-bold ${dSv > 0 ? "text-emerald-600" : "text-red-600"}">${getDeltaPrefix(dSv)}${formatCurrency(dSv)}</span>`;
  }

  const isTop25 = showActionBtn === "Top25";
  return `
          <td class="px-5 py-3 text-sm text-center text-slate-500">${rowNo}</td>
          <td class="px-5 py-3 text-sm font-semibold">${item.nama}</td>
          <td class="px-5 py-3 text-xs text-slate-600 dark:text-slate-400">KC: ${item.namaKanca}<br/>UK: ${item.uker}</td>
          <td class="px-5 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono">T: ${item.tid}<br/>M: ${item.mid}</td>
          <td class="px-5 py-3 text-xs font-medium">${item.pemrakarsa}</td>
          ${
            isTop25
              ? `<td class="px-5 py-3 text-right">${actionBtnHTML}</td>`
              : `
          <td class="px-5 py-3 text-xs text-right text-slate-600 dark:text-slate-400">
            <div class="flex justify-between gap-2"><span class="text-[9px]">MOM:</span> <span>${formatNumber(item.trxLalu)}</span></div>
            <div class="flex justify-between gap-2 font-semibold"><span class="text-[9px]">NOW:</span> <span>${formatNumber(item.trxUpdate)}</span></div>
          </td>
          <td class="px-5 py-3 text-xs text-right text-slate-600 dark:text-slate-400">
            <div class="flex justify-between gap-2"><span class="text-[9px]">MOM:</span> <span>${formatCurrency(item.svLalu)}</span></div>
            <div class="flex justify-between gap-2 font-semibold"><span class="text-[9px]">NOW:</span> <span>${formatCurrency(item.svUpdate)}</span></div>
          </td>
          <td class="px-5 py-3 text-xs text-right">
            <div class="flex justify-between gap-2 mb-1"><span class="text-[9px]">TRX:</span> <span class="${dTrx > 0 ? "text-emerald-500" : "text-red-500"} font-bold">${getDeltaPrefix(dTrx)}${formatNumber(dTrx)}</span></div>
            <div class="flex justify-between gap-2"><span class="text-[9px]">SV:</span> <span class="${dSv > 0 ? "text-emerald-500" : "text-red-500"} font-bold">${getDeltaPrefix(dSv)}${formatCurrency(dSv)}</span></div>
          </td>
          <td class="px-5 py-3 text-center">${actionBtnHTML}</td>
          `
          }
        `;
}

function handlePagination(dataArray, tableType) {
  let itemsPerPage = pagination[tableType].itemsPerPage;
  let currentPage = pagination[tableType].current;
  if (itemsPerPage !== "all") {
    const totalItems = dataArray.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    pagination[tableType].current = currentPage;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return {
      paginatedData: dataArray.slice(
        startIndex,
        Math.min(startIndex + itemsPerPage, totalItems),
      ),
      startIndex,
      totalItems,
      totalPages,
      currentPage,
    };
  }
  return {
    paginatedData: dataArray,
    startIndex: 0,
    totalItems: dataArray.length,
    totalPages: 1,
    currentPage: 1,
  };
}

function updatePaginationUI(tableType, info) {
  const controls = document.getElementById(`paginationControls${tableType}`);
  if (!controls) return;
  if (info.totalItems === 0) {
    controls.classList.add("hidden");
    return;
  }
  controls.classList.remove("hidden");
  document.getElementById(`paginationInfo${tableType}`).textContent =
    `Total ${info.totalItems}`;
}

function changeItemsPerPage(type) {
  pagination[type].itemsPerPage =
    document.getElementById(`itemsPerPage${type}`).value === "all"
      ? "all"
      : parseInt(document.getElementById(`itemsPerPage${type}`).value);
  pagination[type].current = 1;
  refreshTables(type);
}
function nextPage(type) {
  pagination[type].current++;
  refreshTables(type);
}
function prevPage(type) {
  if (pagination[type].current > 1) {
    pagination[type].current--;
    refreshTables(type);
  }
}
function refreshTables(type) {
  if (type === "Result") renderResultTable(getFilteredData());
  if (type === "Top25") renderTop25Table();
  if (type === "Selected") renderSelectedTable();
}

function applySort(dataArray, config) {
  if (!config.key) return dataArray;
  return [...dataArray].sort((a, b) => {
    let valA = a[config.key];
    let valB = b[config.key];
    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return config.direction === "asc" ? -1 : 1;
    if (valA > valB) return config.direction === "asc" ? 1 : -1;
    return 0;
  });
}

function requestSort(table, key) {
  if (sortConfigs[table].key === key)
    sortConfigs[table].direction =
      sortConfigs[table].direction === "asc" ? "desc" : "asc";
  else {
    sortConfigs[table].key = key;
    sortConfigs[table].direction = "asc";
  }
  refreshTables(table.charAt(0).toUpperCase() + table.slice(1));
}

function renderResultTable(data) {
  const tbody = document.getElementById("resultBody");
  if (!data || data.length === 0) {
    tbody.innerHTML = "";
    document.getElementById("emptyState").classList.remove("hidden");
    document.getElementById("resultCount").textContent = "0 records";
    document.getElementById("paginationControlsResult").classList.add("hidden");
    return;
  }
  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("resultCount").textContent =
    `${formatNumber(data.length)} records`;

  const pageInfo = handlePagination(data, "Result");
  updatePaginationUI("Result", pageInfo);
  tbody.innerHTML = pageInfo.paginatedData
    .map((item, i) => {
      const isSelected = selectedMerchants.some((m) => m.tid === item.tid);
      return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? "bg-brand-50/50 dark:bg-brand-900/10" : "bg-white dark:bg-slate-800"}">${generateTableRowHTML(item, pageInfo.startIndex + i + 1, isSelected, "Select")}</tr>`;
    })
    .join("");
}

function renderSelectedTable() {
  const tbody = document.getElementById("selectedBody");
  if (selectedMerchants.length === 0) {
    tbody.innerHTML = "";
    document.getElementById("selectedEmptyState").classList.remove("hidden");
    document.getElementById("selectedCount").textContent = "0 selected";
    document
      .getElementById("paginationControlsSelected")
      .classList.add("hidden");
    updateTotals();
    return;
  }
  document.getElementById("selectedEmptyState").classList.add("hidden");
  document.getElementById("selectedCount").textContent =
    `${selectedMerchants.length} selected`;

  const data = applySort(selectedMerchants, sortConfigs.selected);
  const pageInfo = handlePagination(data, "Selected");
  updatePaginationUI("Selected", pageInfo);
  tbody.innerHTML = pageInfo.paginatedData
    .map(
      (item, i) =>
        `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-800">${generateTableRowHTML(item, pageInfo.startIndex + i + 1, false, "Remove")}</tr>`,
    )
    .join("");
  updateTotals();
}

function renderTop25Table() {
  const tbody = document.getElementById("top25Body");
  const data = applySort(
    [...getBaseFilteredData()]
      .sort((a, b) => a.deltaSv - b.deltaSv)
      .slice(0, 25),
    sortConfigs.top25,
  );
  if (data.length === 0) return (tbody.innerHTML = "");
  const pageInfo = handlePagination(data, "Top25");
  tbody.innerHTML = pageInfo.paginatedData
    .map(
      (item, i) =>
        `<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-800">${generateTableRowHTML(item, pageInfo.startIndex + i + 1, false, "Top25")}</tr>`,
    )
    .join("");
}

// CHARTS & SELECTION

function getChartThemeColors() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    textColor: isDark ? "#cbd5e1" : "#475569",
    gridColor: isDark ? "#334155" : "#e2e8f0",
  };
}
function updateChartsTheme() {
  if (branchChartInstance) renderCharts(getBaseFilteredData());
}

function renderCharts(data) {
  if (branchChartInstance) branchChartInstance.destroy();
  if (productivityChartInstance) productivityChartInstance.destroy();
  if (overallProductivityChartInstance)
    overallProductivityChartInstance.destroy();
  if (!data || data.length === 0) return;

  const colors = getChartThemeColors();

  // Chart 1
  const branchMap = {};
  data.forEach((i) => {
    branchMap[i.namaKanca] = (branchMap[i.namaKanca] || 0) + i.deltaSv;
  });
  const branchData = Object.keys(branchMap)
    .map((k) => ({ k, d: Math.round(branchMap[k] / 1000000) }))
    .sort((a, b) => b.d - a.d);
  branchChartInstance = new Chart(document.getElementById("branchChart"), {
    type: "bar",
    data: {
      labels: branchData.map((b) => b.k),
      datasets: [
        {
          data: branchData.map((b) => b.d),
          backgroundColor: branchData.map((b) =>
            b.d < 0 ? "#ef4444" : "#10b981",
          ),
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          color: colors.textColor,
          align: "end",
          anchor: "end",
          formatter: (v) => (v > 0 ? "+" + v + " Jt" : v + " Jt"),
        },
      },
      scales: {
        x: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.textColor },
        },
        y: {
          grid: { display: false },
          ticks: { color: colors.textColor },
        },
      },
    },
  });

  // Chart 2
  const prod = data.filter((i) => i.svUpdate >= 15000000).length;
  const nProd = data.length - prod;
  overallProductivityChartInstance = new Chart(
    document.getElementById("overallProductivityChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Produktif", "Non-Produktif"],
        datasets: [
          {
            data: [prod, nProd],
            backgroundColor: ["#10b981", "#f43f5e"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: colors.textColor },
          },
          datalabels: {
            color: "#fff",
            formatter: (v) =>
              v > 0 ? ((v / data.length) * 100).toFixed(0) + "%" : null,
          },
        },
      },
    },
  );

  // Chart 3
  const pMap = {};
  data.forEach((i) => {
    if (!pMap[i.namaKanca]) pMap[i.namaKanca] = { t: 0, p: 0 };
    pMap[i.namaKanca].t++;
    if (i.svUpdate >= 15000000) pMap[i.namaKanca].p++;
  });
  const pData = Object.keys(pMap)
    .map((k) => ({ k, pct: (pMap[k].p / pMap[k].t) * 100, d: pMap[k] }))
    .sort((a, b) => b.pct - a.pct);
  productivityChartInstance = new Chart(
    document.getElementById("productivityChart"),
    {
      type: "bar",
      data: {
        labels: pData.map((p) => p.k),
        datasets: [
          { data: pData.map((p) => p.pct), backgroundColor: "#0ea5e9" },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: colors.textColor,
            align: "right",
            anchor: "end",
            formatter: (v, ctx) =>
              v.toFixed(1) +
              "% (" +
              pData[ctx.dataIndex].d.p +
              "/" +
              pData[ctx.dataIndex].d.t +
              ")",
          },
        },
        scales: {
          x: {
            max: 100,
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor },
          },
          y: {
            grid: { display: false },
            ticks: { color: colors.textColor },
          },
        },
      },
    },
  );
}

function updateTotals() {
  let tTrx = 0;
  let tSv = 0;
  selectedMerchants.forEach((i) => {
    tTrx += i.deltaTrx;
    tSv += i.deltaSv;
  });
  const elTrx = document.getElementById("totalTrx");
  const elSv = document.getElementById("totalSv");
  elTrx.className = `text-2xl font-bold mt-1 ${tTrx > 0 ? "text-emerald-500" : tTrx < 0 ? "text-red-500" : "text-slate-800 dark:text-white"}`;
  elSv.className = `text-2xl font-bold mt-1 ${tSv > 0 ? "text-emerald-500" : tSv < 0 ? "text-red-500" : "text-slate-800 dark:text-white"}`;
  animateValue(
    elTrx,
    prevTotalTrx,
    tTrx,
    800,
    formatNumber,
    getDeltaPrefix(tTrx),
  );
  animateValue(
    elSv,
    prevTotalSv,
    tSv,
    800,
    formatCurrency,
    getDeltaPrefix(tSv),
  );
  prevTotalTrx = tTrx;
  prevTotalSv = tSv;
}

function toggleSelectAll() {
  const current = getFilteredData();
  if (current.length === 0) return;
  const allSel = current.every((i) =>
    selectedMerchants.some((m) => m.tid === i.tid),
  );
  if (allSel) {
    const tids = current.map((i) => i.tid);
    selectedMerchants = selectedMerchants.filter((m) => !tids.includes(m.tid));
    addActivityLog(`Unselect All`);
  } else {
    current.forEach((i) => {
      if (!selectedMerchants.some((m) => m.tid === i.tid))
        selectedMerchants.push(i);
    });
    addActivityLog(`Select All`);
  }
  renderResultTable(current);
  renderSelectedTable();
}

function selectMerchant(tid) {
  const m = merchantData.find((m) => m.tid === tid);
  if (m && !selectedMerchants.some((s) => s.tid === tid)) {
    selectedMerchants.push(m);
    addActivityLog(`Menambahkan ${m.nama}`);
    renderResultTable(getFilteredData());
    renderSelectedTable();
  }
}
function removeMerchant(tid) {
  selectedMerchants = selectedMerchants.filter((m) => m.tid !== tid);
  renderResultTable(getFilteredData());
  renderSelectedTable();
}
function clearSelected() {
  selectedMerchants = [];
  addActivityLog(`Clear All Selected`);
  renderResultTable(getFilteredData());
  renderSelectedTable();
}

function getBaseFilteredData() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const cat = document.getElementById("searchCategory").value;
  const svType = document.getElementById("svFilterType").value;
  const svVal = parseFloat(document.getElementById("svFilterValue").value);
  let f = merchantData;
  if (term)
    f = f.filter((i) =>
      cat === "all"
        ? Object.values(i).join(" ").toLowerCase().includes(term)
        : String(i[cat] || "")
            .toLowerCase()
            .includes(term),
    );
  if (svType !== "all" && !isNaN(svVal))
    f = f.filter((i) =>
      svType === ">=" ? i.svUpdate >= svVal : i.svUpdate <= svVal,
    );
  return f;
}
function getFilteredData() {
  return applySort(getBaseFilteredData(), sortConfigs.result);
}

let searchTimeout;
function searchMerchant() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.Result.current = 1;
    pagination.Top25.current = 1;
    renderResultTable(getFilteredData());
    renderCharts(getBaseFilteredData());
    renderTop25Table();
  }, 300);
}
function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("svFilterValue").value = "";
  searchMerchant();
}

// DOWNLOAD EXPORTS (CSV & PDF) FULL DATA

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function getFullCSVString(dataArray) {
  let str =
    "No,Kode Kanca,Nama Kanca,Kode Uker,Nama Uker,TID,MID,Nama Merchant,RMFT,Trx MOM,SV MOM,Trx Update,SV Update,Delta Trx,Delta SV\n";
  str += dataArray
    .map(
      (i, index) =>
        `${index + 1},"${i.kodeKanca}","${i.namaKanca}","${i.kodeUker}","${i.uker}","${i.tid}","${i.mid}","${i.nama}","${i.pemrakarsa}",${i.trxLalu},${i.svLalu},${i.trxUpdate},${i.svUpdate},${i.deltaTrx},${i.deltaSv}`,
    )
    .join("\n");
  return str;
}

function downloadMerchantDataCSV() {
  const d = getFilteredData();
  if (!d.length) return;
  addActivityLog("Download Master CSV");
  downloadCSV(getFullCSVString(d), "MasterData_MOM_Full.csv");
}
function downloadSelectedCSV() {
  if (!selectedMerchants.length) return;
  addActivityLog("Download Selected CSV");
  downloadCSV(getFullCSVString(selectedMerchants), "Selected_MOM_Full.csv");
}
function downloadTop25CSV() {
  const d = applySort(
    [...getBaseFilteredData()]
      .sort((a, b) => a.deltaSv - b.deltaSv)
      .slice(0, 25),
    sortConfigs.top25,
  );
  if (!d.length) return;
  downloadCSV(getFullCSVString(d), "Top25_MOM_Full.csv");
}
function downloadChart(id, name) {
  const c = document.getElementById(id);
  const n = document.createElement("canvas");
  n.width = c.width;
  n.height = c.height;
  const ctx = n.getContext("2d");
  ctx.fillStyle = document.documentElement.classList.contains("dark")
    ? "#1e293b"
    : "#fff";
  ctx.fillRect(0, 0, n.width, n.height);
  ctx.drawImage(c, 0, 0);
  const l = document.createElement("a");
  l.download = name;
  l.href = n.toDataURL("image/png");
  l.click();
}

function downloadTop25PDF() {
  if (!window.jspdf) return alert("jsPDF library not loaded");
  const doc = new window.jspdf.jsPDF("landscape");
  doc.text("Top 25 Penurunan Sales Volume", 14, 15);
  const d = applySort(
    [...getBaseFilteredData()]
      .sort((a, b) => a.deltaSv - b.deltaSv)
      .slice(0, 25),
    sortConfigs.top25,
  );

  doc.autoTable({
    head: [
      ["No", "TID", "MID", "Merchant", "Kanca", "Uker", "RMFT", "Δ SV MOM"],
    ],
    body: d.map((i, index) => [
      index + 1,
      i.tid,
      i.mid,
      i.nama,
      i.namaKanca,
      i.uker,
      i.pemrakarsa,
      getDeltaPrefix(i.deltaSv) + formatCurrency(i.deltaSv),
    ]),
    startY: 20,
    theme: "striped", // Banded row
    styles: { fontSize: 8 },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 7) {
        const val = data.cell.text[0] || "";
        if (val.includes("-"))
          data.cell.styles.textColor = [239, 68, 68]; // Merah
        else if (val.includes("+")) data.cell.styles.textColor = [16, 185, 129]; // Hijau
      }
    },
    didDrawPage: function (data) {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

      const marginLeft = data.settings.margin.left;
      const footerY = pageHeight - 10;

      doc.setFontSize(8);

      // Teks sebelum username
      const leftText = "© BAYU DWI SUHARMINTO | ig: ";

      // Warna abu untuk teks biasa
      doc.setTextColor(150);
      doc.text(leftText, marginLeft, footerY);

      // Hitung panjang teks supaya tetap satu baris
      const textWidth = doc.getTextWidth(leftText);

      // Warna biru untuk link
      doc.setTextColor(0, 0, 255);

      doc.textWithLink("@bayudwis_07", marginLeft + textWidth, footerY, {
        url: "https://instagram.com/bayudwis_07",
      });

      // Reset warna
      doc.setTextColor(0);
    },
  });
  doc.save("Top25_MOM.pdf");
}

function downloadSelectedPDF() {
  if (!window.jspdf || !selectedMerchants.length) return;
  const doc = new window.jspdf.jsPDF("landscape");
  doc.text("Report Merchant Sales VOlume MOM", 14, 15);
  const d = applySort(selectedMerchants, sortConfigs.selected);

  doc.autoTable({
    head: [
      [
        "No",
        "TID",
        "MID",
        "Merchant",
        "Kanca",
        "Uker",
        "RMFT",
        "Trx Update",
        "SV Update",
        "Δ Trx MOM",
        "Δ SV MOM",
      ],
    ],
    body: d.map((i, index) => [
      index + 1,
      i.tid,
      i.mid,
      i.nama,
      i.namaKanca,
      i.uker,
      i.pemrakarsa,
      formatNumber(i.trxUpdate),
      formatCurrency(i.svUpdate),
      getDeltaPrefix(i.deltaTrx) + formatNumber(i.deltaTrx),
      getDeltaPrefix(i.deltaSv) + formatCurrency(i.deltaSv),
    ]),
    startY: 20,
    theme: "striped", // Banded row
    styles: { fontSize: 8 },
    didParseCell: function (data) {
      if (
        data.section === "body" &&
        (data.column.index === 9 || data.column.index === 10)
      ) {
        const val = data.cell.text[0] || "";
        if (val.includes("-"))
          data.cell.styles.textColor = [239, 68, 68]; // Merah
        else if (val.includes("+")) data.cell.styles.textColor = [16, 185, 129]; // Hijau
      }
    },
    didDrawPage: function (data) {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

      const marginLeft = data.settings.margin.left;
      const footerY = pageHeight - 10;

      doc.setFontSize(8);

      // Warna abu untuk copyright
      doc.setTextColor(150);
      const leftText = "© BAYU DWI SUHARMINTO | ig: ";
      doc.text(leftText, marginLeft, footerY);

      // Hitung posisi setelah teks kiri
      const textWidth = doc.getTextWidth(leftText);

      // Warna biru untuk link
      doc.setTextColor(0, 0, 255);

      doc.textWithLink("@bayudwis_07", marginLeft + textWidth, footerY, {
        url: "https://instagram.com/bayudwis_07",
      });

      // Kembalikan warna default jika ada teks lain setelah ini
      doc.setTextColor(0);
    },
  });
  doc.save("Selected_MOM.pdf");
}

// STARTUP SCRIPT

window.onload = () => {
  const user = checkSession();
  if (user)
    initApp(user); // Will show app & fetch data
  else showLogin(); // Will show login screen
};

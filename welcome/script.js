const GAS_URL = "https://script.google.com/macros/s/AKfycbxf54KAI4RIUPHQEa2sPp4GrhMCteLqtdmCKyi8jX2xSdpo0AF_efqo0pEGoIWgBDpH/exec";
let currentUser = {};
let userDevice = "";
let userLocation = "";

// ================= DEVICE & LOCATION DETECTION =================
function detectDevice() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
  return "Desktop/Web";
}

function getLocation() {
  return new Promise(resolve => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
        () => resolve("Permission Denied")
      );
    } else {
      resolve("Not Supported");
    }
  });
}

// ================= INDIAN STATES & MAJOR CITIES =================
const statesCities = {
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool"],
  "Arunachal Pradesh": ["Itanagar"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
  "Goa": ["Panaji", "Margao"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Haryana": ["Gurgaon", "Faridabad", "Panipat"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  "Manipur": ["Imphal"],
  "Meghalaya": ["Shillong"],
  "Mizoram": ["Aizawl"],
  "Nagaland": ["Kohima", "Dimapur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Udaipur"],
  "Sikkim": ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
  "Tripura": ["Agartala"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Noida", "Meerut"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Haldwani"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri"],
  "Delhi": ["New Delhi"],
  "Puducherry": ["Puducherry"],
  "Chandigarh": ["Chandigarh"],
  "Ladakh": ["Leh"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"]
};

function populateStates() {
  const select = document.getElementById("state");
  if (!select) return;
  Object.keys(statesCities).sort().forEach(state => {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    select.appendChild(opt);
  });
}

function populateCities() {
  const state = document.getElementById("state")?.value;
  const citySelect = document.getElementById("city");
  if (!citySelect) return;
  citySelect.innerHTML = '<option value="">Select City</option>';
  if (state && statesCities[state]) {
    statesCities[state].sort().forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }
}

// ================= PAGE LOAD =================
window.onload = async () => {
  hideAll();
  showLoader();

  const token = localStorage.getItem("kw_token");
  const email = localStorage.getItem("kw_email");

  if (!token || !email) {
    await delay(600);
    showLogin();
    ensureOneVisible();
    return;
  }

  try {
    const res = await fetch(GAS_URL);
    if (!res.ok) throw new Error("Failed to verify user");
    const users = await res.json();
    const match = users.find(u => u.Email === email && u.Token === token);

    if (match) {
      currentUser = { email: match.Email, name: match.Name };
      showProfile(); // Direct dashboard if already logged in
    } else {
      localStorage.clear();
      await delay(400);
      showLogin();
    }
  } catch (err) {
    console.error("Verification error:", err);
    localStorage.clear();
    await delay(400);
    showLogin();
  } finally {
    ensureOneVisible();
  }
};

// ================= UI CORE =================
function hideAll() {
  ["loadingBox", "loginBox", "profileFormBox", "profileBox"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.style.display = "none";
    }
  });
}

function showLoader() {
  const el = document.getElementById("loadingBox");
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "flex";
  }
}

function showLogin() {
  hideAll();
  const el = document.getElementById("loginBox");
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "flex";
  }
  document.getElementById("googleBtn").innerHTML = "";
  initGoogleLogin();
}

function showProfile() {
  hideAll();
  const el = document.getElementById("profileBox");
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "block";
  }
  document.getElementById("welcomeText").innerText = `Welcome to Kwikkwash, ${currentUser.name || "User"}!`;
  loadBookings();
}

function showProfileForm() {
  hideAll();
  const el = document.getElementById("profileFormBox");
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "flex";
  }
  populateStates();
  document.getElementById("state").addEventListener("change", populateCities);
}

// ================= GOOGLE LOGIN =================
function initGoogleLogin() {
  if (!window.google?.accounts) return;
  if (window.googleInited) return;
  window.googleInited = true;

  google.accounts.id.initialize({
    client_id: "262661002432-79edenh6esvcj8ve8r7a2jd728p3fdtb.apps.googleusercontent.com",
    callback: handleGoogleLogin
  });

  google.accounts.id.renderButton(
    document.getElementById("googleBtn"),
    { theme: "outline", size: "large", width: "100%" }
  );
}

async function handleGoogleLogin(response) {
  showLoader();
  try {
    const payload = JSON.parse(atob(response.credential.split(".")[1]));
    const email = payload.email;
    const name = payload.name;
    const token = "kw_" + Date.now();

    localStorage.setItem("kw_email", email);
    localStorage.setItem("kw_token", token);
    currentUser = { email, name };

    // Save user to Sheet 1
    const params = new URLSearchParams({ type: "adduser", email, name, token });
    const res = await fetch(`${GAS_URL}?${params}`);
    const data = await res.json();

    if (!data.success) throw new Error("Failed to save user");

    // Capture hidden data
    userDevice = detectDevice();
    userLocation = await getLocation();

    // Show profile form (first time)
    showProfileForm();

  } catch (err) {
    console.error(err);
    alert("Login failed. Please try again.");
    localStorage.clear();
    showLogin();
  }
}

// ================= PROFILE FORM SUBMIT =================
document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const mobile = document.getElementById("profileMobile").value.trim();
  if (!/^\d{10}$/.test(mobile)) {
    alert("Please enter a valid 10-digit mobile number");
    return;
  }

  const state = document.getElementById("state").value;
  const city = document.getElementById("city").value;
  const fulladdress = document.getElementById("profileAddress").value.trim();

  if (!state || !city || !fulladdress) {
    alert("All fields are required");
    return;
  }

  const params = new URLSearchParams({
    type: "addprofile",
    email: currentUser.email,
    mobile,
    state,
    city,
    fulladdress,
    location: userLocation,
    device: userDevice
  });

  try {
    const res = await fetch(`${GAS_URL}?${params}`);
    const data = await res.json();
    if (data.success) {
      alert("Profile saved successfully!");
      showProfile();
    } else {
      alert("Failed to save profile. Try again.");
    }
  } catch (err) {
    alert("Network error. Check your connection.");
  }
});

// ================= BOOKINGS =================
function loadBookings() {
  const tbody = document.querySelector("#bookingTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='4'>Loading bookings…</td></tr>";

  const params = new URLSearchParams({ type: "bookings", email: currentUser.email });
  fetch(`${GAS_URL}?${params}`)
    .then(res => res.json())
    .then(rows => {
      tbody.innerHTML = "";
      if (!rows || rows.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>No bookings yet</td></tr>";
        return;
      }
      rows.reverse().forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${b.Mobile || "-"}</td>
          <td>${b.Location || "-"}</td>
          <td>${b.Address || "-"}</td>
          <td>${b.Time || "-"}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(() => {
      tbody.innerHTML = "<tr><td colspan='4'>Failed to load bookings</td></tr>";
    });
}

function bookWash() {
  const mobileEl = document.getElementById("bookingMobile");
  const addressEl = document.getElementById("bookingAddress");

  const mobile = mobileEl.value.trim();
  if (!/^\d{10}$/.test(mobile)) {
    alert("Please enter a valid 10-digit mobile number.");
    mobileEl.focus();
    return;
  }

  const address = addressEl.value.trim();
  if (!address) {
    alert("Please enter the service address.");
    addressEl.focus();
    return;
  }

  if (!confirm(`Confirm booking at ${address} for mobile ${mobile}?`)) return;

  const params = new URLSearchParams({
    type: "book",
    email: currentUser.email,
    mobile,
    address
  });

  fetch(`${GAS_URL}?${params}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Booking confirmed! We'll contact you soon.");
        mobileEl.value = "";
        addressEl.value = "";
        loadBookings();
      } else {
        alert("Booking failed. Try again.");
      }
    })
    .catch(() => alert("Network error. Try again."));
}

// ================= SAFETY NET & LOGOUT =================
function ensureOneVisible() {
  const visible = ["loadingBox", "loginBox", "profileFormBox", "profileBox"].some(id => {
    const el = document.getElementById(id);
    return el && el.style.display !== "none";
  });
  if (!visible) showLogin();
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    currentUser = {};
    location.reload();
  }
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}
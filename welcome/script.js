const GAS_URL = "https://script.google.com/macros/s/AKfycbzwssQSPMzsssvkIIoPKxeuwXFTk97RFWNmrZmmcdXY_aIl0OHbPQAV7sctzcUj6uQl6w/exec";
let currentUser = {};

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
    if (!res.ok) throw new Error('Failed to fetch users');
    const users = await res.json();
    const match = users.find(u => u.Email === email && u.Token === token);
    if (match) {
      currentUser = { email: match.Email, name: match.Name };
      showProfile();
    } else {
      localStorage.clear();
      await delay(400);
      showLogin();
    }
  } catch (err) {
    console.error('Verification error:', err);
    localStorage.clear();
    await delay(400);
    showLogin();
  } finally {
    ensureOneVisible();
  }
};

// ================= UI CORE =================
function hideAll() {
  ["loadingBox", "loginBox", "profileBox"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.style.display = "none";
    }
  });
}

function showLoader() {
  const loader = document.getElementById("loadingBox");
  if (loader) {
    loader.classList.remove("hidden");
    loader.style.display = "flex";
  }
}

function showLogin() {
  hideAll();
  const login = document.getElementById("loginBox");
  if (login) {
    login.classList.remove("hidden");
    login.style.display = "flex";
  }
  const googleBtn = document.getElementById("googleBtn");
  if (googleBtn) {
    googleBtn.innerHTML = "";
  }
  initGoogleLogin();
}

function showProfile() {
  hideAll();
  const dash = document.getElementById("profileBox");
  if (dash) {
    dash.classList.remove("hidden");
    dash.style.display = "block";
  }
  const welcomeText = document.getElementById("welcomeText");
  if (welcomeText && currentUser.name) {
    welcomeText.innerText = "Welcome to Kwikkwash, " + currentUser.name + "!";
  }
  loadBookings();
}

// ================= GOOGLE LOGIN =================
function initGoogleLogin() {
  if (!window.google || !window.google.accounts) {
    console.warn('Google API not loaded yet');
    return;
  }
  if (window.googleInited) return;
  window.googleInited = true;
  window.google.accounts.id.initialize({
    client_id: "262661002432-79edenh6esvcj8ve8r7a2jd728p3fdtb.apps.googleusercontent.com",
    callback: handleGoogleLogin
  });
  window.google.accounts.id.renderButton(
    document.getElementById("googleBtn"),
    { theme: "outline", size: "large", width: "100%" }
  );
}

function handleGoogleLogin(response) {
  showLoader();
  try {
    const payload = JSON.parse(atob(response.credential.split(".")[1]));
    const email = payload.email;
    const name = payload.name;
    const token = "kw_" + Date.now();
    localStorage.setItem("kw_email", email);
    localStorage.setItem("kw_token", token);
    currentUser = { email, name };

    // Register or update user in backend
    const params = new URLSearchParams({
      type: 'adduser',
      email: email,
      name: name,
      token: token
    });
    fetch(`${GAS_URL}?${params}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to register user');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          showProfile();
        } else {
          throw new Error(data.error || 'Registration failed');
        }
      })
      .catch(err => {
        console.error('Registration error:', err);
        localStorage.clear();
        alert('Login failed: ' + err.message);
        showLogin();
      });
  } catch (err) {
    console.error('Google login decode error:', err);
    localStorage.clear();
    alert('Invalid Google response');
    showLogin();
  }
}

// ================= BOOKINGS =================
function loadBookings() {
  const tbody = document.querySelector("#bookingTable tbody");
  if (!tbody || !currentUser.email) return;
  tbody.innerHTML = "<tr><td colspan='4'>Loading bookings…</td></tr>";
  const params = new URLSearchParams({
    type: 'bookings',
    email: currentUser.email
  });
  fetch(`${GAS_URL}?${params}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load bookings');
      return res.json();
    })
    .then(rows => {
      tbody.innerHTML = "";
      if (!Array.isArray(rows) || rows.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>No bookings yet</td></tr>";
        return;
      }
      // Assume rows are in chronological order (oldest first); reverse for recent first
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
    .catch(err => {
      console.error('Bookings load error:', err);
      tbody.innerHTML = "<tr><td colspan='4'>Failed to load bookings</td></tr>";
    });
}

function bookWash() {
  const mobileEl = document.getElementById('mobile');
  const addressEl = document.getElementById('address');
  if (!mobileEl || !addressEl) return;

  const mobile = mobileEl.value.trim();
  if (!/^\d{10}$/.test(mobile)) {
    alert('Please enter a valid 10-digit mobile number.');
    mobileEl.focus();
    return;
  }

  const address = addressEl.value.trim();
  if (!address) {
    alert('Please enter the service address.');
    addressEl.focus();
    return;
  }

  if (!confirm(`Confirm booking car wash at ${address} for ${mobile}?`)) {
    return;
  }

  const params = new URLSearchParams({
    type: 'book',
    email: currentUser.email,
    mobile: mobile,
    address: address
  });

  fetch(`${GAS_URL}?${params}`)
    .then(res => {
      if (!res.ok) throw new Error('Booking request failed');
      return res.json();
    })
    .then(data => {
      if (data.success) {
        alert('Booking confirmed! We\'ll contact you shortly.');
        mobileEl.value = '';
        addressEl.value = '';
        loadBookings();
      } else {
        throw new Error(data.error || 'Booking failed');
      }
    })
    .catch(err => {
      console.error('Booking error:', err);
      alert('Booking error: ' + err.message);
    });
}

// ================= SAFETY NET =================
function ensureOneVisible() {
  const visible = ["loadingBox", "loginBox", "profileBox"].some(id => {
    const el = document.getElementById(id);
    return el && el.style.display !== "none";
  });
  if (!visible) {
    console.warn("⚠️ Blank screen prevented");
    showLogin();
  }
}

// ================= LOGOUT =================
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.clear();
    currentUser = {};
    location.reload();
  }
}

// ================= UTILS =================
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

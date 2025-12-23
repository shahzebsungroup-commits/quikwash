const GAS_URL = "https://script.google.com/macros/s/AKfycbzwssQSPMzsssvkIIoPKxeuwXFTk97RFWNmrZmmcdXY_aIl0OHbPQAV7sctzcUj6uQl6w/exec";

let currentUser = {};

// ================= PAGE LOAD (CASE B) =================
window.onload = () => {
  const token = localStorage.getItem("kw_token");
  const email = localStorage.getItem("kw_email");

  if (!token || !email) return;

  fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "validateToken",
      email,
      token
    })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      currentUser = res.user;
      showProfile();
      loadBookings();
    } else {
      localStorage.clear();
    }
  })
  .catch(err => console.error("Auto login error", err));
};

// ================= GOOGLE LOGIN =================
function handleGoogleLogin(response) {
  fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "verifyGoogle",
      idToken: response.credential,
      device: navigator.userAgent
    })
  })
  .then(r => r.json())
  .then(res => {
    console.log("LOGIN RESPONSE:", res);

    if (!res.success) {
      alert("Login failed");
      return;
    }

    localStorage.setItem("kw_token", res.token);
    localStorage.setItem("kw_email", res.email);

    currentUser = {
      email: res.email,
      name: res.name
    };

    showProfile();
    loadBookings();
  })
  .catch(err => {
    console.error("Login error", err);
    alert("Login error – check console");
  });
}

// ================= UI =================
function showProfile() {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("profileBox").classList.remove("hidden");
  document.getElementById("welcomeText").innerText =
    "Welcome to Kwikkwash " + currentUser.name;
}

// ================= BOOKING =================
function bookWash() {
  const mobile = document.getElementById("mobile").value.trim();
  const address = document.getElementById("address").value.trim();

  if (!/^\d{10}$/.test(mobile)) {
    alert("Enter valid 10 digit mobile number");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveBooking",
        email: currentUser.email,
        name: currentUser.name,
        mobile,
        location: pos.coords.latitude + "," + pos.coords.longitude,
        address
      })
    })
    .then(() => {
      alert("Booking successful");
      loadBookings();
    });
  }, () => alert("Location permission denied"));
}

// ================= LOAD BOOKINGS =================
function loadBookings() {
  fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "getBookings",
      email: currentUser.email
    })
  })
  .then(r => r.json())
  .then(rows => {
    const tbody = document.querySelector("#bookingTable tbody");
    tbody.innerHTML = "";

    rows.forEach(r => {
      const tr = document.createElement("tr");
      r.forEach(c => {
        const td = document.createElement("td");
        td.innerText = c;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  });
}

// ================= LOGOUT =================
function logout() {
  localStorage.clear();
  location.reload();
}

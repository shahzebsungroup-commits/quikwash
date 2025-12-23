const GAS_URL = "https://script.google.com/macros/s/AKfycbzwssQSPMzsssvkIIoPKxeuwXFTk97RFWNmrZmmcdXY_aIl0OHbPQAV7sctzcUj6uQl6w/exec";

let currentUser = {};

// ================= PAGE LOAD =================
window.onload = () => {
  const token = localStorage.getItem("kw_token");
  const email = localStorage.getItem("kw_email");

  if (token && email) {
    // Case B: token exists → validate with GAS
    fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "validateToken",
        email,
        token
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        showProfile();
        loadBookings();
      } else {
        localStorage.clear();
      }
    });
  }
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
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      alert("Login failed");
      return;
    }

    localStorage.setItem("kw_token", data.token);
    localStorage.setItem("kw_email", data.email);

    currentUser = data.user;
    showProfile();
    loadBookings();
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
  const mobile = document.getElementById("mobile").value;
  const address = document.getElementById("address").value;

  if (!/^\d{10}$/.test(mobile)) {
    alert("Enter valid 10 digit mobile number");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const location = pos.coords.latitude + "," + pos.coords.longitude;

    fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "saveBooking",
        email: currentUser.email,
        name: currentUser.name,
        mobile,
        location,
        address
      })
    })
    .then(() => {
      alert("Booking saved");
      loadBookings();
    });
  });
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
  .then(res => res.json())
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

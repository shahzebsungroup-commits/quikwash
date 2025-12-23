const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzwssQSPMzsssvkIIoPKxeuwXFTk97RFWNmrZmmcdXY_aIl0OHbPQAV7sctzcUj6uQl6w/exec";

let currentUser = {};

// ================= PAGE LOAD =================
window.onload = () => {
  const token = localStorage.getItem("kw_token");
  const email = localStorage.getItem("kw_email");

  if (!token || !email) {
    showLogin();
    return;
  }

  fetch(GAS_URL)
    .then(r => r.json())
    .then(users => {
      const match = users.find(
        u => u.Email === email && u.Token === token
      );

      if (match) {
        currentUser = {
          email: match.Email,
          name: match.Name
        };
        showProfile();
      } else {
        localStorage.clear();
        showLogin();
      }
    })
    .catch(() => showLogin());
};

// ================= UI HELPERS =================
function showLogin() {
  document.getElementById("loadingBox").classList.add("hidden");
  document.getElementById("profileBox").classList.add("hidden");
  document.getElementById("loginBox").classList.remove("hidden");
}

function showProfile() {
  document.getElementById("loadingBox").classList.add("hidden");
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("profileBox").classList.remove("hidden");
  document.getElementById("welcomeText").innerText =
    "Welcome to Kwikkwash " + currentUser.name;
}

// ================= LOGOUT =================
function logout() {
  localStorage.clear();
  location.reload();
}
function loadBookings() {
  const url =
    GAS_URL +
    "?type=bookings" +
    "&email=" + encodeURIComponent(currentUser.email);

  fetch(url)
    .then(r => r.json())
    .then(rows => {
      const tbody = document.querySelector("#bookingTable tbody");
      tbody.innerHTML = "";

      if (!rows.length) {
        tbody.innerHTML =
          "<tr><td colspan='4'>No bookings found</td></tr>";
        return;
      }

      rows.reverse().forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${b.Mobile}</td>
          <td>${b.Location}</td>
          <td>${b.Address}</td>
          <td>${b.Time}</td>
        `;
        tbody.appendChild(tr);
      });
    });
}

// Thay URL Web App thu được sau khi triển khai Apps Script vào đây
const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec";

let allLocations = [];

// Tự động tải danh sách khi mở trang
document.addEventListener("DOMContentLoaded", fetchLocations);

// 1. Lấy vị trí GPS và lưu lên Google Sheet
function getLocation() {
  const nameInput = document.getElementById("locName").value.trim();
  const noteInput = document.getElementById("locNote").value.trim();

  if (!nameInput) {
    alert("Vui lòng nhập Mã khách hàng / Tên vị trí!");
    return;
  }

  if (!navigator.geolocation) {
    alert("Trình duyệt của bạn không hỗ trợ lấy vị trí GPS!");
    return;
  }

  alert("Đang lấy vị trí GPS, vui lòng đợi...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const locData = {
        id: Date.now(),
        name: nameInput,
        note: noteInput,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        time: new Date().toLocaleString("vi-VN")
      };

      // Gửi dữ liệu tới Apps Script
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "ADD",
          location: locData
        })
      })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          alert("Lưu vị trí thành công!");
          document.getElementById("locName").value = "";
          document.getElementById("locNote").value = "";
          fetchLocations(); // Tải lại danh sách
        } else {
          alert("Lỗi từ server: " + res.message);
        }
      })
      .catch(err => {
        console.error(err);
        alert("Lỗi kết nối khi lưu dữ liệu!");
      });
    },
    (error) => {
      alert("Không thể lấy vị trí! Hãy đảm bảo bạn đã bật GPS và cho phép cấp quyền vị trí.");
    },
    { enableHighAccuracy: true }
  );
}

// 2. Tải danh sách vị trí từ Google Sheet
function fetchLocations() {
  fetch(API_URL)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success") {
        allLocations = res.data || [];
        renderList(allLocations);
      }
    })
    .catch(err => console.error("Lỗi tải danh sách:", err));
}

// 3. Hiển thị danh sách ra màn hình
function renderList(list) {
  const ul = document.getElementById("locationList");
  ul.innerHTML = "";

  list.forEach(loc => {
    const li = document.createElement("li");
    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;

    li.innerHTML = `
      <div class="loc-name">${loc.name}</div>
      <div class="loc-note">${loc.note || "Không có ghi chú"}</div>
      <span class="time">🕒 ${loc.time}</span>
      <div class="coords">📍 Tọa độ: ${loc.lat}, ${loc.lng}</div>
      <a class="maps-link" href="${mapsUrl}" target="_blank">Xem trên Google Maps</a>
      
      <div class="action-bar">
        <button class="btn-edit" onclick="editLocation(${loc.id}, '${loc.name}', '${loc.note}')">Sửa</button>
        <button class="btn-delete" onclick="deleteLocation(${loc.id})">Xóa</button>
      </div>
    `;

    li.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON" && e.target.tagName !== "A") {
        li.classList.toggle("selected");
      }
    });

    ul.appendChild(li);
  });
}

// 4. Tìm kiếm vị trí
function filterLocations() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allLocations.filter(loc => 
    loc.name.toLowerCase().includes(keyword) ||
    loc.note.toLowerCase().includes(keyword) ||
    `${loc.lat},${loc.lng}`.includes(keyword)
  );
  renderList(filtered);
}

// 5. Xóa 1 mục
function deleteLocation(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa vị trí này?")) return;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "DELETE", id: id })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      fetchLocations();
    } else {
      alert("Xóa thất bại: " + res.message);
    }
  });
}

// 6. Sửa thông tin
function editLocation(id, oldName, oldNote) {
  const newName = prompt("Nhập tên/Mã khách hàng mới:", oldName);
  if (newName === null) return;
  const newNote = prompt("Nhập ghi chú mới:", oldNote);
  if (newNote === null) return;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "EDIT", id: id, name: newName, note: newNote })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      fetchLocations();
    } else {
      alert("Cập nhật thất bại: " + res.message);
    }
  });
}

// 7. Xóa toàn bộ lịch sử
function clearLocations() {
  if (!confirm("Cảnh báo: Bạn có chắc chắn muốn xóa toàn bộ danh sách?")) return;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "CLEAR" })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      fetchLocations();
    } else {
      alert("Xóa tất cả thất bại: " + res.message);
    }
  });
}

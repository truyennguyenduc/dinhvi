// URL Web App Apps Script của bác
const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec";

let allLocations = [];

// Khởi chạy khi tải trang
document.addEventListener("DOMContentLoaded", fetchLocations);

// 1. Tải danh sách vị trí từ Google Sheet (Có hiệu ứng Loading)
function fetchLocations() {
  const loadingBox = document.getElementById("loadingBox");
  const listElement = document.getElementById("locationList");

  if (loadingBox) loadingBox.style.display = "flex";
  if (listElement) listElement.innerHTML = "";

  fetch(API_URL)
    .then(res => res.json())
    .then(res => {
      if (loadingBox) loadingBox.style.display = "none";

      if (res.status === "success") {
        allLocations = res.data || [];
        renderList(allLocations);
      } else {
        showToast("Lỗi tải danh sách: " + res.message);
      }
    })
    .catch(err => {
      console.error("Lỗi tải danh sách:", err);
      if (loadingBox) loadingBox.style.display = "none";
      showToast("Không thể kết nối tới Google Sheet!");
    });
}

// 2. Lấy vị trí GPS hiện tại (Bắt buộc nhập Mã KH đủ 13 ký tự)
function getLocation() {
  const locNameInput = document.getElementById("locName");
  const nameInput = locNameInput.value.trim().toUpperCase();
  const noteInput = document.getElementById("locNote").value.trim();

  if (!nameInput) {
    showToast("Cảnh báo: Bạn phải nhập Mã khách hàng trước khi lấy vị trí!");
    locNameInput.focus();
    return;
  }

  if (nameInput.length !== 13) {
    showToast(`Cảnh báo: Mã khách hàng phải đủ 13 ký tự! (Hiện tại: ${nameInput.length} ký tự)`);
    locNameInput.focus();
    return;
  }

  if (!navigator.geolocation) {
    showToast("Trình duyệt không hỗ trợ định vị GPS!");
    return;
  }

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

      // Cập nhật lên giao diện ngay lập tức
      allLocations.unshift(locData);
      renderList(allLocations);

      // Xóa trắng ô nhập liệu
      locNameInput.value = "";
      document.getElementById("locNote").value = "";

      showToast("Đã lấy vị trí thành công!");

      // Gửi ngầm dữ liệu lên Google Sheet
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
        if (res.status !== "success") {
          showToast("Lỗi lưu lên Google Sheet: " + res.message);
        }
      })
      .catch(err => {
        console.error(err);
        showToast("Lỗi kết nối khi gửi dữ liệu ngầm!");
      });
    },
    (error) => {
      showToast("Không thể lấy vị trí GPS! Hãy kiểm tra quyền vị trí trên điện thoại.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// 3. Hiển thị danh sách ra giao diện & Cập nhật số lượng
function renderList(locations) {
  const listElement = document.getElementById("locationList");
  const countElement = document.getElementById("locationCount");
  listElement.innerHTML = "";

  // Đếm số lượng
  if (countElement) {
    if (locations.length === allLocations.length) {
      countElement.innerText = `(${locations.length})`;
    } else {
      countElement.innerText = `(${locations.length}/${allLocations.length})`;
    }
  }

  if (locations.length === 0) {
    listElement.innerHTML = "<li style='text-align:center; color:#888;'>Chưa có vị trí nào được lưu.</li>";
    return;
  }

  locations.forEach(loc => {
    const li = document.createElement("li");
    li.onclick = (e) => {
      if (e.target.tagName !== "BUTTON" && e.target.tagName !== "A") {
        li.classList.toggle("selected");
      }
    };

    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;

    li.innerHTML = `
      <div class="loc-name">${loc.name}</div>
      <div class="loc-note">${loc.note ? loc.note : "Không có ghi chú"}</div>
      <span class="time">🕒 ${loc.time}</span>
      <div class="coords">📍 Tọa độ: ${loc.lat}, ${loc.lng}</div>
      <a href="${mapsUrl}" target="_blank" class="maps-link">Xem trên Google Maps</a>
      
      <div class="action-bar">
        <button class="btn-edit" onclick="editLocation(${loc.id})">Sửa</button>
        <button class="btn-delete" onclick="deleteLocation(${loc.id})">Xóa</button>
      </div>
    `;

    listElement.appendChild(li);
  });
}

// 4. Tìm kiếm vị trí
function filterLocations() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allLocations.filter(loc => 
    loc.name.toLowerCase().includes(query) ||
    (loc.note && loc.note.toLowerCase().includes(query)) ||
    `${loc.lat},${loc.lng}`.includes(query)
  );
  renderList(filtered);
}

// 5. Xóa vị trí
function deleteLocation(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa vị trí này?")) return;

  allLocations = allLocations.filter(loc => loc.id !== id);
  renderList(allLocations);
  showToast("Đã xóa vị trí!");

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "DELETE", id: id })
  });
}

// 6. Sửa vị trí
function editLocation(id) {
  const loc = allLocations.find(item => item.id === id);
  if (!loc) return;

  const newName = prompt("Sửa Mã khách hàng:", loc.name);
  if (newName === null) return;
  const newNote = prompt("Sửa Ghi chú:", loc.note);
  if (newNote === null) return;

  loc.name = newName.trim().toUpperCase();
  loc.note = newNote.trim();

  renderList(allLocations);
  showToast("Đã cập nhật vị trí!");

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "EDIT",
      id: id,
      name: loc.name,
      note: loc.note
    })
  });
}

// 7. Hàm hiển thị Toast thông báo (màu xanh, góc phải, 5s tự tắt)
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 5000);
}

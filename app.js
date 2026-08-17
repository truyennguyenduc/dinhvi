const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec";

let allLocations = [];
let deleteTargetId = null;
let editTargetId = null;

document.addEventListener("DOMContentLoaded", fetchLocations);

// 1. Tải danh sách từ Google Sheet
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
        showToast("Lỗi tải danh sách: " + res.message, true);
      }
    })
    .catch(err => {
      console.error("Lỗi tải danh sách:", err);
      if (loadingBox) loadingBox.style.display = "none";
      showToast("Không thể kết nối tới Google Sheet!", true);
    });
}

// 2. Lấy vị trí GPS (Kiểm tra trùng Mã KH)
function getLocation() {
  const locNameInput = document.getElementById("locName");
  const nameInput = locNameInput.value.trim().toUpperCase();
  const noteInput = document.getElementById("locNote").value.trim();

  if (!nameInput) {
    showToast("Cảnh báo: Bạn phải nhập Mã khách hàng trước khi lấy vị trí!", true);
    locNameInput.focus();
    return;
  }

  if (nameInput.length !== 13) {
    showToast(`Cảnh báo: Mã khách hàng phải đủ 13 ký tự! (Hiện tại: ${nameInput.length} ký tự)`, true);
    locNameInput.focus();
    return;
  }

  // --- KIỂM TRA TỒN TẠI MÃ KHÁCH HÀNG ---
  const existingLoc = allLocations.find(item => item.name === nameInput);
  if (existingLoc) {
    showToast(`Mã KH "${nameInput}" đã tồn tại! Đã tìm vị trí cũ để bạn sửa.`, true);
    
    // Tự động điền vào ô tìm kiếm và lọc ra vị trí đó ngay lập tức
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = nameInput;
      filterLocations();
    }
    return; // Ngắt lệnh, không thêm trùng
  }

  if (!navigator.geolocation) {
    showToast("Trình duyệt không hỗ trợ định vị GPS!", true);
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

      allLocations.unshift(locData);
      renderList(allLocations);

      locNameInput.value = "PB060600";
      document.getElementById("locNote").value = "";

      showToast("Đã lấy vị trí thành công!");

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
          showToast("Lỗi lưu lên Google Sheet: " + res.message, true);
        }
      })
      .catch(err => {
        console.error(err);
        showToast("Lỗi kết nối khi gửi dữ liệu ngầm!", true);
      });
    },
    (error) => {
      showToast("Không thể lấy vị trí GPS! Hãy kiểm tra quyền vị trí trên điện thoại.", true);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// 3. Hiển thị danh sách
function renderList(locations) {
  const listElement = document.getElementById("locationList");
  const countElement = document.getElementById("locationCount");
  listElement.innerHTML = "";

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
        <button class="btn-edit" onclick="openEditModal(${loc.id})">Sửa</button>
        <button class="btn-delete" onclick="openConfirmModal(${loc.id})">Xóa</button>
      </div>
    `;

    listElement.appendChild(li);
  });
}

// 4. Tìm kiếm
function filterLocations() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allLocations.filter(loc => 
    loc.name.toLowerCase().includes(query) ||
    (loc.note && loc.note.toLowerCase().includes(query)) ||
    `${loc.lat},${loc.lng}`.includes(query)
  );
  renderList(filtered);
}

// 5. Mở/Đóng Modal Xóa
function openConfirmModal(id) {
  deleteTargetId = id;
  const modal = document.getElementById("confirmModal");
  if (modal) modal.style.display = "flex";

  const btnConfirm = document.getElementById("btnConfirmDelete");
  if (btnConfirm) {
    btnConfirm.onclick = () => {
      executeDelete();
    };
  }
}

function closeConfirmModal() {
  deleteTargetId = null;
  const modal = document.getElementById("confirmModal");
  if (modal) modal.style.display = "none";
}

function executeDelete() {
  if (!deleteTargetId) return;

  const id = deleteTargetId;
  closeConfirmModal();

  allLocations = allLocations.filter(loc => loc.id !== id);
  renderList(allLocations);
  showToast("Đã xóa vị trí!");

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "DELETE", id: id })
  });
}

// 6. Mở/Đóng Modal Sửa
function openEditModal(id) {
  const loc = allLocations.find(item => item.id === id);
  if (!loc) return;

  editTargetId = id;
  document.getElementById("editNameInput").value = loc.name;
  document.getElementById("editNoteInput").value = loc.note || "";

  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "flex";
}

function closeEditModal() {
  editTargetId = null;
  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "none";
}

function saveEditLocation() {
  if (!editTargetId) return;

  const newName = document.getElementById("editNameInput").value.trim().toUpperCase();
  const newNote = document.getElementById("editNoteInput").value.trim();

  if (!newName) {
    showToast("Mã khách hàng không được để trống!", true);
    return;
  }

  if (newName.length !== 13) {
    showToast(`Mã khách hàng phải đủ 13 ký tự! (Hiện tại: ${newName.length} ký tự)`, true);
    return;
  }

  // Kiểm tra nếu chỉnh sửa mã mà bị trùng với một Mã KH khác đã lưu
  const duplicate = allLocations.find(item => item.name === newName && item.id !== editTargetId);
  if (duplicate) {
    showToast(`Mã KH "${newName}" đã thuộc về bản ghi khác!`, true);
    return;
  }

  const loc = allLocations.find(item => item.id === editTargetId);
  if (loc) {
    loc.name = newName;
    loc.note = newNote;
  }

  closeEditModal();
  renderList(allLocations);
  showToast("Đã cập nhật vị trí!");

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "EDIT",
      id: editTargetId,
      name: newName,
      note: newNote
    })
  });
}

// 7. Toast thông báo (isWarning = true sẽ đổi sang màu đỏ)
function showToast(message, isWarning = false) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = isWarning ? "toast warning" : "toast";
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

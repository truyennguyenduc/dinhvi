const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec";

// Cấu hình mật khẩu xác thực khi sửa / xóa
const SECRET_PASSWORD = "Truyen&1978";

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

// 2. Lấy vị trí GPS (Bắt buộc bật định vị GPS mới tiến hành lưu)
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
    showToast(`Mã KH "${nameInput}" đã tồn tại! Chọn khách hàng bên dưới để sửa.`, true);
    
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = nameInput;
      filterLocations();
    }
    return;
  }

  // Kiểm tra trình duyệt có hỗ trợ Geolocation không
  if (!navigator.geolocation) {
    showToast("Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS!", true);
    return;
  }

  showToast("Đang truy xuất vị trí GPS, vui lòng chờ...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Chỉ khi lấy được tọa độ thành công mới đóng gói và lưu dữ liệu
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

      showToast("Đã lấy vị trí và lưu thành công!");

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
      // Xử lý các trường hợp không bật GPS hoặc không cấp quyền
      switch (error.code) {
        case error.PERMISSION_DENIED:
          showToast("Lỗi: Bạn đã từ chối quyền vị trí! Hãy cấp quyền GPS cho trình duyệt.", true);
          break;
        case error.POSITION_UNAVAILABLE:
          showToast("Lỗi: Bắt buộc phải Mở ĐỊNH VỊ (GPS) trên điện thoại mới có thể lưu!", true);
          break;
        case error.TIMEOUT:
          showToast("Lỗi: Quá thời gian lấy vị trí! Hãy bật GPS và thử lại.", true);
          break;
        default:
          showToast("Lỗi: Không thể lấy vị trí! Vui lòng kiểm tra lại GPS trên điện thoại.", true);
          break;
      }
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
  const passInput = document.getElementById("deletePasswordInput");
  if (passInput) passInput.value = "";

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

  const inputPass = document.getElementById("deletePasswordInput").value.trim();
  if (inputPass !== SECRET_PASSWORD) {
    showToast("Mật khẩu xác nhận không đúng!", true);
    return;
  }

  const id = deleteTargetId;
  closeConfirmModal();

  allLocations = allLocations.filter(loc => loc.id !== id);
  renderList(allLocations);
  showToast("Đã xóa vị trí thành công!");

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
  
  const passInput = document.getElementById("editPasswordInput");
  if (passInput) passInput.value = "";

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

  const inputPass = document.getElementById("editPasswordInput").value.trim();
  if (inputPass !== SECRET_PASSWORD) {
    showToast("Mật khẩu xác nhận không đúng!", true);
    return;
  }

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

  const duplicate = allLocations.find(item => item.name === newName && item.id !== editTargetId);
  if (duplicate) {
    showToast(`Mã KH "${newName}" đã thuộc về bản ghi khác!`, true);
    return;
  }

  // Hỏi người dùng có muốn cập nhật tọa độ GPS mới không
  const updateLocation = confirm("Bạn có muốn lấy và cập nhật tọa độ GPS MỚI không?\n\n- Bấm 'OK' để cập nhật tọa độ GPS mới.\n- Bấm 'Hủy' (Cancel) để GIỮ TỌA ĐỘ CŨ.");

  if (updateLocation) {
    // Trường hợp cập nhật cả tọa độ GPS mới
    if (!navigator.geolocation) {
      showToast("Thiết bị không hỗ trợ GPS để cập nhật vị trí!", true);
      return;
    }

    showToast("Đang truy xuất tọa độ GPS mới...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const newTime = new Date().toLocaleString("vi-VN");

        const loc = allLocations.find(item => item.id === editTargetId);
        if (loc) {
          loc.name = newName;
          loc.note = newNote;
          loc.lat = newLat;
          loc.lng = newLng;
          loc.time = newTime;
        }

        closeEditModal();
        renderList(allLocations);
        showToast("Đã cập nhật thông tin và tọa độ GPS mới!");

        fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "EDIT",
            id: editTargetId,
            name: newName,
            note: newNote,
            lat: newLat,
            lng: newLng,
            time: newTime
          })
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            showToast("Lỗi: Đã từ chối quyền vị trí!", true);
            break;
          case error.POSITION_UNAVAILABLE:
            showToast("Lỗi: Bắt buộc phải MỞ ĐỊNH VỊ (GPS) để lấy tọa độ mới!", true);
            break;
          case error.TIMEOUT:
            showToast("Lỗi: Quá thời gian lấy vị trí GPS!", true);
            break;
          default:
            showToast("Lỗi: Không thể lấy tọa độ vị trí mới!", true);
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    // Trường hợp giữ tọa độ cũ (Chỉ cập nhật mã KH và Ghi chú)
    const loc = allLocations.find(item => item.id === editTargetId);
    if (loc) {
      loc.name = newName;
      loc.note = newNote;
    }

    closeEditModal();
    renderList(allLocations);
    showToast("Đã cập nhật thông tin (Giữ nguyên tọa độ cũ)!");

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
}

// 7. Toast thông báo
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

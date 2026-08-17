const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec";

// Cấu hình mật khẩu xác thực khi sửa / xóa
const SECRET_PASSWORD = "Truyen&1978";

let allLocations = [];
let employeesList = [];
let jobsList = [];
let deleteTargetId = null;
let editTargetId = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchEmployees();
  fetchJobs();
  fetchLocations();
});

// 0. Tải danh sách nhân viên từ Apps Script
function fetchEmployees() {
  fetch(`${API_URL}?action=getEmployees`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success" && Array.isArray(res.data)) {
        employeesList = res.data.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item.ten_nvien || item.name || Object.values(item)[0] || "";
          }
          return item;
        });
      } else {
        employeesList = [];
      }
      populateEmployeeDropdowns();
    })
    .catch(err => {
      console.error("Lỗi tải danh sách nhân viên:", err);
      employeesList = [];
      populateEmployeeDropdowns();
    });
}

function populateEmployeeDropdowns() {
  const selectMain = document.getElementById("employeeSelect");
  const selectEdit = document.getElementById("editEmployeeSelect");

  let optionsHTML = '<option value="">-- Chọn nhân viên --</option>';
  employeesList.forEach(emp => {
    let empText = (typeof emp === 'object' && emp !== null) ? (emp.ten_nvien || Object.values(emp)[0]) : emp;
    if (empText) {
      optionsHTML += `<option value="${empText}">${empText}</option>`;
    }
  });

  if (selectMain) selectMain.innerHTML = optionsHTML;
  if (selectEdit) selectEdit.innerHTML = optionsHTML;

  const savedEmployee = localStorage.getItem("selected_employee");
  if (savedEmployee && selectMain) {
    selectMain.value = savedEmployee;
  }
}

function onEmployeeChange() {
  const selectMain = document.getElementById("employeeSelect");
  if (selectMain) {
    localStorage.setItem("selected_employee", selectMain.value);
  }
}

// 0.1 Tải danh sách công việc từ Apps Script
function fetchJobs() {
  fetch(`${API_URL}?action=getJobs`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success" && Array.isArray(res.data)) {
        jobsList = res.data.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item.ten_cviec || item.ma_khang || Object.values(item)[0] || "";
          }
          return item;
        });
      } else {
        jobsList = [];
      }
      populateJobDropdowns();
    })
    .catch(err => {
      console.error("Lỗi tải danh sách công việc:", err);
      jobsList = [];
      populateJobDropdowns();
    });
}

function populateJobDropdowns() {
  const selectMain = document.getElementById("jobSelect");
  const selectEdit = document.getElementById("editJobSelect");

  let optionsHTML = '<option value="">-- Công việc --</option>';
  jobsList.forEach(job => {
    let jobText = (typeof job === 'object' && job !== null) ? (job.ten_cviec || Object.values(job)[0]) : job;
    if (jobText) {
      optionsHTML += `<option value="${jobText}">${jobText}</option>`;
    }
  });

  if (selectMain) selectMain.innerHTML = optionsHTML;
  if (selectEdit) selectEdit.innerHTML = optionsHTML;

  const savedJob = localStorage.getItem("selected_job");
  if (savedJob && selectMain) {
    selectMain.value = savedJob;
  }
}

function onJobChange() {
  const selectMain = document.getElementById("jobSelect");
  if (selectMain) {
    localStorage.setItem("selected_job", selectMain.value);
  }
}

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

// 2. Lấy vị trí GPS và lưu thông tin
function getLocation() {
  const locNameInput = document.getElementById("locName");
  const nameInput = locNameInput.value.trim().toUpperCase();
  const employeeSelect = document.getElementById("employeeSelect");
  const employeeInput = employeeSelect ? employeeSelect.value : "";
  const jobSelect = document.getElementById("jobSelect");
  const jobInput = jobSelect ? jobSelect.value : "";
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

  if (!jobInput) {
    showToast("Cảnh báo: Bạn phải chọn Công việc!", true);
    if (jobSelect) jobSelect.focus();
    return;
  }

  if (!employeeInput) {
    showToast("Cảnh báo: Bạn phải chọn Nhân viên thực hiện!", true);
    if (employeeSelect) employeeSelect.focus();
    return;
  }

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

  if (!navigator.geolocation) {
    showToast("Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS!", true);
    return;
  }

  showToast("Đang truy xuất vị trí GPS, vui lòng chờ...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const locData = {
        id: Date.now(),
        ma_khang: nameInput,
        ten_khang: "Đang kiểm tra...",
        ten_cviec: jobInput,
        ten_nvien: employeeInput,
        note: noteInput,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        time: new Date().toLocaleString("vi-VN")
      };

      allLocations.unshift(locData);
      renderList(allLocations);

      locNameInput.value = "PB060600";
      document.getElementById("locNote").value = "";

      showToast("Đang kiểm tra danh mục và lưu vị trí...");

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
          locData.ten_khang = res.ten_khang;
          renderList(allLocations);
          showToast("Đã lưu vị trí thành công!");
        } else {
          allLocations = allLocations.filter(item => item.id !== locData.id);
          renderList(allLocations);
          showToast("Lỗi: " + res.message, true);
        }
      })
      .catch(err => {
        console.error(err);
        showToast("Lỗi kết nối khi gửi dữ liệu!", true);
      });
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          showToast("Lỗi: Bạn đã từ chối quyền vị trí!", true);
          break;
        case error.POSITION_UNAVAILABLE:
          showToast("Lỗi: Bắt buộc phải Mở ĐỊNH VỊ (GPS) trên điện thoại!", true);
          break;
        case error.TIMEOUT:
          showToast("Lỗi: Quá thời gian lấy vị trí GPS!", true);
          break;
        default:
          showToast("Lỗi: Không thể lấy vị trí GPS!", true);
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
    countElement.innerText = (locations.length === allLocations.length)
      ? `(${locations.length})`
      : `(${locations.length}/${allLocations.length})`;
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
      <div class="loc-name">${loc.ma_khang} ${loc.ten_khang ? `- ${loc.ten_khang}` : ""}</div>
      <div class="loc-employee">👤 NV lấy tọa độ: ${loc.ten_nvien ? loc.ten_nvien : "Chưa cập nhật"} (${loc.ten_cviec ? loc.ten_cviec : "Chưa cập nhật"})</div>
      <div class="loc-note">Ghi chú: ${loc.note ? loc.note : "Không có ghi chú"}</div>
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
    loc.ma_khang.toLowerCase().includes(query) ||
    (loc.ten_khang && loc.ten_khang.toLowerCase().includes(query)) ||
    (loc.ten_nvien && loc.ten_nvien.toLowerCase().includes(query)) ||
    (loc.ten_cviec && loc.ten_cviec.toLowerCase().includes(query)) ||    
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
    btnConfirm.onclick = () => { executeDelete(); };
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
  document.getElementById("editNameInput").value = loc.ma_khang;
  document.getElementById("editEmployeeSelect").value = loc.ten_nvien || "";
  document.getElementById("editJobSelect").value = loc.ten_cviec || "";
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

// Hàm mở Modal xác nhận GPS mới
function askGpsUpdate(onConfirm, onCancel) {
  const modal = document.getElementById("gpsConfirmModal");
  if (!modal) return;

  modal.style.display = "flex";

  document.getElementById("btnGpsConfirm").onclick = () => {
    modal.style.display = "none";
    if (onConfirm) onConfirm();
  };

  document.getElementById("btnGpsCancel").onclick = () => {
    modal.style.display = "none";
    if (onCancel) onCancel();
  };
}

function saveEditLocation() {
  if (!editTargetId) return;

  const inputPass = document.getElementById("editPasswordInput").value.trim();
  if (inputPass !== SECRET_PASSWORD) {
    showToast("Mật khẩu xác nhận không đúng!", true);
    return;
  }

  const newName = document.getElementById("editNameInput").value.trim().toUpperCase();
  const newJob = document.getElementById("editJobSelect").value;
  const newEmployee = document.getElementById("editEmployeeSelect").value;
  const newNote = document.getElementById("editNoteInput").value.trim();

  if (!newName || newName.length !== 13) {
    showToast(`Mã KH phải đúng 13 ký tự!`, true);
    return;
  }

  if (!newJob) {
    showToast("Bạn phải chọn Công việc!", true);
    return;
  }

  if (!newEmployee) {
    showToast("Bạn phải chọn Nhân viên!", true);
    return;
  }

  const duplicate = allLocations.find(item => item.ma_khang === newName && item.id !== editTargetId);
  if (duplicate) {
    showToast(`Mã KH "${newName}" đã thuộc về bản ghi khác!`, true);
    return;
  }

  // Đóng modal sửa thông tin trước
  closeEditModal();

  // Gọi Modal giao diện xanh/xám xác nhận GPS
  askGpsUpdate(
    // Bấm "Đồng ý" -> Lấy tọa độ GPS mới
    () => {
      if (!navigator.geolocation) {
        showToast("Thiết bị không hỗ trợ GPS!", true);
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
            loc.ma_khang = newName;
            loc.ten_nvien = newEmployee;
            loc.ten_cviec = newJob;          
            loc.note = newNote;
            loc.lat = newLat;
            loc.lng = newLng;
            loc.time = newTime;
          }

          renderList(allLocations);
          showToast("Đang cập nhật...");

          fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "EDIT",
              id: editTargetId,
              ma_khang: newName,
              ten_nvien: newEmployee,
              ten_cviec: newJob,           
              note: newNote,
              lat: newLat,
              lng: newLng,
              time: newTime
            })
          }).then(res => res.json()).then(res => {
            if (res.status === "success") {
              if (loc) loc.ten_khang = res.ten_khang;
              renderList(allLocations);
              showToast("Cập nhật thành công!");
            } else {
              showToast("Lỗi: " + res.message, true);
              fetchLocations();
            }
          });
        },
        (error) => { showToast("Không thể lấy tọa độ GPS mới!", true); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    // Bấm "Hủy" -> Chỉ cập nhật thông tin chữ, giữ nguyên GPS cũ
    () => {
      const loc = allLocations.find(item => item.id === editTargetId);
      if (loc) {
        loc.ma_khang = newName;
        loc.ten_nvien = newEmployee;
        loc.ten_cviec = newJob;      
        loc.note = newNote;
      }

      renderList(allLocations);
      showToast("Đang cập nhật...");

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "EDIT",
          id: editTargetId,
          ma_khang: newName,
          ten_nvien: newEmployee,
          ten_cviec: newJob,        
          note: newNote
        })
      }).then(res => res.json()).then(res => {
        if (res.status === "success") {
          if (loc) loc.ten_khang = res.ten_khang;
          renderList(allLocations);
          showToast("Cập nhật thành công!");
        } else {
          showToast("Lỗi: " + res.message, true);
          fetchLocations();
        }
      });
    }
  );
}

// 7. Toast thông báo
function showToast(message, isWarning = false) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = isWarning ? "toast warning" : "toast";
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => { toast.classList.add("show"); }, 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => { toast.remove(); }, 400);
  }, 5000);
}

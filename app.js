const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec";

let allLocations = [];
let employeesList = []; // Mảng object chứa [{ten_nvien, mat_khau}]
let jobsList = [];
let deleteTargetId = null;
let editTargetId = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchEmployees();
  fetchJobs();
  restoreSearchValue(); // Khôi phục từ khóa tìm kiếm khi load lại trang
  fetchLocations();
});

// Hàm chuyển đổi chuỗi thời gian sang milliseconds để sắp xếp
function parseTimeString(timeStr) {
  if (!timeStr) return 0;
  
  const str = String(timeStr).trim();
  const parts = str.split(/[\s,]+/);
  
  if (parts.length >= 2) {
    const datePart = parts.find(p => p.includes("/"));
    const timePart = parts.find(p => p.includes(":"));
    
    if (datePart && timePart) {
      const dSegments = datePart.split("/").map(Number);
      const tSegments = timePart.split(":").map(Number);
      if (dSegments.length === 3) {
        const [day, month, year] = dSegments;
        const hours = tSegments[0] || 0;
        const minutes = tSegments[1] || 0;
        const seconds = tSegments[2] || 0;
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      }
    }
  }

  const parsed = Date.parse(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Tải danh sách Nhân viên kèm Mật khẩu từ Sheet nhan_vien
function fetchEmployees() {
  fetch(`${API_URL}?action=getEmployees`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success" && Array.isArray(res.data)) {
        employeesList = res.data.map(item => {
          if (typeof item === 'object' && item !== null) {
            return {
              ten_nvien: item.ten_nvien || Object.values(item)[0] || "",
              mat_khau: String(item.mat_khau !== undefined ? item.mat_khau : "").trim()
            };
          }
          return { ten_nvien: String(item).trim(), mat_khau: "" };
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

  let optionsHTML = '<option value="">Chọn nhân viên</option>';
  employeesList.forEach(emp => {
    if (emp.ten_nvien) {
      optionsHTML += `<option value="${emp.ten_nvien}">${emp.ten_nvien}</option>`;
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

// Hàm lấy Mật khẩu tương ứng của Nhân viên theo Tên người tạo
function getPasswordByEmployeeName(employeeName) {
  if (!employeeName) return null;
  const empObj = employeesList.find(
    emp => String(emp.ten_nvien).trim().toLowerCase() === String(employeeName).trim().toLowerCase()
  );
  return empObj ? empObj.mat_khau : null;
}

// Tải danh sách công việc
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

  let optionsHTML = '<option value="">Công việc</option>';
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

// 1. Tải danh sách vị trí từ Sheet
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
        allLocations = (res.data || []).map(item => ({
          ...item,
          id: String(item.id).trim()
        }));

        // Sắp xếp giảm dần theo thời gian (time desc)
        allLocations.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));

        filterLocations();
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

  const existingLoc = allLocations.find(item => item.ma_khang === nameInput && (item.trang_thai === undefined || Number(item.trang_thai) === 1));
  if (existingLoc) {
    showToast(`Mã KH "${nameInput}" đã tồn tại! Chọn khách hàng bên dưới để sửa.`, true);
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = nameInput;
      onSearchInput();
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
        id: String(Date.now()),
        ma_khang: nameInput,
        ten_khang: "Đang kiểm tra...",
        ten_cviec: jobInput,
        ten_nvien: employeeInput,
        note: noteInput,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        time: new Date().toLocaleString("vi-VN"),
        trang_thai: 1
      };

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
          allLocations.unshift(locData);
          
          allLocations.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));
          filterLocations();

          locNameInput.value = "PB060600";
          document.getElementById("locNote").value = "";

          showToast("Đã lưu vị trí thành công!");
        } else {
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
      <div class="coords">📍 Tọa độ: ${loc.lat}, ${loc.lng}</div>
      <div class="maps-row">
        <a href="${mapsUrl}" target="_blank" class="maps-link">Xem trên Google Maps</a>
        <span class="time">🕒 ${loc.time}</span>
      </div>
      
      <div class="action-bar">
        <button class="btn-edit" onclick="openEditModal('${loc.id}')">Sửa</button>
        <button class="btn-delete" onclick="openConfirmModal('${loc.id}')">Xóa</button>
      </div>
    `;

    listElement.appendChild(li);
  });
}

// Ghi nhớ và tìm kiếm
function onSearchInput() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    localStorage.setItem("search_value", searchInput.value);
  }
  filterLocations();
}

function restoreSearchValue() {
  const savedSearch = localStorage.getItem("search_value");
  const searchInput = document.getElementById("searchInput");
  if (savedSearch !== null && searchInput) {
    searchInput.value = savedSearch;
  }
}

function filterLocations() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput ? searchInput.value.toLowerCase() : "";
  
  const filtered = allLocations.filter(loc => 
    loc.ma_khang.toLowerCase().includes(query) ||
    (loc.ten_khang && loc.ten_khang.toLowerCase().includes(query)) ||
    (loc.ten_nvien && loc.ten_nvien.toLowerCase().includes(query)) ||
    (loc.ten_cviec && loc.ten_cviec.toLowerCase().includes(query)) ||    
    (loc.note && loc.note.toLowerCase().includes(query)) ||
    `${loc.lat},${loc.lng}`.includes(query)
  );

  filtered.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));

  renderList(filtered);
}

// 5. Mở/Đóng Modal Xóa
function openConfirmModal(id) {
  deleteTargetId = String(id).trim();
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

// Thực hiện xóa: Xác thực người nhập bản ghi & Mật khẩu tương ứng trong sheet nhan_vien
function executeDelete() {
  if (!deleteTargetId) return;

  // Lấy chính xác bản ghi đang muốn xóa
  const targetLoc = allLocations.find(item => String(item.id).trim() === String(deleteTargetId).trim());
  if (!targetLoc) {
    showToast("Không tìm thấy dữ liệu bản ghi cần xóa!", true);
    return;
  }

  // Lấy tên người đã tạo bản ghi này trong bảng dinh_vi
  const creatorName = targetLoc.ten_nvien ? String(targetLoc.ten_nvien).trim() : "";
  if (!creatorName) {
    showToast("Bản ghi chưa có thông tin người nhập nên không thể xác thực!", true);
    return;
  }

  // Lấy mật khẩu chính chủ từ danh sách nhan_vien
  const correctPassword = getPasswordByEmployeeName(creatorName);
  const inputPass = document.getElementById("deletePasswordInput").value.trim();

  if (correctPassword === null) {
    showToast(`Không tìm thấy mật khẩu của người nhập bản ghi: "${creatorName}"`, true);
    return;
  }

  if (inputPass !== correctPassword) {
    showToast(`Mật khẩu không đúng với nhân viên nhập bản ghi ("${creatorName}")!`, true);
    return;
  }

  const id = deleteTargetId;
  closeConfirmModal();

  allLocations = allLocations.filter(loc => String(loc.id) !== String(id));
  filterLocations();
  showToast("Đã xóa vị trí thành công!");

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "DELETE", id: id })
  });
}

// 6. Mở/Đóng Modal Sửa
function openEditModal(id) {
  const searchId = String(id).trim();
  const loc = allLocations.find(item => String(item.id).trim() === searchId);
  if (!loc) {
    showToast("Không tìm thấy bản ghi cần sửa trong bộ nhớ local!", true);
    return;
  }

  editTargetId = searchId;
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
  const modal = document.getElementById("editModal");
  if (modal) modal.style.display = "none";
}

// Modal xác nhận GPS mới
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

// Thực hiện sửa: Xác thực người nhập bản ghi & Mật khẩu tương ứng trong sheet nhan_vien
function saveEditLocation() {
  if (!editTargetId) {
    showToast("Không tìm thấy ID cần sửa!", true);
    return;
  }

  // Lấy chính xác bản ghi đang muốn sửa
  const targetLoc = allLocations.find(item => String(item.id).trim() === String(editTargetId).trim());
  if (!targetLoc) {
    showToast("Không tìm thấy dữ liệu gốc của bản ghi!", true);
    return;
  }

  // Lấy tên người đã tạo bản ghi này trong bảng dinh_vi
  const creatorName = targetLoc.ten_nvien ? String(targetLoc.ten_nvien).trim() : "";
  if (!creatorName) {
    showToast("Bản ghi chưa có thông tin người nhập nên không thể xác thực!", true);
    return;
  }

  // Lấy mật khẩu chính chủ từ danh sách nhan_vien
  const correctPassword = getPasswordByEmployeeName(creatorName);
  const inputPass = document.getElementById("editPasswordInput").value.trim();

  if (correctPassword === null) {
    showToast(`Không tìm thấy mật khẩu của người nhập bản ghi: "${creatorName}"`, true);
    return;
  }

  if (inputPass !== correctPassword) {
    showToast(`Mật khẩu không đúng với nhân viên nhập bản ghi ("${creatorName}")!`, true);
    return;
  }

  const currentId = editTargetId;

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

  const duplicate = allLocations.find(item => item.ma_khang === newName && String(item.id) !== String(currentId));
  if (duplicate) {
    showToast(`Mã KH "${newName}" đã thuộc về bản ghi khác!`, true);
    return;
  }

  closeEditModal();

  askGpsUpdate(
    // Chọn "Sửa luôn tọa độ"
    () => {
      if (!navigator.geolocation) {
        showToast("Thiết bị không hỗ trợ GPS!", true);
        editTargetId = null;
        return;
      }

      showToast("Đang truy xuất tọa độ GPS mới...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          const newTime = new Date().toLocaleString("vi-VN");

          showToast("Đang cập nhật...");

          fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "EDIT",
              id: currentId,
              ma_khang: newName,
              ten_nvien: newEmployee,
              ten_cviec: newJob,           
              note: newNote,
              lat: newLat,
              lng: newLng,
              time: newTime
            })
          })
          .then(res => res.json())
          .then(res => {
            editTargetId = null;
            if (res.status === "success") {
              const loc = allLocations.find(item => String(item.id) === String(currentId));
              if (loc) {
                loc.ma_khang = newName;
                loc.ten_khang = res.ten_khang;
                loc.ten_nvien = newEmployee;
                loc.ten_cviec = newJob;          
                loc.note = newNote;
                loc.lat = newLat;
                loc.lng = newLng;
                loc.time = newTime;
              }
              
              allLocations.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));
              filterLocations();
              showToast("Cập nhật thành công!");
            } else {
              showToast("Lỗi: " + res.message, true);
              fetchLocations();
            }
          })
          .catch(err => { editTargetId = null; });
        },
        (error) => { 
          editTargetId = null;
          showToast("Không thể lấy tọa độ GPS mới!", true); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    // Chọn "Giữ lại tọa độ"
    () => {
      showToast("Đang cập nhật...");

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "EDIT",
          id: currentId,
          ma_khang: newName,
          ten_nvien: newEmployee,
          ten_cviec: newJob,        
          note: newNote
        })
      })
      .then(res => res.json())
      .then(res => {
        editTargetId = null;
        if (res.status === "success") {
          const loc = allLocations.find(item => String(item.id) === String(currentId));
          if (loc) {
            loc.ma_khang = newName;
            loc.ten_khang = res.ten_khang;
            loc.ten_nvien = newEmployee;
            loc.ten_cviec = newJob;      
            loc.note = newNote;
          }
          
          allLocations.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));
          filterLocations();
          showToast("Cập nhật thành công!");
        } else {
          showToast("Lỗi: " + res.message, true);
          fetchLocations();
        }
      })
      .catch(err => { editTargetId = null; });
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

// URL của Web App sau khi Deploy từ Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec"; 

let allLocations = [];
let currentId = null;

// Khởi chạy khi load trang
document.addEventListener("DOMContentLoaded", () => {
  restoreLocalSettings(); 
  loadInitData(); 
  
  const searchInput = document.getElementById("searchInput");
  if(searchInput) {
    searchInput.addEventListener("input", () => {
      saveLocalSettings();
      filterLocations();
    });
  }

  ['loai_tim', 'jobSelect', 'employeeSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', saveLocalSettings);
  });
});

function saveLocalSettings() {
  localStorage.setItem("cmis_loai_tim", document.getElementById("loai_tim")?.value || "MKH");
  localStorage.setItem("cmis_jobSelect", document.getElementById("jobSelect")?.value || "");
  localStorage.setItem("cmis_employeeSelect", document.getElementById("employeeSelect")?.value || "");
  localStorage.setItem("cmis_searchInput", document.getElementById("searchInput")?.value || "");
}

function restoreLocalSettings() {
  const loai_tim = localStorage.getItem("cmis_loai_tim");
  if (loai_tim) {
    const el = document.getElementById("loai_tim");
    if(el) {
      el.value = loai_tim;
      el.dispatchEvent(new Event('change')); 
    }
  }
  
  const searchInput = localStorage.getItem("cmis_searchInput");
  if (searchInput) {
    const el = document.getElementById("searchInput");
    if(el) el.value = searchInput;
  }
}

function populateDropdown(id1, id2, dataArray, defaultText) {
  let html = `<option value="">${defaultText}</option>`;
  dataArray.forEach(item => {
    html += `<option value="${item}">${item}</option>`;
  });
  const el1 = document.getElementById(id1);
  const el2 = document.getElementById(id2);
  if (el1) el1.innerHTML = html;
  if (el2) el2.innerHTML = html;
}

function loadInitData() {
  const listElement = document.getElementById("locationList");
  if(listElement) listElement.innerHTML = "<li>Đang tải dữ liệu...</li>";

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "GET_INIT_DATA" })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      populateDropdown("jobSelect", "editJobSelect", res.cong_viec, "Chọn công việc");
      populateDropdown("employeeSelect", "editEmployeeSelect", res.nhan_vien, "Chọn nhân viên");
      
      const savedJob = localStorage.getItem("cmis_jobSelect");
      if (savedJob) document.getElementById("jobSelect").value = savedJob;
      
      const savedEmp = localStorage.getItem("cmis_employeeSelect");
      if (savedEmp) document.getElementById("employeeSelect").value = savedEmp;

      allLocations = res.locations || [];
      filterLocations();
    } else {
      if(listElement) listElement.innerHTML = `<li>Lỗi: ${res.message}</li>`;
    }
  })
  .catch(err => {
    console.error(err);
    if(listElement) listElement.innerHTML = `<li>Lỗi kết nối máy chủ!</li>`;
  });
}

function parseTimeString(timeStr) {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const parts = str.split(/[\s,]+/);
  if (parts.length >= 2) {
    const datePart = parts.find(p => p.includes("/"));
    const timePart = parts.find(p => p.includes(":"));
    if (datePart && timePart) {
      const [day, month, year] = datePart.split("/").map(Number);
      const [hours, minutes, seconds] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0).getTime();
    }
  }
  const t = Date.parse(str);
  return isNaN(t) ? 0 : t;
}

function removeAccents(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D");
}

function filterLocations() {
  const searchInput = document.getElementById("searchInput");
  const rawQuery = searchInput ? searchInput.value.trim() : "";
  
  if (!rawQuery) {
    renderList(allLocations);
    return;
  }

  const query = removeAccents(rawQuery.toLowerCase());

  const filtered = allLocations.filter(loc => {
    const fullText = String(loc.ma_khang || "") + " " + 
                     String(loc.ten_khang || "") + " " + 
                     String(loc.so_cto || "") + " " + 
                     String(loc.ten_nvien || "") + " " + 
                     String(loc.ten_cviec || "") + " " + 
                     String(loc.note || "");
                     
    const normalizedText = removeAccents(fullText.toLowerCase());
    return normalizedText.includes(query);
  });
  
  renderList(filtered);
}

function renderList(locations) {
  const listElement = document.getElementById("locationList");
  const countElement = document.getElementById("locationCount");
  
  if(!listElement) return;
  if(countElement) countElement.innerText = `(${locations.length}/${allLocations.length})`;
  
  listElement.innerHTML = "";
  if (locations.length === 0) {
    listElement.innerHTML = "<li>Không có dữ liệu.</li>";
    return;
  }
  
  locations.forEach(loc => {
    const li = document.createElement("li");
    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    
    li.innerHTML = `
      <div class="loc-name">${loc.ma_khang} ${loc.ten_khang ? `- ${loc.ten_khang}` : ""}</div>
      <div class="loc-job" style="color: #d9534f; font-weight: bold; font-size: 12px; margin-bottom: 4px;">
          No: ${loc.so_cto ? loc.so_cto : "---"} | Trạm: ${loc.ten_tram ? loc.ten_tram : "---"} | Cột: ${loc.so_cot ? loc.so_cot : "---"}
      </div>
      <div class="loc-employee">👤 NV lấy tọa độ: ${loc.ten_nvien ? loc.ten_nvien : "Chưa cập nhật"} (${loc.ten_cviec ? loc.ten_cviec : "Chưa cập nhật"})</div>
      <div class="loc-note">Ghi chú: ${loc.note ? loc.note : "Không có ghi chú"}</div>
      <div class="coords">📍 Tọa độ: ${loc.lat || "Chưa có"}, ${loc.lng || "Chưa có"}</div>
      <div class="maps-row">
        ${(loc.lat && loc.lng) ? `<a href="${mapsUrl}" target="_blank" class="maps-link">Xem trên Google Maps</a>` : `<span style="color:#888; font-size: 13px;">Không có tọa độ</span>`}
      </div>
      <div class="action-bar">
        <button class="btn-edit" onclick="openEditModal('${loc.id}')">Sửa</button>
        <button class="btn-delete" onclick="openConfirmModal('${loc.id}')">Xóa</button>
      </div>
    `;
    listElement.appendChild(li);
  });
}

// Hàm show thông báo xịn (tự động đóng sau 5s)
function showToast(msg) {
  const oldToast = document.getElementById("custom-toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.id = "custom-toast";
  toast.innerText = msg;

  let bgColor = "#28a745"; 
  let msgLower = msg.toLowerCase();
  if (msgLower.includes("lỗi") || msgLower.includes("vui lòng") || msgLower.includes("không") || msgLower.includes("hủy")) {
    bgColor = "#dc3545"; 
  }

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%) translateY(20px)",
    backgroundColor: bgColor,
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    fontSize: "14px",
    fontWeight: "bold",
    zIndex: "10000",
    opacity: "0",
    transition: "all 0.3s ease-in-out",
    whiteSpace: "nowrap",
    maxWidth: "90%",
    textAlign: "center"
  });

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  }, 10);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Thêm vị trí mới (BẮT BUỘC CÓ TỌA ĐỘ MỚI CHO LƯU)
function getLocation() {
  const searchType = document.getElementById("loai_tim").value;
  const searchValueInput = document.getElementById("locName").value.trim();
  const employeeName = document.getElementById("employeeSelect").value;
  const jobTitle = document.getElementById("jobSelect").value;
  const noteContent = document.getElementById("locNote").value.trim();

  if (!searchValueInput) {
    showToast("Vui lòng nhập thông tin tìm kiếm!");
    return;
  }
  if (!employeeName) {
    showToast("Vui lòng chọn Tên nhân viên!");
    return;
  }
  if (!jobTitle) {
    showToast("Vui lòng chọn Tên công việc!");
    return;
  }

  showToast("Đang lấy tọa độ, vui lòng đợi...");

  // Hàm nội bộ để gửi dữ liệu lưu lên Server
  const saveToServer = (lat, lng) => {
    const now = new Date();
    const timeStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const uniqueId = Date.now().toString();

    const locData = {
      id: uniqueId, search_type: searchType, search_value: searchValueInput,
      ten_nvien: employeeName, ten_cviec: jobTitle, note: noteContent,
      lat: lat, lng: lng, time: timeStr
    };

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "ADD", location: locData })
    })
    .then(res => res.json())
    .then(res => {
      if (res.status === "success") {
        locData.ma_khang = res.ma_khang; locData.ten_khang = res.ten_khang;
        locData.so_cto = res.so_cto; locData.ma_tram = res.ma_tram;
        locData.ten_tram = res.ten_tram; locData.so_cot = res.so_cot;
        
        allLocations.unshift(locData);
        allLocations.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));
        filterLocations();

        showToast(`Đã lưu vị trí: ${res.ma_khang} - ${res.ten_khang}`);
        document.getElementById("locName").value = searchType === 'MKH' ? 'PB060600' : '';
        document.getElementById("locNote").value = "";
      } else {
        showToast("Lỗi: " + res.message);
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối máy chủ!");
      console.error(err);
    });
  };

  if (!navigator.geolocation) {
    showToast("Lỗi: Trình duyệt của bạn không hỗ trợ định vị GPS!");
    return;
  }

  // Gọi định vị GPS - ÉP BẮT BUỘC
  navigator.geolocation.getCurrentPosition(
    position => {
      // Thành công lấy được tọa độ thì mới cho chạy hàm saveToServer
      saveToServer(position.coords.latitude, position.coords.longitude);
    },
    error => {
      console.error(error);
      // Thất bại (chưa bật GPS hoặc rớt mạng) -> Chặn đứng và báo lỗi nền đỏ
      showToast("Lỗi: Vui lòng BẬT ĐỊNH VỊ (GPS) trên máy để lưu!");
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

// ---- CÁC HÀM XỬ LÝ MODAL (SỬA & XÓA) ----
function openEditModal(id) {
  currentId = id;
  const loc = allLocations.find(item => String(item.id) === String(id));
  if (loc) {
    document.getElementById("editLoaiTim").value = "MKH"; 
    document.getElementById("editNameInput").value = loc.ma_khang || "";
    document.getElementById("editEmployeeSelect").value = loc.ten_nvien || "";
    document.getElementById("editJobSelect").value = loc.ten_cviec || "";
    document.getElementById("editNoteInput").value = loc.note || "";
    document.getElementById("editModal").style.display = "flex";
  }
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  currentId = null;
}

function saveEditLocation() {
  const newSearchType = document.getElementById("editLoaiTim").value;
  const newSearchValue = document.getElementById("editNameInput").value.trim();
  const newEmployee = document.getElementById("editEmployeeSelect").value;
  const newJob = document.getElementById("editJobSelect").value;
  const newNote = document.getElementById("editNoteInput").value.trim();

  if (!newSearchValue || !newEmployee || !newJob) {
    showToast("Vui lòng nhập đủ thông tin bắt buộc!");
    return;
  }

  showToast("Đang cập nhật...");

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "EDIT", id: currentId, search_type: newSearchType, search_value: newSearchValue,
      ten_nvien: newEmployee, ten_cviec: newJob, note: newNote
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      const loc = allLocations.find(item => String(item.id) === String(currentId));
      if (loc) {
        loc.ma_khang = res.ma_khang; loc.ten_khang = res.ten_khang;
        loc.so_cto = res.so_cto; loc.ma_tram = res.ma_tram;
        loc.ten_tram = res.ten_tram; loc.so_cot = res.so_cot;
        loc.ten_nvien = newEmployee; loc.ten_cviec = newJob; loc.note = newNote;
      }
      filterLocations();
      closeEditModal();
      showToast("Cập nhật thành công!");
    } else {
      showToast("Lỗi: " + res.message);
    }
  })
  .catch(err => {
    showToast("Lỗi kết nối máy chủ!");
    console.error(err);
  });
}

function openConfirmModal(id) {
  currentId = id;
  document.getElementById("confirmModal").style.display = "flex";
}

function closeConfirmModal() {
  document.getElementById("confirmModal").style.display = "none";
  currentId = null;
}

function deleteLocation() {
  if (!currentId) return;
  const btn = document.getElementById("btnConfirmDelete");
  if(btn) btn.disabled = true;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "DELETE", id: currentId })
  })
  .then(res => res.json())
  .then(res => {
    if(btn) btn.disabled = false;
    if (res.status === "success") {
      allLocations = allLocations.filter(loc => String(loc.id) !== String(currentId));
      filterLocations();
      closeConfirmModal();
      showToast("Xóa thành công!");
    } else {
      showToast("Lỗi khi xóa: " + res.message);
    }
  })
  .catch(err => {
    if(btn) btn.disabled = false;
    showToast("Lỗi kết nối máy chủ!");
    console.error(err);
  });
}

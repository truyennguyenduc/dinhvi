// URL của Web App sau khi Deploy từ Google Apps Script
const API_URL = "AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ"; 

let allLocations = [];
let currentId = null;

// Khởi chạy khi load trang
document.addEventListener("DOMContentLoaded", () => {
  loadLocations();
  
  // Sự kiện tìm kiếm realtime trên thanh search
  const searchBox = document.getElementById("searchBox");
  if(searchBox) {
    searchBox.addEventListener("input", filterLocations);
  }
});

// Hàm lấy danh sách từ Google Sheets
function loadLocations() {
  const listElement = document.getElementById("locationList");
  if(listElement) listElement.innerHTML = "<li>Đang tải dữ liệu...</li>";

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "GET_LIST" })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      allLocations = res.data || [];
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

// Chuyển đổi chuỗi thời gian thành timestamp để sort
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

// Lọc danh sách hiển thị
function filterLocations() {
  const searchBox = document.getElementById("searchBox");
  const query = searchBox ? searchBox.value.toLowerCase().trim() : "";
  
  if (!query) {
    renderList(allLocations);
    return;
  }

  const filtered = allLocations.filter(loc => {
    const mk = (loc.ma_khang || "").toLowerCase();
    const tk = (loc.ten_khang || "").toLowerCase();
    const sct = (loc.so_cto || "").toLowerCase();
    return mk.includes(query) || tk.includes(query) || sct.includes(query);
  });
  renderList(filtered);
}

// Render danh sách ra màn hình
function renderList(locations) {
  const listElement = document.getElementById("locationList");
  if(!listElement) return;
  
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
      <div class="loc-job" style="color: #d9534f; font-weight: bold; font-size: 13px; margin-bottom: 4px;">
          🔢 CTơ: ${loc.so_cto ? loc.so_cto : "---"} | Trạm: ${loc.ma_tram ? loc.ma_tram : "---"} - ${loc.ten_tram ? loc.ten_tram : "---"} | Cột: ${loc.so_cot ? loc.so_cot : "---"}
      </div>
      <div class="loc-employee">👤 NV lấy tọa độ: ${loc.ten_nvien ? loc.ten_nvien : "Chưa cập nhật"} (${loc.ten_cviec ? loc.ten_cviec : "Chưa cập nhật"})</div>
      <div class="loc-note">Ghi chú: ${loc.note ? loc.note : "Không có ghi chú"}</div>
      <div class="coords">📍 Tọa độ: ${loc.lat}, ${loc.lng}</div>
      <div class="maps-row">
        <a href="${mapsUrl}" target="_blank" class="maps-link">Xem trên Google Maps</a>
      </div>
      
      <div class="action-bar">
        <button class="btn-edit" onclick="openEditModal('${loc.id}')">Sửa</button>
        <button class="btn-delete" onclick="openConfirmModal('${loc.id}')">Xóa</button>
      </div>
    `;
    listElement.appendChild(li);
  });
}

// Thêm vị trí mới (lấy tọa độ GPS)
function getLocation() {
  const searchType = document.getElementById("searchType").value;
  const searchValueInput = document.getElementById("searchValue").value.trim();
  const employeeName = document.getElementById("employeeName").value.trim();
  const jobTitle = document.getElementById("jobTitle").value.trim();
  const noteContent = document.getElementById("noteContent").value.trim();
  const statusMsg = document.getElementById("statusMsg");

  if (!searchValueInput) {
    statusMsg.innerText = "Vui lòng nhập thông tin tìm kiếm!";
    return;
  }
  if (!employeeName) {
    statusMsg.innerText = "Vui lòng nhập Tên nhân viên!";
    return;
  }
  if (!jobTitle) {
    statusMsg.innerText = "Vui lòng nhập Tên công việc!";
    return;
  }

  statusMsg.innerText = "Đang lấy tọa độ, vui lòng đợi...";

  if (!navigator.geolocation) {
    statusMsg.innerText = "Trình duyệt không hỗ trợ Geolocation.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const now = new Date();
      const timeStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const uniqueId = Date.now().toString();

      const locData = {
        id: uniqueId,
        search_type: searchType,
        search_value: searchValueInput,
        ten_nvien: employeeName,
        ten_cviec: jobTitle,
        note: noteContent,
        lat: lat,
        lng: lng,
        time: timeStr
      };

      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "ADD", location: locData })
      })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          locData.ma_khang = res.ma_khang; 
          locData.ten_khang = res.ten_khang;
          locData.so_cto = res.so_cto;
          locData.ma_tram = res.ma_tram;
          locData.ten_tram = res.ten_tram;
          locData.so_cot = res.so_cot;
          
          allLocations.unshift(locData);
          allLocations.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));
          filterLocations();

          statusMsg.innerText = `Đã lưu vị trí: ${res.ma_khang} - ${res.ten_khang}`;
          document.getElementById("searchValue").value = "";
          document.getElementById("noteContent").value = "";
        } else {
          statusMsg.innerText = "Lỗi: " + res.message;
        }
      })
      .catch(err => {
        statusMsg.innerText = "Lỗi kết nối máy chủ!";
        console.error(err);
      });
    },
    error => {
      statusMsg.innerText = "Không thể lấy tọa độ. Vui lòng kiểm tra quyền GPS.";
      console.error(error);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

// ---- CÁC HÀM XỬ LÝ MODAL (SỬA & XÓA) ----

function openEditModal(id) {
  currentId = id;
  const loc = allLocations.find(item => String(item.id) === String(id));
  if (loc) {
    document.getElementById("editSearchType").value = "MKH"; 
    document.getElementById("editSearchValue").value = loc.ma_khang || "";
    document.getElementById("editEmployeeName").value = loc.ten_nvien || "";
    document.getElementById("editJobTitle").value = loc.ten_cviec || "";
    document.getElementById("editNoteContent").value = loc.note || "";
    document.getElementById("editUpdateGps").checked = false;
    document.getElementById("editStatusMsg").innerText = "";
    document.getElementById("editModal").style.display = "block";
  }
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  currentId = null;
}

function saveEditLocation() {
  const newSearchType = document.getElementById("editSearchType").value;
  const newSearchValue = document.getElementById("editSearchValue").value.trim();
  const newEmployee = document.getElementById("editEmployeeName").value.trim();
  const newJob = document.getElementById("editJobTitle").value.trim();
  const newNote = document.getElementById("editNoteContent").value.trim();
  const updateGps = document.getElementById("editUpdateGps").checked;
  const editStatusMsg = document.getElementById("editStatusMsg");

  if (!newSearchValue || !newEmployee || !newJob) {
    editStatusMsg.innerText = "Vui lòng nhập đủ các thông tin bắt buộc!";
    return;
  }

  editStatusMsg.innerText = "Đang xử lý...";
  document.getElementById("btnSaveEdit").disabled = true;

  if (updateGps) {
    if (!navigator.geolocation) {
      editStatusMsg.innerText = "Trình duyệt không hỗ trợ Geolocation.";
      document.getElementById("btnSaveEdit").disabled = false;
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const now = new Date();
        const timeStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "EDIT",
            id: currentId,
            search_type: newSearchType,
            search_value: newSearchValue,
            ten_nvien: newEmployee,
            ten_cviec: newJob,
            note: newNote,
            lat: lat,
            lng: lng,
            time: timeStr
          })
        })
        .then(res => res.json())
        .then(res => {
          document.getElementById("btnSaveEdit").disabled = false;
          if (res.status === "success") {
            const loc = allLocations.find(item => String(item.id) === String(currentId));
            if (loc) {
              loc.ma_khang = res.ma_khang;
              loc.ten_khang = res.ten_khang;
              loc.so_cto = res.so_cto;
              loc.ma_tram = res.ma_tram;
              loc.ten_tram = res.ten_tram;
              loc.so_cot = res.so_cot;
              loc.ten_nvien = newEmployee;
              loc.ten_cviec = newJob;          
              loc.note = newNote;
              loc.lat = lat;
              loc.lng = lng;
              loc.time = timeStr;
            }
            allLocations.sort((a, b) => parseTimeString(b.time) - parseTimeString(a.time));
            filterLocations();
            closeEditModal();
          } else {
            editStatusMsg.innerText = "Lỗi: " + res.message;
          }
        })
        .catch(err => {
          document.getElementById("btnSaveEdit").disabled = false;
          editStatusMsg.innerText = "Lỗi kết nối máy chủ!";
          console.error(err);
        });
      },
      error => {
        document.getElementById("btnSaveEdit").disabled = false;
        editStatusMsg.innerText = "Không thể lấy tọa độ.";
        console.error(error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  } else {
    // Không cập nhật tọa độ GPS
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "EDIT",
        id: currentId,
        search_type: newSearchType,
        search_value: newSearchValue,
        ten_nvien: newEmployee,
        ten_cviec: newJob,
        note: newNote
      })
    })
    .then(res => res.json())
    .then(res => {
      document.getElementById("btnSaveEdit").disabled = false;
      if (res.status === "success") {
        const loc = allLocations.find(item => String(item.id) === String(currentId));
        if (loc) {
          loc.ma_khang = res.ma_khang;
          loc.ten_khang = res.ten_khang;
          loc.so_cto = res.so_cto;
          loc.ma_tram = res.ma_tram;
          loc.ten_tram = res.ten_tram;
          loc.so_cot = res.so_cot;
          loc.ten_nvien = newEmployee;
          loc.ten_cviec = newJob;          
          loc.note = newNote;
        }
        filterLocations();
        closeEditModal();
      } else {
        editStatusMsg.innerText = "Lỗi: " + res.message;
      }
    })
    .catch(err => {
      document.getElementById("btnSaveEdit").disabled = false;
      editStatusMsg.innerText = "Lỗi kết nối máy chủ!";
      console.error(err);
    });
  }
}

function openConfirmModal(id) {
  currentId = id;
  document.getElementById("confirmModal").style.display = "block";
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
    } else {
      alert("Lỗi khi xóa: " + res.message);
    }
  })
  .catch(err => {
    if(btn) btn.disabled = false;
    alert("Lỗi kết nối máy chủ!");
    console.error(err);
  });
}

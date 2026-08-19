function renderList(locations) {
  const listElement = document.getElementById("locationList");
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

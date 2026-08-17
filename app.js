// Thay URL copy ở Apps Script vào giữa 2 dấu ngoặc kép này
const API_URL = "https://script.google.com/macros/s/AKfycby_pM4151Q4xksPdnJkFflE3TNVJEO1R-WKuewTwukJZ-8fee26sBH-eHE8pl5EQMLSEQ/exec";

let allLocations = [];

document.addEventListener("DOMContentLoaded", fetchLocations);

// 1. Lấy vị trí GPS và gửi lên Apps Script
// 1. Lấy vị trí GPS và cập nhật giao diện TỨC THÌ
// 1. Lấy vị trí GPS và lưu
// 3. Hàm lấy vị trí GPS hiện tại
function getLocation() {
  const locNameInput = document.getElementById("locName");
  const nameInput = locNameInput.value.trim().toUpperCase(); // Tự đổi thành CHỮ IN HOA
  const noteInput = document.getElementById("locNote").value.trim();

  // BẮT BUỘC NHẬP MÃ KHÁCH HÀNG VÀ PHẢI ĐỦ 13 KÝ TỰ
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

      // Hiển thị ngay lên màn hình
      allLocations.unshift(locData);
      renderList(allLocations);

      // Xóa trắng ô nhập liệu
      locNameInput.value = "";
      document.getElementById("locNote").value = "";

      showToast("Đã lấy vị trí thành công!");

      // Gửi ngầm dữ liệu lên Google Sheet ở nền
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
      showToast("Không thể lấy vị trí GPS! Bác hãy kiểm tra quyền vị trí trên điện thoại.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

// 4. Tìm kiếm
function filterLocations() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allLocations.filter(loc => 
    loc.name.toLowerCase().includes(keyword) ||
    loc.note.toLowerCase().includes(keyword) ||
    `${loc.lat},${loc.lng}`.includes(keyword)
  );
  renderList(filtered);
}

// 5. Xóa 1 vị trí
function deleteLocation(id) {
  if (!confirm("Xác nhận xóa vị trí này?")) return;

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "DELETE", id: id })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") fetchLocations();
  });
}

// 6. Sửa thông tin
function editLocation(id, oldName, oldNote) {
  const newName = prompt("Nhập mã/tên khách hàng mới:", oldName);
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
    if (res.status === "success") fetchLocations();
  });
}

// Hàm hiển thị thông báo Toast góc phải, nền xanh lá, tự ẩn sau 5 giây
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;

  container.appendChild(toast);

  // Hiệu ứng trượt ra
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  // Tự động đóng sau 5 giây (5000ms)
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 400); // Đợi hoàn tất hiệu ứng mờ dần rồi xóa hẳn
  }, 5000);
}

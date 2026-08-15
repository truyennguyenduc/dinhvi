// Tải danh sách vị trí từ LocalStorage khi mở ứng dụng
document.addEventListener("DOMContentLoaded", displayLocations);

function getLocation() {
    const nameInput = document.getElementById("locName");
    const noteInput = document.getElementById("locNote");

    const name = nameInput.value.trim() || "Vị trí không tên";
    const note = noteInput.value.trim();

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const time = new Date().toLocaleString("vi-VN");
                const id = Date.now(); // Tạo ID duy nhất cho mỗi vị trí

                const newLocation = { id, name, note, lat, lng, time };
                
                // Lưu vào LocalStorage
                let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
                locations.unshift(newLocation); // Thêm lên đầu danh sách
                localStorage.setItem("user_locations", JSON.stringify(locations));

                // Reset ô nhập liệu sau khi lưu
                nameInput.value = "";
                noteInput.value = "";

                displayLocations();
            },
            (error) => {
                alert("Không thể lấy vị trí. Vui lòng bật GPS và cấp quyền truy cập vị trí.");
            },
            { enableHighAccuracy: true }
        );
    } else {
        alert("Trình duyệt của bạn không hỗ trợ Geolocation.");
    }
}

function displayLocations() {
    const listElement = document.getElementById("locationList");
    listElement.innerHTML = "";
    
    let locations = JSON.parse(localStorage.getItem("user_locations")) || [];

    if (locations.length === 0) {
        listElement.innerHTML = "<li style='text-align: center; color: #888;'>Chưa có vị trí nào được lưu.</li>";
        return;
    }

    locations.forEach((loc, index) => {
        const li = document.createElement("li");
        
        // Link mở Google Maps
        const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
        let noteHtml = loc.note ? `<div class="note"><b>Ghi chú:</b> ${escapeHtml(loc.note)}</div>` : "";

        li.innerHTML = `
            <div class="loc-title">📍 ${escapeHtml(loc.name)}</div>
            <span class="time">🕒 ${loc.time}</span>
            <div>Tọa độ: <b>${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</b></div>
            ${noteHtml}
            
            <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <a class="maps-link" href="${mapsUrl}" target="_blank" style="margin-right: auto;">🗺️ Mở Google Maps ➔</a>
                <button onclick="editLocation(${index})" style="width: auto; padding: 6px 12px; background: #ffc107; color: #333; margin: 0; font-size: 13px;">✏️ Sửa</button>
                <button onclick="deleteLocation(${index})" style="width: auto; padding: 6px 12px; background: #dc3545; color: white; margin: 0; font-size: 13px;">🗑️ Xóa</button>
            </div>
        `;
        listElement.appendChild(li);
    });
}

// Hàm Xóa từng vị trí
function deleteLocation(index) {
    let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
    if (confirm(`Bạn có chắc muốn xóa vị trí "${locations[index].name}"?`)) {
        locations.splice(index, 1);
        localStorage.setItem("user_locations", JSON.stringify(locations));
        displayLocations();
    }
}

// Hàm Sửa tên & ghi chú vị trí
function editLocation(index) {
    let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
    const item = locations[index];

    const newName = prompt("Nhập tên vị trí mới:", item.name);
    if (newName === null) return; // Bấm Cancel thì thoát

    const newNote = prompt("Nhập ghi chú mới:", item.note || "");
    if (newNote === null) return;

    locations[index].name = newName.trim() || "Vị trí không tên";
    locations[index].note = newNote.trim();

    localStorage.setItem("user_locations", JSON.stringify(locations));
    displayLocations();
}

// Hàm Xóa toàn bộ lịch sử
function clearLocations() {
    if (confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ danh sách vị trí đã lưu?")) {
        localStorage.removeItem("user_locations");
        displayLocations();
    }
}

// Hỗ trợ mã hóa HTML chống lỗi giao diện khi nhập ký tự đặc biệt
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

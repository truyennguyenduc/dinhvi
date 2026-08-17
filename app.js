// Thay URL bên dưới bằng URL ứng dụng Web Apps Script bạn vừa triển khai
const SCRIPT_URL = "https://docs.google.com/spreadsheets/d/13dMMeQn-IS6y_yoI_LVj3paZAH-e3PmNH8Nj_AR4tts/edit?pli=1&gid=0#gid=0"; 
const ADMIN_PASSWORD = "Truyen&1978"; 

document.addEventListener("DOMContentLoaded", displayLocations);

async function fetchLocationsFromSheet() {
    try {
        const response = await fetch(SCRIPT_URL);
        const result = await response.json();
        if (result.status === "success") {
            return result.data;
        }
        return [];
    } catch (error) {
        console.error("Lỗi khi kết nối Google Sheets:", error);
        return [];
    }
}

async function getLocation() {
    const nameInput = document.getElementById("locName");
    const noteInput = document.getElementById("locNote");

    const name = nameInput.value.trim() || "Vị trí không tên";
    const note = noteInput.value.trim();

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const time = new Date().toLocaleString("vi-VN");

                const newLocation = { id: Date.now(), name, note, lat, lng, time };

                // Gửi dữ liệu lưu lên Google Sheets
                await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "ADD", location: newLocation })
                });

                nameInput.value = "";
                noteInput.value = "";

                displayLocations();
            },
            (error) => {
                alert("Không thể lấy vị trí. Vui lòng bật GPS và cho phép ứng dụng truy cập.");
            },
            { enableHighAccuracy: true }
        );
    } else {
        alert("Trình duyệt không hỗ trợ Geolocation.");
    }
}

async function displayLocations() {
    const listElement = document.getElementById("locationList");
    const searchInput = document.getElementById("searchInput");
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
    listElement.innerHTML = "<li style='text-align: center; color: #777;'>Đang tải dữ liệu...</li>";
    
    const locations = await fetchLocationsFromSheet();

    let filteredLocations = locations.filter(loc => {
        const nameMatch = (loc.name || "").toLowerCase().includes(keyword);
        const noteMatch = (loc.note || "").toLowerCase().includes(keyword);
        const coordsMatch = `${loc.lat},${loc.lng}`.includes(keyword);
        return nameMatch || noteMatch || coordsMatch;
    });

    listElement.innerHTML = "";

    if (filteredLocations.length === 0) {
        listElement.innerHTML = "<li style='text-align: center; color: #777;'>Không tìm thấy vị trí nào.</li>";
        return;
    }

    filteredLocations.forEach((loc) => {
        const li = document.createElement("li");
        const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;

        li.onclick = function(e) {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
            document.querySelectorAll('#locationList li').forEach(item => {
                if (item !== li) item.classList.remove('selected');
            });
            li.classList.toggle('selected');
        };

        let noteHtml = loc.note ? `<div class="loc-note">Ghi chú: ${escapeHtml(loc.note)}</div>` : "";

        li.innerHTML = `
            <div class="loc-name">📍 ${escapeHtml(loc.name)}</div>
            ${noteHtml}
            <span class="time">Thời gian: ${loc.time}</span>
            <div class="coords">Tọa độ: <b>${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}</b></div>
            <a class="maps-link" href="${mapsUrl}" target="_blank">Mở trên Google Maps ➔</a>
            
            <div class="action-bar">
                <button class="btn-edit" onclick="editLocation(${loc.id})">✏️ Sửa vị trí</button>
                <button class="btn-delete" onclick="deleteLocation(${loc.id})">🗑️ Xóa vị trí</button>
            </div>
        `;
        listElement.appendChild(li);
    });
}

function filterLocations() {
    displayLocations();
}

// Xóa 1 vị trí (Cần mật khẩu)
async function deleteLocation(id) {
    const password = prompt("Nhập mật khẩu quản trị để xóa vị trí này:");
    if (password === null) return;

    if (password === ADMIN_PASSWORD) {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "DELETE", id: id })
        });
        displayLocations();
        alert("Đã xóa vị trí thành công.");
    } else {
        alert("Sai mật khẩu quản trị!");
    }
}

// Sửa vị trí (Không cần mật khẩu)
async function editLocation(id) {
    const locations = await fetchLocationsFromSheet();
    const item = locations.find(loc => loc.id === id);
    if (!item) return;

    const newName = prompt("Nhập tên vị trí mới:", item.name);
    if (newName === null) return;

    const newNote = prompt("Nhập ghi chú mới:", item.note || "");
    if (newNote === null) return;

    await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "EDIT",
            id: id,
            name: newName.trim() || "Vị trí không tên",
            note: newNote.trim()
        })
    });

    displayLocations();
}

// Xóa toàn bộ lịch sử
async function clearLocations() {
    const password = prompt("Nhập mật khẩu quản trị để XÓA TOÀN BỘ lịch sử:");
    if (password === null) return;

    if (password === ADMIN_PASSWORD) {
        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "CLEAR" })
        });
        displayLocations();
        alert("Đã xóa toàn bộ lịch sử.");
    } else {
        alert("Sai mật khẩu quản trị!");
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

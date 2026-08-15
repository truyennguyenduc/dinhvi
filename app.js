// Mật khẩu quản trị để xóa vị trí (Bác có thể đổi mật khẩu tại đây)
const ADMIN_PASSWORD = "123"; 

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

                const newLocation = { id: Date.now(), name, note, lat, lng, time };
                
                let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
                locations.unshift(newLocation);
                localStorage.setItem("user_locations", JSON.stringify(locations));

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

function displayLocations() {
    const listElement = document.getElementById("locationList");
    const searchInput = document.getElementById("searchInput");
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
    listElement.innerHTML = "";
    
    let locations = JSON.parse(localStorage.getItem("user_locations")) || [];

    let filteredLocations = locations.filter(loc => {
        const nameMatch = loc.name.toLowerCase().includes(keyword);
        const noteMatch = (loc.note || "").toLowerCase().includes(keyword);
        const coordsMatch = `${loc.lat},${loc.lng}`.includes(keyword);
        return nameMatch || noteMatch || coordsMatch;
    });

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
            <div class="coords">Tọa độ: <b>${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</b></div>
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
function deleteLocation(id) {
    const password = prompt("Nhập mật khẩu quản trị để xóa vị trí này:");
    if (password === null) return;

    if (password === ADMIN_PASSWORD) {
        let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
        locations = locations.filter(loc => loc.id !== id);
        localStorage.setItem("user_locations", JSON.stringify(locations));
        displayLocations();
        alert("Đã xóa vị trí thành công.");
    } else {
        alert("Sai mật khẩu quản trị!");
    }
}

// Sửa vị trí (Không cần mật khẩu)
function editLocation(id) {
    let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
    const index = locations.findIndex(loc => loc.id === id);
    if (index === -1) return;

    const item = locations[index];

    const newName = prompt("Nhập tên vị trí mới:", item.name);
    if (newName === null) return;

    const newNote = prompt("Nhập ghi chú mới:", item.note || "");
    if (newNote === null) return;

    locations[index].name = newName.trim() || "Vị trí không tên";
    locations[index].note = newNote.trim();

    localStorage.setItem("user_locations", JSON.stringify(locations));
    displayLocations();
}

// Xóa toàn bộ lịch sử (Nút bấm phía trên - Cần mật khẩu)
function clearLocations() {
    const password = prompt("Nhập mật khẩu quản trị để XÓA TOÀN BỘ lịch sử:");
    if (password === null) return;

    if (password === ADMIN_PASSWORD) {
        localStorage.removeItem("user_locations");
        displayLocations();
        alert("Đã xóa toàn bộ lịch sử.");
    } else {
        alert("Sai mật khẩu quản trị!");
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
    const keyword = document.getElementById("searchInput").value.toLowerCase().trim();
    listElement.innerHTML = "";
    
    let locations = JSON.parse(localStorage.getItem("user_locations")) || [];

    // Lọc theo từ khóa tìm kiếm
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

        // Toggle ẩn/hiện menu nút bấm khi chọn vào dòng
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

function deleteLocation(id) {
    let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
    const item = locations.find(loc => loc.id === id);
    if (confirm(`Bạn có muốn xóa vị trí "${item ? item.name : ''}"?`)) {
        locations = locations.filter(loc => loc.id !== id);
        localStorage.setItem("user_locations", JSON.stringify(locations));
        displayLocations();
    }
}

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

function clearLocations() {
    if (confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử đã lưu?")) {
        localStorage.removeItem("user_locations");
        displayLocations();
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

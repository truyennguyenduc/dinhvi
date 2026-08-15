// Tải danh sách vị trí từ bộ nhớ máy (LocalStorage) khi mở ứng dụng
document.addEventListener("DOMContentLoaded", displayLocations);

function getLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const time = new Date().toLocaleString("vi-VN");

                const newLocation = { lat, lng, time };
                
                // Lưu vào LocalStorage
                let locations = JSON.parse(localStorage.getItem("user_locations")) || [];
                locations.unshift(newLocation); // Thêm lên đầu danh sách
                localStorage.setItem("user_locations", JSON.stringify(locations));

                displayLocations();
            },
            (error) => {
                alert("Không thể lấy vị trí. Vui lòng bật GPS và cho phép truy cập vị trí.");
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
        listElement.innerHTML = "<li>Chưa có vị trí nào được lưu.</li>";
        return;
    }

    locations.forEach((loc) => {
        const li = document.createElement("li");
        
        // Link mở Google Maps trực tiếp bằng tọa độ lat,lng
        const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;

        li.innerHTML = `
            <span class="time">Thời gian: ${loc.time}</span>
            <div>Tọa độ: <b>${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</b></div>
            <a href="${mapsUrl}" target="_blank">Mở trên Google Maps ➔</a>
        `;
        listElement.appendChild(li);
    });
}

function clearLocations() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách vị trí đã lưu?")) {
        localStorage.removeItem("user_locations");
        displayLocations();
    }
}
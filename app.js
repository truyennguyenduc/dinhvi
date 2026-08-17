const SPREADSHEET_ID = "13dMMeQn-IS6y_yoI_LVj3paZAH-e3PmNH8Nj_AR4tts";
const SHEET_NAME = "dinh_vi";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: "error", message: "Không tìm thấy dữ liệu POST" });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return responseJSON({ status: "error", message: "Không tìm thấy sheet " + SHEET_NAME });
    }

    if (action === "ADD") {
      const loc = data.location;
      sheet.appendRow([loc.id, loc.name, loc.note, loc.lat, loc.lng, loc.time]);
      return responseJSON({ status: "success", message: "Đã thêm vị trí" });
    }
    
    if (action === "DELETE") {
      const id = data.id;
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == id) {
          sheet.deleteRow(i + 1);
          return responseJSON({ status: "success", message: "Đã xóa vị trí" });
        }
      }
      return responseJSON({ status: "error", message: "Không tìm thấy ID" });
    }

    if (action === "EDIT") {
      const id = data.id;
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == id) {
          sheet.getRange(i + 1, 2).setValue(data.name);
          sheet.getRange(i + 1, 3).setValue(data.note);
          return responseJSON({ status: "success", message: "Đã cập nhật vị trí" });
        }
      }
      return responseJSON({ status: "error", message: "Không tìm thấy ID" });
    }

    if (action === "CLEAR") {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      return responseJSON({ status: "success", message: "Đã xóa toàn bộ lịch sử" });
    }

  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return responseJSON({ status: "error", message: "Không tìm thấy sheet " + SHEET_NAME });
    }

    const rows = sheet.getDataRange().getValues();
    const locations = [];
    
    for (let i = 1; i < rows.length; i++) {
      locations.push({
        id: Number(rows[i][0]),
        name: String(rows[i][1]),
        note: String(rows[i][2]),
        lat: Number(rows[i][3]),
        lng: Number(rows[i][4]),
        time: String(rows[i][5])
      });
    }
    
    locations.reverse();
    return responseJSON({ status: "success", data: locations });
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

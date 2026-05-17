// accountManager.js

// 1. Hàm tự động sinh mã ID ngẫu nhiên 4 chữ số (Từ 1000 đến 9999)
function generateFourDigitID() {
    return Math.floor(1000 + Math.random() * 9000);
}

// 2. Hàm khởi tạo tài khoản mới cho người chơi mới
export function createNewAccount(inputName) {
    const cleanName = inputName.trim();
    if (!cleanName) return null;

    const uniqueID = generateFourDigitID();
    const tagAccount = `${cleanName}#${uniqueID}`; // Định dạng: NamX#1234
    const uniqueUID = "usr_" + Math.random().toString(36).substr(2, 9); // UID ngẫu nhiên cho thiết bị

    const accountObj = {
        uid: uniqueUID,
        name: cleanName,
        tagId: uniqueID,
        fullTag: tagAccount,
        role: "Dân thường", // Mặc định ban đầu khi chưa chia bài
        team: "Dân Làng",
        isDead: false,
        resetVoted: false
    };

    // Lưu vĩnh viễn vào bộ nhớ cục bộ của trình duyệt chống mất tài khoản
    localStorage.setItem("wolf_messenger_user", JSON.stringify(accountObj));
    return accountObj;
}

// 3. Hàm tự động kiểm tra xem thiết bị đã có tài khoản sẵn chưa (Khôi phục đăng nhập)
export function getSavedAccount() {
    const savedData = localStorage.getItem("wolf_messenger_user");
    if (savedData) {
        try {
            return JSON.parse(savedData);
        } catch (e) {
            localStorage.removeItem("wolf_messenger_user");
            return null;
        }
    }
    return null;
}

// 4. Hàm xóa tài khoản (Khi muốn đổi tên hoàn toàn)
export function clearCurrentAccount() {
    localStorage.removeItem("wolf_messenger_user");
}
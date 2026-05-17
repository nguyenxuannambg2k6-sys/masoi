// chatManager.js

// 1. BỘ LỌC BẢO MẬT PHÂN QUYỀN TIN NHẮN (KÍN ĐÁO 100% THEO YÊU CẦU CỦA BẠN)
export function canUserSeeMessage(msgObj, myUser) {
    const mode = msgObj.mode;

    // Kênh Làng: Mở công khai cho mọi thành viên đọc thảo luận ban ngày
    if (mode === "village") return true;

    // Kênh Hội Đồng Sói: Chỉ cho phép những ai mang vai trò thuộc phe Sói hoặc Admin phòng truy cập
    if (mode === "wolf") {
        return myUser.role === "Ma Sói" || myUser.role === "Sói đầu đàn" || myUser.role === "Sói con" || myUser.isAdmin;
    }

    // Kênh Quản Trò AI: Mã hóa bảo mật riêng tư tuyệt đối giữa cá nhân bạn và AI
    if (mode === "ai") {
        if (msgObj.uid === "ai-bot" && msgObj.targetUid === myUser.uid) return true; // Tin AI rep riêng cho bạn
        if (msgObj.uid === myUser.uid) return true; // Tin bạn gửi trong tab chat AI
    }

    // Kênh Chat Riêng Tư 1:1 (Người chơi - Người chơi)
    if (mode === "private") {
        // Chỉ người gửi hoặc người nhận khớp chính xác mã định danh thiết bị UID mới có quyền đọc văn bản công khai
        return msgObj.uid === myUser.uid || msgObj.targetUid === myUser.uid;
    }

    return false;
}

// 2. TỰ ĐỘNG SINH CÁC NÚT TICK HÀNH ĐỘNG HỢP VỚI TIẾN TRÌNH NGÀY/ĐÊM VÀ CHỨC NĂNG
export function generateActionTickButton(player, myUser, isNight) {
    // Nếu bạn đã chết hoặc đối tượng đã chết -> Ẩn toàn bộ nút tick, tước quyền biểu quyết hành động
    if (player.isDead || myUser.isDead) return ""; 

    // BAN NGÀY: Hiện nút Vote treo cổ công khai bên cạnh tên của tất cả mọi người còn sống ở Kênh Làng
    if (!isNight) {
        return `<button class="action-tick-btn" data-action="day_vote" data-target="${player.uid}">🗳️ Vote Treo</button>`;
    }

    // BAN ĐÊM: Tự động hiện nút Tick chức năng bí mật tương ứng theo từng cấu hình vai trò
    if (isNight) {
        // Nếu bạn là Ma Sói -> Hiện nút Tick cắn bên cạnh những người thuộc phe Dân Làng còn sống
        if ((myUser.role === "Ma Sói" || myUser.role === "Sói đầu đàn") && player.role !== "Ma Sói") {
            return `<button class="action-tick-btn" data-action="wolf_bite" data-target="${player.uid}">🩸 Cắn</button>`;
        }
        // Nếu bạn là Tiên Tri -> Hiện nút Tick để thực hiện soi chức danh kín đáo gửi về tab AI mật
        if (myUser.role === "Tiên tri") {
            return `<button class="action-tick-btn" data-action="seer_soi" data-target="${player.uid}">👁️ Soi</button>`;
        }
        // Nếu bạn là Bảo Vệ -> Hiện nút Tick kích hoạt lá chắn bảo vệ mục tiêu đêm nay
        if (myUser.role === "Bảo vệ") {
            return `<button class="action-tick-btn" data-action="guard_protect" data-target="${player.uid}">🛡️ Hộ Vệ</button>`;
        }
    }

    return "";
}
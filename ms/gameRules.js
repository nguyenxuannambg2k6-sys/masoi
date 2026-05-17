// gameRules.js

export const gameRules = {
    general: {
        title: "Luật Vận Hành WolfMessenger Ultimate",
        minPlayers: 6,
        resetVoteThreshold: 0.51 // Quá bán 51% biểu quyết sẽ reset
    },
    phases: {
        night: "🌙 ĐÊM XUỐNG: Hãy vào mục [Quản Trò AI] và sử dụng các nút Tick chức năng bí mật!",
        day: "☀️ NGÀY LÊN: Thảo luận tại [Làng Ma Sói]. Để vote treo cổ ai, hãy tick vào nút Bầu chọn bên danh sách!"
    },
    setup: {
        small: "6-8 người: 2 Sói, 1 Tiên tri, 1 Bảo vệ, còn lại là Dân thường.",
        large: "9-12 người: 3 Sói, 1 Tiên tri, 1 Phù thủy, 1 Bảo vệ, còn lại là Dân thường."
    }
};

// Hàm hỗ trợ Quản Trò AI trả về luật của lệnh khi người chơi tra cứu
export function getCommandResponse(command) {
    const cleanCmd = command.trim().toLowerCase();
    
    if (cleanCmd === "/chucnang") {
        return "🤖 Quản trò nhắc nhở: Lệnh hiển thị chi tiết vai trò của riêng bạn. Hệ thống tự động xử lý nút bấm không cần gõ lệnh.";
    }
    if (cleanCmd === "/luat") {
        return `🤖 Hướng Dẫn: Trình tự ban đêm Sói cắn -> Tiên tri soi -> Bảo vệ -> Phù thủy. Ai cũng có quyền dùng lệnh /chucnang, /luat, /status gửi riêng cho AI. Để reset hãy bấm nút bỏ phiếu biểu quyết bên dưới Menu.`;
    }
    if (cleanCmd === "/status") {
        return "🤖 Trạng thái trận đấu: Gửi lệnh này để kiểm tra tổng số thành viên phe Dân và Sói còn sống.";
    }
    return null;
}
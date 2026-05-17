// characterData.js

export const characterData = {
    "Dân thường": {
        role: "Dân thường",
        team: "Dân Làng",
        icon: "🏠",
        description: "Không có kỹ năng đặc biệt ban đêm. Ban ngày dùng suy luận để tìm Ma Sói.",
        victoryCondition: "Tiêu diệt hết toàn bộ Ma Sói."
    },
    "Tiên tri": {
        role: "Tiên tri",
        team: "Dân Làng",
        icon: "👁️",
        description: "Mỗi đêm thức giấc soi 1 người để biết có phải Ma Sói hay không.",
        victoryCondition: "Tiêu diệt hết toàn bộ Ma Sói."
    },
    "Bảo vệ": {
        role: "Bảo vệ",
        team: "Dân Làng",
        icon: "🛡️",
        description: "Mỗi đêm chọn bảo vệ 1 người khỏi bị Sói cắn. Không bảo vệ 1 người 2 đêm liên tiếp.",
        victoryCondition: "Tiêu diệt hết toàn bộ Ma Sói."
    },
    "Phù thủy": {
        role: "Phù thủy",
        team: "Dân Làng",
        icon: "🧪",
        description: "Có 1 bình thuốc cứu và 1 bình thuốc độc, mỗi loại chỉ dùng được 1 lần trong ván.",
        victoryCondition: "Tiêu diệt hết toàn bộ Ma Sói."
    },
    "Thợ săn": {
        role: "Thợ săn",
        team: "Dân Làng",
        icon: "🏹",
        description: "Khi chết được kéo chọn bắn chết thêm 1 người bất kỳ cùng chết theo.",
        victoryCondition: "Tiêu diệt hết toàn bộ Ma Sói."
    },
    "Thần tình yêu / Cupid": {
        role: "Thần tình yêu / Cupid",
        team: "Dân Làng",
        icon: "💘",
        description: "Đêm đầu chọn ghép đôi 2 người. Nếu 1 người chết, người kia chết theo vì đau buồn.",
        victoryCondition: "Tiêu diệt hết Sói (nếu cặp đôi cùng phe Dân) hoặc là cặp sống sót duy nhất (nếu Sói - Dân)."
    },
    "Ma Sói": {
        role: "Ma Sói",
        team: "Ma Sói",
        icon: "🐺",
        description: "Ban đêm cùng bầy Sói thức giấc chọn người cắn chết. Ban ngày giả làm dân thường.",
        victoryCondition: "Số lượng Sói lớn hơn hoặc bằng số lượng dân làng còn sống."
    },
    "Kẻ muốn chết": {
        role: "Kẻ muốn chết",
        team: "Trung lập",
        icon: "🤡",
        description: "Tỏ ra đáng nghi ban ngày để đánh lừa dân làng bỏ phiếu vote treo cổ mình.",
        victoryCondition: "Bị dân làng treo cổ chết thành công ban ngày."
    },
    "Sát nhân": {
        role: "Sát nhân",
        team: "Trung lập",
        icon: "🔪",
        description: "Kẻ sát nhân hoạt động đơn độc. Mỗi đêm thức giấc tự chọn giết chết 1 người.",
        victoryCondition: "Là người duy nhất còn sống sót cuối cùng trong phòng."
    }
};

export function getCharacterInfo(roleName) {
    return characterData[roleName] || {
        role: "Chưa rõ",
        team: "Chưa rõ",
        icon: "❓",
        description: "Chưa có thông tin.",
        victoryCondition: "Chưa rõ."
    };
}
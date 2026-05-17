// gameLogic.js
import { db } from './firebaseConfig.js';

// 1. THUẬT TOÁN XÁO TRỘN VÀ CHIA VAI NGẪU NHIÊN THEO QUY MÔ PHÒNG
export function allocateRoles(roomCode, playersObj) {
    const playersKeys = Object.keys(playersObj);
    const count = playersKeys.length;

    // Thiết lập số lượng vai trò dựa theo cấu hình setup chuẩn của gameRules.js
    let rolePool = [];
    if (count >= 9) {
        rolePool = ["Ma Sói", "Ma Sói", "Ma Sói", "Tiên tri", "Phù thủy", "Bảo vệ"];
    } else if (count >= 6) {
        rolePool = ["Ma Sói", "Ma Sói", "Tiên tri", "Bảo vệ"];
    } else {
        rolePool = ["Ma Sói", "Tiên tri"]; // Chế độ chạy thử nghiệm nhanh cho ít người
    }

    // Lấp đầy các vị trí trống còn lại bằng Dân thường
    while (rolePool.length < count) {
        rolePool.push("Dân thường");
    }

    // Thuật toán xáo trộn ngẫu nhiên hoàn hảo Fisher-Yates Shuffle
    for (let i = rolePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
    }

    // Cập nhật cấu hình phân phát bài bí mật lên cơ sở dữ liệu Firebase
    playersKeys.forEach((uid, index) => {
        const assignedRole = rolePool[index];
        // Xác định thuộc tính phe phái ban đầu dựa theo tên vai trò
        let assignedTeam = "Dân Làng";
        if (assignedRole === "Ma Sói") assignedTeam = "Ma Sói";

        db.ref(`quiz_rooms/${roomCode}/players/${uid}`).update({
            role: assignedRole,
            team: assignedTeam,
            isDead: false,
            resetVoted: false
        });
    });

    // Kích hoạt cờ bắt đầu trạng thái trận đấu luân chuyển
    db.ref(`quiz_rooms/${roomCode}/gameState`).update({
        started: true,
        isNight: false,
        phaseNumber: 1
    });
}

// 2. QUY TẮC BAN ĐÊM: TỰ ĐỘNG TỔNG HỢP VÀ ĐỐI CHIẾU KẾT QUẢ SỐNG/CHẾT NGẦM
export function processNightResults(roomCode, players, actions) {
    let killedUid = null;
    let protectedUid = null;
    let witchHeal = false;
    let witchKillUid = null;

    // A. Logic Sói cắn: Tìm người chơi nhận nhiều lượt Tick cắn nhất từ bầy Sói
    if (actions && actions.wolf_votes) {
        const votes = {};
        Object.values(actions.wolf_votes).forEach(targetUid => {
            votes[targetUid] = (votes[targetUid] || 0) + 1;
        });
        
        let maxVotes = 0;
        for (const [target, count] of Object.entries(votes)) {
            if (count > maxVotes) {
                maxVotes = count;
                killedUid = target;
            }
        }
    }

    // B. Logic Bảo vệ tick lá chắn hộ vệ
    if (actions && actions.bodyguard_protect) {
        protectedUid = Object.values(actions.bodyguard_protect)[0]; // Bảo vệ chỉ được chọn 1 người mỗi đêm
    }

    // C. Logic Phù thủy dùng bình thuốc (Cứu sinh / Độc tử)
    if (actions && actions.witch_action) {
        const witchData = Object.values(actions.witch_action)[0];
        if (witchData) {
            if (witchData.heal) witchHeal = true;
            if (witchData.kill) witchKillUid = witchData.kill;
        }
    }

    // D. ĐỐI CHIẾU QUY TẮC PHÁN QUYẾT CUỐI CÙNG
    const deadList = [];
    
    // Nạn nhân bị Sói cắn sẽ chết nếu không được Bảo vệ chọn và không được Phù thủy dùng bình cứu
    if (killedUid && killedUid !== protectedUid && !witchHeal) {
        deadList.push(killedUid);
    }
    // Nếu Phù thủy rải bình thuốc độc trúng ai -> Người đó tử vong lập tức
    if (witchKillUid) {
        deadList.push(witchKillUid);
    }

    // Ghi nhận trạng thái tử vong lên Firebase đám mây thời gian thực
    deadList.forEach(uid => {
        if (players[uid]) {
            db.ref(`quiz_rooms/${roomCode}/players/${uid}`).update({ isDead: true });
        }
    });

    // Quản trò AI tổng hợp kết quả gửi phát thanh công khai tại Kênh Làng vào buổi sáng
    let message = "☀️ Trời sáng rồi! Mọi người thức giấc. ";
    if (deadList.length === 0) {
        message += "Đêm qua là một đêm hoàn toàn bình yên, không ai bị hại!";
    } else {
        const deadNames = deadList.map(uid => players[uid]?.name || "Ẩn danh").join(", ");
        message += `Đêm qua thần chết đã ghé thăm, nạn nhân xấu số là: 💀 ${deadNames}`;
    }

    return message;
}

// 3. QUY TẮC BAN NGÀY: TÍNH TOÁN BIỂU QUYẾT TREO CỔ HOÀNG TỬ / TRƯỞNG LÀNG
export function processDayVoteResults(roomCode, players, dayVotes) {
    if (!dayVotes) return "⚖️ Hôm nay Làng yên bình, không có ai thực hiện quyền biểu quyết Vote treo cổ.";

    const voteCounts = {}; // Khởi tạo bộ đếm phiếu biểu quyết

    Object.entries(dayVotes).forEach(([voterUid, targetUid]) => {
        // Quy tắc đặc biệt: Lá phiếu của Trưởng làng tính trị giá gấp đôi (2 phiếu)
        const voteWeight = players[voterUid]?.role === "Trưởng làng" ? 2 : 1;
        voteCounts[targetUid] = (voteCounts[targetUid] || 0) + voteWeight;
    });

    let maxVotes = 0;
    let targetHangUid = null;
    let isTie = false; // Cờ theo dõi trạng thái hòa phiếu

    for (const [target, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
            maxVotes = count;
            targetHangUid = target;
            isTie = false;
        } else if (count === maxVotes) {
            isTie = true; // Bằng phiếu bầu -> Hòa vote treo cổ
        }
    }

    // Kết luận hình phạt treo cổ
    if (targetHangUid && !isTie && maxVotes >= 1) {
        const victim = players[targetHangUid];
        
        // Quy tắc Hoàng tử: Tự động lật bài lột mặt nạ để thoát chết một lần duy nhất ban ngày
        if (victim?.role === "Hoàng tử") {
            return `Aha! 🤴 Hoàng tử ${victim.name} bị đưa lên giàn treo cổ, nhưng đã kịp thời lật bài tiết lộ thân phận hoàng gia nên được tha bổng một mạng!`;
        }

        db.ref(`quiz_rooms/${roomCode}/players/${targetHangUid}`).update({ isDead: true });
        return `⚖️ Cuộc bỏ phiếu kết thúc. Với số phiếu áp đảo (${maxVotes} phiếu), nghi phạm bị cả làng treo cổ hôm nay là: 💀 ${victim.name} (${victim.role})`;
    }

    return "⚖️ Ý kiến người dân bị phân tán hoặc số phiếu bằng nhau, hôm nay pháp trường trống rỗng, không ai bị treo cổ!";
}

// 4. KIỂM TRA ĐIỀU KIỆN KẾT THÚC THẮNG/THUA SAU MỖI LƯỢT THAY ĐỔI TRẠNG THÁI
export function checkGameOver(players) {
    const alivePlayers = Object.values(players).filter(p => !p.isDead);
    
    // Đếm số lượng thành viên còn sinh tồn của từng phe
    const wolfCount = alivePlayers.filter(p => p.role === "Ma Sói" || p.role === "Sói đầu đàn" || p.role === "Sói con").length;
    const villagerCount = alivePlayers.filter(p => p.team === "Dân Làng" || p.role === "Dân thường" || p.role === "Tiên tri" || p.role === "Bảo vệ" || p.role === "Phù thủy").length;

    // Đối chiếu điều kiện kết thúc thắng cuộc cốt lõi của game
    if (wolfCount >= villagerCount) {
        return { over: true, winner: "PHE MA SÓI CHÍN MUỒI CUỘC SĂN VÀ GIÀNH CHIẾN THẮNG 🐺!" };
    }
    if (wolfCount === 0) {
        return { over: true, winner: "PHE DÂN LÀNG ĐÃ TRUY QUÉT SẠCH SẼ BẦY SÓI 🏠!" };
    }
    
    return { over: false, winner: null };
}
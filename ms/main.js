// main.js
import { db } from './firebaseConfig.js';
import { getSavedAccount, createNewAccount } from './accountManager.js';
import { allocateRoles, processNightResults, processDayVoteResults, checkGameOver } from './gameLogic.js';
import { canUserSeeMessage, generateActionTickButton } from './chatManager.js';
import { getCommandResponse } from './gameRules.js';

// Định nghĩa vùng màn hình DOM
const screenLobby = document.getElementById('screen-lobby');
const screenBrowser = document.getElementById('screen-browser');
const screenGame = document.getElementById('screen-game');
const overlay = document.getElementById('overlay');
const sidebar = document.getElementById('sidebar');

// Các nút điều hướng sảnh phòng
const btnConfirmName = document.getElementById('btnConfirmName');
const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnVoteReset = document.getElementById('btnVoteReset');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const btnSend = document.getElementById('btnSend');

// Thông tin hiển thị trạng thái
const helloUser = document.getElementById('hello-user');
const chatTitle = document.getElementById('chat-title');
const userInfoEl = document.getElementById('user-info');
const phaseBadge = document.getElementById('phase-badge');
const msgList = document.getElementById('msg-list');
const chatInput = document.getElementById('chat-input');
const resetVoteCountLabel = document.getElementById('reset-vote-count');

let myUser = null; // Lưu tài khoản hiện tại dạng Object
let currentRoomCode = "";
let currentMode = "village"; // Các tab chat: village, wolf, ai, private
let isNight = false;
let privateTargetUid = null; // UID người đang chat riêng 1:1

// ==========================================
// 1. LUỒNG KHỞI CHẠY & KHÔI PHỤC TỰ ĐỘNG CHỐNG VĂNG GAME
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    myUser = getSavedAccount();
    
    if (myUser) {
        // Đã có tài khoản sẵn trong bộ nhớ -> Nhảy thẳng qua sảnh chọn phòng
        helloUser.textContent = myUser.fullTag;
        screenLobby.classList.add('hidden');
        screenBrowser.classList.remove('hidden');
        
        // KIỂM TRA XEM CÓ ĐANG CHƠI DỞ PHÒNG NÀO KHÔNG (Khôi phục nếu F5/Văng mạng)
        const savedRoom = localStorage.getItem("wolf_current_room");
        if (savedRoom) {
            vàoPhòngTrậnĐấu(savedRoom);
        }
    }
    quétDanhSáchPhòngRealtime();
});

// Sự kiện click xác nhận đăng nhập danh tính mới
btnConfirmName.addEventListener('click', () => {
    const nameInput = document.getElementById('userName').value.trim();
    if (!nameInput) return alert("Vui lòng nhập tên tài khoản!");
    
    myUser = createNewAccount(nameInput);
    helloUser.textContent = myUser.fullTag;
    screenLobby.classList.add('hidden');
    screenBrowser.classList.remove('hidden');
});

// Đổi tên tài khoản, xóa bộ nhớ máy quay lại từ đầu
document.getElementById('btnChangeName').addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// ==========================================
// 2. GIÁM SÁT VÀ HIỂN THỊ DANH SÁCH PHÒNG TRỰC TUYẾN
// ==========================================
function quétDanhSáchPhòngRealtime() {
    db.ref('quiz_rooms').on('value', snapshot => {
        const activeRoomsList = document.getElementById('active-rooms-list');
        activeRoomsList.innerHTML = "";
        const allRooms = snapshot.val();
        
        if (!allRooms) {
            activeRoomsList.innerHTML = `<div class="no-room-text">Chưa có phòng nào hoạt động. Hãy tạo phòng mới!</div>`;
            return;
        }
        
        Object.entries(allRooms).forEach(([roomCode, roomData]) => {
            const playersCount = roomData.players ? Object.keys(roomData.players).length : 0;
            const isStarted = roomData.gameState?.started ? "Đang chiến đấu ⚔️" : "Đang đợi người chơi ⏳";
            
            const row = document.createElement('div');
            row.className = 'room-row-item';
            row.innerHTML = `
                <div class="room-info-meta">
                    <b>🚪 Phòng: ${roomCode}</b>
                    <div>Thành viên: ${playersCount} | Trạng thái: ${isStarted}</div>
                </div>
                <button class="btn-join-fast" data-room="${roomCode}">VÀO PHÒNG</button>
            `;
            activeRoomsList.appendChild(row);
        });

        // Bắt sự kiện click nút Vào phòng nhanh không cần gõ mã
        document.querySelectorAll('.btn-join-fast').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const room = e.target.getAttribute('data-room');
                vàoPhòngTrậnĐấu(room);
            });
        });
    });
}

// Bấm nút tạo mã phòng thủ công
btnCreateRoom.addEventListener('click', () => {
    const roomCodeInput = document.getElementById('newRoomCode').value.trim().toUpperCase();
    if (!roomCodeInput) return alert("Vui lòng nhập mã phòng cần tạo!");
    vàoPhòngTrậnĐấu(roomCodeInput);
});

// ==========================================
// 3. LOGIC LIÊN KẾT PHÒNG THỜI GIAN THỰC SAU ĐĂNG NHẬP
// ==========================================
function vàoPhòngTrậnĐấu(roomCode) {
    currentRoomCode = roomCode;
    localStorage.setItem("wolf_current_room", roomCode); // Khóa vị trí phòng dở dang

    db.ref(`quiz_rooms/${roomCode}`).once('value', snapshot => {
        const data = snapshot.val();
        
        // Kiểm tra xem dữ liệu mạng tài khoản cũ đã có vai trò trong phòng chưa
        if (data && data.players && data.players[myUser.uid]) {
            myUser = data.players[myUser.uid]; // Đồng bộ lại vai trò cũ dở dang
        } else {
            // Nếu là người đầu tiên tạo phòng -> Mặc định gán cờ Admin phụ trách điều hành trận đấu
            const isFirst = (!data || !data.players) ? true : false;
            myUser.isAdmin = isFirst;
            myUser.role = "Dân thường";
            myUser.team = "Dân Làng";
            myUser.isDead = false;
        }

        // Đẩy thông tin tài khoản trực tuyến lên máy chủ đám mây
        myUser.isOnline = true;
        db.ref(`quiz_rooms/${roomCode}/players/${myUser.uid}`).set(myUser);
        
        // KÍCH HOẠT CƠ CHẾ .onDisconnect() - TỰ ĐỘNG CHUYỂN XÁM ĐÈN TÍN HIỆU KHI VĂNG MẠNG
        db.ref(`quiz_rooms/${roomCode}/players/${myUser.uid}/isOnline`).onDisconnect().set(false);

        // Chuyển màn hình giao diện tĩnh sang không gian trận đấu chính thức
        screenBrowser.classList.add('hidden');
        screenGame.classList.remove('hidden');
        
        khởiĐộngHệThốngLắngNgheRealtime();
    });
}

// ==========================================
// 4. LUỒNG ĐỒNG BỘ VÀ XỬ LÝ SỰ KIỆN TICK TRONG TRẬN ĐẤU
// ==========================================
function khởiĐộngHệThốngLắngNgheRealtime() {
    const path = `quiz_rooms/${currentRoomCode}`;
    userInfoEl.textContent = `Danh tính: ${myUser.fullTag} | Vai trò: Đang tải...`;

    // A. Lắng nghe cập nhật Ngày/Đêm ăn khớp toàn phòng
    db.ref(`${path}/gameState/isNight`).on('value', s => {
        isNight = s.val() || false;
        phaseBadge.textContent = isNight ? "🌙 ĐÊM" : "☀️ NGÀY";
        phaseBadge.style.background = isNight ? "#4a148c" : "#facc15";
        phaseBadge.style.color = isNight ? "white" : "black";
    });

    // B. Lắng nghe vai trò bí mật do máy chủ chia bài ngẫu nhiên cấp phát
    db.ref(`${path}/players/${myUser.uid}`).on('value', s => {
        if (!s.exists()) return;
        const currentData = s.val();
        myUser.role = currentData.role || "Dân thường";
        myUser.team = currentData.team || "Dân Làng";
        myUser.isDead = currentData.isDead || false;

        userInfoEl.textContent = `ID: ${myUser.fullTag} | Vai: ${myUser.role} ${myUser.isDead ? '💀 (Đã chết)' : '❤️ (Sống)'}`;
        
        // Nếu là Ma Sói, kích hoạt hiển thị Tab kênh chat Hội Đồng Sói bí mật
        if (myUser.role === "Ma Sói" || myUser.role === "Sói đầu đàn" || myUser.role === "Sói con") {
            document.getElementById('item-wolf').classList.remove('hidden');
        } else {
            document.getElementById('item-wolf').classList.add('hidden');
        }

        // Kiểm tra quyền hiển thị nút Bắt đầu trận đấu (Chỉ dành cho Admin phòng thi)
        if (myUser.isAdmin && !data?.gameState?.started) {
            document.getElementById('admin-panel').classList.remove('hidden');
        } else {
            document.getElementById('admin-panel').classList.add('hidden');
        }
    });

    // C. Lắng nghe cập nhật danh sách người chơi và render NÚT TICK HÀNH ĐỘNG
    db.ref(`${path}/players`).on('value', s => {
        const listPlayersContainer = document.getElementById('list-players');
        listPlayersContainer.innerHTML = "";
        const players = s.val();
        if (!players) return;

        // Đếm số lượng phiếu biểu quyết Reset trận dân chủ thời gian thực
        const totalPlayers = Object.keys(players).length;
        const resetVotesCount = Object.values(players).filter(p => p.resetVoted).length;
        resetVoteCountLabel.textContent = `${resetVotesCount}/${totalPlayers}`;

        // Kiểm tra tự động kết thúc trận đấu dọn phòng
        const checkWin = checkGameOver(players);
        if (checkWin.over) {
            alert(`🎉 TRẬN ĐẤU KẾT THÚC!\nKẾT QUẢ: ${checkWin.winner}`);
            db.ref(`${path}/gameState/started`).set(false);
        }

        Object.values(players).forEach(p => {
            const row = document.createElement('div');
            row.className = `player-item-row ${p.isDead ? 'is-dead' : ''}`;
            
            // Tạo chuỗi nút tick động dựa theo vai trò và luồng Ngày/Đêm hiện tại của bạn
            const tickButtonHTML = generateActionTickButton(p, myUser, isNight);

            row.innerHTML = `
                <div class="player-item-left" data-uid="${p.uid}" data-name="${p.name}">
                    <div class="avatar">${p.name[0].toUpperCase()}<div class="status ${p.isOnline ? 'online' : 'offline'}"></div></div>
                    <div style="min-width: 0;">
                        <b style="font-size:13px; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.name}</b>
                        <small style="color:var(--gold); font-size:10px">ID: ${p.tagId} ${p.isDead ? '💀 Chết' : ''}</small>
                    </div>
                </div>
                <div class="player-item-right">${tickButtonHTML}</div>
            `;
            listPlayersContainer.appendChild(row);
        });

        // Bắt sự kiện click chọn mở kênh Chat bí mật 1:1 (Người chơi - Người chơi) Kín 100%
        document.querySelectorAll('.player-item-left').forEach(zone => {
            zone.addEventListener('click', (e) => {
                const targetUid = zone.getAttribute('data-uid');
                const targetName = zone.getAttribute('data-name');
                if (targetUid === myUser.uid) return; // Không tự chat với chính mình
                
                privateTargetUid = targetUid;
                document.getElementById('private-target-name').textContent = targetName;
                document.getElementById('item-private').classList.remove('hidden');
                kíchHoạtChuyểnĐổiKênhChat('private');
            });
        });

        // BẮT SỰ KIỆN CLICK VÀO CÁC NÚT TICK ĐỂ THỰC HIỆN VOTE/CHỨC NĂNG KHÔNG CẦN GÕ CHỮ
        document.querySelectorAll('.action-tick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionType = btn.getAttribute('data-action');
                const targetUid = btn.getAttribute('data-target');

                // Xử lý đổi màu trạng thái bừng sáng của nút khi click (box-shadow)
                document.querySelectorAll('.action-tick-btn').forEach(b => b.classList.remove('tick-active', 'tick-active-vote'));
                btn.classList.add(isNight ? 'tick-active' : 'tick-active-vote');

                if (actionType === "day_vote") {
                    // Biểu quyết ban ngày của Làng treo cổ nghi phạm công khai
                    db.ref(`${path}/gameState/day_votes/${myUser.uid}`).set(targetUid);
                    pushAiSystemMessage(`Bạn đã tick chọn Vote treo cổ người chơi này.`);
                }
                else if (actionType === "wolf_bite") {
                    // Hội đồng Sói bỏ phiếu thống nhất cắn nạn nhân ban đêm
                    db.ref(`${path}/gameState/night_actions/wolf_votes/${myUser.uid}`).set(targetUid);
                    pushAiSystemMessage(`Hội đồng sói ghi nhận lượt tick cắn mục tiêu ban đêm.`);
                }
                else if (actionType === "seer_soi") {
                    // Chức năng Tiên tri soi vai trò kín gửi về tab AI mật
                    db.ref(`quiz_rooms/${currentRoomCode}/players/${targetUid}/role`).once('value', roleSnap => {
                        const targetRole = roleSnap.val() || "Dân thường";
                        pushAiSystemMessage(`🔮 Kết quả soi đêm nay: Người bạn chọn mang vai trò [ ${targetRole} ]!`);
                    });
                }
                else if (actionType === "guard_protect") {
                    // Chức năng Bảo vệ chọn lá chắn hộ vệ ban đêm
                    db.ref(`${path}/gameState/night_actions/bodyguard_protect/${myUser.uid}`).set(targetUid);
                    pushAiSystemMessage(`🛡️ Hệ thống ghi nhận: Bạn chọn bảo vệ mục tiêu này đêm nay.`);
                }
            });
        });
    });

    // D. Lắng nghe lịch sử tin nhắn đẩy về, tự động chạy bộ lọc bảo mật phân quyền Kín 100%
    db.ref(`${path}/messages`).on('child_added', snapshot => {
        const msgData = snapshot.val();
        if (!msgData) return;

        // Bộ lọc phân quyền bảo mật chỉ cho phép người nhận và người gửi nhìn thấy
        const canSee = canUserSeeMessage(msgData, myUser);
        if (!canSee) return;

        // Nếu tin nhắn thuộc kênh hiện tại đang chọn, render vẽ ra màn hình
        if (msgData.mode === currentMode || msgData.mode === "ai") {
            const div = document.createElement('div');
            div.className = `msg ${msgData.uid === 'ai-bot' ? 'ai' : (msgData.uid === myUser.uid ? 'sent' : 'received')}`;
            div.innerHTML = `<b>${msgData.sender}:</b> ${msgData.text}`;
            msgList.appendChild(div);
            msgList.scrollTop = msgList.scrollHeight; // Cuộn tự động tin nhắn mới xuống đáy
        }
    });
}

// Bắt sự kiện click nút Bắt đầu trận đấu của Admin phòng học
document.getElementById('btnStartGame').addEventListener('click', () => {
    db.ref(`quiz_rooms/${currentRoomCode}/players`).once('value', snapshot => {
        const playersObj = snapshot.val();
        if (!playersObj || Object.keys(playersObj).length < 6) {
            return alert("Cần tối thiểu 6 người chơi để tự động phân vai trò theo quy tắc!");
        }
        allocateRoles(currentRoomCode, playersObj);
    });
});

// ==========================================
// 5. QUẢN LÝ ĐIỀU HƯỚNG CHUYỂN KÊNH CHAT RIÊNG BIỆT
// ==========================================
function kíchHoạtChuyểnĐổiKênhChat(mode) {
    currentMode = mode;
    document.querySelectorAll('.chat-item').forEach(e => e.classList.remove('active'));
    msgList.innerHTML = ""; // Dọn sạch màn hình chat để nạp lịch sử kênh mới riêng biệt hoàn toàn

    if (mode === 'village') {
        document.getElementById('item-village').classList.add('active');
        chatTitle.textContent = "🏠 Làng Ma Sói (Công khai)";
    } else if (mode === 'wolf') {
        document.getElementById('item-wolf').classList.add('active');
        chatTitle.textContent = "🐺 Hội Đồng Sói (Mật phe)";
    } else if (mode === 'ai') {
        document.getElementById('item-ai').classList.add('active');
        chatTitle.textContent = "🤖 Quản Trò AI (Bảo mật cá nhân)";
    } else if (mode === 'private') {
        document.getElementById('item-private').classList.add('active');
        chatTitle.textContent = `✉️ Chat riêng tư 1:1`;
    }

    // Kéo lại lịch sử tin nhắn đã lọc bảo mật của riêng kênh này từ Firebase đổ xuống màn hình
    db.ref(`quiz_rooms/${currentRoomCode}/messages`).once('value', snapshot => {
        if (!snapshot.exists()) return;
        Object.values(snapshot.val()).forEach(msg => {
            if (!canUserSeeMessage(msg, myUser)) return;
            if (msg.mode === currentMode) {
                const div = document.createElement('div');
                div.className = `msg ${msg.uid === 'ai-bot' ? 'ai' : (msg.uid === myUser.uid ? 'sent' : 'received')}`;
                div.innerHTML = `<b>${msg.sender}:</b> ${msg.text}`;
                msgList.appendChild(div);
            }
        });
        msgList.scrollTop = msgList.scrollHeight;
    });
}

// Gắn sự kiện click đổi tab chat trên thanh sidebar bên trái
document.getElementById('item-village').addEventListener('click', () => kíchHoạtChuyểnĐổiKênhChat('village'));
document.getElementById('item-wolf').addEventListener('click', () => kíchHoạtChuyểnĐổiKênhChat('wolf'));
document.getElementById('item-ai').addEventListener('click', () => kíchHoạtChuyểnĐổiKênhChat('ai'));
document.getElementById('item-private').addEventListener('click', () => kíchHoạtChuyểnĐổiKênhChat('private'));

// Nút bấm bỏ phiếu biểu quyết yêu cầu Reset trận đấu dân chủ
btnVoteReset.addEventListener('click', () => {
    myUser.resetVoted = !myUser.resetVoted; // Đảo ngược trạng thái tick chọn đồng ý
    db.ref(`quiz_rooms/${currentRoomCode}/players/${myUser.uid}/resetVoted`).set(myUser.resetVoted);
});

// ==========================================
// 6. LUỒNG GỬI TIN NHẮN CHAT VÀ XỬ LÝ LỆNH ẨN QUẢN TRÒ AI
// ==========================================
function thựcHiệnGửiTinNhắn() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";

    // LỆNH ẨN / LỆNH TỐI CAO: Xử lý xóa database thời gian thực kín đáo tại kênh AI
    if (text === "/xoafirebase" && currentMode === "ai") {
        if (confirm("Hành động tối cao! Bạn có chắc chắn muốn xóa sạch dữ liệu phòng đấu này trên Firebase đám mây?")) {
            db.ref(`quiz_rooms/${currentRoomCode}`).remove().then(() => {
                localStorage.clear();
                location.reload(); // Tải lại trang F5 cho toàn làng giải phóng bộ nhớ
            });
        }
        return;
    }

    // Xử lý chặn tin nhắn lệnh hệ thống người chơi bắt đầu bằng dấu gạch chéo /
    if (text.startsWith('/')) {
        if (currentMode !== "ai") {
            alert("Các lệnh tra cứu hệ thống bắt buộc phải gửi riêng trong kênh chat [🤖 Quản Trò AI]!");
            return;
        }
        // Gửi lệnh lên kênh AI
        db.ref(`quiz_rooms/${currentRoomCode}/messages`).push({
            uid: myUser.uid,
            sender: myUser.name,
            text: text,
            mode: "ai"
        });
        
        // Quản trò AI giải mã lệnh và gửi phản hồi mật hiệu bảo mật riêng cho bạn
        const cmdReply = getCommandResponse(text);
        if (cmdReply) {
            pushAiSystemMessage(cmdReply);
        } else {
            pushAiSystemMessage("🤖 Quản trò thông báo: Câu lệnh hệ thống không hợp lệ hoặc sai cú pháp!");
        }
        return;
    }

    // LUỒNG TIN NHẮN THƯỜNG: Đẩy dữ liệu đồng bộ phân quyền lên Firebase
    const msgPayload = {
        uid: myUser.uid,
        sender: myUser.name,
        text: text,
        mode: currentMode
    };

    if (currentMode === "private") {
        msgPayload.targetUid = privateTargetUid; // Gán khóa chặn ID đích danh để bảo mật chat 1:1
    }

    db.ref(`quiz_rooms/${currentRoomCode}/messages`).push(msgPayload);
}

// Đóng gói hàm đẩy tin nhắn tự động từ Quản trò AI
function pushAiSystemMessage(contentText) {
    db.ref(`quiz_rooms/${currentRoomCode}/messages`).push({
        uid: 'ai-bot',
        targetUid: myUser.uid, // Phân quyền kín chỉ máy bạn nhận được
        sender: "🤖 Quản Trò AI",
        text: contentText,
        mode: "ai"
    });
}

// Bắt sự kiện nhấn phím Enter để gửi tin nhanh trên điện thoại và PC
btnSend.addEventListener('click', thựcHiệnGửiTinNhắn);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') thựcHiệnGửiTinNhắn();
});

// Điều khiển đóng mở menu trượt Drawer thích ứng linh hoạt điện thoại di động
menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.remove('hidden');
});
overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.add('hidden');
});
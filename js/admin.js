        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const manualFirebaseConfig = {
            apiKey: "AIzaSyAciknEYhZU7AwOdfYytC1t_AnW2Ee11us",
            authDomain: "faifah-ttb.firebaseapp.com",
            projectId: "faifah-ttb",
            storageBucket: "faifah-ttb.appspot.com",
            messagingSenderId: "842980876200",
            appId: "1:842980876200:web:f33bfad2ccbf263075079d"
        };

        const config = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : manualFirebaseConfig;
        const app = initializeApp(config);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // ฟังก์ชันช่วยเตรียมโครงสร้างพาธเชื่อมต่อ Firebase สำหรับ sandbox/production
        const getPath = (colName) => {
            const sandboxId = typeof __app_id !== 'undefined' ? __app_id : null;
            if (sandboxId) return `artifacts/${sandboxId}/public/data/${colName}`;
            return colName;
        };

        // TikTok Player เริ่มเล่นแบบปิดเสียงตามนโยบาย autoplay ของเบราว์เซอร์
        // เมื่อ player ส่ง event ว่าพร้อมแล้ว ให้สั่งเปิดเสียงกลับผ่าน postMessage
        window.addEventListener('message', (event) => {
            if (event.origin !== 'https://www.tiktok.com') return;
            const data = event.data;
            if (data && data['x-tiktok-player'] && data.type === 'onPlayerReady' && event.source) {
                event.source.postMessage({ type: 'unMute', 'x-tiktok-player': true }, event.origin);
            }
        });

        // ฟังก์ชันแสดง Toast Notification แทนการใช้ alert ดั้งเดิมตามนโยบาย UI คุณภาพสูง
        const showToast = (message, type = 'success') => {
            const toast = document.createElement('div');
            toast.className = `fixed bottom-5 right-5 p-4 rounded-xl z-[999] shadow-lg text-[13px] font-bold fade-in ${type === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'
                }`;
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        };

        // --- GLOBAL MEMORY STATES ---
        let tiktokMembers = [];
        let tiktokPositions = [];
        let tiktokBranches = [];
        let tiktokPosts = []; // TikTok Posts Collection Array
        let tiktokLogs = []; // TikTok Log Collection Array
        let tiktokLinks = []; // TikTok Links Collection Array
        let tiktokLicenses = []; // TikTok License Collection Array
        let tiktokDeletedPosts = []; // TikTok Deleted Posts Collection Array
        let deleteCurrentPage = 1;
        let deleteItemsPerPage = 30;

        let tiktokNews = [];
        let newsCurrentPage = 1;
        let newsItemsPerPage = 10;

        // Tiktok License Table Configuration
        let licenseSortColumn = 'employeeId';
        let licenseSortDirection = 'asc';
        let licenseCurrentPage = 1;
        let licenseItemsPerPage = 10;
        let licenseSearchQuery = '';

        // Tiktok Link Table Configuration
        let linkSortColumn = 'employeeId';
        let linkSortDirection = 'asc';
        let linkCurrentPage = 1;
        let linkItemsPerPage = 10;
        let linkSearchQuery = '';

        // Tiktok Member Table Configuration
        let sortColumn = 'employeeId';
        let sortDirection = 'asc';
        let currentPage = 1;
        let itemsPerPage = 30; // แสดงผล 30 รายการต่อหน้า
        let memberStatusFilter = 'New Registration'; // กำหนดค่า Default ไปที่ "รออนุมัติ" ตามข้อกำหนด

        // Branch Table Configuration
        let branchSortColumn = 'empBranch';
        let branchSortDirection = 'asc';
        let branchCurrentPage = 1;
        let branchItemsPerPage = 30; // แสดงผล 30 รายการต่อหน้าเป็นค่าดีฟอลต์

        // Tiktok Post Table Configuration
        let postsActiveTab = 'new'; // 'new' หรือ 'approved'
        let postsSortColumn = 'createdAt';
        let postsSortDirection = 'desc';
        let postsCurrentPage = 1;
        let postsItemsPerPage = 30; // แสดงผล 30 รายการต่อหน้าตามข้อกำหนด

        // Reset Password Table Configuration
        let resetSortColumn = 'employeeId';
        let resetSortDirection = 'asc';
        let resetCurrentPage = 1;
        let resetItemsPerPage = 30; // กำหนดค่า default การแสดงผล 30 รายการต่อหน้า

        // ตัวแปรเก็บสถานะการเลือกดูพรีวิววิดีโอ TikTok ปัจจุบัน
        window.currentPreviewPostId = null;

        // เริ่มต้นการซิงค์ข้อมูลแบบ Real-time (ตามกฎข้อที่ 1 และ 3)
        const startSync = () => {
            const user = auth.currentUser;
            if (!user) return;
            // 1. ซิงค์ Tiktok_Member
            onSnapshot(collection(db, getPath('Tiktok_Member')), (snap) => {
                tiktokMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // บังคับเตรียมสไตล์และการใช้งานตัวกรองกลุ่มพนักงานเมื่อโหลดเสร็จสิ้น
                window.setMemberFilter(memberStatusFilter);
                window.renderResetPasswordTable();
                updateReportSection();
                populateReportFilters();
                if (typeof window.populateUsageFilters === 'function') window.populateUsageFilters();
                if (typeof window.updateUsageCharts === 'function') window.updateUsageCharts();
                if (typeof updateLearningSection === 'function') updateLearningSection();
                if (typeof window.renderTiktokLinks === 'function') window.renderTiktokLinks();
            }, (err) => console.error("Member sync error:", err));

            // 2. ซิงค์ Tiktok_Position
            onSnapshot(collection(db, getPath('Tiktok_Position')), (snap) => {
                tiktokPositions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderTiktokPositions();
            }, (err) => console.error("Position sync error:", err));

            // 3. ซิงค์ Tiktok_Branch
            onSnapshot(collection(db, getPath('Tiktok_Branch')), (snap) => {
                tiktokBranches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                populateBranchFilters();
                renderTiktokBranches();
                populateReportFilters();
                updateReportSection();
                if (typeof window.populateUsageFilters === 'function') window.populateUsageFilters();
                if (typeof window.updateUsageCharts === 'function') window.updateUsageCharts();
                if (typeof populateLearningFilters === 'function') populateLearningFilters();
                if (typeof updateLearningSection === 'function') updateLearningSection();
            }, (err) => console.error("Branch sync error:", err));            // 4. ซิงค์ Tiktok_Post
            onSnapshot(collection(db, getPath('Tiktok_Post')), (snap) => {
                tiktokPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderTiktokPosts();
                updateReportSection();
                if (typeof window.updateUsageCharts === 'function') window.updateUsageCharts();
            }, (err) => console.error("Post sync error:", err));

            // 5. ซิงค์ Tiktok_log
            onSnapshot(collection(db, getPath('Tiktok_log')), (snap) => {
                tiktokLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (typeof window.updateUsageCharts === 'function') window.updateUsageCharts();
            }, (err) => console.error("Log sync error:", err));

            // 6. ซิงค์ Tiktok_Link
            onSnapshot(collection(db, getPath('Tiktok_Link')), (snap) => {
                tiktokLinks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (typeof window.renderTiktokLinks === 'function') window.renderTiktokLinks();
            }, (err) => console.error("Link sync error:", err));

            // 7. ซิงค์ Tiktok_License
            onSnapshot(collection(db, getPath('Tiktok_License')), (snap) => {
                tiktokLicenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (typeof window.renderTiktokLicenses === 'function') window.renderTiktokLicenses();
            }, (err) => console.error("License sync error:", err));

            // 8. ซิงค์ Tiktok_Delete
            onSnapshot(collection(db, getPath('Tiktok_Delete')), (snap) => {
                tiktokDeletedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (typeof window.renderTiktokDeletedPosts === 'function') window.renderTiktokDeletedPosts();
            }, (err) => console.error("Tiktok_Delete sync error:", err));

            // 9. ซิงค์ Tiktok_News
            onSnapshot(collection(db, getPath('Tiktok_News')), (snap) => {
                tiktokNews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (typeof window.renderTiktokNews === 'function') window.renderTiktokNews();
            }, (err) => console.error("News sync error:", err));
        };

        // --- FILTER FUNCTION: TIKTOK MEMBERS ---
        // ฟังก์ชันกำหนดตัวกรองสมาชิกและไฮไลต์ปุ่มควบคุมการเลือกอย่างชาญฉลาด
        window.setMemberFilter = (val) => {
            memberStatusFilter = val;

            const btnAll = document.getElementById('btn-filter-all');
            const btnPending = document.getElementById('btn-filter-pending');
            const btnApproved = document.getElementById('btn-filter-approved');

            if (btnAll && btnPending && btnApproved) {
                // เคลียร์คลาสสีดั้งเดิม
                [btnAll, btnPending, btnApproved].forEach(btn => {
                    btn.className = "px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all text-stone-600 hover:text-stone-850";
                });

                // ไฮไลต์ปุ่มที่กำลังทำงานอยู่
                if (val === 'all') {
                    btnAll.className = "px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all bg-[#0056ff] text-white shadow-sm hover:text-white";
                } else if (val === 'New Registration') {
                    btnPending.className = "px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all bg-[#0056ff] text-white shadow-sm hover:text-white";
                } else if (val === 'Registration') {
                    btnApproved.className = "px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all bg-[#0056ff] text-white shadow-sm hover:text-white";
                }
            }

            currentPage = 1;
            renderTiktokMembers();
        };

        // --- RENDER FUNCTION: TIKTOK MEMBERS ---
        window.renderTiktokMembers = () => {
            const tbody = document.getElementById('tiktok-table-body');
            if (!tbody) return;

            const searchQuery = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
            const statusFilter = memberStatusFilter; // ดึงค่าจากปุ่มตัวกรองที่เลือกไว้ล่าสุด

            // Filter
            let filtered = tiktokMembers.filter(m => {
                const matchesSearch = (m.name || '').toLowerCase().includes(searchQuery) ||
                    (m.employeeId || '').toLowerCase().includes(searchQuery) ||
                    (m.tiktokUser || '').toLowerCase().includes(searchQuery) ||
                    (m.tiktokUrl || '').toLowerCase().includes(searchQuery) ||
                    (m.empBranch || '').toLowerCase().includes(searchQuery) ||
                    (m.empPosition || '').toLowerCase().includes(searchQuery);
                const matchesStatus = statusFilter === 'all' || m.MemberStatus === statusFilter;
                return matchesSearch && matchesStatus;
            });

            // Sort
            filtered.sort((a, b) => {
                let valA = a[sortColumn];
                let valB = b[sortColumn];
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return sortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            });

            // Pagination
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
            if (currentPage > totalPages) currentPage = totalPages;

            const startIdx = (currentPage - 1) * itemsPerPage;
            const endIdx = Math.min(startIdx + itemsPerPage, total);
            const pageItems = filtered.slice(startIdx, endIdx);

            const infoText = document.getElementById('tiktok-pagination-info');
            if (infoText) {
                infoText.innerText = total === 0 ? "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ" : `แสดง ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${total} รายการ`;
            }
            const pageNumText = document.getElementById('tiktok-page-number');
            if (pageNumText) pageNumText.innerText = `หน้า ${currentPage} / ${totalPages}`;

            const prevBtn = document.getElementById('btn-page-prev');
            const nextBtn = document.getElementById('btn-page-next');
            if (prevBtn) prevBtn.disabled = (currentPage === 1);
            if (nextBtn) nextBtn.disabled = (currentPage === totalPages);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบข้อมูลสมาชิก TikTok ที่ตรงกับสถานะที่เลือก</td></tr>`;
                return;
            }

            tbody.innerHTML = pageItems.map(item => {
                // ดึงรูปถ่ายฟิลด์ PictureMember หรือ profileImage ตามภาพถ่ายจริง
                const imgUrl = item.profileImage || item.PictureMember || `https://placehold.co/100x100/e2e8f0/475569?text=${encodeURIComponent(item.name ? item.name.charAt(0) : 'T')}`;

                let statusBadge = "";
                if (item.MemberStatus === 'Registration') {
                    statusBadge = '<span class="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-[12px] font-bold inline-block text-center w-full max-w-[100px]">อนุมัติ</span>';
                } else {
                    statusBadge = '<span class="bg-red-100 text-red-800 border border-red-200 px-3 py-1.5 rounded-full text-[12px] font-bold inline-block text-center w-full max-w-[100px]">รออนุมัติ</span>';
                }

                // สลับปุ่มการอนุมัติและปุ่มยกเลิกการอนุมัติได้ด้วยตามเงื่อนไขอย่างชาญฉลาด (เรียกใช้ผ่านขอบเขต window เพื่อความเสถียร 100%)
                let approveButton = "";
                if (item.MemberStatus === "New Registration") {
                    approveButton = `
                        <button onclick="window.approveTiktokMember('${item.id}', '${item.name}')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg animate-pulse" title="อนุมัติการสมัคร">
                            <i data-lucide="check" class="w-4 h-4"></i>
                        </button>
                    `;
                } else if (item.MemberStatus === "Registration") {
                    approveButton = `
                        <button onclick="window.unapproveTiktokMember('${item.id}', '${item.name}')" class="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg animate-pulse" title="ยกเลิกการอนุมัติ">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    `;
                }

                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <td class="text-center py-3">
                        <!-- Direct hover upload container -->
                        <div class="relative w-11 h-10 rounded-full overflow-hidden mx-auto border border-stone-200 shadow-sm cursor-pointer group" onclick="window.triggerProfileDirectUpload('${item.id}')">
                            <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://placehold.co/100x100/cbd5e1/475569?text=Error';" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <i data-lucide="camera" class="w-4 h-4 text-white"></i>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 pl-4 text-left">
                        <div class="font-bold text-stone-850 text-[13.5px]">${item.employeeId || '-'}</div>
                        <div class="text-[12.5px] text-stone-500 font-semibold mt-0.5">${item.name || '-'}</div>
                    </td>
                    <td class="py-3 pl-4 text-left">
                        <div class="font-bold text-stone-700 text-[13px]">${item.empPosition || '-'}</div>
                        <div class="text-[12px] text-stone-400 font-medium mt-0.5">${item.empBranch || '-'}</div>
                    </td>
                    <td class="py-3 pl-4 text-left">
                        <div class="font-bold text-rose-500 text-[13px]">${item.tiktokUser || '-'}</div>
                        <div class="text-[12px] text-stone-400 font-medium truncate max-w-[140px] mt-0.5" title="${item.tiktokUrl || ''}">${item.tiktokUrl || '-'}</div>
                    </td>
                    <td class="text-center py-3 text-[13px]">
                        ${statusBadge}
                    </td>
                    <td class="text-center py-3">
                        <div class="flex justify-center gap-1.5">
                            ${approveButton}
                            <button onclick="window.openTiktokMemberModal('${item.id}')" class="p-1.5 text-blue-500 hover:bg-blue-50 border border-blue-200 rounded-lg" title="แก้ไขข้อมูล">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.openDeleteModal('${item.id}', '${item.name || item.employeeId}', 'member')" class="p-1.5 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg" title="ลบข้อมูล">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');

            lucide.createIcons();
            updateTiktokSortIcons();
        };

        // Profile Direct Image Upload with canvas compression (200px x 200px)
        window.triggerProfileDirectUpload = (memberId) => {
            const input = document.getElementById('member-photo-direct-upload');
            if (!input) return;
            input.value = '';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = async () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 200;
                        canvas.height = 200;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, 200, 200);

                        const base64Data = canvas.toDataURL('image/jpeg', 0.85);

                        try {
                            const docRef = doc(db, getPath('Tiktok_Member'), memberId);
                            await updateDoc(docRef, {
                                profileImage: base64Data,
                                updatedAt: serverTimestamp()
                            });
                            showToast("อัปเดตและย่อขนาดรูปถ่ายสำเร็จแล้ว (200x200px)!", "success");
                        } catch (err) {
                            console.error(err);
                            showToast("ไม่สามารถอัปโหลดและปรับขนาดรูปภาพได้", "error");
                        }
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            };
            input.click();
        };

        window.approveTiktokMember = async (id, name) => {
            try {
                const docRef = doc(db, getPath('Tiktok_Member'), id);
                await updateDoc(docRef, {
                    MemberStatus: "Registration",
                    updatedAt: serverTimestamp()
                });
                showToast(`อนุมัติผู้ใช้งาน "${name}" เรียบร้อยแล้ว`, "success");

                // ดึงอีเมลผู้รับเพื่อเปิดใน Email Client (mailto:)
                const member = tiktokMembers.find(m => m.id === id);
                if (member && member.employeeId) {
                    const employeeId = member.employeeId.trim();
                    const to = `${employeeId}@ttbbank.com`;
                    const subject = encodeURIComponent("ยินดีต้อนรับสู่ Branch Tiktok, The IDOL");

                    const htmlBody = `<div style="background-color: #0056ff; padding: 24px; border-radius: 16px; color: #ffffff; font-family: 'Kanit', 'Helvetica Neue', Helvetica, Arial, sans-serif; margin-bottom: 20px; max-width: 600px;">
    <h2 style="font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 16px; color: #ffffff; line-height: 1.4;">ยินดีต้อนรับสู่แคมเปญ Branch Tiktok, The IDOL</h2>
    <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #ffffff;">
        ร่วมสร้างสรรค์คลิปวิดีโอผ่านช่องทาง <span style="color: #f68b1f; text-decoration: underline; font-weight: bold;">TikTok</span> เพื่อแนะนำตัวตน แนะนำสาขา ให้ความรู้ทางการเงิน เตือนภัยมิจฉาชีพ หรือแนะนำผลิตภัณฑ์ ttb ช่วยสร้างความเชื่อมั่นให้ลูกค้ารู้ว่า <span style="color: #f68b1f; font-weight: bold;">“เรามีตัวตนจริง อยู่ใกล้คุณ และพร้อมให้บริการจริง”</span> โดยมุ่งเน้นที่การสร้างตัวตน
    </p>
</div>
<div style="font-family: 'Kanit', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; color: #333333; line-height: 1.6; max-width: 600px;">
    <p style="font-weight: bold; font-size: 16px; margin-bottom: 12px; color: #0056ff;">คุณสามารถเข้าใช้ระบบงานได้แล้ว</p>
    <p style="font-weight: bold; margin-bottom: 8px;">วิธีการสร้าง icon บนมือถือของคุณ</p>
    <div style="margin-top: 10px;">
        <img src="https://firebasestorage.googleapis.com/v0/b/faifah-ttb.appspot.com/o/Tiktok%2Fhowto.png?alt=media&token=32a6dc28-bdcc-455e-8df1-7a1aeae57e30&v=2" alt="วิธีการสร้าง icon บนมือถือ" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; display: block;" />
    </div>
</div>`;

                    const plainTextBody = `ยินดีต้อนรับสู่แคมเปญ Branch Tiktok, The IDOL\n\nร่วมสร้างสรรค์คลิปวิดีโอผ่านช่องทาง TikTok เพื่อแนะนำตัวตน แนะนำสาขา ให้ความรู้ทางการเงิน เตือนภัยมิจฉาชีพ หรือแนะนำผลิตภัณฑ์ ttb ช่วยสร้างความเชื่อมั่นให้ลูกค้ารู้ว่า “เรามีตัวตนจริง อยู่ใกล้คุณ และพร้อมให้บริการจริง” โดยมุ่งเน้นที่การสร้างตัวตน\n\nคุณสามารถเข้าใช้ระบบงานได้แล้ว\n\nวิธีการสร้าง icon บนมือถือของคุณ:\nhttps://firebasestorage.googleapis.com/v0/b/faifah-ttb.appspot.com/o/Tiktok%2Fhowto.png?alt=media&token=32a6dc28-bdcc-455e-8df1-7a1aeae57e30&v=2`;

                    // คัดลอก rich HTML ไปยัง Clipboard เพื่อให้สามารถวางใน Outlook หรือโปรแกรมเมลอื่นได้โดยตรง
                    try {
                        const htmlBlob = new Blob([htmlBody], { type: 'text/html' });
                        const textBlob = new Blob([plainTextBody], { type: 'text/plain' });
                        const data = [new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })];
                        navigator.clipboard.write(data).then(() => {
                            showToast(`คัดลอกรูปแบบอีเมล (พร้อมรูปภาพ) ลง Clipboard เรียบร้อยแล้ว!`, "success");
                        }).catch(err => {
                            console.error("Clipboard copy failed:", err);
                        });
                    } catch (clipErr) {
                        console.error("Clipboard API not supported or failed:", clipErr);
                    }

                    // เปิดโปรแกรมจดหมาย โดยให้แอดมินกด Ctrl+V เพื่อวางเนื้อหา
                    const instructions = encodeURIComponent("[ กด Ctrl + V หรือคลิกขวาแล้วกดวาง (Paste) เพื่อใส่เนื้อหาจดหมายรูปแบบการ์ดและรูปภาพสวยงามลงที่นี่ ]");
                    window.location.href = `mailto:${to}?subject=${subject}&body=${instructions}`;
                    showToast(`เปิดหน้าต่างอีเมลไปที่ ${to} สำเร็จแล้ว!`, "success");
                }
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถอัปเดตสถานะการอนุมัติได้", "error");
            }
        };

        // ฟังก์ชันยกเลิกการอนุมัติ สลับกลับมาเป็น New Registration
        window.unapproveTiktokMember = async (id, name) => {
            try {
                const docRef = doc(db, getPath('Tiktok_Member'), id);
                await updateDoc(docRef, {
                    MemberStatus: "New Registration",
                    updatedAt: serverTimestamp()
                });
                showToast(`ยกเลิกการอนุมัติผู้ใช้งาน "${name}" เรียบร้อยแล้ว`, "success");
            } catch (err) {
                console.error("Unapprove Tiktok Member Error:", err);
                showToast("ไม่สามารถยกเลิกการอนุมัติผู้ใช้งานรายนี้ได้", "error");
            }
        };

        window.changeTiktokPage = (direction) => {
            currentPage += direction;
            renderTiktokMembers();
        };

        window.toggleTiktokSort = (col) => {
            if (sortColumn === col) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = col;
                sortDirection = 'asc';
            }
            renderTiktokMembers();
        };

        const updateTiktokSortIcons = () => {
            const cols = ['employeeId', 'empPosition', 'tiktokUser', 'MemberStatus'];
            cols.forEach(col => {
                const el = document.getElementById(`sort-icon-${col}`);
                if (!el) return;

                if (sortColumn === col) {
                    el.innerHTML = sortDirection === 'asc'
                        ? `<i data-lucide="arrow-up" class="w-3.5 h-3.5 text-blue-600 inline"></i>`
                        : `<i data-lucide="arrow-down" class="w-3.5 h-3.5 text-blue-600 inline"></i>`;
                } else {
                    el.innerHTML = `<i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-stone-400 opacity-60 inline"></i>`;
                }
            });
            lucide.createIcons();
        };

        // --- POSITION SYSTEM FUNCTIONS (30% Box) ---
        window.renderTiktokPositions = () => {
            const tbody = document.getElementById('position-table-body');
            if (!tbody) return;

            if (tiktokPositions.length === 0) {
                tbody.innerHTML = `<tr><td colspan="2" class="text-center py-10 text-stone-400 italic text-[12px]">ไม่มีข้อมูลตำแหน่งงาน</td></tr>`;
                return;
            }

            tbody.innerHTML = tiktokPositions.map(pos => {
                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <!-- อ้างอิงข้อมูลตำแหน่งงานผ่านฟิลด์ empPosition -->
                    <td class="py-3 pl-4 font-semibold text-stone-700 text-[13px] text-left">${pos.empPosition || '-'}</td>
                    <td class="text-center py-3">
                        <div class="flex justify-center gap-1.5">
                            <button onclick="window.openTiktokPositionModal('${pos.id}')" class="p-1.5 text-blue-500 hover:bg-blue-50 border border-blue-200 rounded-lg">
                                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="window.openDeleteModal('${pos.id}', '${pos.empPosition}', 'position')" class="p-1.5 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
            lucide.createIcons();
        };

        window.openTiktokPositionModal = (id = null) => {
            const modal = document.getElementById('position-modal');
            const title = document.getElementById('position-modal-title');
            const form = document.getElementById('position-form');
            form.reset();

            if (id) {
                const pos = tiktokPositions.find(p => p.id === id);
                if (pos) {
                    title.innerText = "แก้ไขข้อมูลตำแหน่งงาน";
                    document.getElementById('position-edit-id').value = id;
                    // อ้างอิงข้อมูลผ่านฟิลด์ empPosition
                    document.getElementById('form-posName').value = pos.empPosition || '';
                }
            } else {
                title.innerText = "เพิ่มตำแหน่งงานใหม่";
                document.getElementById('position-edit-id').value = '';
            }
            modal.classList.remove('hidden');
        };

        window.closeTiktokPositionModal = () => {
            document.getElementById('position-modal').classList.add('hidden');
        };

        window.handlePositionSubmit = async (e) => {
            e.preventDefault();
            const editId = document.getElementById('position-edit-id').value;

            // ป้องกันการบันทึกซ้ำโดยการปิดปุ่ม
            const submitBtn = document.getElementById('btn-submit-position');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></span>กำลังบันทึก...';
            }

            // บันทึกฟิลด์ empPosition แทน positionName ตามฐานข้อมูล Tiktok_Position จริง
            const data = {
                empPosition: document.getElementById('form-posName').value.trim(),
                updatedAt: serverTimestamp()
            };

            try {
                if (editId) {
                    await updateDoc(doc(db, getPath('Tiktok_Position'), editId), data);
                    showToast("อัปเดตข้อมูลตำแหน่งงานเรียบร้อยแล้ว", "success");
                } else {
                    await addDoc(collection(db, getPath('Tiktok_Position')), {
                        ...data,
                        createdAt: serverTimestamp()
                    });
                    showToast("เพิ่มตำแหน่งงานใหม่เรียบร้อยแล้ว", "success");
                }
                closeTiktokPositionModal();
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถบันทึกข้อมูลตำแหน่งงานได้", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "บันทึก";
                }
            }
        };

        // --- BRANCH SYSTEM FUNCTIONS (70% Box) ---
        // ฟังก์ชันในการสร้างและคัดสรรตัวกรอง Size, RH, Zone ให้ทำงานเชื่อมโยงสัมพันธ์กันอย่างถูกต้องและยืดหยุ่น
        // แก้ไขให้ไม่แสดงผลรายการที่ไม่เข้าเงื่อนไขการค้นหาเลยแทนการ Disabled ตัวเลือก
        const populateBranchFilters = () => {
            const sizeSelect = document.getElementById('branch-filter-size');
            const rhSelect = document.getElementById('branch-filter-rh');
            const zoneSelect = document.getElementById('branch-filter-zone');
            if (!sizeSelect || !rhSelect || !zoneSelect) return;

            const selectedSize = sizeSelect.value || 'all';
            const selectedRh = rhSelect.value || 'all';
            const selectedZone = zoneSelect.value || 'all';

            // ดึงข้อมูลตัวคัดกรองที่มีสาขาสัมพันธ์กันจริงๆ มาแสดงผลโดยตรง (Capped Dropdowns)
            // คัดออก (ไม่แสดงผล) หากไม่เข้าเงื่อนไขการเลือกปัจจุบันเลยตามข้อกำหนด
            const validSizes = [...new Set(tiktokBranches
                .filter(b => (selectedRh === 'all' || b.empRH === selectedRh) && (selectedZone === 'all' || b.empZone === selectedZone))
                .map(b => b.empSize).filter(Boolean))].sort();

            const validRHs = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedZone === 'all' || b.empZone === selectedZone))
                .map(b => b.empRH).filter(Boolean))].sort();

            const validZones = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedRh === 'all' || b.empRH === selectedRh))
                .map(b => b.empZone).filter(Boolean))].sort();

            const updateSelectOptions = (selectEl, validOptions, currentValue, placeholder) => {
                let html = `<option value="all">${placeholder}</option>`;
                validOptions.forEach(opt => {
                    const selected = opt === currentValue ? 'selected' : '';
                    html += `<option value="${opt}" ${selected}>${opt}</option>`;
                });
                selectEl.innerHTML = html;
            };

            updateSelectOptions(sizeSelect, validSizes, selectedSize, "ทั้งหมด (Size)");
            updateSelectOptions(rhSelect, validRHs, selectedRh, "ทั้งหมด (RH)");
            updateSelectOptions(zoneSelect, validZones, selectedZone, "ทั้งหมด (Zone)");
        };

        // เรียกใช้ฟังก์ชันประมวลผลตัวกรองสาขาเมื่อมีการปรับเปลี่ยนค่า
        window.onBranchFilterChange = () => {
            const sizeSelect = document.getElementById('branch-filter-size');
            const rhSelect = document.getElementById('branch-filter-rh');
            const zoneSelect = document.getElementById('branch-filter-zone');

            let selectedSize = sizeSelect.value;
            let selectedRh = rhSelect.value;
            let selectedZone = zoneSelect.value;

            populateBranchFilters();

            // ล้างค่าปัจจุบันทันทีหากเงื่อนไขการผสมอื่นคัดตัวเลือกเดิมออกไปเรียบร้อยแล้ว เพื่อเลี่ยงข้อมูลค้าง (Interlocking cascade lock)
            if (!Array.from(sizeSelect.options).map(o => o.value).includes(selectedSize)) {
                sizeSelect.value = 'all';
            }
            if (!Array.from(rhSelect.options).map(o => o.value).includes(selectedRh)) {
                rhSelect.value = 'all';
            }
            if (!Array.from(zoneSelect.options).map(o => o.value).includes(selectedZone)) {
                zoneSelect.value = 'all';
            }

            populateBranchFilters();
            branchCurrentPage = 1;
            renderTiktokBranches();
        };

        window.renderTiktokBranches = () => {
            const tbody = document.getElementById('branch-table-body');
            if (!tbody) return;

            const filterSize = document.getElementById('branch-filter-size')?.value || 'all';
            const filterRH = document.getElementById('branch-filter-rh')?.value || 'all';
            const filterZone = document.getElementById('branch-filter-zone')?.value || 'all';
            const branchSearchQuery = document.getElementById('branch-search-input')?.value.toLowerCase().trim() || '';

            // Filter branches (Interlocking & Search box)
            let filtered = tiktokBranches.filter(b => {
                const matchesSize = filterSize === 'all' || b.empSize === filterSize;
                const matchesRH = filterRH === 'all' || b.empRH === filterRH;
                const matchesZone = filterZone === 'all' || b.empZone === filterZone;
                const matchesSearch = (b.empBranch || '').toLowerCase().includes(branchSearchQuery);
                return matchesSize && matchesRH && matchesZone && matchesSearch;
            });

            // Sorting
            filtered.sort((a, b) => {
                let valA = a[branchSortColumn];
                let valB = b[branchSortColumn];

                if (branchSortColumn === 'empMember') {
                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;
                    return branchSortDirection === 'asc' ? valA - valB : valB - valA;
                }

                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return branchSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            });

            // Pagination
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / branchItemsPerPage));
            if (branchCurrentPage > totalPages) branchCurrentPage = totalPages;

            const startIdx = (branchCurrentPage - 1) * branchItemsPerPage;
            const endIdx = Math.min(startIdx + branchItemsPerPage, total);
            const pageItems = filtered.slice(startIdx, endIdx);

            const infoText = document.getElementById('branch-pagination-info');
            if (infoText) {
                infoText.innerText = total === 0 ? "แสดง 0 ถึง 0 จาก 0 รายการ" : `แสดง ${startIdx + 1} ถึง ${endIdx} จาก ${total} รายการ`;
            }
            const pageNumText = document.getElementById('branch-page-number');
            if (pageNumText) pageNumText.innerText = `หน้า ${branchCurrentPage} / ${totalPages}`;

            const prevBtn = document.getElementById('btn-branch-prev');
            const nextBtn = document.getElementById('btn-branch-next');
            if (prevBtn) prevBtn.disabled = (branchCurrentPage === 1);
            if (nextBtn) nextBtn.disabled = (branchCurrentPage === totalPages);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-stone-400 italic">ไม่มีข้อมูลสาขาที่ตรงกับตัวกรอง</td></tr>`;
                return;
            }

            tbody.innerHTML = pageItems.map(br => {
                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <td class="py-2.5 pl-4 font-semibold text-stone-700 text-left">${br.empBranch || '-'}</td>
                    <td class="py-2.5">${br.empZone || '-'}</td>
                    <td class="py-2.5 text-center">${br.empRH || '-'}</td>
                    <td class="py-2.5 text-center font-bold text-indigo-600">${Number(br.empMember || 0).toLocaleString('th-TH')}</td>
                    <!-- คอลัมน์ Group (empSize) เพิ่มเติมตามรายละเอียด -->
                    <td class="py-2.5 text-center font-semibold text-stone-600">${br.empSize || '-'}</td>
                    <td class="text-center py-2.5">
                        <div class="flex justify-center gap-1.5">
                            <button onclick="openTiktokBranchModal('${br.id}')" class="p-1 text-blue-500 hover:bg-blue-50 border border-blue-200 rounded-lg">
                                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="openDeleteModal('${br.id}', '${br.empBranch}', 'branch')" class="p-1 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');

            lucide.createIcons();
            updateBranchSortIcons();
        };

        window.openTiktokBranchModal = (id = null) => {
            const modal = document.getElementById('branch-modal');
            const title = document.getElementById('branch-modal-title');
            const form = document.getElementById('branch-form');
            form.reset();

            if (id) {
                const br = tiktokBranches.find(b => b.id === id);
                if (br) {
                    title.innerText = "แก้ไขข้อมูลสาขาพนักงาน";
                    document.getElementById('branch-edit-id').value = id;
                    document.getElementById('form-brName').value = br.empBranch || '';
                    document.getElementById('form-brZone').value = br.empZone || '';
                    document.getElementById('form-brRH').value = br.empRH || '';
                    document.getElementById('form-brMember').value = br.empMember || 0;
                    document.getElementById('form-brSize').value = br.empSize || '';
                }
            } else {
                title.innerText = "เพิ่มข้อมูลสาขาพนักงานใหม่";
                document.getElementById('branch-edit-id').value = '';
            }
            modal.classList.remove('hidden');
        };

        window.closeTiktokBranchModal = () => {
            document.getElementById('branch-modal').classList.add('hidden');
        };

        window.handleBranchSubmit = async (e) => {
            e.preventDefault();
            const editId = document.getElementById('branch-edit-id').value;

            // ป้องกันการกดซ้ำโดยการปิดปุ่ม
            const submitBtn = document.getElementById('btn-submit-branch');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></span>กำลังบันทึก...';
            }

            const data = {
                empBranch: document.getElementById('form-brName').value.trim(),
                empZone: document.getElementById('form-brZone').value.trim(),
                empRH: document.getElementById('form-brRH').value.trim(),
                empMember: parseInt(document.getElementById('form-brMember').value) || 0,
                empSize: document.getElementById('form-brSize').value.trim(),
                updatedAt: serverTimestamp()
            };

            try {
                if (editId) {
                    await updateDoc(doc(db, getPath('Tiktok_Branch'), editId), data);
                    showToast("อัปเดตข้อมูลสาขาพนักงานเรียบร้อยแล้ว", "success");
                } else {
                    await addDoc(collection(db, getPath('Tiktok_Branch')), {
                        ...data,
                        createdAt: serverTimestamp()
                    });
                    showToast("เพิ่มข้อมูลสาขาพนักงานใหม่สำเร็จแล้ว", "success");
                }
                closeTiktokBranchModal();
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถบันทึกข้อมูลสาขาได้", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "บันทึก";
                }
            }
        };

        window.changeBranchPage = (direction) => {
            branchCurrentPage += direction;
            renderTiktokBranches();
        };

        window.onBranchPageSizeChanged = () => {
            const select = document.getElementById('branch-items-per-page');
            if (select) {
                branchItemsPerPage = parseInt(select.value);
                branchCurrentPage = 1;
                renderTiktokBranches();
            }
        };

        window.toggleBranchSort = (col) => {
            if (branchSortColumn === col) {
                branchSortDirection = branchSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                branchSortColumn = col;
                branchSortDirection = 'asc';
            }
            renderTiktokBranches();
        };

        const updateBranchSortIcons = () => {
            const cols = ['empBranch', 'empZone', 'empRH', 'empMember', 'empSize'];
            cols.forEach(col => {
                const el = document.getElementById(`sort-icon-${col}`);
                if (!el) return;

                if (branchSortColumn === col) {
                    el.innerHTML = branchSortDirection === 'asc'
                        ? `<i data-lucide="arrow-up" class="w-3 h-3 text-blue-600 inline"></i>`
                        : `<i data-lucide="arrow-down" class="w-3 h-3 text-blue-600 inline"></i>`;
                } else {
                    el.innerHTML = `<i data-lucide="arrow-up-down" class="w-3 h-3 text-stone-400 opacity-60 inline"></i>`;
                }
            });
            lucide.createIcons();
        };

        // Excel file Upload & parsing using SheetJS
        window.handleExcelUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        showToast("ไม่พบข้อมูลพนักงานหรือสาขาในไฟล์ Excel", "error");
                        return;
                    }

                    showToast("กำลังอัปโหลดข้อมูลสาขา...", "success");

                    let successCount = 0;
                    for (const row of jsonData) {
                        const branchData = {
                            empBranch: row.empBranch || row['ชื่อสาขา'] || row['สาขา'] || '',
                            empZone: row.empZone || row['เขต'] || '',
                            empRH: row.empRH || row['RH'] || '',
                            empMember: parseInt(row.empMember || row['จำนวน'] || row['empMember\r'] || 0),
                            empSize: row.empSize || row['Size'] || row['ขนาด'] || '',
                            createdAt: serverTimestamp()
                        };

                        if (branchData.empBranch) {
                            const colRef = collection(db, getPath('Tiktok_Branch'));
                            await addDoc(colRef, branchData);
                            successCount++;
                        }
                    }

                    showToast(`อัปโหลดข้อมูลสาขาสำเร็จทั้งหมด ${successCount} รายการเรียบร้อยแล้ว`, "success");
                    event.target.value = ''; // reset file input
                } catch (err) {
                    console.error("Excel parse error:", err);
                    showToast("ไม่สามารถประมวลผลไฟล์ Excel ได้ กรุณาตรวจสอบโครงสร้างหัวคอลัมน์", "error");
                }
            };
            reader.readAsArrayBuffer(file);
        };

        // Purge/Delete All Branches Modal Logic
        window.openDeleteAllBranchesModal = () => {
            document.getElementById('purge-confirm-text').value = '';
            document.getElementById('btn-purge-branches').disabled = true;
            document.getElementById('delete-all-branch-modal').classList.remove('hidden');
        };

        // แก้ไขข้อผิดพลาด ReferenceError: ผูกฟังก์ชันเข้ากับ window object
        window.closeDeleteAllBranchesModal = () => {
            document.getElementById('delete-all-branch-modal').classList.add('hidden');
        };

        window.checkPurgeInput = (el) => {
            const btn = document.getElementById('btn-purge-branches');
            if (el.value.trim() === 'Delete') {
                btn.disabled = false;
            } else {
                btn.disabled = true;
            }
        };

        window.confirmPurgeAllBranches = async () => {
            closeDeleteAllBranchesModal();
            showToast("กำลังเริ่มล้างข้อมูลสาขาทั้งหมด...", "success");

            try {
                // Delete docs one by one as batching complex structures without index is simpler this way on front end
                const promises = tiktokBranches.map(b => deleteDoc(doc(db, getPath('Tiktok_Branch'), b.id)));
                await Promise.all(promises);
                showToast("ล้างข้อมูลรายชื่อสาขาพนักงานทั้งหมดเรียบร้อยแล้ว", "success");
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถล้างข้อมูลสาขาพนักงานได้สำเร็จ", "error");
            }
        };

        // --- GLOBAL DELETE MANAGEMENT ---
        window.openDeleteModal = (id, name, type) => {
            document.getElementById('delete-id').value = id;
            document.getElementById('delete-type').value = type;
            document.getElementById('delete-target-name').innerText = name;
            document.getElementById('delete-modal').classList.remove('hidden');
        };

        window.closeDeleteModal = () => {
            document.getElementById('delete-modal').classList.add('hidden');
        };

        window.confirmDeletePreviewPost = () => {
            const postId = window.currentPreviewPostId;
            if (!postId) return;
            const post = tiktokPosts.find(p => p.id === postId);
            const title = post ? post.title : 'วิดีโอ TikTok';
            window.openDeleteModal(postId, title, 'delete-post-to-archive');
        };

        window.confirmGenericDelete = async () => {
            const id = document.getElementById('delete-id').value;
            const type = document.getElementById('delete-type').value;
            if (!id || !type) return;

            try {
                if (type === 'delete-post-to-archive') {
                    const post = tiktokPosts.find(p => p.id === id);
                    if (post) {
                        const deleteData = { ...post };
                        delete deleteData.id;
                        deleteData.deletedAt = serverTimestamp();
                        await addDoc(collection(db, getPath('Tiktok_Delete')), deleteData);
                        await deleteDoc(doc(db, getPath('Tiktok_Post'), id));
                        showToast("ย้ายข้อมูลไปที่ Tiktok_Delete เรียบร้อยแล้ว", "success");
                        window.closeTiktokUrlModal();
                    }
                    closeDeleteModal();
                    return;
                }

                let collectionName = '';
                if (type === 'member') collectionName = 'Tiktok_Member';
                else if (type === 'position') collectionName = 'Tiktok_Position';
                else if (type === 'branch') collectionName = 'Tiktok_Branch';
                else if (type === 'post') collectionName = 'Tiktok_Post';

                const docRef = doc(db, getPath(collectionName), id);
                await deleteDoc(docRef);
                showToast("ลบข้อมูลสำเร็จเรียบร้อยแล้ว", "success");
                closeDeleteModal();
            } catch (err) {
                console.error(err);
                showToast("เกิดข้อผิดพลาดในการลบข้อมูลรายการดังกล่าว", "error");
            }
        };

        // --- TIKTOK POSTS SYSTEM FUNCTIONS (จัดการโพสต์) ---
        // ควบคุมสวิตช์หน้าต่างโพสต์ใหม่ / โพสต์อนุมัติ
        window.switchPostsTab = (tab) => {
            postsActiveTab = tab;
            postsCurrentPage = 1;

            const btnNew = document.getElementById('btn-posts-tab-new');
            const btnApproved = document.getElementById('btn-posts-tab-approved');
            const summaryTitle = document.getElementById('posts-summary-title');

            if (tab === 'new') {
                btnNew.className = "px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 bg-blue-600 text-white shadow-md";
                btnApproved.className = "px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200";
                if (summaryTitle) summaryTitle.innerText = "โพสต์ใหม่ทั้งหมด:";
            } else {
                btnNew.className = "px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200";
                btnApproved.className = "px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 bg-blue-600 text-white shadow-md";
                if (summaryTitle) summaryTitle.innerText = "โพสต์ที่อนุมัติแล้ว:";
            }

            renderTiktokPosts();
        };

        window.renderTiktokPosts = () => {
            const tbody = document.getElementById('posts-table-body');
            const summaryCountEl = document.getElementById('posts-summary-count');
            if (!tbody) return;

            const searchQuery = document.getElementById('posts-search-input')?.value.toLowerCase().trim() || '';

            // กรองหาโพสต์ตามเงื่อนไข ( employee_send === false สำหรับโพสต์ใหม่ และ true สำหรับโพสต์ที่ส่ง/อนุมัติแล้ว)
            let filtered = tiktokPosts.filter(p => {
                const empSendState = (p.employee_send === true || p.employee_send === 'true');
                const isCorrectTab = (postsActiveTab === 'new') ? (!empSendState) : empSendState;

                // ตรวจค้นหาประวัติสมาชิก Tiktok เพื่อโยงข้อมูลรูปถ่ายพนักงานและชื่อจริงมาค้นหาร่วมกัน
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(p.employeeId).trim());
                const memberName = member ? (member.name || '') : '';

                const matchesSearch = (p.employeeId || '').toLowerCase().includes(searchQuery) ||
                    (p.title || '').toLowerCase().includes(searchQuery) ||
                    (p.name || '').toLowerCase().includes(searchQuery) ||
                    memberName.toLowerCase().includes(searchQuery);

                return isCorrectTab && matchesSearch;
            });

            // อัปเดตสถิติจำนวนรวม
            if (summaryCountEl) {
                summaryCountEl.innerText = `${filtered.length} รายการ`;
            }

            // จัดการเรียงลำดับ (Sorting)
            filtered.sort((a, b) => {
                let valA = a[postsSortColumn];
                let valB = b[postsSortColumn];

                if (postsSortColumn === 'Click_Post' || postsSortColumn === 'Tiktok_view') {
                    const clickA = a.Click_Post !== undefined ? a.Click_Post : (a.Tiktok_view !== undefined ? a.Tiktok_view : 0);
                    const clickB = b.Click_Post !== undefined ? b.Click_Post : (b.Tiktok_view !== undefined ? b.Tiktok_view : 0);
                    valA = Number(clickA) || 0;
                    valB = Number(clickB) || 0;
                    return postsSortDirection === 'asc' ? valA - valB : valB - valA;
                }

                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return postsSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            });

            // หน้าเพจ (Pagination)
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / postsItemsPerPage));
            if (postsCurrentPage > totalPages) postsCurrentPage = totalPages;

            const startIdx = (postsCurrentPage - 1) * postsItemsPerPage;
            const endIdx = Math.min(startIdx + postsItemsPerPage, total);
            const pageItems = filtered.slice(startIdx, endIdx);

            const infoText = document.getElementById('posts-pagination-info');
            if (infoText) {
                infoText.innerText = total === 0 ? "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ" : `แสดง ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${total} รายการ`;
            }
            const pageNumText = document.getElementById('posts-page-number');
            if (pageNumText) pageNumText.innerText = `หน้า ${postsCurrentPage} / ${totalPages}`;

            const prevBtn = document.getElementById('btn-posts-prev');
            const nextBtn = document.getElementById('btn-posts-next');
            if (prevBtn) prevBtn.disabled = (postsCurrentPage === 1);
            if (nextBtn) nextBtn.disabled = (postsCurrentPage === totalPages);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบข้อมูลโพสต์ในส่วนนี้</td></tr>`;
                return;
            }

            let rowsHtml = pageItems.map((item, idx) => {
                // ค้นหารูปถ่ายและชื่อพนักงานจาก Tiktok_Member โดยอิงฟิลด์ PictureMember หรือ profileImage
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(item.employeeId).trim());
                const empName = member ? (member.name || '-') : (item.name || '-');
                const imgUrl = member && (member.profileImage || member.PictureMember)
                    ? (member.profileImage || member.PictureMember)
                    : `https://placehold.co/100x100/e2e8f0/475569?text=${encodeURIComponent(empName.charAt(0))}`;

                // แปลงฟอร์แมต createdAt
                const createdDateStr = item.createdAt
                    ? (item.createdAt.seconds
                        ? new Date(item.createdAt.seconds * 1000).toLocaleString('th-TH')
                        : new Date(item.createdAt).toLocaleString('th-TH'))
                    : '-';

                // ดึงข้อมูลจำนวนคลิกมาแสดงผลในคอลัมน์ Click
                const clickCountVal = item.Click_Post !== undefined ? item.Click_Post : (item.Tiktok_view !== undefined ? item.Tiktok_view : 0);
                const viewsCount = Number(clickCountVal).toLocaleString('th-TH');

                // แถวปุ่มคำสั่ง (Actions) สำหรับระบบอนุมัติและปรับเปลี่ยน (ผูกกับขอบเขต window เพื่อการันตีการทำงาน)
                let postActionBtn = "";
                if (postsActiveTab === 'new') {
                    // ปุ่มส่งโพสต์ (employee_send = true, admin_ok = true)
                    postActionBtn = `
                        <button onclick="window.approveTiktokPost('${item.id}')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg animate-pulse" title="ส่งและอนุมัติโพสต์">
                            <i data-lucide="check-circle" class="w-4 h-4"></i>
                        </button>
                    `;
                } else {
                    // ปุ่มสลับยกเลิกการส่งโพสต์กลับไปโพสต์ใหม่ (Revert)
                    postActionBtn = `
                        <button onclick="window.revertTiktokPost('${item.id}')" class="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg animate-pulse" title="ดึงกลับเป็นโพสต์ใหม่">
                            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                        </button>
                    `;
                }

                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <td class="text-center py-3 font-semibold text-stone-600">${startIdx + idx + 1}</td>
                    <td class="text-center py-2">
                        <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://placehold.co/100x100/cbd5e1/475569?text=Error';" class="w-10 h-10 rounded-full object-cover mx-auto border border-stone-200 shadow-sm">
                    </td>
                    <td class="text-center py-3 font-bold text-stone-850">${item.employeeId || '-'}</td>
                    <td class="py-3 pl-4 text-left">
                        <div class="font-semibold text-stone-700">${empName}</div>
                        <div class="text-[11px] text-stone-400 font-semibold mt-0.5" title="วันที่โพสต์">
                            ${createdDateStr}
                        </div>
                    <td class="py-2 pl-4 text-left">
                        <div class="${window.getEvaluationBorderClass(item)}">
                            <div class="font-medium text-stone-800 truncate max-w-[200px]" title="${item.title || ''}">${item.title || '-'}</div>
                            <div class="text-[11px] text-stone-400 font-semibold mt-0.5">${item.category || 'Trusted Employee'}</div>
                        </div>
                    </td>
                    <td class="py-3 text-left">
                        <!-- อัปเดตลิงก์พรีวิวให้ส่ง id ของโพสต์เพื่อนำไปจัดการอัปเดตวิวและส่งสถานะ -->
                        <button onclick="window.viewTiktokUrl('${item.url || ''}', '${item.id}')" class="inline-flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors" title="ดูคลิปวิดีโอ">
                            <i data-lucide="video" class="w-3.5 h-3.5"></i>
                            ดูคลิป
                        </button>
                    </td>
                    <!-- แถวยอดเข้าชม View แสดงถัดจาก Tiktok URL (ด้านหน้าคอลัมน์ จัดการ) -->
                    <td class="text-center py-3 font-bold text-indigo-600">${viewsCount}</td>
                    <td class="text-center py-3">
                        <div class="flex justify-center gap-1.5">
                            ${postActionBtn}
                            <button onclick="window.openTiktokPostModal('${item.id}')" class="p-1.5 text-blue-500 hover:bg-blue-50 border border-blue-200 rounded-lg" title="แก้ไขข้อมูล">
                                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="openDeleteModal('${item.id}', '${item.title}', 'post')" class="p-1.5 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg" title="ลบโพสต์">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');

            // แถวล่างสุด (นับจำนวนพนักงานทั้งหมด และรวม Click)
            const totalClicks = filtered.reduce((sum, item) => {
                const clicks = item.Click_Post !== undefined ? item.Click_Post : (item.Tiktok_view !== undefined ? item.Tiktok_view : 0);
                return sum + (Number(clicks) || 0);
            }, 0);
            rowsHtml += `
            <tr class="bg-stone-50 font-bold border-t border-stone-200">
                <td class="text-center py-3 text-[12.5px] font-extrabold text-stone-700">รวม</td>
                <td colspan="5" class="py-3 pl-4 text-left text-[12.5px] font-extrabold text-stone-700">ทั้งหมด: ${total} รายการ</td>
                <td class="text-center py-3 font-extrabold text-indigo-600 text-[13px]">${totalClicks.toLocaleString('th-TH')}</td>
                <td class="bg-stone-50"></td>
            </tr>
            `;

            tbody.innerHTML = rowsHtml;
            lucide.createIcons();
            updatePostsSortIcons();
        };

        // ฟังก์ชันคีย์ยอดวิวย้อนกลับไปที่ Tiktok_Post หรือ Tiktok_Delete
        window.updatePostViews = async (val) => {
            const postId = window.currentPreviewPostId;
            if (!postId) return;
            try {
                let isDeleted = false;
                let post = tiktokPosts.find(p => p.id === postId);
                if (!post && typeof tiktokDeletedPosts !== 'undefined') {
                    post = tiktokDeletedPosts.find(p => p.id === postId);
                    isDeleted = true;
                }
                const collectionName = isDeleted ? 'Tiktok_Delete' : 'Tiktok_Post';
                const docRef = doc(db, getPath(collectionName), postId);
                await updateDoc(docRef, {
                    Click_Post: Number(val) || 0,
                    Tiktok_view: Number(val) || 0,
                    updatedAt: serverTimestamp()
                });
                if (post) {
                    post.Click_Post = Number(val) || 0;
                    post.Tiktok_view = Number(val) || 0;
                }
            } catch (err) {
                console.error("Error updating clicks:", err);
            }
        };

        // ฟังก์ชันแก้ไข URL ของโพสต์พร้อมเซฟลง Firestore อัตโนมัติจากหน้าพรีวิว
        window.updatePostUrl = async (val) => {
            const postId = window.currentPreviewPostId;
            if (!postId) return;
            try {
                let isDeleted = false;
                let post = tiktokPosts.find(p => p.id === postId);
                if (!post && typeof tiktokDeletedPosts !== 'undefined') {
                    post = tiktokDeletedPosts.find(p => p.id === postId);
                    isDeleted = true;
                }
                const collectionName = isDeleted ? 'Tiktok_Delete' : 'Tiktok_Post';
                const docRef = doc(db, getPath(collectionName), postId);
                await updateDoc(docRef, {
                    url: val.trim(),
                    updatedAt: serverTimestamp()
                });
                if (post) post.url = val.trim();

                // อัปเดตการแสดงผลของลิงก์และ URL Display ในหน้านั้นแบบเรียลไทม์
                const displayEl = document.getElementById('tiktok-url-display');
                const linkEl = document.getElementById('tiktok-url-link');
                if (displayEl) displayEl.innerText = val;
                if (linkEl) linkEl.href = val;

                // อัปโหลดโหลด Iframe วิดีโอ TikTok อันใหม่
                const iframeContainer = document.getElementById('tiktok-iframe-container');
                if (iframeContainer) {
                    const videoIdMatch = val.match(/\/video\/(\d+)/) || val.match(/\/v\/(\d+)/);
                    if (videoIdMatch && videoIdMatch[1]) {
                        const videoId = videoIdMatch[1];
                        iframeContainer.innerHTML = `
                            <iframe 
                                src="https://www.tiktok.com/player/v1/${videoId}?autoplay=1&rel=0&description=1&volume_control=1"
                                class="w-full h-full" 
                                frameborder="0" 
                                allow="autoplay; encrypted-media; picture-in-picture" 
                                allowfullscreen>
                            </iframe>
                        `;
                    } else {
                        const simpleIdMatch = val.trim().match(/^\d+$/);
                        if (simpleIdMatch) {
                            iframeContainer.innerHTML = `
                                <iframe 
                                    src="https://www.tiktok.com/player/v1/${val.trim()}?autoplay=1&rel=0&description=1&volume_control=1"
                                    class="w-full h-full" 
                                    frameborder="0" 
                                    allow="autoplay; encrypted-media; picture-in-picture" 
                                    allowfullscreen>
                                </iframe>
                            `;
                        } else {
                            iframeContainer.innerHTML = `
                                <div class="p-6 text-center space-y-3">
                                    <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-sm mb-2">
                                        <i data-lucide="help-circle" class="w-6 h-6"></i>
                                    </div>
                                    <p class="font-bold text-stone-200">ไม่สามารถพรีวิวลิงก์นี้ได้</p>
                                    <p class="text-[11px] text-stone-400 px-4">ระบบความปลอดภัย of TikTok ไม่อนุญาตให้ดึงข้อมูลจากลิงก์สั้นภายนอก กรุณาคลิกเปิดลิงก์โดยตรงด้านล่าง</p>
                                </div>
                            `;
                            lucide.createIcons();
                        }
                    }
                }
            } catch (err) {
                console.error("Error updating URL:", err);
            }
        };

        // ฟังก์ชันแก้ไขข้อมูล Memo รายละเอียดการบันทึกของโพสต์พร้อมเซฟลง Firestore อัตโนมัติ
        window.updatePostMemo = async (val) => {
            const postId = window.currentPreviewPostId;
            if (!postId) return;
            try {
                let isDeleted = false;
                let post = tiktokPosts.find(p => p.id === postId);
                if (!post && typeof tiktokDeletedPosts !== 'undefined') {
                    post = tiktokDeletedPosts.find(p => p.id === postId);
                    isDeleted = true;
                }
                const collectionName = isDeleted ? 'Tiktok_Delete' : 'Tiktok_Post';
                const docRef = doc(db, getPath(collectionName), postId);
                await updateDoc(docRef, {
                    memo: val,
                    updatedAt: serverTimestamp()
                });
                if (post) post.memo = val;

                // อัปเดตสถานะการแสดงผลของปุ่มลบคลิปทันที
                const deleteBtn = document.getElementById('btn-delete-preview-post');
                if (deleteBtn) {
                    if (val && val.trim() !== '') {
                        deleteBtn.classList.remove('hidden');
                    } else {
                        deleteBtn.classList.add('hidden');
                    }
                }
            } catch (err) {
                console.error("Error updating memo:", err);
            }
        };

        // ฟังก์ชันในการเซ็ตอนุมัติและ โพสต์คลิปนี้ (employee_send = true, admin_ok = true) จากโมดอลพรีวิว
        window.publishPreviewPost = async () => {
            const postId = window.currentPreviewPostId;
            if (!postId) return;
            try {
                const docRef = doc(db, getPath('Tiktok_Post'), postId);
                await updateDoc(docRef, {
                    employee_send: true,
                    admin_ok: true,
                    updatedAt: serverTimestamp()
                });
                showToast("ส่งและอนุมัติโพสต์ TikTok จากตัวอย่างสำเร็จแล้ว!", "success");
                closeTiktokUrlModal();
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถอัปเดตสถานะโพสต์ได้", "error");
            }
        };

        window.approveTiktokPost = async (id) => {
            try {
                const docRef = doc(db, getPath('Tiktok_Post'), id);
                await updateDoc(docRef, {
                    employee_send: true,
                    admin_ok: true,
                    updatedAt: serverTimestamp()
                });
                showToast("อนุมัติและเผยแพร่โพสต์ TikTok สำเร็จแล้ว!", "success");
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถอัปเดตสถานะอนุมัติโพสต์ได้", "error");
            }
        };

        window.revertTiktokPost = async (id) => {
            try {
                const docRef = doc(db, getPath('Tiktok_Post'), id);
                await updateDoc(docRef, {
                    employee_send: false,
                    admin_ok: false,
                    updatedAt: serverTimestamp()
                });
                showToast("ดึงโพสต์กลับคืนสู่สถานะโพสต์ใหม่เรียบร้อย", "success");
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถเปลี่ยนสถานะโพสต์กลับคืนได้", "error");
            }
        };

        window.openTiktokPostModal = (id = null) => {
            const modal = document.getElementById('post-modal');
            const title = document.getElementById('post-modal-title');
            const form = document.getElementById('post-form');
            form.reset();

            // ตั้งค่าวันที่ปัจจุบันเป็น Default สำหรับวันที่โพสต์
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('form-post-date').value = today;

            if (id) {
                const post = tiktokPosts.find(p => p.id === id);
                if (post) {
                    title.innerText = "แก้ไขข้อมูลโพสต์ TikTok";
                    document.getElementById('post-edit-id').value = id;
                    document.getElementById('form-post-employeeId').value = post.employeeId || '';
                    document.getElementById('form-post-date').value = post.postDate || today;
                    document.getElementById('form-post-title').value = post.title || '';
                    document.getElementById('form-post-url').value = post.url || '';
                    // เพิ่มระบบดึงค่าหมวดหมู่ Category ในปุ่มแก้ไข
                    document.getElementById('form-post-category').value = post.category || 'Trusted Employee';
                }
            } else {
                title.innerText = "เพิ่มข้อมูลโพสต์ใหม่";
                document.getElementById('post-edit-id').value = '';
                document.getElementById('form-post-category').value = 'Trusted Employee';
            }

            modal.classList.remove('hidden');
        };

        window.closeTiktokPostModal = () => {
            document.getElementById('post-modal').classList.add('hidden');
        };

        window.handlePostSubmit = async (e) => {
            e.preventDefault();
            const editId = document.getElementById('post-edit-id').value;
            const empId = document.getElementById('form-post-employeeId').value.trim();

            // ป้องกันการกดซ้ำโดยการปิดปุ่มชั่วขณะ
            const submitBtn = document.getElementById('btn-submit-post');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></span>กำลังบันทึก...';
            }

            // ดึงชื่อพนักงานจาก Tiktok_Member เพื่ออัปเดตลงในโพสต์โดยตรง
            const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(empId).trim());
            const empName = member ? (member.name || '') : '';

            const data = {
                employeeId: empId,
                name: empName,
                postDate: document.getElementById('form-post-date').value,
                title: document.getElementById('form-post-title').value.trim(),
                url: document.getElementById('form-post-url').value.trim(),
                category: document.getElementById('form-post-category').value, // บันทึกข้อมูลหมวดหมู่
                updatedAt: serverTimestamp()
            };

            try {
                if (editId) {
                    await updateDoc(doc(db, getPath('Tiktok_Post'), editId), data);
                    showToast("แก้ไขรายละเอียดโพสต์เรียบร้อยแล้ว", "success");
                } else {
                    // บันทึกฟิลด์สถานะ Default สำหรับโพสต์ใหม่
                    await addDoc(collection(db, getPath('Tiktok_Post')), {
                        ...data,
                        employee_send: false,
                        admin_ok: false,
                        createdAt: serverTimestamp()
                    });
                    showToast("เพิ่มข้อมูลโพสต์ใหม่เรียบร้อยแล้ว", "success");
                }
                closeTiktokPostModal();
            } catch (err) {
                console.error(err);
                showToast("ไม่สามารถบันทึกข้อมูลโพสต์ได้", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "บันทึกโพสต์";
                }
            }
        };

        window.getEvaluationBorderClass = (item) => {
            let evalStatus = item.evaluationStatus !== undefined ? Number(item.evaluationStatus) : null;
            if (!evalStatus && item.memo && item.memo.trim() !== '') {
                evalStatus = 3;
            }

            if (evalStatus === 1) {
                return 'bg-green-50 border border-green-200 rounded-xl p-2.5';
            } else if (evalStatus === 2) {
                return 'bg-amber-50 border border-amber-300 rounded-xl p-2.5';
            } else if (evalStatus === 3) {
                return 'bg-red-50 border border-red-200 rounded-xl p-2.5';
            }
            return 'p-2.5';
        };

        window.updateEvaluationStatus = async (statusVal) => {
            const postId = window.currentPreviewPostId;
            if (!postId) return;
            try {
                let isDeleted = false;
                let post = tiktokPosts.find(p => p.id === postId);
                if (!post && typeof tiktokDeletedPosts !== 'undefined') {
                    post = tiktokDeletedPosts.find(p => p.id === postId);
                    isDeleted = true;
                }
                const collectionName = isDeleted ? 'Tiktok_Delete' : 'Tiktok_Post';
                const docRef = doc(db, getPath(collectionName), postId);
                await updateDoc(docRef, {
                    evaluationStatus: Number(statusVal),
                    updatedAt: serverTimestamp()
                });
                if (post) post.evaluationStatus = Number(statusVal);
            } catch (err) {
                console.error("Error updating evaluation status:", err);
            }
        };

        window.viewTiktokUrl = async (url, postId) => {
            window.currentPreviewPostId = postId;
            const modal = document.getElementById('tiktok-url-modal');
            const displayEl = document.getElementById('tiktok-url-display');
            const linkEl = document.getElementById('tiktok-url-link');
            const iframeContainer = document.getElementById('tiktok-iframe-container');
            const viewsInput = document.getElementById('tiktok-views-input');
            const publishBtn = document.getElementById('btn-publish-preview');
            const editUrlInput = document.getElementById('tiktok-url-edit-input');

            if (!modal || !displayEl || !linkEl || !iframeContainer) return;

            displayEl.innerText = url;
            linkEl.href = url;
            if (editUrlInput) editUrlInput.value = url;

            // ดึงข้อมูลวิวย้อนกลับและพรีฟิลลงอินพุตคีย์วิว
            let post = tiktokPosts.find(p => p.id === postId);
            if (!post && typeof tiktokDeletedPosts !== 'undefined') {
                post = tiktokDeletedPosts.find(p => p.id === postId);
            }
            const currentViews = post ? (post.Click_Post !== undefined ? post.Click_Post : (post.Tiktok_view || 0)) : 0;
            if (viewsInput) viewsInput.value = currentViews;

            // ดึงข้อมูล Click_Post และพรีฟิลลงอินพุตคลิก (readonly)
            const clicksInput = document.getElementById('tiktok-clicks-input');
            if (clicksInput) {
                clicksInput.value = post && post.Click_Post !== undefined ? post.Click_Post : 0;
            }

            // ดึงข้อมูล memo และพรีฟิลลงอินพุต memo
            const memoInput = document.getElementById('tiktok-memo-input');
            if (memoInput) {
                memoInput.value = post && post.memo ? post.memo : '';
            }

            // ดึงข้อมูล evaluationStatus และพรีฟิลลงวิทยุประเมิน
            const evalRadios = document.getElementsByName('evaluation-status-radio');
            let evaluationStatus = post ? post.evaluationStatus : null;

            // Backward compatibility
            if (!evaluationStatus && post && post.memo && post.memo.trim() !== '') {
                evaluationStatus = 3;
            }

            evalRadios.forEach(r => {
                r.checked = (String(r.value) === String(evaluationStatus));
            });

            // จัดการเปิด/ซ่อนปุ่มลบคลิปตามการมีอยู่ของ Memo
            const deleteBtn = document.getElementById('btn-delete-preview-post');
            if (deleteBtn) {
                if (post && post.memo && post.memo.trim() !== '') {
                    deleteBtn.classList.remove('hidden');
                } else {
                    deleteBtn.classList.add('hidden');
                }
            }

            // แสดงสถานะ License ของพนักงานผู้อัปโหลดโพสต์
            const lifeEl = document.getElementById('preview-license-life');
            const nonlifeEl = document.getElementById('preview-license-nonlife');
            const icEl = document.getElementById('preview-license-ic');
            if (lifeEl && nonlifeEl && icEl) {
                const empId = post ? post.employeeId : '';
                const licensesArr = (typeof tiktokLicenses !== 'undefined' ? tiktokLicenses : window.tiktokLicenses) || [];
                const license = licensesArr.find(l => String(l.employeeId).trim() === String(empId).trim());

                if (license && license.Life_insurance && String(license.Life_insurance).trim() !== '') {
                    lifeEl.textContent = `มี Life: License`;
                    lifeEl.className = 'p-2 rounded-xl text-white transition-all bg-emerald-600';
                } else {
                    lifeEl.textContent = `ไม่มี Life License`;
                    lifeEl.className = 'p-2 rounded-xl text-white transition-all bg-rose-600';
                }

                if (license && license.Nonlife_insurance && String(license.Nonlife_insurance).trim() !== '') {
                    nonlifeEl.textContent = `มี Non life License`;
                    nonlifeEl.className = 'p-2 rounded-xl text-white transition-all bg-emerald-600';
                } else {
                    nonlifeEl.textContent = `ไม่มี Non life License`;
                    nonlifeEl.className = 'p-2 rounded-xl text-white transition-all bg-rose-600';
                }

                if (license && license.IC_license && String(license.IC_license).trim() !== '') {
                    icEl.textContent = `มี IC License`;
                    icEl.className = 'p-2 rounded-xl text-white transition-all bg-emerald-600';
                } else {
                    icEl.textContent = `ไม่มี IC License`;
                    icEl.className = 'p-2 rounded-xl text-white transition-all bg-rose-600';
                }
            }

            // ซ่อนหรือแสดงปุ่มเผยแพร่ตามสถานะปัจจุบัน
            if (publishBtn) {
                const isSent = post && (post.employee_send === true || post.employee_send === 'true');
                if (isSent) {
                    publishBtn.classList.add('hidden');
                } else {
                    publishBtn.classList.remove('hidden');
                }
            }

            modal.classList.remove('hidden');
            lucide.createIcons();

            // ฟังก์ชันในการแสดงพรีวิวด้วย Video ID
            const setEmbedIframe = (vidId) => {
                iframeContainer.innerHTML = `
                    <iframe 
                        src="https://www.tiktok.com/player/v1/${vidId}?autoplay=1&rel=0&description=1&volume_control=1"
                        class="w-full h-full" 
                        frameborder="0" 
                        allow="autoplay; encrypted-media; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                `;
            };

            // ตรวจสอบว่าเป็นลิงก์สั้นหรือไม่ (vt.tiktok.com หรือ vm.tiktok.com)
            const isShortUrl = url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com');

            if (isShortUrl) {
                // แสดงสถานะกำลังโหลด/แปลงลิงก์สั้น
                iframeContainer.innerHTML = `
                    <div class="p-6 text-center space-y-3">
                        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p class="font-bold text-stone-200">กำลังแปลงลิงก์สั้น...</p>
                        <p class="text-[11px] text-stone-400 px-4">ระบบกำลังคลายลิงก์ vt.tiktok.com เพื่อดึงข้อมูลวิดีโอแบบเต็ม</p>
                    </div>
                `;

                try {
                    let resolvedUrl = "";

                    // 1. ลองใช้ corsproxy.io
                    try {
                        const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(url)}`);
                        if (res.ok) {
                            const html = await res.text();
                            const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/) ||
                                html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/);
                            if (canonicalMatch && canonicalMatch[1]) {
                                resolvedUrl = canonicalMatch[1];
                            }
                        }
                    } catch (e1) {
                        console.warn("corsproxy.io failed, trying allorigins:", e1);
                    }

                    // 2. ลองใช้ allorigins.win เป็น fallback
                    if (!resolvedUrl) {
                        try {
                            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data && data.contents) {
                                    const html = data.contents;
                                    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/) ||
                                        html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/);
                                    if (canonicalMatch && canonicalMatch[1]) {
                                        resolvedUrl = canonicalMatch[1];
                                    }
                                }
                            }
                        } catch (e2) {
                            console.error("allorigins fallback failed:", e2);
                        }
                    }

                    if (resolvedUrl) {
                        // แยกแยะ videoId จาก URL ยาวที่แปลงได้
                        const vMatch = resolvedUrl.match(/\/video\/(\d+)/) || resolvedUrl.match(/\/v\/(\d+)/);
                        if (vMatch && vMatch[1]) {
                            const videoId = vMatch[1];
                            setEmbedIframe(videoId);

                            // ปรับเปลี่ยนค่าในฟิลด์อินพุตแสดงผล URL
                            displayEl.innerText = resolvedUrl;
                            if (editUrlInput) editUrlInput.value = resolvedUrl;

                            // บันทึก URL ยาวกลับลง Firestore ทันทีเพื่อไม่ต้องแปลงซ้ำอีกในครั้งถัดไป
                            window.updatePostUrl(resolvedUrl);
                            showToast("แปลงลิงก์สั้นและบันทึกอัตโนมัติสำเร็จ!", "success");
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Failed to resolve short url:", err);
                }
            }

            // ค้นหาและดึง ID ของวิดีโอจาก URL ของ TikTok
            const videoIdMatch = url.match(/\/video\/(\d+)/) || url.match(/\/v\/(\d+)/);

            if (videoIdMatch && videoIdMatch[1]) {
                const videoId = videoIdMatch[1];
                setEmbedIframe(videoId);
            } else {
                // กรณีที่เป็นตัวเลข ID ล้วนๆ
                const simpleIdMatch = url.trim().match(/^\d+$/);
                if (simpleIdMatch) {
                    setEmbedIframe(url.trim());
                } else {
                    iframeContainer.innerHTML = `
                        <div class="p-6 text-center space-y-3">
                            <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-sm mb-2">
                                <i data-lucide="help-circle" class="w-6 h-6"></i>
                            </div>
                            <p class="font-bold text-stone-200">ไม่สามารถพรีวิวลิงก์นี้ได้</p>
                            <p class="text-[11px] text-stone-400 px-4">ระบบความปลอดภัย of TikTok ไม่อนุญาตให้ดึงข้อมูลจากลิงก์สั้นภายนอก กรุณาคลิกเปิดลิงก์โดยตรงด้านล่าง</p>
                        </div>
                    `;
                }
            }
        };

        window.closeTiktokUrlModal = () => {
            const modal = document.getElementById('tiktok-url-modal');
            const iframeContainer = document.getElementById('tiktok-iframe-container');
            // ทำความสะอาด iframe ทันทีที่กดปิดเพื่อหยุดเสียงและวิดีโอที่กำลังเล่นอยู่
            if (iframeContainer) {
                iframeContainer.innerHTML = '';
            }
            if (modal) {
                modal.classList.add('hidden');
            }
        };

        window.changePostsPage = (direction) => {
            postsCurrentPage += direction;
            renderTiktokPosts();
        };

        window.onPostsPageSizeChanged = () => {
            const select = document.getElementById('posts-items-per-page');
            if (select) {
                postsItemsPerPage = parseInt(select.value);
                postsCurrentPage = 1;
                renderTiktokPosts();
            }
        };

        window.renderTiktokDeletedPosts = () => {
            const tbody = document.getElementById('delete-table-body');
            const summaryCountEl = document.getElementById('delete-summary-count');
            if (!tbody) return;

            const searchQuery = document.getElementById('delete-search-input')?.value.toLowerCase().trim() || '';

            // กรองหาโพสต์ตามเงื่อนไขค้นหา
            let filtered = tiktokDeletedPosts.filter(p => {
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(p.employeeId).trim());
                const memberName = member ? (member.name || '') : '';

                const matchesSearch = (p.employeeId || '').toLowerCase().includes(searchQuery) ||
                    (p.title || '').toLowerCase().includes(searchQuery) ||
                    (p.name || '').toLowerCase().includes(searchQuery) ||
                    memberName.toLowerCase().includes(searchQuery);

                return matchesSearch;
            });

            // อัปเดตสถิติจำนวนรวม
            if (summaryCountEl) {
                summaryCountEl.innerText = `${filtered.length} รายการ`;
            }

            // หน้าเพจ (Pagination)
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / deleteItemsPerPage));
            if (deleteCurrentPage > totalPages) deleteCurrentPage = totalPages;

            const startIdx = (deleteCurrentPage - 1) * deleteItemsPerPage;
            const endIdx = Math.min(startIdx + deleteItemsPerPage, total);
            const pageItems = filtered.slice(startIdx, endIdx);

            const infoText = document.getElementById('delete-pagination-info');
            if (infoText) {
                infoText.innerText = total === 0 ? "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ" : `แสดง ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${total} รายการ`;
            }
            const pageNumText = document.getElementById('delete-page-number');
            if (pageNumText) pageNumText.innerText = `หน้า ${deleteCurrentPage} / ${totalPages}`;

            const prevBtn = document.getElementById('btn-delete-prev');
            const nextBtn = document.getElementById('btn-delete-next');
            if (prevBtn) prevBtn.disabled = (deleteCurrentPage === 1);
            if (nextBtn) nextBtn.disabled = (deleteCurrentPage === totalPages);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบข้อมูลประวัติโพสต์ที่ถูกลบ</td></tr>`;
                return;
            }

            let rowsHtml = pageItems.map((item, idx) => {
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(item.employeeId).trim());
                const empName = member ? (member.name || '-') : (item.name || '-');
                const imgUrl = member && (member.profileImage || member.PictureMember)
                    ? (member.profileImage || member.PictureMember)
                    : `https://placehold.co/100x100/e2e8f0/475569?text=${encodeURIComponent(empName.charAt(0))}`;

                const clickCountVal = item.Click_Post !== undefined ? item.Click_Post : (item.Tiktok_view !== undefined ? item.Tiktok_view : 0);
                const viewsCount = Number(clickCountVal).toLocaleString('th-TH');

                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <td class="text-center py-3 font-semibold text-stone-600">${startIdx + idx + 1}</td>
                    <td class="text-center py-2">
                        <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://placehold.co/100x100/cbd5e1/475569?text=Error';" class="w-10 h-10 rounded-full object-cover mx-auto border border-stone-200 shadow-sm">
                    </td>
                    <td class="text-center py-3 font-bold text-stone-850">${item.employeeId || '-'}</td>
                    <td class="py-3 pl-4 font-semibold text-stone-700 text-left">${empName}</td>
                    <td class="py-2 pl-4 text-left">
                        <div class="${window.getEvaluationBorderClass(item)}">
                            <div class="font-medium text-stone-800 truncate max-w-[200px]" title="${item.title || ''}">${item.title || '-'}</div>
                            <div class="text-[11px] text-stone-400 font-semibold mt-0.5">${item.category || 'Trusted Employee'}</div>
                        </div>
                    </td>
                    <td class="py-3 text-left">
                        <button onclick="window.viewTiktokUrl('${item.url || ''}', '${item.id}')" class="inline-flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors" title="ดูคลิปวิดีโอ">
                            <i data-lucide="video" class="w-3.5 h-3.5"></i>
                            ดูคลิป
                        </button>
                    </td>
                    <td class="text-center py-3 font-bold text-indigo-600">${viewsCount}</td>
                </tr>
                `;
            }).join('');

            tbody.innerHTML = rowsHtml;
            lucide.createIcons();
        };

        window.changeDeletePage = (direction) => {
            deleteCurrentPage += direction;
            window.renderTiktokDeletedPosts();
        };

        window.onDeletePageSizeChanged = () => {
            const select = document.getElementById('delete-items-per-page');
            if (select) {
                deleteItemsPerPage = parseInt(select.value);
                deleteCurrentPage = 1;
                window.renderTiktokDeletedPosts();
            }
        };

        window.openDuplicateUrlModal = () => {
            const modal = document.getElementById('duplicate-url-modal');
            if (modal) modal.classList.remove('hidden');
            window.renderDuplicateUrlsTable();
        };

        window.closeDuplicateUrlModal = () => {
            const modal = document.getElementById('duplicate-url-modal');
            if (modal) modal.classList.add('hidden');
        };

        window.renderDuplicateUrlsTable = () => {
            const tbody = document.getElementById('duplicate-url-table-body');
            if (!tbody) return;

            // นับจำนวน URL
            const urlCounts = {};
            tiktokPosts.forEach(p => {
                if (p.url && p.url.trim() !== '') {
                    const u = p.url.trim().toLowerCase();
                    urlCounts[u] = (urlCounts[u] || 0) + 1;
                }
            });

            // หาโพสต์ที่มี URL ซ้ำ
            const duplicates = tiktokPosts.filter(p => {
                if (!p.url || p.url.trim() === '') return false;
                const u = p.url.trim().toLowerCase();
                return urlCounts[u] > 1;
            });

            // เรียงลำดับตัวที่ซ้ำกันให้อยู่ใกล้กัน
            duplicates.sort((a, b) => {
                const uA = String(a.url || '').trim().toLowerCase();
                const uB = String(b.url || '').trim().toLowerCase();
                return uA.localeCompare(uB);
            });

            if (duplicates.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบลิงก์ URL ที่ซ้ำกันในระบบ</td></tr>`;
                return;
            }

            let rowsHtml = duplicates.map((item, idx) => {
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(item.employeeId).trim());
                const empName = member ? (member.name || '-') : (item.name || '-');
                const imgUrl = member && (member.profileImage || member.PictureMember)
                    ? (member.profileImage || member.PictureMember)
                    : `https://placehold.co/100x100/e2e8f0/475569?text=${encodeURIComponent(empName.charAt(0))}`;

                const clickCountVal = item.Click_Post !== undefined ? item.Click_Post : (item.Tiktok_view !== undefined ? item.Tiktok_view : 0);
                const viewsCount = Number(clickCountVal).toLocaleString('th-TH');

                return `
                <tr class="hover:bg-rose-50/20 transition-colors">
                    <td class="text-center py-3 font-semibold text-stone-600">${idx + 1}</td>
                    <td class="text-center py-2">
                        <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://placehold.co/100x100/cbd5e1/475569?text=Error';" class="w-10 h-10 rounded-full object-cover mx-auto border border-stone-200 shadow-sm">
                    </td>
                    <td class="text-center py-3 font-bold text-stone-850">${item.employeeId || '-'}</td>
                    <td class="py-3 pl-4 font-semibold text-stone-700 text-left">${empName}</td>
                    <td class="py-2 pl-4 text-left">
                        <div class="${window.getEvaluationBorderClass(item)}">
                            <div class="font-medium text-stone-800 truncate max-w-[200px]" title="${item.title || ''}">${item.title || '-'}</div>
                            <div class="text-[11px] text-stone-400 font-semibold mt-0.5">${item.category || 'Trusted Employee'}</div>
                        </div>
                    </td>
                    <td class="py-3 text-left">
                        <div class="flex flex-col space-y-1">
                            <button onclick="window.viewTiktokUrl('${item.url || ''}', '${item.id}')" class="inline-flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors w-fit" title="ดูคลิปวิดีโอ">
                                <i data-lucide="video" class="w-3.5 h-3.5"></i>
                                ดูคลิป
                            </button>
                            <span class="font-mono text-[10px] text-stone-400 truncate max-w-[180px] block" title="${item.url}">${item.url}</span>
                        </div>
                    </td>
                    <td class="text-center py-3 font-bold text-indigo-600">${viewsCount}</td>
                </tr>
                `;
            }).join('');

            tbody.innerHTML = rowsHtml;
            lucide.createIcons();
        };

        window.openMemoPostsModal = () => {
            const modal = document.getElementById('memo-posts-modal');
            if (modal) modal.classList.remove('hidden');
            window.renderMemoPostsTable();
        };

        window.closeMemoPostsModal = () => {
            const modal = document.getElementById('memo-posts-modal');
            if (modal) modal.classList.add('hidden');
        };

        window.renderMemoPostsTable = () => {
            const tbody = document.getElementById('memo-posts-table-body');
            if (!tbody) return;

            // กรองหาโพสต์ที่มี Memo (ไม่ว่าง และไม่เป็น null)
            const memoPosts = tiktokPosts.filter(p => p.memo && p.memo.trim() !== '');

            // เรียงลำดับตามวันที่แก้ไขล่าสุดหรือการบันทึก
            memoPosts.sort((a, b) => {
                const timeA = a.updatedAt ? (a.updatedAt.seconds || new Date(a.updatedAt).getTime()) : 0;
                const timeB = b.updatedAt ? (b.updatedAt.seconds || new Date(b.updatedAt).getTime()) : 0;
                return timeB - timeA; // ล่าสุดขึ้นก่อน
            });

            if (memoPosts.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบคลิปวิดีโอที่มี Memo ในระบบ</td></tr>`;
                return;
            }

            let rowsHtml = memoPosts.map((item, idx) => {
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(item.employeeId).trim());
                const empName = member ? (member.name || '-') : (item.name || '-');
                const imgUrl = member && (member.profileImage || member.PictureMember)
                    ? (member.profileImage || member.PictureMember)
                    : `https://placehold.co/100x100/e2e8f0/475569?text=${encodeURIComponent(empName.charAt(0))}`;

                const clickCountVal = item.Click_Post !== undefined ? item.Click_Post : (item.Tiktok_view !== undefined ? item.Tiktok_view : 0);
                const viewsCount = Number(clickCountVal).toLocaleString('th-TH');

                return `
                <tr class="hover:bg-amber-50/10 transition-colors">
                    <td class="text-center py-3 font-semibold text-stone-600">${idx + 1}</td>
                    <td class="text-center py-2">
                        <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://placehold.co/100x100/cbd5e1/475569?text=Error';" class="w-10 h-10 rounded-full object-cover mx-auto border border-stone-200 shadow-sm">
                    </td>
                    <td class="text-center py-3 font-bold text-stone-850">${item.employeeId || '-'}</td>
                    <td class="py-3 pl-4 font-semibold text-stone-700 text-left">${empName}</td>
                    <td class="py-2 pl-4 text-left">
                        <div class="${window.getEvaluationBorderClass(item)}">
                            <div class="font-medium text-stone-800 truncate max-w-[200px]" title="${item.title || ''}">${item.title || '-'}</div>
                            <div class="text-[11px] text-stone-400 font-semibold mt-0.5">${item.category || 'Trusted Employee'}</div>
                        </div>
                    </td>
                    <td class="py-3 pl-4 text-left font-semibold text-amber-800 bg-amber-50/40 max-w-[250px] truncate" title="${item.memo}">
                        ${item.memo}
                    </td>
                    <td class="py-3 text-left">
                        <button onclick="window.viewTiktokUrl('${item.url || ''}', '${item.id}')" class="inline-flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors" title="ดูคลิปวิดีโอ">
                            <i data-lucide="video" class="w-3.5 h-3.5"></i>
                            ดูคลิป
                        </button>
                    </td>
                    <td class="text-center py-3 font-bold text-indigo-600">${viewsCount}</td>
                </tr>
                `;
            }).join('');

            tbody.innerHTML = rowsHtml;
            lucide.createIcons();
        };

        window.togglePostsSort = (col) => {
            if (postsSortColumn === col) {
                postsSortDirection = postsSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                postsSortColumn = col;
                postsSortDirection = 'asc';
            }
            renderTiktokPosts();
        };

        const updatePostsSortIcons = () => {
            const cols = ['postIndex', 'employeeId', 'name', 'Tiktok_view', 'title'];
            cols.forEach(col => {
                const iconId = col === 'postIndex' ? 'sort-icon-postIndex' :
                    col === 'employeeId' ? 'sort-icon-postEmployeeId' :
                        col === 'name' ? 'sort-icon-postName' :
                            col === 'Tiktok_view' ? 'sort-icon-postViews' : 'sort-icon-postTitle';
                const el = document.getElementById(iconId);
                if (!el) return;

                if (postsSortColumn === col) {
                    el.innerHTML = postsSortDirection === 'asc'
                        ? `<i data-lucide="arrow-up" class="w-3.5 h-3.5 text-blue-600 inline"></i>`
                        : `<i data-lucide="arrow-down" class="w-3.5 h-3.5 text-blue-600 inline"></i>`;
                } else {
                    el.innerHTML = `<i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-stone-400 opacity-60 inline"></i>`;
                }
            });
            lucide.createIcons();
        };

        // --- RENDER DYNAMIC ANALYTICS REPORTS ---
        // --- REPORT POSTS CHART GLOBALS & HELPERS ---
        window.selectedReportPostsMonth = 'all';
        window.reportPostsChartInstance = null;
        window.selectedRhReportFilter = 'all';
        window.selectedRhPositionReportFilter = 'all';
        window.rhReportChartInstance = null;
        window.rhPositionReportChartInstance = null;
        window.registrationPostingPieChartInstance = null;

        window.populateRhPositionReportFilterButtons = () => {
            const container = document.getElementById('rh-position-report-filter-buttons');
            if (!container) return;
            const rhs = ['all', 'RH-1', 'RH-2', 'RH-3', 'RH-4', 'RH-5'];
            const labels = {
                'all': 'ดูทั้งหมด',
                'RH-1': 'RH-1',
                'RH-2': 'RH-2',
                'RH-3': 'RH-3',
                'RH-4': 'RH-4',
                'RH-5': 'RH-5'
            };
            let html = rhs.map(rh => {
                const checked = window.selectedRhPositionReportFilter === rh ? 'checked' : '';
                return `
                <label class="inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white transition-all">
                    <input type="radio" name="rh-position-report-filter" value="${rh}" ${checked} onchange="window.setRhPositionReportFilter('${rh}')" class="hidden">
                    ${labels[rh]}
                </label>
                `;
            }).join('');
            container.innerHTML = html;
        };

        window.setRhPositionReportFilter = (val) => {
            window.selectedRhPositionReportFilter = val;
            updateReportSection();
        };

        window.populateRhReportFilterButtons = () => {
            const container = document.getElementById('rh-report-filter-buttons');
            if (!container) return;

            // Only populate once or dynamically if needed, to prevent rewriting DOM on every render.
            // Check if already populated or has buttons
            const rhs = ['all', 'RH-1', 'RH-2', 'RH-3', 'RH-4', 'RH-5'];
            const labels = {
                'all': 'ดูทั้งหมด',
                'RH-1': 'RH-1',
                'RH-2': 'RH-2',
                'RH-3': 'RH-3',
                'RH-4': 'RH-4',
                'RH-5': 'RH-5'
            };

            let html = rhs.map(rh => {
                const checked = window.selectedRhReportFilter === rh ? 'checked' : '';
                return `
                <label class="inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white transition-all">
                    <input type="radio" name="rh-report-filter" value="${rh}" ${checked} onchange="window.setRhReportFilter('${rh}')" class="hidden">
                    ${labels[rh]}
                </label>
                `;
            }).join('');

            container.innerHTML = html;
        };

        window.setRhReportFilter = (val) => {
            window.selectedRhReportFilter = val;
            updateReportSection();
        };

        window.populateReportPostsMonthRadios = (filteredPosts) => {
            const container = document.getElementById('report-posts-month-radios');
            if (!container) return;

            const monthsMap = {};
            const thaiMonthShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

            filteredPosts.forEach(p => {
                if (p.postDate) {
                    const parts = p.postDate.split('-');
                    if (parts.length >= 2) {
                        const key = `${parts[0]}-${parts[1]}`;
                        const yearEng = parseInt(parts[0]);
                        const yearThai = yearEng + 543;
                        const monthIndex = parseInt(parts[1]) - 1;
                        if (monthIndex >= 0 && monthIndex < 12) {
                            monthsMap[key] = `${thaiMonthShort[monthIndex]} ${yearThai}`;
                        }
                    }
                }
            });

            const sortedMonthKeys = Object.keys(monthsMap).sort();

            let html = `
                <label class="inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white transition-all">
                    <input type="radio" name="report-posts-month" value="all" ${window.selectedReportPostsMonth === 'all' ? 'checked' : ''} onchange="window.setReportPostsMonth('all')" class="hidden">
                    ทั้งหมด
                </label>
            `;

            sortedMonthKeys.forEach(key => {
                html += `
                    <label class="inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white transition-all">
                        <input type="radio" name="report-posts-month" value="${key}" ${window.selectedReportPostsMonth === key ? 'checked' : ''} onchange="window.setReportPostsMonth('${key}')" class="hidden">
                        ${monthsMap[key]}
                    </label>
                `;
            });

            container.innerHTML = html;

            if (window.selectedReportPostsMonth !== 'all' && !monthsMap[window.selectedReportPostsMonth]) {
                window.selectedReportPostsMonth = 'all';
                const allRadio = container.querySelector('input[value="all"]');
                if (allRadio) allRadio.checked = true;
            }
        };

        window.setReportPostsMonth = (val) => {
            window.selectedReportPostsMonth = val;
            updateReportSection();
        };

        // ฟังก์ชันสร้างตัวคัดกรอง Size, RH, Zone สำหรับรายงานผล
        window.populateReportFilters = () => {
            const sizeSelect = document.getElementById('report-filter-size');
            const rhSelect = document.getElementById('report-filter-rh');
            const zoneSelect = document.getElementById('report-filter-zone');
            if (!sizeSelect || !rhSelect || !zoneSelect) return;

            const selectedSize = sizeSelect.value || 'all';
            const selectedRh = rhSelect.value || 'all';
            const selectedZone = zoneSelect.value || 'all';

            // ดึงข้อมูลตัวคัดกรองที่มีสาขาสัมพันธ์กันจริงๆ มาแสดงผลโดยตรง (Capped Dropdowns)
            // คัดออก (ไม่แสดงผล) หากไม่เข้าเงื่อนไขการเลือกปัจจุบันเลยตามข้อกำหนด
            const validSizes = [...new Set(tiktokBranches
                .filter(b => (selectedRh === 'all' || b.empRH === selectedRh) && (selectedZone === 'all' || b.empZone === selectedZone))
                .map(b => b.empSize).filter(Boolean))].sort();

            const validRHs = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedZone === 'all' || b.empZone === selectedZone))
                .map(b => b.empRH).filter(Boolean))].sort();

            const validZones = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedRh === 'all' || b.empRH === selectedRh))
                .map(b => b.empZone).filter(Boolean))].sort();

            const updateSelectOptions = (selectEl, validOptions, currentValue, placeholder) => {
                let html = `<option value="all">${placeholder}</option>`;
                validOptions.forEach(opt => {
                    const selected = opt === currentValue ? 'selected' : '';
                    html += `<option value="${opt}" ${selected}>${opt}</option>`;
                });
                selectEl.innerHTML = html;
            };

            updateSelectOptions(sizeSelect, validSizes, selectedSize, "ทั้งหมด (Size)");
            updateSelectOptions(rhSelect, validRHs, selectedRh, "ทั้งหมด (RH)");
            updateSelectOptions(zoneSelect, validZones, selectedZone, "ทั้งหมด (Zone)");
        };

        window.onReportFilterChange = () => {
            const sizeSelect = document.getElementById('report-filter-size');
            const rhSelect = document.getElementById('report-filter-rh');
            const zoneSelect = document.getElementById('report-filter-zone');

            let selectedSize = sizeSelect.value;
            let selectedRh = rhSelect.value;
            let selectedZone = zoneSelect.value;

            populateReportFilters();

            if (!Array.from(sizeSelect.options).map(o => o.value).includes(selectedSize)) {
                sizeSelect.value = 'all';
            }
            if (!Array.from(rhSelect.options).map(o => o.value).includes(selectedRh)) {
                rhSelect.value = 'all';
            }
            if (!Array.from(zoneSelect.options).map(o => o.value).includes(selectedZone)) {
                zoneSelect.value = 'all';
            }

            populateReportFilters();
            updateReportSection();
        };

        const updateReportSection = () => {
            const filterSize = document.getElementById('report-filter-size')?.value || 'all';
            const filterRH = document.getElementById('report-filter-rh')?.value || 'all';
            const filterZone = document.getElementById('report-filter-zone')?.value || 'all';

            // คัดกรองสาขาตามตัวคัดกรองระดับบนสุด
            const filteredBranches = tiktokBranches.filter(b => {
                const matchesSize = filterSize === 'all' || b.empSize === filterSize;
                const matchesRH = filterRH === 'all' || b.empRH === filterRH;
                const matchesZone = filterZone === 'all' || b.empZone === filterZone;
                return matchesSize && matchesRH && matchesZone;
            });
            const branchNames = filteredBranches.map(b => b.empBranch);
            const cleanBranchNames = branchNames.map(name => name.trim().toLowerCase());
            const filteredMembers = tiktokMembers.filter(m => m.empBranch && cleanBranchNames.includes(m.empBranch.trim().toLowerCase()));

            // คัดกรองโพสต์ TikTok ที่สังกัดในสาขาที่ผ่านเงื่อนไขการกรองโดยตรงจาก empBranch ในโพสต์
            const filteredPosts = tiktokPosts.filter(p => p.empBranch && cleanBranchNames.includes(p.empBranch.trim().toLowerCase()));
            // 1. พนักงานทั้งหมด (นับรวม empMember ของสาขาพนักงานที่คัดเลือกมาแล้ว)
            const totalEmployeesCount = filteredBranches.reduce((acc, curr) => acc + (Number(curr.empMember) || 0), 0);

            // 2. ลงทะเบียนทั้งหมด (นับจำนวนพนักงานทั้งหมดที่สมัครเข้ามาใน filteredMembers ฟิลด์ MemberStatus = "Registration")
            const registeredMembers = filteredMembers.filter(m => m.MemberStatus === 'Registration');
            const totalRegisteredCount = registeredMembers.length;

            // 3. เข้าร่วมกิจกรรม: พนักงานที่ได้โพสต์และมีสถานะ admin_ok === true หรือ 'true' อย่างน้อย 1 โพสต์ (คิดจาก employeeId ไม่นับซ้ำ)
            const approvedPostedEmpIds = new Set(
                filteredPosts
                    .filter(p => p.admin_ok === true || p.admin_ok === 'true')
                    .map(p => String(p.employeeId).trim())
            );
            const participantCount = approvedPostedEmpIds.size;

            // 4. จำนวนโพสต์ (ตาราง Tiktok_Post ที่มีฟิลด์ admin_ok === true หรือผ่านการอนุมัติ)
            const approvedPostsCount = filteredPosts.filter(p => p.admin_ok === true || p.admin_ok === 'true').length;

            // 5. โพสต์รออนุมัติ (ตาราง Tiktok_Post ที่มีฟิลด์ admin_ok === false หรือไม่ใช่ true)
            const pendingPostsCount = filteredPosts.filter(p => p.admin_ok === false || p.admin_ok === 'false' || p.admin_ok === undefined || p.admin_ok === null).length;

            // 6. สาขาที่เข้าร่วม: นับจากพนักงานที่โพสต์ เอา empBranch ในตารางโพสต์ และไม่นับซ้ำสาขาเดียวกัน
            const uniqueParticipatingBranches = [...new Set(filteredPosts.map(p => p.empBranch).filter(Boolean))];
            const participatingBranchesCount = uniqueParticipatingBranches.filter(b => cleanBranchNames.includes(b.trim().toLowerCase())).length;

            // อัปเดตข้อมูลการแสดงผลสถิติบน DOM ทั้ง 6 แผง
            const totalEmployeesEl = document.getElementById('report-total-employees');
            const registeredApprovedEl = document.getElementById('report-registered-approved');
            const participantsEl = document.getElementById('report-participants');
            const totalPostsEl = document.getElementById('report-total-posts');
            const pendingPostsEl = document.getElementById('report-pending-posts');
            const participatingBranchesEl = document.getElementById('report-participating-branches');

            if (totalEmployeesEl) totalEmployeesEl.innerText = totalEmployeesCount.toLocaleString('th-TH');
            if (registeredApprovedEl) registeredApprovedEl.innerText = totalRegisteredCount.toLocaleString('th-TH');
            if (participantsEl) participantsEl.innerText = participantCount.toLocaleString('th-TH');
            if (totalPostsEl) totalPostsEl.innerText = approvedPostsCount.toLocaleString('th-TH');
            if (pendingPostsEl) pendingPostsEl.innerText = pendingPostsCount.toLocaleString('th-TH');
            if (participatingBranchesEl) participatingBranchesEl.innerText = participatingBranchesCount.toLocaleString('th-TH');

            // --- RENDER TIKTOK POSTS DYNAMIC REPORT CHART ---
            let chartPosts = filteredPosts;
            window.populateReportPostsMonthRadios(filteredPosts);

            const reportEmpIdFilter = document.getElementById('report-posts-filter-emp-id')?.value.trim() || '';
            if (reportEmpIdFilter) {
                chartPosts = chartPosts.filter(p => p.employeeId && String(p.employeeId).trim() === reportEmpIdFilter);
            }

            if (window.selectedReportPostsMonth !== 'all') {
                chartPosts = chartPosts.filter(p => p.postDate && p.postDate.startsWith(window.selectedReportPostsMonth));
            }

            // Update summary info boxes for the chart
            const chartSummaryApprovedEl = document.getElementById('chart-summary-approved');
            const chartSummaryPendingEl = document.getElementById('chart-summary-pending');
            const chartSummaryEmployeesEl = document.getElementById('chart-summary-employees');

            const chartSummaryApprovedCount = chartPosts.filter(p => p.admin_ok === true || p.admin_ok === 'true').length;
            const chartSummaryPendingCount = chartPosts.filter(p => p.admin_ok === false || p.admin_ok === 'false' || p.admin_ok === undefined || p.admin_ok === null).length;
            if (chartSummaryApprovedEl) chartSummaryApprovedEl.innerText = chartSummaryApprovedCount.toLocaleString('th-TH');
            if (chartSummaryPendingEl) chartSummaryPendingEl.innerText = chartSummaryPendingCount.toLocaleString('th-TH');

            const dailyStats = {};
            chartPosts.forEach(p => {
                if (p.postDate) {
                    if (!dailyStats[p.postDate]) {
                        dailyStats[p.postDate] = { approved: 0, pending: 0, employees: new Set() };
                    }
                    const isApproved = (p.admin_ok === true || p.admin_ok === 'true');
                    if (isApproved) {
                        dailyStats[p.postDate].approved++;
                    } else {
                        dailyStats[p.postDate].pending++;
                    }
                    if (p.employeeId) {
                        dailyStats[p.postDate].employees.add(p.employeeId);
                    }
                }
            });

            const sortedReportDates = Object.keys(dailyStats).sort();
            const reportLabels = sortedReportDates;
            const approvedData = sortedReportDates.map(d => dailyStats[d].approved);
            const pendingData = sortedReportDates.map(d => dailyStats[d].pending);
            const uniqueEmployeesData = sortedReportDates.map(d => dailyStats[d].employees.size);

            const reportPostsCtx = document.getElementById('reportPostsChart')?.getContext('2d');
            if (reportPostsCtx) {
                if (window.reportPostsChartInstance) {
                    window.reportPostsChartInstance.destroy();
                }

                const topTotalPlugin = {
                    id: 'topTotalPlugin',
                    afterDatasetsDraw(chart) {
                        const { ctx, scales: { x, y } } = chart;
                        ctx.save();
                        ctx.font = 'bold 10px Kanit';
                        ctx.fillStyle = '#475569';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';

                        const totals = [];
                        const xCoords = [];
                        const yCoords = [];

                        chart.data.datasets.forEach((dataset, datasetIndex) => {
                            if (datasetIndex === 0) return; // skip line dataset
                            const meta = chart.getDatasetMeta(datasetIndex);
                            if (meta.hidden) return;

                            dataset.data.forEach((val, i) => {
                                totals[i] = (totals[i] || 0) + (val || 0);
                                if (meta.data[i]) {
                                    xCoords[i] = meta.data[i].x;
                                    yCoords[i] = yCoords[i] !== undefined ? Math.min(yCoords[i], meta.data[i].y) : meta.data[i].y;
                                }
                            });
                        });

                        totals.forEach((total, i) => {
                            if (total > 0 && xCoords[i] !== undefined && yCoords[i] !== undefined) {
                                ctx.fillText(total, xCoords[i], yCoords[i] - 5);
                            }
                        });
                        ctx.restore();
                    }
                };

                window.reportPostsChartInstance = new Chart(reportPostsCtx, {
                    type: 'bar',
                    data: {
                        labels: reportLabels,
                        datasets: [
                            {
                                type: 'line',
                                label: 'จำนวนพนักงาน',
                                data: uniqueEmployeesData,
                                borderColor: '#000000',
                                borderDash: [5, 5],
                                borderWidth: 2,
                                fill: false,
                                pointBackgroundColor: '#000000',
                                tension: 0.2,
                                yAxisID: 'y'
                            },
                            {
                                type: 'bar',
                                label: 'โพสต์อนุมัติแล้ว',
                                data: approvedData,
                                backgroundColor: '#10b981',
                                stack: 'posts',
                                yAxisID: 'y'
                            },
                            {
                                type: 'bar',
                                label: 'โพสต์อยู่ระหว่างตรวจสอบ',
                                data: pendingData,
                                backgroundColor: '#94a3b8',
                                stack: 'posts',
                                yAxisID: 'y'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { font: { family: 'Kanit' } }
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                position: 'left',
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            }
                        }
                    },
                    plugins: [topTotalPlugin]
                });
            }

            // ฝั่งซ้าย (50%): กราฟแท่งจัดสรร "จำนวนไอเดียทำคลิป" โดยนับเฉพาะคีย์ประเภทที่ admin_ok === true เท่านั้น
            const categories = {
                'Trusted Employee': { count: 0, label: 'Trusted Employee (รู้จักฉัน รู้จักสาขา)' },
                'Financial Knowledge': { count: 0, label: 'Financial Knowledge (ให้ความรู้ด้านการเงิน)' },
                'Product': { count: 0, label: 'Product (แนะนำผลิตภัณฑ์ ttb)' },
                'Scam Alert': { count: 0, label: 'Scam Alert (รู้ทันมิจฉาชีพ)' }
            };

            filteredPosts.forEach(p => {
                if (p.admin_ok === true || p.admin_ok === 'true') {
                    const cat = p.category || 'Trusted Employee';
                    const foundKey = Object.keys(categories).find(k => k.toLowerCase() === cat.toLowerCase().trim());
                    if (foundKey) {
                        categories[foundKey].count++;
                    } else {
                        categories['Trusted Employee'].count++; // Fallback
                    }
                }
            });

            const catDistributionContainer = document.getElementById('category-distribution-bars');
            if (catDistributionContainer) {
                const maxCatCount = Math.max(...Object.values(categories).map(c => c.count), 1);
                const colors = {
                    'Trusted Employee': 'bg-blue-500',
                    'Financial Knowledge': 'bg-emerald-500',
                    'Product': 'bg-amber-500',
                    'Scam Alert': 'bg-rose-500'
                };
                catDistributionContainer.innerHTML = Object.entries(categories).map(([key, info]) => {
                    const pct = (info.count / maxCatCount) * 100;
                    const colorClass = colors[key] || 'bg-indigo-600';
                    return `
                    <div class="space-y-1">
                        <div class="flex justify-between text-[12.5px] font-bold text-stone-700">
                            <span>${info.label}</span>
                            <span>${info.count.toLocaleString('th-TH')} โพสต์</span>
                        </div>
                        <div class="w-full bg-stone-100 rounded-full h-3">
                            <div class="${colorClass} h-3 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                        </div>
                    </div>
                    `;
                }).join('');
            }

            // คำนวณความต้องการเรื่องจำนวนผู้ร่วมกิจกรรม แยกราย RH (กล่องรายงานผลใหม่)
            const rhEmployeeTotals = {}; // empRH -> sum of empMember
            const rhParticipants = {}; // empRH -> Set of unique employeeIds

            // คำนวณหาจำนวนพนักงานทั้งหมดใน RH ปัจจุบันที่ผ่านเกณฑ์กรอง
            filteredBranches.forEach(b => {
                const rh = b.empRH || 'ไม่ระบุ';
                if (!rhEmployeeTotals[rh]) rhEmployeeTotals[rh] = 0;
                rhEmployeeTotals[rh] += (Number(b.empMember) || 0);
            });

            // คำนวณหาจำนวนผู้เข้าร่วม (Unique EmployeeId) ใน RH ปัจจุบันจาก Tiktok_Post
            filteredPosts.forEach(p => {
                const empId = p.employeeId;
                if (!empId) return;

                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(empId).trim());
                if (member && member.empBranch) {
                    const br = tiktokBranches.find(b => b.empBranch === member.empBranch);
                    const rh = br?.empRH || 'ไม่ระบุ';

                    if (!rhParticipants[rh]) rhParticipants[rh] = new Set();
                    rhParticipants[rh].add(empId);
                }
            });

            const allRHs = [...new Set([
                ...Object.keys(rhEmployeeTotals),
                ...Object.keys(rhParticipants)
            ])].sort();

            const rhParticipantsBars = document.getElementById('rh-participants-bars');
            if (rhParticipantsBars) {
                if (allRHs.length === 0) {
                    rhParticipantsBars.innerHTML = `<p class="text-stone-400 italic text-[13px] text-center py-4">ไม่มีข้อมูล RH ในระบบ</p>`;
                } else {
                    rhParticipantsBars.innerHTML = allRHs.map(rh => {
                        const totalEmp = rhEmployeeTotals[rh] || 0;
                        const partCount = rhParticipants[rh] ? rhParticipants[rh].size : 0;
                        const pct = totalEmp > 0 ? (partCount / totalEmp) * 100 : 0;

                        return `
                        <div class="space-y-1">
                            <div class="flex justify-between text-[12.5px] font-bold text-stone-700">
                                <span>${rh}</span>
                                <span>พนักงาน : ${partCount} จาก: ${totalEmp} คน (${pct.toFixed(1)}%)</span>
                            </div>
                            <div class="w-full bg-stone-100 rounded-full h-3 flex overflow-hidden">
                                <div class="bg-indigo-500 h-full rounded-l transition-all duration-500" style="width: ${pct}%"></div>
                                <div class="bg-stone-200 h-full flex-1"></div>
                            </div>
                        </div>
                        `;
                    }).join('');
                }
            }
            // สัดส่วนตำแหน่งพนักงานลงทะเบียน
            const posCounts = {};
            registeredMembers.forEach(m => {
                const pos = (m.empPosition || 'ไม่ระบุตำแหน่ง').trim();
                posCounts[pos] = (posCounts[pos] || 0) + 1;
            });

            const uniqueGlobalPositions = [...new Set(tiktokMembers.map(m => (m.empPosition || 'ไม่ระบุตำแหน่ง').trim()))].sort();
            const standardPositionColors = [
                'rgba(59, 130, 246, 0.85)',   // Blue
                'rgba(16, 185, 129, 0.85)',  // Green
                'rgba(245, 158, 11, 0.85)',   // Amber
                'rgba(239, 68, 68, 0.85)',    // Red
                'rgba(139, 92, 246, 0.85)',   // Purple
                'rgba(236, 72, 153, 0.85)',   // Pink
                'rgba(20, 184, 166, 0.85)',   // Teal
                'rgba(249, 115, 22, 0.85)',   // Orange
                'rgba(107, 114, 128, 0.85)',  // Gray
                'rgba(79, 70, 229, 0.85)'     // Indigo
            ];

            const getPositionColor = (pos) => {
                const idx = uniqueGlobalPositions.indexOf(pos);
                return standardPositionColors[idx >= 0 ? (idx % standardPositionColors.length) : 0];
            };

            const sortedPosLabels = Object.keys(posCounts).sort();
            const posData = sortedPosLabels.map(p => posCounts[p]);
            const posBgColors = sortedPosLabels.map(p => getPositionColor(p));

            const pieCtx = document.getElementById('registrationPostingPieChart')?.getContext('2d');
            if (pieCtx) {
                if (window.registrationPostingPieChartInstance) {
                    window.registrationPostingPieChartInstance.destroy();
                }

                const doughnutCenterAndSliceLabelsPlugin = {
                    id: 'doughnutCenterAndSliceLabelsPlugin',
                    beforeDraw(chart) {
                        const { ctx, width, height } = chart;
                        ctx.restore();

                        ctx.font = "bold 13px Kanit";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = "#475569";
                        ctx.textAlign = "center";

                        const text1 = "ลงทะเบียนรวม";
                        const text2 = `${totalRegisteredCount} คน`;

                        const centerX = chart.getDatasetMeta(0).data[0]?.x || (width / 2);
                        const centerY = chart.getDatasetMeta(0).data[0]?.y || (height / 2);

                        ctx.fillText(text1, centerX, centerY - 10);
                        ctx.font = "bold 20px Kanit";
                        ctx.fillStyle = "#0056ff";
                        ctx.fillText(text2, centerX, centerY + 12);

                        ctx.save();
                    },
                    afterDatasetsDraw(chart) {
                        const { ctx } = chart;
                        ctx.save();

                        chart.data.datasets.forEach((dataset, datasetIdx) => {
                            const meta = chart.getDatasetMeta(datasetIdx);
                            meta.data.forEach((element, index) => {
                                const dataVal = dataset.data[index];
                                if (!dataVal || dataVal === 0) return;

                                const view = element;
                                const startAngle = view.startAngle;
                                const endAngle = view.endAngle;
                                const middleAngle = startAngle + (endAngle - startAngle) / 2;

                                const outerRadius = view.outerRadius;
                                const innerRadius = view.innerRadius;
                                const middleRadius = innerRadius + (outerRadius - innerRadius) / 2;

                                const x = view.x + Math.cos(middleAngle) * middleRadius;
                                const y = view.y + Math.sin(middleAngle) * middleRadius;

                                ctx.font = "bold 11px Kanit";
                                ctx.fillStyle = "#ffffff";
                                ctx.textAlign = "center";
                                ctx.textBaseline = "middle";

                                ctx.fillText(dataVal, x, y);
                            });
                        });
                        ctx.restore();
                    }
                };

                window.registrationPostingPieChartInstance = new Chart(pieCtx, {
                    type: 'doughnut',
                    data: {
                        labels: sortedPosLabels,
                        datasets: [{
                            data: posData,
                            backgroundColor: posBgColors,
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        cutout: '65%'
                    },
                    plugins: [doughnutCenterAndSliceLabelsPlugin]
                });
            }

            const legendEl = document.getElementById('pie-chart-legend-info');
            if (legendEl) {
                legendEl.innerHTML = sortedPosLabels.map(p => {
                    const count = posCounts[p];
                    const pct = totalRegisteredCount > 0 ? (count / totalRegisteredCount * 100).toFixed(1) : 0;
                    const color = getPositionColor(p);
                    return `
                        <div class="flex items-center gap-1.5 text-[11px] font-bold">
                            <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${color}"></span>
                            <span class="text-stone-600">${p}: <span class="text-stone-850">${count} คน (${pct}%)</span></span>
                        </div>
                    `;
                }).join('');
            }

            // --- RENDER RH ZONE-BASED CHART ---
            window.populateRhReportFilterButtons();



            const zoneStats = {};

            // Initialize zones from all tiktokBranches that match the selected RH filter (space-insensitive)
            tiktokBranches.forEach(b => {
                const zone = b.empZone || 'ไม่ระบุเขต';
                const rh = b.empRH || 'ไม่ระบุ';
                const cleanRh = rh.replace(/\s+/g, '').toLowerCase();
                const cleanFilter = window.selectedRhReportFilter.replace(/\s+/g, '').toLowerCase();

                if (window.selectedRhReportFilter !== 'all' && cleanRh !== cleanFilter) {
                    return;
                }
                if (!zoneStats[zone]) {
                    zoneStats[zone] = { approved: 0, pending: 0, employees: new Set(), rh: rh };
                }
            });

            // Aggregate metrics from all tiktokPosts using direct empBranch field
            tiktokPosts.forEach(p => {
                const branchName = p.empBranch;
                if (!branchName) return;

                const br = tiktokBranches.find(b => b.empBranch === branchName);
                if (br) {
                    const zone = br.empZone || 'ไม่ระบุเขต';
                    const rh = br.empRH || 'ไม่ระบุ';
                    const cleanRh = rh.replace(/\s+/g, '').toLowerCase();
                    const cleanFilter = window.selectedRhReportFilter.replace(/\s+/g, '').toLowerCase();

                    if (window.selectedRhReportFilter !== 'all' && cleanRh !== cleanFilter) {
                        return;
                    }

                    if (!zoneStats[zone]) {
                        zoneStats[zone] = { approved: 0, pending: 0, employees: new Set(), rh: rh };
                    }

                    const isApproved = (p.admin_ok === true || p.admin_ok === 'true');
                    if (isApproved) {
                        zoneStats[zone].approved++;
                    } else {
                        zoneStats[zone].pending++;
                    }
                    if (p.employeeId) {
                        zoneStats[zone].employees.add(p.employeeId);
                    }
                }
            });

            // Calculate total posts in the filtered RH
            let totalPostsInFilteredRH = 0;
            Object.values(zoneStats).forEach(z => {
                totalPostsInFilteredRH += (z.approved || 0) + (z.pending || 0);
            });
            const totalPostSpan = document.getElementById('rh-report-total-posts');
            if (totalPostSpan) {
                totalPostSpan.innerText = `${totalPostsInFilteredRH.toLocaleString('th-TH')} โพสต์`;
            }

            const sortedZones = Object.keys(zoneStats).sort((a, b) => {
                const rhA = zoneStats[a].rh || '';
                const rhB = zoneStats[b].rh || '';
                const compareRh = rhA.localeCompare(rhB, 'th', { numeric: true });
                if (compareRh !== 0) return compareRh;
                return a.localeCompare(b, 'th');
            });
            const zoneLabels = sortedZones.map(z => [z, zoneStats[z].rh || 'ไม่ระบุ']);
            const zoneApprovedData = sortedZones.map(z => zoneStats[z].approved);
            const zonePendingData = sortedZones.map(z => zoneStats[z].pending);
            const zoneEmployeesData = sortedZones.map(z => zoneStats[z].employees.size);

            const baseColors = {
                'RH-1': { approved: 'rgba(59, 130, 246, 1)', pending: 'rgba(59, 130, 246, 0.4)' },
                'RH-2': { approved: 'rgba(16, 185, 129, 1)', pending: 'rgba(16, 185, 129, 0.4)' },
                'RH-3': { approved: 'rgba(245, 158, 11, 1)', pending: 'rgba(245, 158, 11, 0.4)' },
                'RH-4': { approved: 'rgba(239, 68, 68, 1)', pending: 'rgba(239, 68, 68, 0.4)' },
                'RH-5': { approved: 'rgba(139, 92, 246, 1)', pending: 'rgba(139, 92, 246, 0.4)' }
            };
            const defaultColors = { approved: 'rgba(148, 163, 184, 1)', pending: 'rgba(148, 163, 184, 0.4)' };

            const approvedColors = sortedZones.map(z => {
                const rh = zoneStats[z].rh;
                return baseColors[rh]?.approved || defaultColors.approved;
            });

            const pendingColors = sortedZones.map(z => {
                const rh = zoneStats[z].rh;
                return baseColors[rh]?.pending || defaultColors.pending;
            });

            const rhReportCtx = document.getElementById('rhReportChart')?.getContext('2d');
            if (rhReportCtx) {
                if (window.rhReportChartInstance) {
                    window.rhReportChartInstance.destroy();
                }

                const topTotalPlugin = {
                    id: 'topTotalPlugin',
                    afterDatasetsDraw(chart) {
                        const { ctx, scales: { x, y } } = chart;
                        ctx.save();
                        ctx.font = 'bold 10px Kanit';
                        ctx.fillStyle = '#475569';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';

                        const totals = [];
                        const xCoords = [];
                        const yCoords = [];

                        chart.data.datasets.forEach((dataset, datasetIndex) => {
                            if (datasetIndex === 0) return; // skip line dataset
                            const meta = chart.getDatasetMeta(datasetIndex);
                            if (meta.hidden) return;

                            dataset.data.forEach((val, i) => {
                                totals[i] = (totals[i] || 0) + (val || 0);
                                if (meta.data[i]) {
                                    xCoords[i] = meta.data[i].x;
                                    yCoords[i] = yCoords[i] !== undefined ? Math.min(yCoords[i], meta.data[i].y) : meta.data[i].y;
                                }
                            });
                        });

                        totals.forEach((total, i) => {
                            if (total > 0 && xCoords[i] !== undefined && yCoords[i] !== undefined) {
                                ctx.fillText(total, xCoords[i], yCoords[i] - 5);
                            }
                        });
                        ctx.restore();
                    }
                };

                window.rhReportChartInstance = new Chart(rhReportCtx, {
                    type: 'bar',
                    data: {
                        labels: zoneLabels,
                        datasets: [
                            {
                                type: 'line',
                                label: 'จำนวนพนักงาน',
                                data: zoneEmployeesData,
                                borderColor: '#000000',
                                borderDash: [5, 5],
                                borderWidth: 2,
                                fill: false,
                                pointBackgroundColor: '#000000',
                                tension: 0.2,
                                yAxisID: 'y'
                            },
                            {
                                type: 'bar',
                                label: 'โพสต์อนุมัติแล้ว',
                                data: zoneApprovedData,
                                backgroundColor: approvedColors,
                                stack: 'posts',
                                yAxisID: 'y'
                            },
                            {
                                type: 'bar',
                                label: 'โพสต์อยู่ระหว่างตรวจสอบ',
                                data: zonePendingData,
                                backgroundColor: pendingColors,
                                stack: 'posts',
                                yAxisID: 'y'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { font: { family: 'Kanit' } }
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                position: 'left',
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            }
                        }
                    },
                    plugins: [topTotalPlugin]
                });
            }

            // --- RENDER RH POSITION-BASED CHART (NEW) ---
            window.populateRhPositionReportFilterButtons();
            const rhPositionReportCtx = document.getElementById('rhPositionReportChart')?.getContext('2d');
            if (rhPositionReportCtx) {
                if (window.rhPositionReportChartInstance) {
                    window.rhPositionReportChartInstance.destroy();
                }

                const zonePositionStats = {};
                const allPositionsSet = new Set();

                // Initialize zones from branches matching filter
                tiktokBranches.forEach(b => {
                    const zone = b.empZone || 'ไม่ระบุเขต';
                    const rh = b.empRH || 'ไม่ระบุ';
                    const cleanRh = rh.replace(/\s+/g, '').toLowerCase();
                    const cleanFilter = window.selectedRhPositionReportFilter.replace(/\s+/g, '').toLowerCase();

                    if (window.selectedRhPositionReportFilter !== 'all' && cleanRh !== cleanFilter) {
                        return;
                    }
                    if (!zonePositionStats[zone]) {
                        zonePositionStats[zone] = { postsCount: 0, positions: {}, rh: rh };
                    }
                });

                // Count positions of employees per zone (only count approved employees)
                tiktokMembers.forEach(m => {
                    const isApproved = (m.admin_ok === true || m.admin_ok === 'true' || m.admin_ok === 1 || m.admin_ok === '1' || m.MemberStatus === 'Registration');
                    if (!isApproved) return;

                    const branchName = m.empBranch;
                    if (!branchName) return;

                    const br = tiktokBranches.find(b => b.empBranch === branchName);
                    if (br) {
                        const zone = br.empZone || 'ไม่ระบุเขต';
                        const rh = br.empRH || 'ไม่ระบุ';
                        const cleanRh = rh.replace(/\s+/g, '').toLowerCase();
                        const cleanFilter = window.selectedRhPositionReportFilter.replace(/\s+/g, '').toLowerCase();

                        if (window.selectedRhPositionReportFilter !== 'all' && cleanRh !== cleanFilter) {
                            return;
                        }

                        if (!zonePositionStats[zone]) {
                            zonePositionStats[zone] = { postsCount: 0, positions: {}, rh: rh };
                        }

                        const position = (m.empPosition || 'ไม่ระบุตำแหน่ง').trim();
                        if (position) {
                            allPositionsSet.add(position);
                            zonePositionStats[zone].positions[position] = (zonePositionStats[zone].positions[position] || 0) + 1;
                        }
                    }
                });

                // Aggregate post count per zone (only count approved posts)
                tiktokPosts.forEach(p => {
                    const isPostApproved = (p.admin_ok === true || p.admin_ok === 'true');
                    if (!isPostApproved) return;

                    const branchName = p.empBranch;
                    if (!branchName) return;

                    const br = tiktokBranches.find(b => b.empBranch === branchName);
                    if (br) {
                        const zone = br.empZone || 'ไม่ระบุเขต';
                        const rh = br.empRH || 'ไม่ระบุ';
                        const cleanRh = rh.replace(/\s+/g, '').toLowerCase();
                        const cleanFilter = window.selectedRhPositionReportFilter.replace(/\s+/g, '').toLowerCase();

                        if (window.selectedRhPositionReportFilter !== 'all' && cleanRh !== cleanFilter) {
                            return;
                        }

                        if (!zonePositionStats[zone]) {
                            zonePositionStats[zone] = { postsCount: 0, positions: {}, rh: rh };
                        }

                        zonePositionStats[zone].postsCount++;
                    }
                });

                const sortedZonesPos = Object.keys(zonePositionStats).sort((a, b) => {
                    const rhA = zonePositionStats[a].rh || '';
                    const rhB = zonePositionStats[b].rh || '';
                    const compareRh = rhA.localeCompare(rhB, 'th', { numeric: true });
                    if (compareRh !== 0) return compareRh;
                    return a.localeCompare(b, 'th');
                });

                const zonePosLabels = sortedZonesPos.map(z => [z, zonePositionStats[z].rh || 'ไม่ระบุ']);
                const zonePostsData = sortedZonesPos.map(z => zonePositionStats[z].postsCount);

                const positionList = Array.from(allPositionsSet).sort();

                let totalEmployeesInFilteredRH = 0;
                Object.values(zonePositionStats).forEach(stat => {
                    Object.values(stat.positions).forEach(count => {
                        totalEmployeesInFilteredRH += count;
                    });
                });
                const totalEmpSpan = document.getElementById('rh-position-total-employees');
                if (totalEmpSpan) {
                    totalEmpSpan.innerText = `${totalEmployeesInFilteredRH.toLocaleString('th-TH')} คน`;
                }

                const posDatasets = positionList.map(pos => {
                    const data = sortedZonesPos.map(z => zonePositionStats[z].positions[pos] || 0);
                    return {
                        type: 'bar',
                        label: pos,
                        data: data,
                        backgroundColor: getPositionColor(pos),
                        stack: 'positions',
                        yAxisID: 'y'
                    };
                });

                // Add line dataset for total posts count
                posDatasets.unshift({
                    type: 'line',
                    label: 'จำนวนโพสต์รวม',
                    data: zonePostsData,
                    borderColor: '#0056ff', // Blue dashed line
                    borderDash: [5, 5],
                    borderWidth: 2.5,
                    fill: false,
                    pointBackgroundColor: '#0056ff',
                    pointRadius: 4,
                    tension: 0.2,
                    yAxisID: 'yPosts'
                });

                const topTotalPosPlugin = {
                    id: 'topTotalPosPlugin',
                    afterDatasetsDraw(chart) {
                        const { ctx, scales: { x, y } } = chart;
                        ctx.save();
                        ctx.font = 'bold 10px Kanit';
                        ctx.fillStyle = '#475569';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';

                        const totals = [];
                        const xCoords = [];
                        const yCoords = [];

                        chart.data.datasets.forEach((dataset, datasetIndex) => {
                            if (datasetIndex === 0) return; // skip line dataset
                            const meta = chart.getDatasetMeta(datasetIndex);
                            if (meta.hidden) return;

                            dataset.data.forEach((val, i) => {
                                totals[i] = (totals[i] || 0) + (val || 0);
                                if (meta.data[i]) {
                                    xCoords[i] = meta.data[i].x;
                                    yCoords[i] = yCoords[i] !== undefined ? Math.min(yCoords[i], meta.data[i].y) : meta.data[i].y;
                                }
                            });
                        });

                        totals.forEach((total, i) => {
                            if (total > 0 && xCoords[i] !== undefined && yCoords[i] !== undefined) {
                                ctx.fillText(total, xCoords[i], yCoords[i] - 5);
                            }
                        });
                        ctx.restore();
                    }
                };

                window.rhPositionReportChartInstance = new Chart(rhPositionReportCtx, {
                    type: 'bar',
                    data: {
                        labels: zonePosLabels,
                        datasets: posDatasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { font: { family: 'Kanit' } }
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'จำนวนพนักงานตามตำแหน่ง (คน)',
                                    font: { family: 'Kanit', weight: 'bold' }
                                },
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            },
                            yPosts: {
                                stacked: false,
                                beginAtZero: true,
                                position: 'right',
                                title: {
                                    display: true,
                                    text: 'จำนวนโพสต์รวม (ครั้ง)',
                                    font: { family: 'Kanit', weight: 'bold' }
                                },
                                grid: { drawOnChartArea: false },
                                ticks: { font: { family: 'Kanit' } }
                            }
                        }
                    },
                    plugins: [topTotalPosPlugin]
                });
            }

            // Call top charts update
            window.populateTopChartsMonthOptions();
            window.updateTopBranchesReport();
            window.updateTopEmployeesReport();
            window.populatePositionFilterOptions();
            window.updatePositionPostsReport();
        };

        window.populatePositionFilterOptions = () => {
            const container = document.getElementById('position-checkbox-container');
            if (!container) return;

            // Get unique positions from tiktokMembers
            const uniquePositions = [...new Set(tiktokMembers.map(m => (m.empPosition || 'ไม่ระบุตำแหน่ง').trim()))]
                .filter(p => p !== '')
                .sort();

            const existingCheckboxes = container.querySelectorAll('input[name="pos-checkbox"]');
            if (existingCheckboxes.length === uniquePositions.length) {
                return;
            }

            let html = `
                <label class="flex items-center gap-1 cursor-pointer select-none text-[11px] font-bold">
                    <input type="checkbox" id="pos-check-all" checked onchange="window.toggleAllPositionCheckboxes(this)" class="rounded border-stone-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5">
                    <span>ทั้งหมด</span>
                </label>
            `;
            uniquePositions.forEach(p => {
                html += `
                    <label class="flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-stone-600">
                        <input type="checkbox" name="pos-checkbox" value="${p}" checked onchange="window.onPositionCheckboxChange()" class="rounded border-stone-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5">
                        <span>${p}</span>
                    </label>
                `;
            });
            container.innerHTML = html;
        };

        window.toggleAllPositionCheckboxes = (master) => {
            const checkboxes = document.getElementsByName('pos-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = master.checked;
            });
            window.updatePositionPostsReport();
        };

        window.onPositionCheckboxChange = () => {
            const checkboxes = document.getElementsByName('pos-checkbox');
            const master = document.getElementById('pos-check-all');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            const noneChecked = Array.from(checkboxes).every(cb => !cb.checked);

            if (master) {
                master.checked = allChecked;
                master.indeterminate = !allChecked && !noneChecked;
            }
            window.updatePositionPostsReport();
        };

        window.toggleAllCategoryCheckboxes = (master) => {
            const checkboxes = document.getElementsByName('cat-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = master.checked;
            });
            window.updatePositionPostsReport();
        };

        window.onCategoryCheckboxChange = () => {
            const checkboxes = document.getElementsByName('cat-checkbox');
            const master = document.getElementById('cat-check-all');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            const noneChecked = Array.from(checkboxes).every(cb => !cb.checked);

            if (master) {
                master.checked = allChecked;
                master.indeterminate = !allChecked && !noneChecked;
            }
            window.updatePositionPostsReport();
        };

        window.toggleAllRhCheckboxes = (master) => {
            const checkboxes = document.getElementsByName('rh-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = master.checked;
            });
            window.updatePositionPostsReport();
        };

        window.onRhCheckboxChange = () => {
            const checkboxes = document.getElementsByName('rh-checkbox');
            const master = document.getElementById('rh-check-all');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            const noneChecked = Array.from(checkboxes).every(cb => !cb.checked);

            if (master) {
                master.checked = allChecked;
                master.indeterminate = !allChecked && !noneChecked;
            }
            window.updatePositionPostsReport();
        };

        window.updatePositionPostsReport = () => {
            const checkboxes = document.getElementsByName('pos-checkbox');
            const rawSelectedPositions = [];
            checkboxes.forEach(cb => {
                if (cb.checked) rawSelectedPositions.push(cb.value);
            });

            // Exclude specified positions from แกน x
            const excludedPositions = ['ที่ปรึกษาการเงินลูกค้าบุคคล', 'สำนักงานใหญ่'];
            const selectedPositions = rawSelectedPositions.filter(pos => !excludedPositions.includes(pos));

            const catCheckboxes = document.getElementsByName('cat-checkbox');
            const selectedCategories = [];
            catCheckboxes.forEach(cb => {
                if (cb.checked) selectedCategories.push(cb.value.toLowerCase().trim());
            });

            const rhCheckboxes = document.getElementsByName('rh-checkbox');
            const selectedRHs = [];
            rhCheckboxes.forEach(cb => {
                if (cb.checked) selectedRHs.push(cb.value.toLowerCase().trim());
            });

            const ctx = document.getElementById('positionPostsReportChart')?.getContext('2d');
            if (!ctx) return;

            if (window.positionPostsReportChartInstance) {
                window.positionPostsReportChartInstance.destroy();
            }

            if (selectedPositions.length === 0 || selectedCategories.length === 0 || selectedRHs.length === 0) {
                // Clear summary elements
                document.getElementById('pos-report-total-employees').innerText = '0 คน';
                document.getElementById('pos-report-total-clips').innerText = '0 คลิป';
                document.getElementById('pos-report-avg-clips').innerText = '0 คลิป/คน';
                return;
            }

            // Colors mapping matching the Position & RH report card
            const uniqueGlobalPositions = [...new Set(tiktokMembers.map(m => (m.empPosition || 'ไม่ระบุตำแหน่ง').trim()))].sort();
            const standardPositionColors = [
                'rgba(59, 130, 246, 0.85)',   // Blue
                'rgba(16, 185, 129, 0.85)',  // Green
                'rgba(245, 158, 11, 0.85)',   // Amber
                'rgba(239, 68, 68, 0.85)',    // Red
                'rgba(139, 92, 246, 0.85)',   // Purple
                'rgba(236, 72, 153, 0.85)',   // Pink
                'rgba(20, 184, 166, 0.85)',   // Teal
                'rgba(249, 115, 22, 0.85)',   // Orange
                'rgba(107, 114, 128, 0.85)',  // Gray
                'rgba(79, 70, 229, 0.85)'     // Indigo
            ];
            const getPositionColor = (pos) => {
                const idx = uniqueGlobalPositions.indexOf(pos);
                return standardPositionColors[idx >= 0 ? (idx % standardPositionColors.length) : 0];
            };

            let labels = [];
            let postsData = [];
            let uniqueEmployeesData = [];
            let bgColors = [];
            let chartLabel = '';

            // Calculate summaries for the active selected positions & categories & RHs
            const summaryEmpSet = new Set();
            let summaryClipsCount = 0;

            tiktokPosts.forEach(p => {
                if (p.admin_ok !== true && p.admin_ok !== 'true') return;

                // Filter by category
                const catVal = (p.category || '').toLowerCase().trim();
                if (!selectedCategories.includes(catVal)) return;

                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(p.employeeId).trim());
                if (!member) return;

                const pos = (member.empPosition || 'ไม่ระบุตำแหน่ง').trim();
                if (excludedPositions.includes(pos) || !selectedPositions.includes(pos)) return;

                // Filter by RH
                const br = tiktokBranches.find(b => b.empBranch === member.empBranch);
                const rh = (br?.empRH || 'ไม่ระบุ').toLowerCase().trim();
                if (!selectedRHs.includes(rh)) return;

                summaryEmpSet.add(p.employeeId);
                summaryClipsCount++;
            });

            // Update Summary Badges
            const summaryEmpCount = summaryEmpSet.size;
            const avgClipsPerPerson = summaryEmpCount > 0 ? (summaryClipsCount / summaryEmpCount).toFixed(2) : '0';

            document.getElementById('pos-report-total-employees').innerText = `${summaryEmpCount} คน`;
            document.getElementById('pos-report-total-clips').innerText = `${summaryClipsCount} คลิป`;
            document.getElementById('pos-report-avg-clips').innerText = `${avgClipsPerPerson} คลิป/คน`;

            if (selectedPositions.length > 1) {
                // Group by Position
                const posStats = {};
                selectedPositions.forEach(pos => {
                    posStats[pos] = { postsCount: 0, employees: new Set() };
                });

                tiktokPosts.forEach(p => {
                    if (p.admin_ok !== true && p.admin_ok !== 'true') return;
                    const catVal = (p.category || '').toLowerCase().trim();
                    if (!selectedCategories.includes(catVal)) return;

                    const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(p.employeeId).trim());
                    if (!member) return;

                    const pos = (member.empPosition || 'ไม่ระบุตำแหน่ง').trim();
                    if (excludedPositions.includes(pos)) return;

                    // Filter by RH
                    const br = tiktokBranches.find(b => b.empBranch === member.empBranch);
                    const rh = (br?.empRH || 'ไม่ระบุ').toLowerCase().trim();
                    if (!selectedRHs.includes(rh)) return;

                    if (posStats[pos]) {
                        posStats[pos].postsCount++;
                        posStats[pos].employees.add(p.employeeId);
                    }
                });

                labels = Object.keys(posStats).sort();
                postsData = labels.map(l => posStats[l].postsCount);
                uniqueEmployeesData = labels.map(l => posStats[l].employees.size);
                bgColors = labels.map(pos => getPositionColor(pos));
                chartLabel = 'จำนวนโพสต์และพนักงานแยกตามตำแหน่งงาน';
            } else {
                // Group by Post Title for the single selected position
                const singlePos = selectedPositions[0];
                const titleStats = {};

                tiktokPosts.forEach(p => {
                    if (p.admin_ok !== true && p.admin_ok !== 'true') return;
                    const catVal = (p.category || '').toLowerCase().trim();
                    if (!selectedCategories.includes(catVal)) return;

                    const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(p.employeeId).trim());
                    if (!member) return;

                    const pos = (member.empPosition || 'ไม่ระบุตำแหน่ง').trim();
                    if (excludedPositions.includes(pos)) return;

                    // Filter by RH
                    const br = tiktokBranches.find(b => b.empBranch === member.empBranch);
                    const rh = (br?.empRH || 'ไม่ระบุ').toLowerCase().trim();
                    if (!selectedRHs.includes(rh)) return;

                    if (pos === singlePos) {
                        const title = (p.title || 'ไม่ระบุหัวข้อ').trim();
                        if (!titleStats[title]) {
                            titleStats[title] = { postsCount: 0, employees: new Set() };
                        }
                        titleStats[title].postsCount++;
                        titleStats[title].employees.add(p.employeeId);
                    }
                });

                const sortedTitles = Object.entries(titleStats)
                    .sort((a, b) => b[1].postsCount - a[1].postsCount)
                    .slice(0, 15);

                labels = sortedTitles.map(item => item[0]);
                postsData = sortedTitles.map(item => item[1].postsCount);
                uniqueEmployeesData = sortedTitles.map(item => item[1].employees.size);
                const singleColor = getPositionColor(singlePos);
                bgColors = labels.map(() => singleColor);
                chartLabel = `สถิติของตำแหน่ง "${singlePos}" แยกตามหัวข้อ (Top 15)`;
            }

            window.positionPostsReportChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            type: 'line',
                            label: 'จำนวนพนักงานที่โพสต์ (คน - ไม่ซ้ำ)',
                            data: uniqueEmployeesData,
                            borderColor: '#000000',
                            borderDash: [5, 5],
                            borderWidth: 2,
                            fill: false,
                            pointBackgroundColor: '#000000',
                            tension: 0.2,
                            yAxisID: 'yEmployees'
                        },
                        {
                            type: 'bar',
                            label: 'จำนวนโพสต์ (ครั้ง)',
                            data: postsData,
                            backgroundColor: bgColors,
                            borderWidth: 1,
                            borderRadius: 8,
                            yAxisID: 'y'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { font: { family: 'Kanit' } }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Kanit' } }
                        },
                        y: {
                            beginAtZero: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'จำนวนโพสต์ (ครั้ง)',
                                font: { family: 'Kanit', weight: 'bold' }
                            },
                            ticks: { stepSize: 1, font: { family: 'Kanit' } }
                        },
                        yEmployees: {
                            beginAtZero: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'จำนวนพนักงานที่โพสต์ (คน)',
                                font: { family: 'Kanit', weight: 'bold' }
                            },
                            grid: { drawOnChartArea: false },
                            ticks: { stepSize: 1, font: { family: 'Kanit' } }
                        }
                    }
                }
            });
        };

        window.populateTopChartsMonthOptions = () => {
            const monthsMap = {};
            const thaiMonthShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

            tiktokPosts.forEach(p => {
                if (p.postDate) {
                    const parts = p.postDate.split('-');
                    if (parts.length >= 2) {
                        const key = `${parts[0]}-${parts[1]}`;
                        const yearEng = parseInt(parts[0]);
                        const yearThai = yearEng + 543;
                        const monthIndex = parseInt(parts[1]) - 1;
                        if (monthIndex >= 0 && monthIndex < 12) {
                            monthsMap[key] = `${thaiMonthShort[monthIndex]} ${yearThai}`;
                        }
                    }
                }
            });

            const sortedMonthKeys = Object.keys(monthsMap).sort();

            const populateSelect = (selectId) => {
                const selectEl = document.getElementById(selectId);
                if (!selectEl) return;
                const currentVal = selectEl.value;
                let html = `<option value="all">ทุกเดือน</option>`;
                sortedMonthKeys.forEach(key => {
                    html += `<option value="${key}">${monthsMap[key]}</option>`;
                });
                selectEl.innerHTML = html;
                if (Array.from(selectEl.options).some(o => o.value === currentVal)) {
                    selectEl.value = currentVal;
                } else {
                    selectEl.value = 'all';
                }
            };

            populateSelect('report-top-branches-filter-month');
            populateSelect('report-top-employees-filter-month');
        };

        window.updateTopBranchesReport = () => {
            const rhFilter = document.getElementById('report-top-branches-filter-rh')?.value || 'all';
            const monthFilter = document.getElementById('report-top-branches-filter-month')?.value || 'all';

            // Filter posts with admin_ok === true
            let filtered = tiktokPosts.filter(p => p.admin_ok === true || p.admin_ok === 'true');

            // Apply RH filter
            if (rhFilter !== 'all') {
                filtered = filtered.filter(p => {
                    const branchName = p.empBranch;
                    if (!branchName) return false;
                    const br = tiktokBranches.find(b => b.empBranch === branchName);
                    return br && br.empRH === rhFilter;
                });
            }

            // Apply Month filter
            if (monthFilter !== 'all') {
                filtered = filtered.filter(p => p.postDate && p.postDate.startsWith(monthFilter));
            }

            // Aggregate by branch (Count posts and unique employees)
            const branchStats = {};
            filtered.forEach(p => {
                const branchName = p.empBranch || 'ไม่ระบุสาขา';
                if (!branchStats[branchName]) {
                    branchStats[branchName] = { postsCount: 0, employees: new Set() };
                }
                branchStats[branchName].postsCount++;
                if (p.employeeId) {
                    branchStats[branchName].employees.add(p.employeeId);
                }
            });

            // Sort and take top 10
            const sortedBranches = Object.entries(branchStats)
                .sort((a, b) => b[1].postsCount - a[1].postsCount)
                .slice(0, 10);

            const labels = sortedBranches.map(item => item[0]);
            const postsData = sortedBranches.map(item => item[1].postsCount);
            const uniqueEmployeesData = sortedBranches.map(item => item[1].employees.size);

            const ctx = document.getElementById('topBranchesChart')?.getContext('2d');
            if (ctx) {
                if (window.topBranchesChartInstance) {
                    window.topBranchesChartInstance.destroy();
                }

                const topBranchesValuePlugin = {
                    id: 'topBranchesValuePlugin',
                    afterDatasetsDraw(chart) {
                        const { ctx } = chart;
                        ctx.save();
                        ctx.font = 'bold 10px Kanit';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';

                        chart.data.datasets.forEach((dataset, datasetIndex) => {
                            const meta = chart.getDatasetMeta(datasetIndex);
                            if (meta.hidden) return;

                            ctx.fillStyle = datasetIndex === 0 ? '#000000' : '#475569';

                            dataset.data.forEach((val, i) => {
                                if (val > 0 && meta.data[i]) {
                                    const x = meta.data[i].x;
                                    const y = meta.data[i].y;
                                    ctx.fillText(val, x, y - 5);
                                }
                            });
                        });
                        ctx.restore();
                    }
                };

                window.topBranchesChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                type: 'line',
                                label: 'จำนวนพนักงานที่โพสต์ (คน - ไม่ซ้ำ)',
                                data: uniqueEmployeesData,
                                borderColor: '#000000',
                                borderDash: [5, 5],
                                borderWidth: 2,
                                fill: false,
                                pointBackgroundColor: '#000000',
                                pointRadius: 4,
                                tension: 0.2,
                                yAxisID: 'yEmployees'
                            },
                            {
                                type: 'bar',
                                label: 'จำนวนโพสต์ที่อนุมัติแล้ว (ครั้ง)',
                                data: postsData,
                                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                borderColor: 'rgb(59, 130, 246)',
                                borderWidth: 1,
                                borderRadius: 6,
                                yAxisID: 'y'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { font: { family: 'Kanit' } }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                beginAtZero: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'จำนวนโพสต์ที่อนุมัติแล้ว (ครั้ง)',
                                    font: { family: 'Kanit', weight: 'bold' }
                                },
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            },
                            yEmployees: {
                                beginAtZero: true,
                                position: 'right',
                                title: {
                                    display: true,
                                    text: 'จำนวนพนักงานที่โพสต์ (คน)',
                                    font: { family: 'Kanit', weight: 'bold' }
                                },
                                grid: { drawOnChartArea: false },
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            }
                        }
                    },
                    plugins: [topBranchesValuePlugin]
                });
            }
        };

        window.updateTopEmployeesReport = () => {
            const rhFilter = document.getElementById('report-top-employees-filter-rh')?.value || 'all';
            const monthFilter = document.getElementById('report-top-employees-filter-month')?.value || 'all';

            // Filter posts with admin_ok === true
            let filtered = tiktokPosts.filter(p => p.admin_ok === true || p.admin_ok === 'true');

            // Apply RH filter
            if (rhFilter !== 'all') {
                filtered = filtered.filter(p => {
                    const branchName = p.empBranch;
                    if (!branchName) return false;
                    const br = tiktokBranches.find(b => b.empBranch === branchName);
                    return br && br.empRH === rhFilter;
                });
            }

            // Apply Month filter
            if (monthFilter !== 'all') {
                filtered = filtered.filter(p => p.postDate && p.postDate.startsWith(monthFilter));
            }

            // Aggregate by employeeId
            const empCounts = {};
            filtered.forEach(p => {
                const empId = p.employeeId;
                if (empId) {
                    empCounts[empId] = (empCounts[empId] || 0) + 1;
                }
            });

            // Sort and take top 10
            const sortedEmps = Object.entries(empCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            const labels = sortedEmps.map(item => {
                const empId = item[0];
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(empId).trim());
                return member ? `${member.name} (${empId})` : empId;
            });
            const data = sortedEmps.map(item => item[1]);

            const ctx = document.getElementById('topEmployeesChart')?.getContext('2d');
            if (ctx) {
                if (window.topEmployeesChartInstance) {
                    window.topEmployeesChartInstance.destroy();
                }

                window.topEmployeesChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'จำนวนโพสต์ที่อนุมัติแล้ว',
                            data: data,
                            backgroundColor: 'rgba(16, 185, 129, 0.8)',
                            borderColor: 'rgb(16, 185, 129)',
                            borderWidth: 1,
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { font: { family: 'Kanit' } }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            }
                        }
                    }
                });
            }
        };

        // --- RESET PASSWORD SYSTEM FUNCTIONS ---
        window.renderResetPasswordTable = () => {
            const tbody = document.getElementById('reset-table-body');
            if (!tbody) return;

            const searchQuery = document.getElementById('reset-search-input')?.value.toLowerCase().trim() || '';

            // คัดกรองพนักงานที่มีคำขอ PIN โดยฟิลด์ empReset จะต้องไม่เท่ากับค่าว่าง หรือ null
            let filtered = tiktokMembers.filter(m => {
                const hasPIN = (m.empReset !== undefined && m.empReset !== null && String(m.empReset).trim() !== '');
                if (!hasPIN) return false;

                const matchesSearch = (m.name || '').toLowerCase().includes(searchQuery) ||
                    (m.employeeId || '').toLowerCase().includes(searchQuery) ||
                    (m.empBranch || '').toLowerCase().includes(searchQuery);
                return matchesSearch;
            });

            // เรียงลำดับข้อมูล
            filtered.sort((a, b) => {
                let valA = a[resetSortColumn];
                let valB = b[resetSortColumn];
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return resetSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            });

            // การแบ่งหน้าแสดงผล
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / resetItemsPerPage));
            if (resetCurrentPage > totalPages) resetCurrentPage = totalPages;

            const startIdx = (resetCurrentPage - 1) * resetItemsPerPage;
            const endIdx = Math.min(startIdx + resetItemsPerPage, total);
            const pageItems = filtered.slice(startIdx, endIdx);

            const infoText = document.getElementById('reset-pagination-info');
            if (infoText) {
                infoText.innerText = total === 0 ? "แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ" : `แสดง ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${total} รายการ`;
            }
            const pageNumText = document.getElementById('reset-page-number');
            if (pageNumText) pageNumText.innerText = `หน้า ${resetCurrentPage} / ${totalPages}`;

            const prevBtn = document.getElementById('btn-reset-page-prev');
            const nextBtn = document.getElementById('btn-reset-page-next');
            if (prevBtn) prevBtn.disabled = (resetCurrentPage === 1);
            if (nextBtn) nextBtn.disabled = (resetCurrentPage === totalPages);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบรายการคำขอ Reset Password</td></tr>`;
                return;
            }

            tbody.innerHTML = pageItems.map(item => {
                const imgUrl = item.profileImage || item.PictureMember || `https://placehold.co/100x100/e2e8f0/475569?text=${encodeURIComponent(item.name ? item.name.charAt(0) : 'T')}`;
                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <td class="text-center py-3">
                        <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://placehold.co/100x100/cbd5e1/475569?text=Error';" class="w-11 h-10 rounded-full object-cover mx-auto border border-stone-200 shadow-sm">
                    </td>
                    <td class="py-3 pl-4 font-bold text-stone-850 text-[13px]">${item.employeeId || '-'}</td>
                    <td class="py-3 pl-4 font-semibold text-stone-700 text-[13px]">${item.name || '-'}</td>
                    <td class="py-3 pl-4 text-stone-500 text-[13px]">${item.empBranch || '-'}</td>
                    <td class="py-3 text-center font-mono font-bold text-indigo-600 text-[13.5px]">${item.empReset || '-'}</td>
                    <td class="text-center py-3">
                        <button onclick="window.sendResetEmail('${item.employeeId}', '${item.empReset || ''}')" class="p-1.5 text-blue-500 hover:bg-blue-50 border border-blue-200 rounded-lg" title="ส่งอีเมลกู้คืนรหัสผ่าน">
                            <i data-lucide="mail" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
                `;
            }).join('');

            lucide.createIcons();
            window.updateResetSortIcons();
        };

        window.sendResetEmail = (employeeId, empReset) => {
            if (!employeeId) {
                showToast("ไม่พบรหัสพนักงาน", "error");
                return;
            }
            if (!empReset) {
                showToast("ไม่พบรหัส PIN สำหรับการ Reset", "error");
                return;
            }

            const to = `${employeeId.trim()}@ttbbank.com`;
            const subject = encodeURIComponent("Reset Password : Branch Tiktok, The IDOL");

            const htmlBody = `<div style="background-color: #0056ff; padding: 24px; border-radius: 16px; color: #ffffff; font-family: 'Kanit', 'Helvetica Neue', Helvetica, Arial, sans-serif; margin-bottom: 20px; max-width: 600px;">
    <h2 style="font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 16px; color: #ffffff; line-height: 1.4;">คำขอเปลี่ยนรหัสผ่าน (Reset Password)</h2>
    <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #ffffff;">
        ระบบได้รับคำขอเปลี่ยนรหัสผ่านสำหรับรหัสพนักงานของคุณ PIN สำหรับการนำไปใส่สำหรับการ Reset Password คือ:
    </p>
    <div style="margin-top: 16px; background-color: #ffffff; color: #0056ff; font-size: 28px; font-weight: bold; text-align: center; padding: 12px; border-radius: 8px; letter-spacing: 4px;">
        ${empReset}
    </div>
</div>`;

            const plainTextBody = `คำขอเปลี่ยนรหัสผ่าน (Reset Password)\n\nPIN สำหรับการนำไปใส่สำหรับการ Reset Password คือ: ${empReset}`;

            try {
                const htmlBlob = new Blob([htmlBody], { type: 'text/html' });
                const textBlob = new Blob([plainTextBody], { type: 'text/plain' });
                const data = [new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })];
                navigator.clipboard.write(data).then(() => {
                    showToast(`คัดลอกรูปแบบอีเมลกู้คืนรหัสผ่านลง Clipboard เรียบร้อยแล้ว!`, "success");
                }).catch(err => {
                    console.error("Clipboard copy failed:", err);
                });
            } catch (clipErr) {
                console.error("Clipboard API not supported or failed:", clipErr);
            }

            const instructions = encodeURIComponent("[ กด Ctrl + V หรือคลิกขวาแล้วกดวาง (Paste) เพื่อใส่เนื้อหาจดหมายรูปแบบการ์ดและรหัส PIN ลงที่นี่ ]");
            window.location.href = `mailto:${to}?subject=${subject}&body=${instructions}`;
            showToast(`เปิดหน้าต่างอีเมลไปที่ ${to} สำเร็จแล้ว!`, "success");
        };

        window.changeResetPage = (direction) => {
            resetCurrentPage += direction;
            window.renderResetPasswordTable();
        };

        window.toggleResetSort = (col) => {
            if (resetSortColumn === col) {
                resetSortDirection = resetSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                resetSortColumn = col;
                resetSortDirection = 'asc';
            }
            window.renderResetPasswordTable();
        };

        window.updateResetSortIcons = () => {
            const cols = ['employeeId', 'name', 'empBranch'];
            cols.forEach(col => {
                const el = document.getElementById(`sort-icon-reset-${col}`);
                if (!el) return;

                if (resetSortColumn === col) {
                    el.innerHTML = resetSortDirection === 'asc'
                        ? `<i data-lucide="arrow-up" class="w-3.5 h-3.5 text-blue-600 inline"></i>`
                        : `<i data-lucide="arrow-down" class="w-3.5 h-3.5 text-blue-600 inline"></i>`;
                } else {
                    el.innerHTML = `<i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-stone-400 opacity-60 inline"></i>`;
                }
            });
            lucide.createIcons();
        };

        // --- DYNAMIC USAGE ANALYTICS REPORT ---
        window.dailyLineChartInstance = null;
        window.hourlyBarChartInstance = null;

        window.populateUsageFilters = () => {
            const sizeSelect = document.getElementById('usage-filter-size');
            const rhSelect = document.getElementById('usage-filter-rh');
            const zoneSelect = document.getElementById('usage-filter-zone');
            const branchSelect = document.getElementById('usage-filter-branch');
            if (!sizeSelect || !rhSelect || !zoneSelect || !branchSelect) return;

            const selectedSize = sizeSelect.value || 'all';
            const selectedRh = rhSelect.value || 'all';
            const selectedZone = zoneSelect.value || 'all';
            const selectedBranch = branchSelect.value || 'all';

            // Interlocking filtering logic
            const validSizes = [...new Set(tiktokBranches
                .filter(b => (selectedRh === 'all' || b.empRH === selectedRh) && (selectedZone === 'all' || b.empZone === selectedZone) && (selectedBranch === 'all' || b.empBranch === selectedBranch))
                .map(b => b.empSize).filter(Boolean))].sort();

            const validRHs = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedZone === 'all' || b.empZone === selectedZone) && (selectedBranch === 'all' || b.empBranch === selectedBranch))
                .map(b => b.empRH).filter(Boolean))].sort();

            const validZones = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedRh === 'all' || b.empRH === selectedRh) && (selectedBranch === 'all' || b.empBranch === selectedBranch))
                .map(b => b.empZone).filter(Boolean))].sort();

            const validBranches = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedRh === 'all' || b.empRH === selectedRh) && (selectedZone === 'all' || b.empZone === selectedZone))
                .map(b => b.empBranch).filter(Boolean))].sort();

            const updateSelectOptions = (selectEl, validOptions, currentValue, placeholder) => {
                let html = `<option value="all">${placeholder}</option>`;
                validOptions.forEach(opt => {
                    const selected = opt === currentValue ? 'selected' : '';
                    html += `<option value="${opt}" ${selected}>${opt}</option>`;
                });
                selectEl.innerHTML = html;
            };

            updateSelectOptions(sizeSelect, validSizes, selectedSize, "ทั้งหมด (Size)");
            updateSelectOptions(rhSelect, validRHs, selectedRh, "ทั้งหมด (RH)");
            updateSelectOptions(zoneSelect, validZones, selectedZone, "ทั้งหมด (Zone)");
            updateSelectOptions(branchSelect, validBranches, selectedBranch, "ทั้งหมด (Branch)");
        };

        window.onUsageFilterChange = () => {
            const sizeSelect = document.getElementById('usage-filter-size');
            const rhSelect = document.getElementById('usage-filter-rh');
            const zoneSelect = document.getElementById('usage-filter-zone');
            const branchSelect = document.getElementById('usage-filter-branch');

            let selectedSize = sizeSelect.value;
            let selectedRh = rhSelect.value;
            let selectedZone = zoneSelect.value;
            let selectedBranch = branchSelect.value;

            window.populateUsageFilters();

            if (!Array.from(sizeSelect.options).map(o => o.value).includes(selectedSize)) {
                sizeSelect.value = 'all';
            }
            if (!Array.from(rhSelect.options).map(o => o.value).includes(selectedRh)) {
                rhSelect.value = 'all';
            }
            if (!Array.from(zoneSelect.options).map(o => o.value).includes(selectedZone)) {
                zoneSelect.value = 'all';
            }
            if (!Array.from(branchSelect.options).map(o => o.value).includes(selectedBranch)) {
                branchSelect.value = 'all';
            }

            window.populateUsageFilters();
            window.updateUsageCharts();
        };

        let selectedUsageMonth = 'all';
        window.populateUsageMonthRadios = (filteredPosts) => {
            const radiosContainer = document.getElementById('usage-month-radios');
            if (!radiosContainer) return;

            const monthsMap = {};
            const thaiMonthShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

            filteredPosts.forEach(p => {
                if (p.postDate) {
                    const parts = p.postDate.split('-');
                    if (parts.length >= 2) {
                        const key = `${parts[0]}-${parts[1]}`;
                        const yearEng = parseInt(parts[0]);
                        const yearThai = yearEng + 543;
                        const monthIndex = parseInt(parts[1]) - 1;
                        if (monthIndex >= 0 && monthIndex < 12) {
                            monthsMap[key] = `${thaiMonthShort[monthIndex]} ${yearThai}`;
                        }
                    }
                }
            });

            const sortedMonthKeys = Object.keys(monthsMap).sort();

            let html = `
                <label class="inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white transition-all">
                    <input type="radio" name="usage-month" value="all" ${selectedUsageMonth === 'all' ? 'checked' : ''} onchange="window.setUsageMonth('all')" class="hidden">
                    ทั้งหมด
                </label>
            `;

            sortedMonthKeys.forEach(key => {
                html += `
                    <label class="inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white transition-all">
                        <input type="radio" name="usage-month" value="${key}" ${selectedUsageMonth === key ? 'checked' : ''} onchange="window.setUsageMonth('${key}')" class="hidden">
                        ${monthsMap[key]}
                    </label>
                `;
            });

            radiosContainer.innerHTML = html;

            if (selectedUsageMonth !== 'all' && !monthsMap[selectedUsageMonth]) {
                selectedUsageMonth = 'all';
                const allRadio = radiosContainer.querySelector('input[value="all"]');
                if (allRadio) allRadio.checked = true;
            }
        };

        window.setUsageMonth = (val) => {
            selectedUsageMonth = val;
            window.updateUsageCharts();
        };

        window.downloadMembersExcel = () => {
            const searchQuery = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
            const statusFilter = memberStatusFilter;

            let filtered = tiktokMembers.filter(m => {
                const matchesSearch = (m.name || '').toLowerCase().includes(searchQuery) ||
                    (m.employeeId || '').toLowerCase().includes(searchQuery) ||
                    (m.tiktokUser || '').toLowerCase().includes(searchQuery) ||
                    (m.tiktokUrl || '').toLowerCase().includes(searchQuery) ||
                    (m.empBranch || '').toLowerCase().includes(searchQuery) ||
                    (m.empPosition || '').toLowerCase().includes(searchQuery);
                const matchesStatus = statusFilter === 'all' || m.MemberStatus === statusFilter;
                return matchesSearch && matchesStatus;
            });

            filtered.sort((a, b) => {
                let valA = a[sortColumn];
                let valB = b[sortColumn];
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return sortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            });

            const excelData = filtered.map((m, idx) => ({
                "ลำดับ": idx + 1,
                "รหัสพนักงาน": m.employeeId || '',
                "ชื่อ-นามสกุล": m.name || '',
                "ตำแหน่ง": m.empPosition || '',
                "สาขา": m.empBranch || '',
                "TikTok Username": m.tiktokUser || '',
                "TikTok ID / Url": m.tiktokUrl || '',
                "สถานะการสมัคร": m.MemberStatus === 'Registration' ? 'อนุมัติแล้ว' : 'รอการตรวจสอบ',
                "วันที่สมัคร": m.createdAt ? (m.createdAt.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString('th-TH') : new Date(m.createdAt).toLocaleString('th-TH')) : ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
            XLSX.writeFile(workbook, "Tiktok_Members.xlsx");
        };

        window.downloadPostsExcel = () => {
            const searchQuery = document.getElementById('posts-search-input')?.value.toLowerCase().trim() || '';
            let filtered = tiktokPosts.filter(p => {
                const empSendState = (p.employee_send === true || p.employee_send === 'true');
                const isCorrectTab = (postsActiveTab === 'new') ? (!empSendState) : empSendState;

                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(p.employeeId).trim());
                const memberName = member ? (member.name || '') : '';

                const matchesSearch = (p.employeeId || '').toLowerCase().includes(searchQuery) ||
                    (p.title || '').toLowerCase().includes(searchQuery) ||
                    (p.name || '').toLowerCase().includes(searchQuery) ||
                    memberName.toLowerCase().includes(searchQuery);

                return isCorrectTab && matchesSearch;
            });

            filtered.sort((a, b) => {
                let valA = a[postsSortColumn];
                let valB = b[postsSortColumn];

                if (postsSortColumn === 'Tiktok_view') {
                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;
                    return postsSortDirection === 'asc' ? valA - valB : valB - valA;
                }

                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return postsSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            });

            const excelData = filtered.map((p, idx) => {
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(p.employeeId).trim());
                return {
                    "ลำดับ": p.postIndex || idx + 1,
                    "รหัสพนักงาน": p.employeeId || '',
                    "ชื่อ-นามสกุล": p.name || (member ? member.name : ''),
                    "ชื่อเรื่อง / หมวดหมู่": p.title || '',
                    "Tiktok URL": p.url || '',
                    "ยอดเข้าชม (View)": Number(p.Tiktok_view) || 0,
                    "สถานะการอนุมัติ": p.admin_ok === true || p.admin_ok === 'true' ? 'อนุมัติแล้ว' : 'รออนุมัติ',
                    "วันที่โพสต์": p.createdAt ? (p.createdAt.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleString('th-TH') : new Date(p.createdAt).toLocaleString('th-TH')) : ''
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Posts");
            XLSX.writeFile(workbook, `Tiktok_Posts_${postsActiveTab === 'new' ? 'New' : 'Approved'}.xlsx`);
        };

        window.downloadBranchExcel = () => {
            const filterSize = document.getElementById('branch-filter-size')?.value || 'all';
            const filterRH = document.getElementById('branch-filter-rh')?.value || 'all';
            const filterZone = document.getElementById('branch-filter-zone')?.value || 'all';
            const branchSearchQuery = document.getElementById('branch-search-input')?.value.toLowerCase().trim() || '';

            let filtered = tiktokBranches.filter(b => {
                const matchesSize = filterSize === 'all' || b.empSize === filterSize;
                const matchesRH = filterRH === 'all' || b.empRH === filterRH;
                const matchesZone = filterZone === 'all' || b.empZone === filterZone;
                const matchesSearch = (b.empBranch || '').toLowerCase().includes(branchSearchQuery);
                return matchesSize && matchesRH && matchesZone && matchesSearch;
            });

            filtered.sort((a, b) => {
                let valA = a[branchSortColumn];
                let valB = b[branchSortColumn];

                if (branchSortColumn === 'empMember') {
                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;
                    return branchSortDirection === 'asc' ? valA - valB : valB - valA;
                }

                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return branchSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            });

            const excelData = filtered.map((b, idx) => ({
                "ลำดับ": idx + 1,
                "ชื่อสาขา": b.empBranch || '',
                "เขต": b.empZone || '',
                "RH": b.empRH || '',
                "จำนวนพนักงาน": Number(b.empMember) || 0,
                "Group / Size": b.empSize || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Branches");
            XLSX.writeFile(workbook, "Tiktok_Branches.xlsx");
        };

        window.updateUsageCharts = () => {
            const filterSize = document.getElementById('usage-filter-size')?.value || 'all';
            const filterRH = document.getElementById('usage-filter-rh')?.value || 'all';
            const filterZone = document.getElementById('usage-filter-zone')?.value || 'all';
            const filterBranch = document.getElementById('usage-filter-branch')?.value || 'all';

            // Filter logs directly using the fields stored in the Tiktok_log documents
            let baseLogs = tiktokLogs.filter(log => {
                const matchesSize = filterSize === 'all' || log.empSize === filterSize;
                const matchesRH = filterRH === 'all' || log.empRH === filterRH;
                const matchesZone = filterZone === 'all' || log.empZone === filterZone;
                const matchesBranch = filterBranch === 'all' || log.empBranch === filterBranch;
                return matchesSize && matchesRH && matchesZone && matchesBranch;
            });

            const getDateAndHour = (log) => {
                let dateStr = "";
                let hour = 12;
                if (log.datetime) {
                    let d = null;
                    if (typeof log.datetime.toDate === 'function') {
                        d = log.datetime.toDate();
                    } else if (log.datetime.seconds) {
                        d = new Date(log.datetime.seconds * 1000);
                    } else {
                        d = new Date(log.datetime);
                    }
                    if (d && !isNaN(d.getTime())) {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        dateStr = `${year}-${month}-${day}`;
                        hour = d.getHours();
                    }
                }
                return { dateStr, hour };
            };

            const dynamicRadiosData = baseLogs.map(l => ({ postDate: getDateAndHour(l).dateStr }));
            window.populateUsageMonthRadios(dynamicRadiosData);

            let dailyLogs = [...baseLogs];
            const usageEmpIdFilter = document.getElementById('usage-filter-emp-id')?.value.trim() || '';
            if (usageEmpIdFilter) {
                dailyLogs = dailyLogs.filter(log => {
                    const empId = log.employeeID || log.employeeId;
                    return empId && String(empId).trim() === usageEmpIdFilter;
                });
            }
            if (selectedUsageMonth !== 'all') {
                dailyLogs = dailyLogs.filter(log => {
                    const { dateStr } = getDateAndHour(log);
                    return dateStr && dateStr.startsWith(selectedUsageMonth);
                });
            }

            const countMode = document.querySelector('input[name="usage-count-mode"]:checked')?.value || 'all';

            const dailyData = {};
            dailyLogs.forEach(log => {
                const { dateStr } = getDateAndHour(log);
                const empId = log.employeeID || log.employeeId;
                if (dateStr) {
                    if (!dailyData[dateStr]) {
                        dailyData[dateStr] = { total: 0, users: new Set() };
                    }
                    dailyData[dateStr].total++;
                    if (empId) dailyData[dateStr].users.add(empId);
                }
            });

            const sortedDates = Object.keys(dailyData).sort();
            const dailyLabels = sortedDates;
            const dailyValues = sortedDates.map(date => {
                const dayObj = dailyData[date];
                if (countMode === 'unique') {
                    return dayObj.users.size;
                } else if (countMode === 'duplicate') {
                    return dayObj.total - dayObj.users.size;
                } else {
                    return dayObj.total;
                }
            });

            const dailyCtx = document.getElementById('dailyLineChart')?.getContext('2d');
            if (dailyCtx) {
                if (window.dailyLineChartInstance) {
                    window.dailyLineChartInstance.destroy();
                }
                window.dailyLineChartInstance = new Chart(dailyCtx, {
                    type: 'line',
                    data: {
                        labels: dailyLabels,
                        datasets: [{
                            label: countMode === 'unique' ? 'ผู้เข้าใช้งานไม่ซ้ำ (คน)' : countMode === 'duplicate' ? 'ผู้เข้าใช้งานซ้ำ (ครั้ง)' : 'จำนวนการใช้งานทั้งหมด',
                            data: dailyValues,
                            borderColor: '#0056ff',
                            backgroundColor: 'rgba(0, 86, 255, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.3,
                            pointBackgroundColor: '#f68b1f',
                            pointBorderColor: '#fff',
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    font: { family: 'Kanit' }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            }
                        }
                    }
                });
            }

            let hourlyLogs = [...baseLogs];
            const hourlyEmpIdFilter = document.getElementById('hourly-filter-emp-id')?.value.trim() || '';
            if (hourlyEmpIdFilter) {
                hourlyLogs = hourlyLogs.filter(log => {
                    const empId = log.employeeID || log.employeeId;
                    return empId && String(empId).trim() === hourlyEmpIdFilter;
                });
            }
            const hourlyDateSelect = document.getElementById('hourly-filter-date');
            const selectedHourlyDate = hourlyDateSelect ? hourlyDateSelect.value : '';
            if (selectedHourlyDate) {
                hourlyLogs = hourlyLogs.filter(log => {
                    const { dateStr } = getDateAndHour(log);
                    return dateStr === selectedHourlyDate;
                });
            } else if (selectedUsageMonth !== 'all') {
                hourlyLogs = hourlyLogs.filter(log => {
                    const { dateStr } = getDateAndHour(log);
                    return dateStr && dateStr.startsWith(selectedUsageMonth);
                });
            }

            // Compute unique and total count for hourly summary boxes
            const uniqueHourlyUsers = new Set();
            hourlyLogs.forEach(log => {
                const empId = log.employeeID || log.employeeId;
                if (empId) uniqueHourlyUsers.add(empId);
            });
            const hourlyTotalCount = hourlyLogs.length;
            const hourlyUniqueCount = uniqueHourlyUsers.size;

            const hourlySummaryUniqueEl = document.getElementById('hourly-summary-unique');
            if (hourlySummaryUniqueEl) {
                hourlySummaryUniqueEl.textContent = hourlyUniqueCount.toLocaleString();
            }
            const hourlySummaryTotalEl = document.getElementById('hourly-summary-total');
            if (hourlySummaryTotalEl) {
                hourlySummaryTotalEl.textContent = hourlyTotalCount.toLocaleString();
            }

            const hourCounts = Array(24).fill(0);
            const hourUniqueUsers = Array(24).fill().map(() => new Set());
            hourlyLogs.forEach(log => {
                const { hour } = getDateAndHour(log);
                if (hour >= 0 && hour < 24) {
                    hourCounts[hour]++;
                    const empId = log.employeeID || log.employeeId;
                    if (empId) {
                        hourUniqueUsers[hour].add(empId);
                    }
                }
            });
            const hourUniqueCounts = hourUniqueUsers.map(s => s.size);

            const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

            const hourlyCtx = document.getElementById('hourlyBarChart')?.getContext('2d');
            if (hourlyCtx) {
                if (window.hourlyBarChartInstance) {
                    window.hourlyBarChartInstance.destroy();
                }
                const hourlyTopTotalPlugin = {
                    id: 'hourlyTopTotalPlugin',
                    afterDatasetsDraw(chart) {
                        const { ctx } = chart;
                        ctx.save();
                        ctx.font = 'bold 10px Kanit';
                        ctx.fillStyle = '#475569';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';

                        const meta = chart.getDatasetMeta(0);
                        meta.data.forEach((bar, index) => {
                            const val = chart.data.datasets[0].data[index];
                            if (val > 0) {
                                ctx.fillText(val, bar.x, bar.y - 5);
                            }
                        });
                        ctx.restore();
                    }
                };
                window.hourlyBarChartInstance = new Chart(hourlyCtx, {
                    type: 'bar',
                    data: {
                        labels: hourlyLabels,
                        datasets: [
                            {
                                label: `ช่วงเวลาทำรายการระหว่างวัน (ครั้ง)`,
                                data: hourCounts,
                                backgroundColor: 'rgba(124, 58, 237, 0.8)',
                                borderColor: '#7c3aed',
                                borderWidth: 1,
                                borderRadius: 6,
                                order: 2
                            },
                            {
                                type: 'line',
                                label: `จำนวนพนักงานที่เข้าใช้งาน (คน - ไม่นับซ้ำ)`,
                                data: hourUniqueCounts,
                                borderColor: '#0056ff',
                                backgroundColor: 'transparent',
                                borderWidth: 2.5,
                                borderDash: [6, 4],
                                fill: false,
                                tension: 0.3,
                                pointBackgroundColor: '#0056ff',
                                pointBorderColor: '#fff',
                                pointRadius: 4,
                                order: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { font: { family: 'Kanit' } }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { stepSize: 1, font: { family: 'Kanit' } }
                            }
                        }
                    },
                    plugins: [hourlyTopTotalPlugin]
                });
            }
        };

        // --- LEARNING SECTION GLOBALS & HELPERS ---
        window.selectedLearningRhFilter = 'all';
        window.learningZoneChartInstance = null;
        window.learningCurrentPage = 1;
        window.learningItemsPerPage = 10;

        window.populateLearningFilters = () => {
            const sizeSelect = document.getElementById('learning-filter-size');
            const rhSelect = document.getElementById('learning-filter-rh');
            const zoneSelect = document.getElementById('learning-filter-zone');
            if (!sizeSelect || !rhSelect || !zoneSelect) return;

            const selectedSize = sizeSelect.value || 'all';
            const selectedRh = rhSelect.value || 'all';
            const selectedZone = zoneSelect.value || 'all';

            const validSizes = [...new Set(tiktokBranches
                .filter(b => (selectedRh === 'all' || b.empRH === selectedRh) && (selectedZone === 'all' || b.empZone === selectedZone))
                .map(b => b.empSize).filter(Boolean))].sort();

            const validRHs = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedZone === 'all' || b.empZone === selectedZone))
                .map(b => b.empRH).filter(Boolean))].sort();

            const validZones = [...new Set(tiktokBranches
                .filter(b => (selectedSize === 'all' || b.empSize === selectedSize) && (selectedRh === 'all' || b.empRH === selectedRh))
                .map(b => b.empZone).filter(Boolean))].sort();

            const updateSelectOptions = (selectEl, validOptions, currentValue, placeholder) => {
                let html = `<option value="all">${placeholder}</option>`;
                validOptions.forEach(opt => {
                    const selected = opt === currentValue ? 'selected' : '';
                    html += `<option value="${opt}" ${selected}>${opt}</option>`;
                });
                selectEl.innerHTML = html;
            };

            updateSelectOptions(sizeSelect, validSizes, selectedSize, "ทั้งหมด (Size)");
            updateSelectOptions(rhSelect, validRHs, selectedRh, "ทั้งหมด (RH)");
            updateSelectOptions(zoneSelect, validZones, selectedZone, "ทั้งหมด (Zone)");
        };

        window.onLearningFilterChange = () => {
            const sizeSelect = document.getElementById('learning-filter-size');
            const rhSelect = document.getElementById('learning-filter-rh');
            const zoneSelect = document.getElementById('learning-filter-zone');

            let selectedSize = sizeSelect ? sizeSelect.value : 'all';
            let selectedRh = rhSelect ? rhSelect.value : 'all';
            let selectedZone = zoneSelect ? zoneSelect.value : 'all';

            window.populateLearningFilters();
            window.learningCurrentPage = 1;
            window.updateLearningSection();
        };

        window.populateLearningRhFilterButtons = () => {
            const container = document.getElementById('learning-rh-report-filter-buttons');
            if (!container) return;

            const rhs = ['all', 'RH-1', 'RH-2', 'RH-3', 'RH-4', 'RH-5'];
            const labels = {
                'all': 'ดูทั้งหมด',
                'RH-1': 'RH-1',
                'RH-2': 'RH-2',
                'RH-3': 'RH-3',
                'RH-4': 'RH-4',
                'RH-5': 'RH-5'
            };

            let html = rhs.map(rh => {
                const checked = window.selectedLearningRhFilter === rh ? 'checked' : '';
                return `
                <label class="inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white transition-all">
                    <input type="radio" name="learning-rh-report-filter" value="${rh}" ${checked} onchange="window.setLearningRhFilter('${rh}')" class="hidden">
                    ${labels[rh]}
                </label>
                `;
            }).join('');

            container.innerHTML = html;
        };

        window.setLearningRhFilter = (val) => {
            window.selectedLearningRhFilter = val;
            window.updateLearningSection();
        };

        window.updateLearningSection = () => {
            window.populateLearningFilters();
            window.populateLearningRhFilterButtons();

            const filterSize = document.getElementById('learning-filter-size')?.value || 'all';
            const filterRH = document.getElementById('learning-filter-rh')?.value || 'all';
            const filterZone = document.getElementById('learning-filter-zone')?.value || 'all';

            // Filter branches
            const filteredBranches = tiktokBranches.filter(b => {
                const matchesSize = filterSize === 'all' || b.empSize === filterSize;
                const matchesRH = filterRH === 'all' || b.empRH === filterRH;
                const matchesZone = filterZone === 'all' || b.empZone === filterZone;
                return matchesSize && matchesRH && matchesZone;
            });
            const branchNames = filteredBranches.map(b => b.empBranch);
            const cleanBranchNames = branchNames.map(name => name.trim().toLowerCase());
            const filteredMembers = tiktokMembers.filter(m => m.empBranch && cleanBranchNames.includes(m.empBranch.trim().toLowerCase()));

            // Box 1: Registered Employees (admin_ok=true on member)
            const registeredApprovedCount = filteredMembers.filter(m => m.admin_ok === true || m.admin_ok === 'true' || m.admin_ok === 1 || m.admin_ok === '1' || m.MemberStatus === 'Registration').length;
            const regCountEl = document.getElementById('learning-registered-count');
            if (regCountEl) regCountEl.innerText = registeredApprovedCount.toLocaleString('th-TH');

            // Box 2: Interested Students (learnMoreRequest=true)
            const interestedCount = filteredMembers.filter(m => m.learnMoreRequest === true || m.learnMoreRequest === 'true' || m.learnMoreRequest === 1 || m.learnMoreRequest === '1').length;
            const intCountEl = document.getElementById('learning-interested-count');
            if (intCountEl) intCountEl.innerText = interestedCount.toLocaleString('th-TH');

            // --- ZONE CHART FOR LEARNING ---
            const zoneStats = {};

            // Initialize zones from all branches that match selected RH in the chart filter
            tiktokBranches.forEach(b => {
                const zone = b.empZone || 'ไม่ระบุเขต';
                const rh = b.empRH || 'ไม่ระบุ';
                const cleanRh = rh.replace(/\s+/g, '').toLowerCase();
                const cleanFilter = window.selectedLearningRhFilter.replace(/\s+/g, '').toLowerCase();

                if (window.selectedLearningRhFilter !== 'all' && cleanRh !== cleanFilter) {
                    return;
                }
                if (!zoneStats[zone]) {
                    zoneStats[zone] = { approved: 0, pending: 0, employees: 0, rh: rh };
                }
            });

            // Aggregate metrics from all members for this chart
            tiktokMembers.forEach(m => {
                if (!m.empBranch) return;
                const br = tiktokBranches.find(b => b.empBranch === m.empBranch);
                if (br) {
                    const zone = br.empZone || 'ไม่ระบุเขต';
                    const rh = br.empRH || 'ไม่ระบุ';
                    const cleanRh = rh.replace(/\s+/g, '').toLowerCase();
                    const cleanFilter = window.selectedLearningRhFilter.replace(/\s+/g, '').toLowerCase();

                    if (window.selectedLearningRhFilter !== 'all' && cleanRh !== cleanFilter) {
                        return;
                    }

                    if (!zoneStats[zone]) {
                        zoneStats[zone] = { approved: 0, pending: 0, employees: 0, rh: rh };
                    }

                    // Count registered employees (admin_ok=true or MemberStatus='Registration') in the zone
                    const isRegistered = (m.MemberStatus === 'Registration' || m.admin_ok === true || m.admin_ok === 'true' || m.admin_ok === 1 || m.admin_ok === '1');
                    if (isRegistered) {
                        zoneStats[zone].employees++;
                    }

                    // Only count if they are interested in learning
                    if (m.learnMoreRequest === true || m.learnMoreRequest === 'true' || m.learnMoreRequest === 1 || m.learnMoreRequest === '1') {
                        const isApproved = (m.MemberStatus === 'Registration' || m.admin_ok === true || m.admin_ok === 'true' || m.admin_ok === 1 || m.admin_ok === '1');
                        if (isApproved) {
                            zoneStats[zone].approved++;
                        } else {
                            zoneStats[zone].pending++;
                        }
                    }
                }
            });

            const sortedZones = Object.keys(zoneStats).sort((a, b) => {
                const rhA = zoneStats[a].rh || '';
                const rhB = zoneStats[b].rh || '';
                const compareRh = rhA.localeCompare(rhB, 'th', { numeric: true });
                if (compareRh !== 0) return compareRh;
                return a.localeCompare(b, 'th');
            });

            const zoneLabels = sortedZones.map(z => [z, zoneStats[z].rh || 'ไม่ระบุ']);
            const zoneApprovedData = sortedZones.map(z => zoneStats[z].approved);
            const zonePendingData = sortedZones.map(z => zoneStats[z].pending);
            const zoneEmployeesData = sortedZones.map(z => zoneStats[z].employees);

            const baseColors = {
                'RH-1': { approved: 'rgba(59, 130, 246, 1)', pending: 'rgba(59, 130, 246, 0.4)' },
                'RH-2': { approved: 'rgba(16, 185, 129, 1)', pending: 'rgba(16, 185, 129, 0.4)' },
                'RH-3': { approved: 'rgba(245, 158, 11, 1)', pending: 'rgba(245, 158, 11, 0.4)' },
                'RH-4': { approved: 'rgba(239, 68, 68, 1)', pending: 'rgba(239, 68, 68, 0.4)' },
                'RH-5': { approved: 'rgba(139, 92, 246, 1)', pending: 'rgba(139, 92, 246, 0.4)' }
            };
            const defaultColors = { approved: 'rgba(148, 163, 184, 1)', pending: 'rgba(148, 163, 184, 0.4)' };

            const approvedColors = sortedZones.map(z => {
                const rh = zoneStats[z].rh;
                return baseColors[rh]?.approved || defaultColors.approved;
            });

            const pendingColors = sortedZones.map(z => {
                const rh = zoneStats[z].rh;
                return baseColors[rh]?.pending || defaultColors.pending;
            });

            const chartCtx = document.getElementById('learningZoneChart')?.getContext('2d');
            if (chartCtx) {
                if (window.learningZoneChartInstance) {
                    window.learningZoneChartInstance.destroy();
                }

                const learningTopTotalPlugin = {
                    id: 'learningTopTotalPlugin',
                    afterDatasetsDraw(chart) {
                        const { ctx, scales: { x, y } } = chart;
                        ctx.save();
                        ctx.font = 'bold 10px Kanit';
                        ctx.fillStyle = '#475569';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';

                        const totals = [];
                        const xCoords = [];
                        const yCoords = [];

                        chart.data.datasets.forEach((dataset, datasetIndex) => {
                            if (datasetIndex === 0) return; // skip line dataset
                            const meta = chart.getDatasetMeta(datasetIndex);
                            if (meta.hidden) return;

                            dataset.data.forEach((val, i) => {
                                totals[i] = (totals[i] || 0) + (val || 0);
                                if (meta.data[i]) {
                                    xCoords[i] = meta.data[i].x;
                                    yCoords[i] = yCoords[i] !== undefined ? Math.min(yCoords[i], meta.data[i].y) : meta.data[i].y;
                                }
                            });
                        });

                        totals.forEach((total, i) => {
                            if (total > 0 && xCoords[i] !== undefined && yCoords[i] !== undefined) {
                                ctx.fillText(total, xCoords[i], yCoords[i] - 5);
                            }
                        });
                        ctx.restore();
                    }
                };

                window.learningZoneChartInstance = new Chart(chartCtx, {
                    type: 'bar',
                    data: {
                        labels: zoneLabels,
                        datasets: [
                            {
                                type: 'line',
                                label: 'พนักงานที่เป็นสมาชิก',
                                data: zoneEmployeesData,
                                borderColor: '#000000',
                                borderDash: [5, 5],
                                borderWidth: 2,
                                fill: false,
                                pointBackgroundColor: '#000000',
                                tension: 0.2,
                                yAxisID: 'y'
                            },
                            {
                                type: 'bar',
                                label: 'ลงทะเบียนเรียน',
                                data: zoneApprovedData,
                                backgroundColor: approvedColors,
                                stack: 'students',
                                yAxisID: 'y'
                            },
                            {
                                type: 'bar',
                                label: 'ไม่ได้ลงทะเบียนเรียน',
                                data: zonePendingData,
                                backgroundColor: pendingColors,
                                stack: 'students',
                                yAxisID: 'y'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { font: { family: 'Kanit' } }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { family: 'Kanit' } }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { stepSize: 5, font: { family: 'Kanit' } }
                            }
                        }
                    },
                    plugins: [learningTopTotalPlugin]
                });
            }

            // --- RENDER TABLE ---
            window.renderLearningTable(filteredMembers);
        };

        window.renderLearningTable = (filteredMembersList) => {
            const tbody = document.getElementById('learning-table-body');
            if (!tbody) return;

            // Only interested applicants
            let list = filteredMembersList.filter(m => m.learnMoreRequest === true || m.learnMoreRequest === 'true' || m.learnMoreRequest === 1 || m.learnMoreRequest === '1');

            const parseDate = (d) => {
                if (!d) return 0;
                if (d.seconds) return d.seconds * 1000;
                const ms = Date.parse(d);
                return isNaN(ms) ? 0 : ms;
            };

            // Sort by learnMoreDate latest
            list.sort((a, b) => {
                return parseDate(b.learnMoreDate) - parseDate(a.learnMoreDate);
            });

            // Pagination
            const total = list.length;
            const totalPages = Math.max(1, Math.ceil(total / window.learningItemsPerPage));
            if (window.learningCurrentPage > totalPages) window.learningCurrentPage = totalPages;

            const startIdx = (window.learningCurrentPage - 1) * window.learningItemsPerPage;
            const endIdx = Math.min(startIdx + window.learningItemsPerPage, total);
            const pageItems = list.slice(startIdx, endIdx);

            const paginationInfo = document.getElementById('learning-pagination-info');
            if (paginationInfo) {
                paginationInfo.innerText = total > 0
                    ? `แสดง ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${total} รายการ`
                    : `แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ`;
            }

            const pageNum = document.getElementById('learning-page-number');
            if (pageNum) {
                pageNum.innerText = `หน้า ${window.learningCurrentPage} / ${totalPages}`;
            }

            const btnPrev = document.getElementById('btn-learning-prev');
            const btnNext = document.getElementById('btn-learning-next');
            if (btnPrev) btnPrev.disabled = window.learningCurrentPage === 1;
            if (btnNext) btnNext.disabled = window.learningCurrentPage === totalPages;

            if (pageItems.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-10 text-stone-400 italic">
                        ไม่มีข้อมูลผู้สนใจสมัครเรียน
                    </td>
                </tr>
                `;
                return;
            }

            tbody.innerHTML = pageItems.map(m => {
                // Profile image fallback
                const imgSrc = m.profileImage ? m.profileImage : 'images/default-profile.png';
                const showImgHtml = `<img src="${imgSrc}" onerror="this.src='images/default-profile.png'" class="w-10 h-10 object-cover rounded-full mx-auto border border-stone-200 shadow-sm">`;

                return `
                <tr class="hover:bg-stone-50 cursor-pointer transition-all" onclick="window.showLearningDetail('${m.id}')">
                    <td class="text-center">${showImgHtml}</td>
                    <td class="text-center font-bold text-stone-700">${m.employeeId || '-'}</td>
                    <td class="pl-4 font-semibold text-stone-800">${m.name || '-'}</td>
                    <td class="pl-4 text-stone-600">${m.empBranch || '-'}</td>
                    <td class="pl-4 text-stone-500 max-w-[250px] truncate" title="${m.learnMoreReason || '-'}">${m.learnMoreReason || '-'}</td>
                </tr>
                `;
            }).join('');
        };

        window.showLearningDetail = (memberId) => {
            const member = tiktokMembers.find(m => m.id === memberId);
            if (!member) return;

            document.getElementById('learning-modal-image').src = member.profileImage || 'images/default-profile.png';
            document.getElementById('learning-modal-empid').innerText = member.employeeId || '-';
            document.getElementById('learning-modal-name').innerText = member.name || '-';
            document.getElementById('learning-modal-position').innerText = member.empPosition || '-';
            document.getElementById('learning-modal-branch').innerText = member.empBranch || '-';
            document.getElementById('learning-modal-reason').innerText = member.learnMoreReason || '-';
            document.getElementById('learning-modal-tiktok').innerText = member.tiktokUser || '-';

            let displayDate = '-';
            if (member.learnMoreDate) {
                displayDate = member.learnMoreDate.seconds
                    ? new Date(member.learnMoreDate.seconds * 1000).toLocaleString('th-TH')
                    : new Date(member.learnMoreDate).toLocaleString('th-TH');
            }
            document.getElementById('learning-modal-date').innerText = displayDate;

            const approveBtn = document.getElementById('learning-modal-approve-btn');
            if (approveBtn) {
                const isPending = member.MemberStatus === 'New Registration';
                if (isPending) {
                    approveBtn.classList.remove('hidden');
                    approveBtn.onclick = async () => {
                        try {
                            approveBtn.disabled = true;
                            approveBtn.innerText = "กำลังอนุมัติ...";
                            await window.approveTiktokMember(member.id, member.name);
                            window.closeLearningDetailModal();
                        } catch (err) {
                            console.error(err);
                        } finally {
                            approveBtn.disabled = false;
                            approveBtn.innerText = "อนุมัติพนักงาน";
                        }
                    };
                } else {
                    approveBtn.classList.add('hidden');
                }
            }

            document.getElementById('learning-detail-modal').classList.remove('hidden');
            lucide.createIcons();
        };

        window.closeLearningDetailModal = () => {
            document.getElementById('learning-detail-modal').classList.add('hidden');
        };

        window.changeLearningPage = (direction) => {
            window.learningCurrentPage += direction;
            window.updateLearningSection();
        };

        window.onLearningPageSizeChanged = () => {
            const select = document.getElementById('learning-items-per-page');
            if (select) {
                window.learningItemsPerPage = parseInt(select.value) || 10;
                window.learningCurrentPage = 1;
                window.updateLearningSection();
            }
        };

        window.downloadLearningExcel = () => {
            const filterSize = document.getElementById('learning-filter-size')?.value || 'all';
            const filterRH = document.getElementById('learning-filter-rh')?.value || 'all';
            const filterZone = document.getElementById('learning-filter-zone')?.value || 'all';

            const filteredBranches = tiktokBranches.filter(b => {
                const matchesSize = filterSize === 'all' || b.empSize === filterSize;
                const matchesRH = filterRH === 'all' || b.empRH === filterRH;
                const matchesZone = filterZone === 'all' || b.empZone === filterZone;
                return matchesSize && matchesRH && matchesZone;
            });
            const branchNames = filteredBranches.map(b => b.empBranch);
            const cleanBranchNames = branchNames.map(name => name.trim().toLowerCase());
            const filteredMembers = tiktokMembers.filter(m => m.empBranch && cleanBranchNames.includes(m.empBranch.trim().toLowerCase()));

            let list = filteredMembers.filter(m => m.learnMoreRequest === true || m.learnMoreRequest === 'true' || m.learnMoreRequest === 1 || m.learnMoreRequest === '1');

            const parseDate = (d) => {
                if (!d) return 0;
                if (d.seconds) return d.seconds * 1000;
                const ms = Date.parse(d);
                return isNaN(ms) ? 0 : ms;
            };

            list.sort((a, b) => {
                return parseDate(b.learnMoreDate) - parseDate(a.learnMoreDate);
            });

            const excelData = list.map((m, idx) => ({
                "ลำดับ": idx + 1,
                "รหัสพนักงาน": m.employeeId || '',
                "ชื่อ-นามสกุล": m.name || '',
                "สาขา": m.empBranch || '',
                "เหตุผลที่อยากเรียน": m.learnMoreReason || '',
                "วันที่ยื่นคำขอ": m.learnMoreDate ? (m.learnMoreDate.seconds ? new Date(m.learnMoreDate.seconds * 1000).toLocaleString('th-TH') : new Date(m.learnMoreDate).toLocaleString('th-TH')) : ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "LearningApplicants");
            XLSX.writeFile(workbook, "Tiktok_Learning_Applicants.xlsx");
        };

        // --- AUTH & NAVIGATION CONTROLLERS ---
        window.navigate = (sectionId) => {
            document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
            const target = document.getElementById(`section-${sectionId}`);
            if (target) target.classList.remove('hidden');

            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('tab-active');
                b.classList.add('text-stone-500');
            });
            const navBtn = document.getElementById(`nav-${sectionId}`);
            if (navBtn) navBtn.classList.add('tab-active');

            if (sectionId === 'usage') {
                if (typeof window.populateUsageFilters === 'function') window.populateUsageFilters();
                if (typeof window.updateUsageCharts === 'function') window.updateUsageCharts();
            }

            if (sectionId === 'reports') {
                if (typeof updateReportSection === 'function') updateReportSection();
            }

            if (sectionId === 'learning') {
                if (typeof updateLearningSection === 'function') updateLearningSection();
            }

            if (sectionId === 'license') {
                if (typeof window.renderTiktokLicenses === 'function') window.renderTiktokLicenses();
            }

            if (sectionId === 'delete-history') {
                if (typeof window.renderTiktokDeletedPosts === 'function') window.renderTiktokDeletedPosts();
            }

            if (sectionId === 'news') {
                if (typeof window.renderTiktokNews === 'function') window.renderTiktokNews();
            }

            lucide.createIcons();
        };

        window.handleAdminLogin = (e) => {
            e.preventDefault();
            const adminId = document.getElementById('login-admin-id').value.trim();
            const password = document.getElementById('login-password').value;

            if (adminId === 'admin' && password === 'admin123') {
                onAdminLoginSuccess();
            } else {
                showToast("รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง!", "error");
            }
        };

        window.handleLogOut = () => {
            const nav = document.getElementById('main-nav');
            if (nav) nav.innerHTML = '';
            window.navigate('auth');
        };

        const onAdminLoginSuccess = () => {
            const nav = document.getElementById('main-nav');
            if (!nav) return;

            nav.innerHTML = `
                <button onclick="navigate('data-system')" id="nav-data-system" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">สมาชิก</button>
                <button onclick="navigate('manage-posts')" id="nav-manage-posts" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">จัดการโพสต์</button>
                <button onclick="navigate('reset-password')" id="nav-reset-password" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">Reset</button>
                <button onclick="navigate('data-structure')" id="nav-data-structure" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">โครงสร้าง</button>
                <button onclick="navigate('learning')" id="nav-learning" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">การเรียนรู้</button>
                <button onclick="navigate('reports')" id="nav-reports" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">รายงาน</button>
                <button onclick="navigate('usage')" id="nav-usage" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">การใช้งาน</button>
                <button onclick="navigate('link')" id="nav-link" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">Link</button>
                <button onclick="navigate('license')" id="nav-nav-license" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all font-bold select-none cursor-pointer">License</button>
                <button onclick="navigate('delete-history')" id="nav-delete-history" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all text-red-500 hover:text-red-700">Delete</button>
                <button onclick="navigate('news')" id="nav-news" class="tab-btn px-4 py-2 rounded-lg text-[13px] font-semibold transition-all">News</button>
            `;
            lucide.createIcons();
            window.navigate('data-system');
        };

        // เปิด Unified Modal สำหรับการเพิ่มหรือแก้ไขสมาชิก TikTok
        window.openTiktokMemberModal = (id = null) => {
            const modal = document.getElementById('unified-modal');
            const title = document.getElementById('modal-title');
            const form = document.getElementById('tiktok-member-form');
            form.reset();

            if (id) {
                const member = tiktokMembers.find(m => m.id === id);
                if (member) {
                    title.innerText = "แก้ไขข้อมูลสมาชิก TikTok";
                    document.getElementById('edit-id').value = id;
                    document.getElementById('form-employeeId').value = member.employeeId || '';
                    document.getElementById('form-name').value = member.name || '';
                    document.getElementById('form-empPosition').value = member.empPosition || '';
                    document.getElementById('form-empBranch').value = member.empBranch || '';
                    document.getElementById('form-tiktokUser').value = member.tiktokUser || '';
                    document.getElementById('form-tiktokUrl').value = member.tiktokUrl || '';
                    document.getElementById('form-MemberStatus').value = member.MemberStatus || 'Registration';
                    document.getElementById('form-password').value = member.password || '';
                    document.getElementById('form-profileImage').value = member.profileImage || '';
                }
            } else {
                title.innerText = "เพิ่มสมาชิก TikTok ใหม่";
                document.getElementById('edit-id').value = '';
            }

            modal.classList.remove('hidden');
        };

        window.closeTiktokModal = () => {
            document.getElementById('unified-modal').classList.add('hidden');
        };

        window.openQRCodeModal = () => {
            document.getElementById('qrcode-modal').classList.remove('hidden');
            lucide.createIcons();
        };

        window.closeQRCodeModal = () => {
            document.getElementById('qrcode-modal').classList.add('hidden');
        };

        window.handleTiktokFormSubmit = async (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-id').value;

            const submitBtn = document.getElementById('btn-submit-form');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></span>กำลังบันทึกข้อมูล...';
            }

            const data = {
                employeeId: document.getElementById('form-employeeId').value.trim(),
                name: document.getElementById('form-name').value.trim(),
                empPosition: document.getElementById('form-empPosition').value.trim(),
                empBranch: document.getElementById('form-empBranch').value.trim(),
                tiktokUser: document.getElementById('form-tiktokUser').value.trim(),
                tiktokUrl: document.getElementById('form-tiktokUrl').value.trim(),
                MemberStatus: document.getElementById('form-MemberStatus').value,
                password: document.getElementById('form-password').value.trim(),
                profileImage: document.getElementById('form-profileImage').value.trim(),
                updatedAt: serverTimestamp()
            };

            try {
                if (editId) {
                    const docRef = doc(db, getPath('Tiktok_Member'), editId);
                    await updateDoc(docRef, data);
                    showToast("อัปเดตข้อมูลสมาชิก TikTok เรียบร้อยแล้ว", "success");
                } else {
                    const colRef = collection(db, getPath('Tiktok_Member'));
                    await addDoc(colRef, {
                        ...data,
                        createdAt: serverTimestamp()
                    });
                    showToast("เพิ่มสมาชิก TikTok ใหม่เข้าสู่ระบบเรียบร้อยแล้ว", "success");
                }
                closeTiktokModal();
            } catch (err) {
                console.error("Save Tiktok Member Error:", err);
                showToast("ไม่สามารถบันทึกข้อมูลไปยังระบบคลาวด์ได้", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "บันทึกข้อมูล";
                }
            }
        };

        // --- TIKTOK LINK MANAGEMENT FUNCTIONS ---

        // ค้นหาข้อมูลและฟิลเตอร์
        window.onLinkSearch = (e) => {
            linkSearchQuery = e.target.value.toLowerCase().trim();
            linkCurrentPage = 1;
            window.renderTiktokLinks();
        };

        // สลับการเรียงลำดับคอลัมน์
        window.toggleLinkSort = (col) => {
            if (linkSortColumn === col) {
                linkSortDirection = linkSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                linkSortColumn = col;
                linkSortDirection = 'asc';
            }
            window.renderTiktokLinks();
        };

        // เปลี่ยนหน้าของตาราง
        window.changeLinkPage = (direction) => {
            linkCurrentPage += direction;
            window.renderTiktokLinks();
        };

        // เปลี่ยนจำนวนข้อมูลที่จะแสดงผลต่อหน้า
        window.onLinkPageSizeChanged = () => {
            const pageSizeSelect = document.getElementById('link-items-per-page');
            if (pageSizeSelect) {
                linkItemsPerPage = parseInt(pageSizeSelect.value) || 10;
                linkCurrentPage = 1;
                window.renderTiktokLinks();
            }
        };

        // เรนเดอร์ตาราง Tiktok_Link
        window.renderTiktokLinks = () => {
            const tbody = document.getElementById('link-table-body');
            if (!tbody) return;

            // ค้นหา / กรองข้อมูล
            let filtered = [...tiktokLinks];
            if (linkSearchQuery) {
                filtered = filtered.filter(item => {
                    const empId = String(item.employeeId || '').toLowerCase();
                    const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(item.employeeId).trim());
                    const empName = member ? String(member.name || '').toLowerCase() : '';
                    return empId.includes(linkSearchQuery) || empName.includes(linkSearchQuery);
                });
            }

            // เรียงลำดับข้อมูล
            filtered.sort((a, b) => {
                let valA = a[linkSortColumn] || '';
                let valB = b[linkSortColumn] || '';

                if (linkSortColumn === 'count') {
                    valA = Number(valA);
                    valB = Number(valB);
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return linkSortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return linkSortDirection === 'asc' ? 1 : -1;
                return 0;
            });

            // อัปเดตไอคอนจัดเรียง
            ['employeeId', 'count'].forEach(col => {
                const iconSpan = document.getElementById(`sort-icon-link-${col}`);
                if (iconSpan) {
                    if (linkSortColumn === col) {
                        iconSpan.innerHTML = linkSortDirection === 'asc'
                            ? `<i data-lucide="arrow-up" class="w-3.5 h-3.5 inline"></i>`
                            : `<i data-lucide="arrow-down" class="w-3.5 h-3.5 inline"></i>`;
                    } else {
                        iconSpan.innerHTML = `<i data-lucide="arrow-up-down" class="w-3 h-3 text-stone-400 opacity-60 inline"></i>`;
                    }
                }
            });

            // การแบ่งหน้า
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / linkItemsPerPage) || 1;
            if (linkCurrentPage > totalPages) linkCurrentPage = totalPages;
            if (linkCurrentPage < 1) linkCurrentPage = 1;

            const startIdx = (linkCurrentPage - 1) * linkItemsPerPage;
            const endIdx = startIdx + linkItemsPerPage;
            const pageItems = filtered.slice(startIdx, endIdx);

            // อัปเดตส่วนควบคุมและข้อความ Pagination
            const paginationInfo = document.getElementById('link-pagination-info');
            if (paginationInfo) {
                const currentStart = totalItems === 0 ? 0 : startIdx + 1;
                const currentEnd = Math.min(endIdx, totalItems);
                paginationInfo.innerText = `แสดง ${currentStart} ถึง ${currentEnd} จากทั้งหมด ${totalItems} รายการ`;
            }

            const pageNumberSpan = document.getElementById('link-page-number');
            if (pageNumberSpan) {
                pageNumberSpan.innerText = `หน้า ${linkCurrentPage} / ${totalPages}`;
            }

            const prevBtn = document.getElementById('btn-link-page-prev');
            const nextBtn = document.getElementById('btn-link-page-next');
            if (prevBtn) prevBtn.disabled = (linkCurrentPage === 1);
            if (nextBtn) nextBtn.disabled = (linkCurrentPage === totalPages);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบข้อมูล Link</td></tr>`;
                lucide.createIcons();
                return;
            }

            tbody.innerHTML = pageItems.map((item, idx) => {
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(item.employeeId).trim());
                const empName = member ? (member.name || '-') : '-';
                const empBranch = member ? (member.empBranch || '-') : '-';
                const empZone = member ? (member.empZone || '-') : '-';
                const imgUrl = member && (member.profileImage || member.PictureMember)
                    ? (member.profileImage || member.PictureMember)
                    : `https://placehold.co/100x100/e2e8f0/475569?text=${encodeURIComponent(empName.charAt(0))}`;

                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <td class="text-center py-3 font-semibold text-stone-600 text-[13px]">${startIdx + idx + 1}</td>
                    <td class="text-center py-3">
                        <img src="${imgUrl}" alt="Profile" class="w-10 h-10 rounded-full mx-auto object-cover border border-stone-200 shadow-sm">
                    </td>
                    <td class="text-left pl-4 font-mono font-bold text-stone-700 text-[13px]">${item.employeeId || '-'}</td>
                    <td class="text-left pl-4 text-stone-850 font-bold text-[13.5px]">${empName}</td>
                    <td class="text-left pl-4 text-stone-800 font-bold text-[13.5px]">${empBranch}</td>
                    <td class="text-left pl-4 text-stone-600 font-semibold text-[13px]">${empZone}</td>
                    <td class="text-center font-black text-[#0056ff] text-[14px]">${Number(item.count || 0).toLocaleString('th-TH')}</td>
                    <td class="text-center py-3">
                        <div class="flex items-center justify-center gap-2">
                            <a href="${item.link || '#'}" target="_blank" class="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-full transition-all" title="กดดูหน้าเพจ">
                                <i data-lucide="external-link" class="w-4 h-4"></i>
                            </a>
                            <button onclick="window.openEditLinkModal('${item.id}')" class="p-1.5 text-blue-500 hover:bg-blue-50 border border-blue-200 rounded-full transition-all" title="แก้ไขข้อมูล">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.deleteTiktokLink('${item.id}')" class="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-full transition-all" title="ลบข้อมูล">
                                <i data-lucide="trash" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');

            lucide.createIcons();
        };

        // เปิด Modal เพิ่มข้อมูล
        window.openAddLinkModal = () => {
            const modal = document.getElementById('link-modal');
            const title = document.getElementById('link-modal-title');
            const form = document.getElementById('tiktok-link-form');
            form.reset();
            document.getElementById('link-edit-id').value = '';
            title.innerText = "เพิ่มข้อมูล Link";
            modal.classList.remove('hidden');
        };

        // เปิด Modal แก้ไขข้อมูล
        window.openEditLinkModal = (id) => {
            const modal = document.getElementById('link-modal');
            const title = document.getElementById('link-modal-title');
            const form = document.getElementById('tiktok-link-form');
            form.reset();

            const item = tiktokLinks.find(l => l.id === id);
            if (item) {
                document.getElementById('link-edit-id').value = id;
                document.getElementById('link-form-employeeId').value = item.employeeId || '';
                document.getElementById('link-form-link').value = item.link || '';
                document.getElementById('link-form-count').value = item.count !== undefined ? item.count : 0;
                title.innerText = "แก้ไขข้อมูล Link";
                modal.classList.remove('hidden');
            }
        };

        // ปิด Modal
        window.closeLinkModal = () => {
            const modal = document.getElementById('link-modal');
            if (modal) modal.classList.add('hidden');
        };

        // บันทึกข้อมูลจากการกรอกฟอร์มไปยังตาราง Tiktok_Link
        window.handleLinkFormSubmit = async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "กำลังบันทึก...";
            }

            const editId = document.getElementById('link-edit-id').value;
            const employeeId = document.getElementById('link-form-employeeId').value.trim();
            const link = document.getElementById('link-form-link').value.trim();
            const count = parseInt(document.getElementById('link-form-count').value) || 0;

            const linkData = {
                employeeId,
                link,
                count,
                updatedAt: serverTimestamp()
            };

            try {
                if (editId) {
                    const docRef = doc(db, getPath('Tiktok_Link'), editId);
                    await updateDoc(docRef, linkData);
                    showToast("แก้ไขข้อมูล Link สำเร็จแล้ว", "success");
                } else {
                    linkData.createdAt = serverTimestamp();
                    const colRef = collection(db, getPath('Tiktok_Link'));
                    await addDoc(colRef, linkData);
                    showToast("เพิ่มข้อมูล Link ใหม่สำเร็จแล้ว", "success");
                }
                window.closeLinkModal();
            } catch (err) {
                console.error("Save Link Error:", err);
                showToast("ไม่สามารถบันทึกข้อมูล Link ได้", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "บันทึกข้อมูล";
                }
            }
        };

        // ลบข้อมูล Link
        window.deleteTiktokLink = async (id) => {
            if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล Link รายการนี้?")) {
                try {
                    const docRef = doc(db, getPath('Tiktok_Link'), id);
                    await deleteDoc(docRef);
                    showToast("ลบข้อมูล Link สำเร็จแล้ว", "success");
                } catch (err) {
                    console.error("Delete Link Error:", err);
                    showToast("ไม่สามารถลบข้อมูล Link ได้", "error");
                }
            }
        };

        // อัปโหลด Excel ของ Link และประมวลผลข้อมูล
        window.handleLinkExcelUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        showToast("ไม่พบข้อมูล Link ในไฟล์ Excel", "error");
                        return;
                    }

                    showToast("กำลังอัปโหลดข้อมูล Link...", "success");

                    let successCount = 0;
                    for (const row of jsonData) {
                        const employeeId = String(row.employeeId || row['รหัสพนักงาน'] || '').trim();
                        const link = String(row.link || row['Link'] || row['ลิงก์'] || '').trim();
                        const count = parseInt(row.count || row['Click'] || row['จำนวนคลิก'] || row['ยอดคลิก'] || 0);

                        if (employeeId && link) {
                            const linkData = {
                                employeeId,
                                link,
                                count,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            };

                            const colRef = collection(db, getPath('Tiktok_Link'));
                            await addDoc(colRef, linkData);
                            successCount++;
                        }
                    }

                    showToast(`อัปโหลดข้อมูล Link สำเร็จทั้งหมด ${successCount} รายการเรียบร้อยแล้ว`, "success");
                    event.target.value = ''; // reset file input
                } catch (err) {
                    console.error("Excel parse error:", err);
                    showToast("ไม่สามารถประมวลผลไฟล์ Excel ได้ กรุณาตรวจสอบโครงสร้างหัวคอลัมน์", "error");
                }
            };
            reader.readAsArrayBuffer(file);
        };

        // --- TIKTOK LICENSE MANAGEMENT FUNCTIONS ---

        // ค้นหาข้อมูลและฟิลเตอร์
        window.onLicenseSearch = (e) => {
            licenseSearchQuery = e.target.value.toLowerCase().trim();
            licenseCurrentPage = 1;
            window.renderTiktokLicenses();
        };

        // สลับการเรียงลำดับคอลัมน์
        window.toggleLicenseSort = (col) => {
            if (licenseSortColumn === col) {
                licenseSortDirection = licenseSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                licenseSortColumn = col;
                licenseSortDirection = 'asc';
            }
            window.renderTiktokLicenses();
        };

        // เปลี่ยนหน้าของตาราง
        window.changeLicensePage = (direction) => {
            licenseCurrentPage += direction;
            window.renderTiktokLicenses();
        };

        // เปลี่ยนจำนวนข้อมูลที่จะแสดงผลต่อหน้า
        window.onLicensePageSizeChanged = () => {
            const pageSizeSelect = document.getElementById('license-items-per-page');
            if (pageSizeSelect) {
                licenseItemsPerPage = parseInt(pageSizeSelect.value) || 10;
                licenseCurrentPage = 1;
                window.renderTiktokLicenses();
            }
        };

        // เรนเดอร์ตาราง Tiktok_License
        window.renderTiktokLicenses = () => {
            const tbody = document.getElementById('license-table-body');
            if (!tbody) return;

            // ค้นหา / กรองข้อมูล
            let filtered = [...tiktokLicenses];
            if (licenseSearchQuery) {
                filtered = filtered.filter(item => {
                    const empId = String(item.employeeId || '').toLowerCase();
                    return empId.includes(licenseSearchQuery);
                });
            }

            // เรียงลำดับข้อมูล
            filtered.sort((a, b) => {
                let valA = String(a[licenseSortColumn] || '').toLowerCase();
                let valB = String(b[licenseSortColumn] || '').toLowerCase();
                if (valA < valB) return licenseSortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return licenseSortDirection === 'asc' ? 1 : -1;
                return 0;
            });

            // อัปเดตไอคอนจัดเรียง
            const iconSpan = document.getElementById('sort-icon-license-employeeId');
            if (iconSpan) {
                if (licenseSortColumn === 'employeeId') {
                    iconSpan.innerHTML = licenseSortDirection === 'asc'
                        ? `<i data-lucide="arrow-up" class="w-3.5 h-3.5 inline"></i>`
                        : `<i data-lucide="arrow-down" class="w-3.5 h-3.5 inline"></i>`;
                } else {
                    iconSpan.innerHTML = `<i data-lucide="arrow-up-down" class="w-3 h-3 text-stone-400 opacity-60 inline"></i>`;
                }
            }

            // การแบ่งหน้า
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / licenseItemsPerPage) || 1;
            if (licenseCurrentPage > totalPages) licenseCurrentPage = totalPages;
            if (licenseCurrentPage < 1) licenseCurrentPage = 1;

            const startIdx = (licenseCurrentPage - 1) * licenseItemsPerPage;
            const endIdx = startIdx + licenseItemsPerPage;
            const pageItems = filtered.slice(startIdx, endIdx);

            // อัปเดตส่วนควบคุมและข้อความ Pagination
            const paginationInfo = document.getElementById('license-pagination-info');
            if (paginationInfo) {
                const currentStart = totalItems === 0 ? 0 : startIdx + 1;
                const currentEnd = Math.min(endIdx, totalItems);
                paginationInfo.innerText = `แสดง ${currentStart} ถึง ${currentEnd} จากทั้งหมด ${totalItems} รายการ`;
            }

            const pageNumberSpan = document.getElementById('license-page-number');
            if (pageNumberSpan) {
                pageNumberSpan.innerText = `หน้า ${licenseCurrentPage} / ${totalPages}`;
            }

            const prevBtn = document.getElementById('btn-license-page-prev');
            const nextBtn = document.getElementById('btn-license-page-next');
            if (prevBtn) prevBtn.disabled = (licenseCurrentPage === 1);
            if (nextBtn) nextBtn.disabled = (licenseCurrentPage === totalPages);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-stone-400 italic text-[13px]">ไม่พบข้อมูล License</td></tr>`;
                lucide.createIcons();
                return;
            }

            const cleanLicense = (val) => {
                if (!val) return '-';
                let clean = String(val).replace(/[-–—_.\/\\*]/g, '').trim();
                return clean || '-';
            };

            tbody.innerHTML = pageItems.map((item, idx) => {
                const member = tiktokMembers.find(m => String(m.employeeId).trim() === String(item.employeeId).trim());
                const imgUrl = (member && member.profileImage) ? member.profileImage : './images/default-profile.png';
                return `
                <tr class="hover:bg-blue-50/10 transition-colors">
                    <td class="text-center py-3 font-semibold text-stone-600 text-[13px]">${startIdx + idx + 1}</td>
                    <td class="text-center py-2">
                        <img src="${imgUrl}" alt="Profile" class="w-10 h-10 rounded-full mx-auto object-cover border border-stone-200 shadow-sm">
                    </td>
                    <td class="text-left pl-4 font-mono font-bold text-stone-700 text-[13px]">${item.employeeId || '-'}</td>
                    <td class="text-left pl-4 text-stone-850 font-semibold text-[13.5px]">${cleanLicense(item.Life_insurance)}</td>
                    <td class="text-left pl-4 text-stone-800 font-semibold text-[13.5px]">${cleanLicense(item.Nonlife_insurance)}</td>
                    <td class="text-left pl-4 text-stone-600 font-semibold text-[13px]">${cleanLicense(item.IC_license)}</td>
                    <td class="text-center py-3">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="window.openEditLicenseModal('${item.id}')" class="p-1.5 text-blue-500 hover:bg-blue-50 border border-blue-200 rounded-full transition-all" title="แก้ไขข้อมูล">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.deleteTiktokLicense('${item.id}')" class="p-1.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-full transition-all" title="ลบข้อมูล">
                                <i data-lucide="trash" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');

            lucide.createIcons();
        };

        // เปิด Modal เพิ่มข้อมูล
        window.openAddLicenseModal = () => {
            const modal = document.getElementById('license-modal');
            const title = document.getElementById('license-modal-title');
            const form = document.getElementById('tiktok-license-form');
            form.reset();
            document.getElementById('license-edit-id').value = '';
            title.innerText = "เพิ่มข้อมูล License";
            modal.classList.remove('hidden');
        };

        // เปิด Modal แก้ไขข้อมูล
        window.openEditLicenseModal = (id) => {
            const modal = document.getElementById('license-modal');
            const title = document.getElementById('license-modal-title');
            const form = document.getElementById('tiktok-license-form');
            form.reset();

            const item = tiktokLicenses.find(l => l.id === id);
            if (item) {
                document.getElementById('license-edit-id').value = id;
                document.getElementById('license-form-employeeId').value = item.employeeId || '';
                document.getElementById('license-form-Life_insurance').value = item.Life_insurance || '';
                document.getElementById('license-form-Nonlife_insurance').value = item.Nonlife_insurance || '';
                document.getElementById('license-form-IC_license').value = item.IC_license || '';
                title.innerText = "แก้ไขข้อมูล License";
                modal.classList.remove('hidden');
            }
        };

        // ปิด Modal
        window.closeLicenseModal = () => {
            const modal = document.getElementById('license-modal');
            if (modal) modal.classList.add('hidden');
        };

        // บันทึกข้อมูลจากการกรอกฟอร์มไปยังตาราง Tiktok_License
        window.handleLicenseFormSubmit = async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "กำลังบันทึก...";
            }

            const editId = document.getElementById('license-edit-id').value;
            const employeeId = document.getElementById('license-form-employeeId').value.trim();
            const Life_insurance = document.getElementById('license-form-Life_insurance').value.trim();
            const Nonlife_insurance = document.getElementById('license-form-Nonlife_insurance').value.trim();
            const IC_license = document.getElementById('license-form-IC_license').value.trim();

            const licenseData = {
                employeeId,
                Life_insurance,
                Nonlife_insurance,
                IC_license,
                updatedAt: serverTimestamp()
            };

            try {
                if (editId) {
                    const docRef = doc(db, getPath('Tiktok_License'), editId);
                    await updateDoc(docRef, licenseData);
                    showToast("แก้ไขข้อมูล License สำเร็จแล้ว", "success");
                } else {
                    licenseData.createdAt = serverTimestamp();
                    const colRef = collection(db, getPath('Tiktok_License'));
                    await addDoc(colRef, licenseData);
                    showToast("เพิ่มข้อมูล License ใหม่สำเร็จแล้ว", "success");
                }
                window.closeLicenseModal();
            } catch (err) {
                console.error("Save License Error:", err);
                showToast("ไม่สามารถบันทึกข้อมูล License ได้", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "บันทึกข้อมูล";
                }
            }
        };

        // ลบข้อมูล License รายบุคคล
        window.deleteTiktokLicense = async (id) => {
            if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูล License รายการนี้?")) {
                try {
                    const docRef = doc(db, getPath('Tiktok_License'), id);
                    await deleteDoc(docRef);
                    showToast("ลบข้อมูล License สำเร็จแล้ว", "success");
                } catch (err) {
                    console.error("Delete License Error:", err);
                    showToast("ไม่สามารถลบข้อมูล License ได้", "error");
                }
            }
        };

        // อัปโหลด Excel ของ License และประมวลผลข้อมูล
        window.handleLicenseExcelUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        showToast("ไม่พบข้อมูล License ในไฟล์ Excel", "error");
                        return;
                    }

                    showToast("กำลังอัปโหลดข้อมูล License...", "success");

                    let successCount = 0;
                    for (const row of jsonData) {
                        const employeeId = String(row.employeeId || row['employeeid'] || row['รหัสพนักงาน'] || '').trim();
                        const Life_insurance = String(row.Life_insurance || row['Life_insurance'] || row['ประกันชีวิต'] || '').trim();
                        const Nonlife_insurance = String(row.Nonlife_insurance || row['Nonlife_insurance'] || row['ประกันวินาศภัย'] || '').trim();
                        const IC_license = String(row.IC_license || row['IC_license'] || row['IC License'] || '').trim();

                        if (employeeId) {
                            const licenseData = {
                                employeeId,
                                Life_insurance,
                                Nonlife_insurance,
                                IC_license,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            };

                            const colRef = collection(db, getPath('Tiktok_License'));
                            await addDoc(colRef, licenseData);
                            successCount++;
                        }
                    }

                    showToast(`อัปโหลดข้อมูล License สำเร็จทั้งหมด ${successCount} รายการเรียบร้อยแล้ว`, "success");
                    event.target.value = ''; // reset file input
                } catch (err) {
                    console.error("Excel parse error:", err);
                    showToast("ไม่สามารถประมวลผลไฟล์ Excel ได้ กรุณาตรวจสอบโครงสร้างหัวคอลัมน์", "error");
                }
            };
            reader.readAsArrayBuffer(file);
        };

        // ล้างข้อมูล License ทั้งหมด
        window.openDeleteAllLicenseModal = () => {
            const confirmInput = document.getElementById('license-purge-confirm-text');
            if (confirmInput) confirmInput.value = '';
            const btn = document.getElementById('btn-purge-licenses');
            if (btn) btn.disabled = true;
            const modal = document.getElementById('delete-all-license-modal');
            if (modal) modal.classList.remove('hidden');
        };

        window.closeDeleteAllLicenseModal = () => {
            const modal = document.getElementById('delete-all-license-modal');
            if (modal) modal.classList.add('hidden');
        };

        window.checkLicensePurgeInput = (el) => {
            const btn = document.getElementById('btn-purge-licenses');
            if (btn) {
                if (el.value.trim() === 'Delete Page') {
                    btn.disabled = false;
                } else {
                    btn.disabled = true;
                }
            }
        };

        window.confirmPurgeAllLicenses = async () => {
            window.closeDeleteAllLicenseModal();
            showToast("กำลังเริ่มล้างข้อมูล License ทั้งหมด...", "success");

            try {
                const promises = tiktokLicenses.map(item => deleteDoc(doc(db, getPath('Tiktok_License'), item.id)));
                await Promise.all(promises);
                showToast("ล้างข้อมูล License ทั้งหมดเรียบร้อยแล้ว", "success");
            } catch (err) {
                console.error("Purge licenses error:", err);
                showToast("ไม่สามารถล้างข้อมูล License ได้สำเร็จ", "error");
            }
        };

        // ตรวจสอบความถูกต้องของ Firebase Auth
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const status = document.getElementById('connection-status');
                status.innerText = "LIVE: SYNC ACTIVE";
                status.classList.replace('text-stone-400', 'text-emerald-500');
                startSync();
            }
        });

        // ฟังก์ชันเริ่มต้นระบบพอร์ทัล
        const init = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
                window.navigate('auth');
            } catch (error) {
                console.error("Initialize error:", error);
            }
        };

        window.onload = init;

        // --- NEWS SYSTEM MANAGEMENT FUNCTIONS ---
        window.openNewsModal = (newsId = null) => {
            const modal = document.getElementById('news-modal');
            const title = document.getElementById('news-modal-title');
            const form = document.getElementById('news-form');
            form.reset();

            if (newsId) {
                const item = tiktokNews.find(n => n.id === newsId);
                if (item) {
                    title.innerText = "แก้ไขข่าวสาร";
                    document.getElementById('news-edit-id').value = newsId;
                    document.getElementById('news-status').value = item.status || 'online';
                    document.getElementById('news-date').value = item.date || '';
                    document.getElementById('news-title').value = item.title || '';
                    document.getElementById('news-detail').value = item.detail || '';
                }
            } else {
                title.innerText = "เพิ่มข่าวสารใหม่";
                document.getElementById('news-edit-id').value = '';
                // Default date to today in local time zone
                const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
                document.getElementById('news-date').value = today;
            }

            if (modal) modal.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
        };

        window.closeNewsModal = () => {
            const modal = document.getElementById('news-modal');
            if (modal) modal.classList.add('hidden');
        };

        window.saveNewsItem = async (e) => {
            e.preventDefault();
            const editId = document.getElementById('news-edit-id').value;
            const status = document.getElementById('news-status').value;
            const date = document.getElementById('news-date').value;
            const title = document.getElementById('news-title').value.trim();
            const detail = document.getElementById('news-detail').value.trim();

            const newsData = {
                status,
                date,
                title,
                detail,
                updatedAt: serverTimestamp()
            };

            const gl = document.getElementById('globalLoader') || document.getElementById('global-loader');
            if (gl) gl.classList.remove('hidden');

            try {
                if (editId) {
                    const docRef = doc(db, getPath('Tiktok_News'), editId);
                    await updateDoc(docRef, newsData);
                    showToast("แก้ไขข้อมูลข่าวสารเรียบร้อยแล้วค่ะ!");
                } else {
                    newsData.clicks = 0;
                    newsData.createdAt = serverTimestamp();
                    const colRef = collection(db, getPath('Tiktok_News'));
                    await addDoc(colRef, newsData);
                    showToast("เพิ่มข่าวสารเรียบร้อยแล้วค่ะ!");
                }
                window.closeNewsModal();
            } catch (err) {
                console.error("Error saving news:", err);
                showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูลค่ะ", "error");
            } finally {
                if (gl) gl.classList.add('hidden');
            }
        };

        window.deleteNewsItem = async (newsId, titleText) => {
            if (!confirm(`คุณต้องการลบข่าวสารหัวข้อ "${titleText}" ใช่หรือไม่?`)) return;
            const gl = document.getElementById('globalLoader') || document.getElementById('global-loader');
            if (gl) gl.classList.remove('hidden');

            try {
                const docRef = doc(db, getPath('Tiktok_News'), newsId);
                await deleteDoc(docRef);
                showToast("ลบข่าวสารเรียบร้อยแล้วค่ะ!");
            } catch (err) {
                console.error("Error deleting news:", err);
                showToast("เกิดข้อผิดพลาดในการลบข้อมูลค่ะ", "error");
            } finally {
                if (gl) gl.classList.add('hidden');
            }
        };

        window.renderTiktokNews = () => {
            const tbody = document.getElementById('news-table-body');
            if (!tbody) return;

            // Sort news by date descending, then createdAt descending
            const list = [...tiktokNews].sort((a, b) => {
                const dateA = a.date || '';
                const dateB = b.date || '';
                if (dateB !== dateA) return dateB.localeCompare(dateA);
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });

            const total = list.length;
            const totalPages = Math.max(1, Math.ceil(total / newsItemsPerPage));
            if (newsCurrentPage > totalPages) newsCurrentPage = totalPages;

            const startIdx = (newsCurrentPage - 1) * newsItemsPerPage;
            const endIdx = Math.min(startIdx + newsItemsPerPage, total);
            const pageItems = list.slice(startIdx, endIdx);

            const paginationInfo = document.getElementById('news-pagination-info');
            if (paginationInfo) {
                paginationInfo.innerText = total > 0
                    ? `จำนวนข่าวสารทั้งหมด: ${total} รายการ (แสดง ${startIdx + 1} ถึง ${endIdx})`
                    : `จำนวนข่าวสารทั้งหมด: 0 รายการ`;
            }

            const pageNum = document.getElementById('news-page-number');
            if (pageNum) {
                pageNum.innerText = `หน้า ${newsCurrentPage} / ${totalPages}`;
            }

            const btnPrev = document.getElementById('btn-news-page-prev');
            const btnNext = document.getElementById('btn-news-page-next');
            if (btnPrev) btnPrev.disabled = newsCurrentPage === 1;
            if (btnNext) btnNext.disabled = newsCurrentPage === totalPages;

            if (pageItems.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-10 text-stone-400 italic text-[13px]">
                        ไม่มีข้อมูลข่าวสาร
                    </td>
                </tr>
                `;
                return;
            }

            tbody.innerHTML = pageItems.map((n, idx) => {
                // format date to show in local format
                let displayDate = n.date || '-';
                if (n.date) {
                    const parts = n.date.split('-');
                    if (parts.length === 3) {
                        displayDate = `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
                    }
                }
                const statusClass = n.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600';
                const statusLabel = n.status === 'online' ? 'Online' : 'Offline';
                const clickCount = n.clicks !== undefined ? n.clicks : 0;

                return `
                <tr class="hover:bg-stone-50 transition-all text-[13px]">
                    <td class="py-3 font-medium text-stone-600">${displayDate}</td>
                    <td class="text-center py-3">
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${statusClass}">${statusLabel}</span>
                    </td>
                    <td class="py-3 font-semibold text-stone-800">${n.title || '-'}</td>
                    <td class="py-3 text-stone-500 max-w-[300px] truncate" title="${n.detail || '-'}">${n.detail || '-'}</td>
                    <td class="text-center py-3 text-stone-700 font-bold">${clickCount.toLocaleString('th-TH')}</td>
                    <td class="text-center py-3">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="window.openNewsModal('${n.id}')" class="p-1 hover:bg-stone-100 rounded text-blue-600 border-0 bg-transparent cursor-pointer" title="แก้ไข">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.deleteNewsItem('${n.id}', '${(n.title || '').replace(/'/g, "\\'")}')" class="p-1 hover:bg-stone-100 rounded text-red-600 border-0 bg-transparent cursor-pointer" title="ลบ">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');

            if (window.lucide) window.lucide.createIcons();
        };

        window.changeNewsPage = (direction) => {
            newsCurrentPage += direction;
            window.renderTiktokNews();
        };

        window.onNewsPageSizeChanged = () => {
            const select = document.getElementById('news-items-per-page');
            if (select) {
                newsItemsPerPage = parseInt(select.value) || 10;
                newsCurrentPage = 1;
                window.renderTiktokNews();
            }
        };

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc, setDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : { apiKey: "AIzaSyAciknEYhZU7AwOdfYytC1t_AnW2Ee11us", authDomain: "faifah-ttb.firebaseapp.com", projectId: "faifah-ttb", storageBucket: "faifah-ttb.appspot.com", messagingSenderId: "842980876200", appId: "1:842980876200:web:f33bfad2ccbf263075079d" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// กำหนดชื่อตารางคอลเลกชันระดับ Root ตามกติกาความปลอดภัย
const MEMBER_COLLECTION = 'Tiktok_Member';
const BRANCH_COLLECTION = 'Tiktok_Branch';
const POSITION_COLLECTION = 'Tiktok_Position';
const QUIZ_COLLECTION = 'Tiktok_Quiz';

window.currentUser = null;
window.uploadedProfileBase64 = null;
window.activeFormTab = 'login'; // 'login' or 'register'
window.isMuted = false;

// รายการตัวเลือกสาขาและตำแหน่งงานดึงจริงจาก Database
window.branchesList = [];
window.positionsList = [];

// รายการแบบทดสอบและสเตตัสจำลอง
window.quizQuestions = [];
window.currentQuizIndex = 0;
window.quizSelectedChoice = null;
window.quizSubmitted = false;
window.quizScore = 0;
window.quizTrueCount = 0;
window.quizFalseCount = 0;

// --- ระบบเลื่อนหน้าไปที่บนสุดของหน้าเว็บโดยอัตโนมัติเมื่อสลับหน้า ---
window.scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    const mainContainer = document.getElementById('mainWrapper');
    if (mainContainer) mainContainer.scrollTop = 0;

    const welcomeView = document.getElementById('welcomeView');
    if (welcomeView) welcomeView.scrollTop = 0;

    const formView = document.getElementById('formView');
    if (formView) formView.scrollTop = 0;

    const quizQuestionView = document.getElementById('quizQuestionView');
    if (quizQuestionView) quizQuestionView.scrollTop = 0;

    const dashboardScrollArea = document.getElementById('dashboardScrollArea');
    if (dashboardScrollArea) dashboardScrollArea.scrollTop = 0;
};

// --- ประกาศฟังก์ชันระดับ Global เพื่อเชื่อมโยง HTML inline onclick ---
window.transitionToForm = () => {
    document.getElementById('welcomeView').classList.add('hidden');
    document.getElementById('formView').classList.remove('hidden');
    window.scrollToTop();
    window.speakText("เข้าสู่หน้าต่างลงทะเบียนเข้าใช้งาน เลือกเข้าสู่ระบบหรือลงทะเบียนสมาชิกใหม่ค่ะ");
};

window.transitionToWelcome = () => {
    document.getElementById('formView').classList.add('hidden');
    document.getElementById('welcomeView').classList.remove('hidden');
    window.scrollToTop();
    window.speakText("กลับมายังวัตถุประสงค์ของกิจกรรม");
};

window.switchFormTab = (tab) => {
    window.activeFormTab = tab;
    const loginBtn = document.getElementById('tabLoginBtn');
    const registerBtn = document.getElementById('tabRegisterBtn');
    const loginArea = document.getElementById('loginFormArea');
    const registerArea = document.getElementById('registerFormArea');

    if (tab === 'login') {
        loginBtn.className = "flex-1 py-2.5 rounded-xl text-[13px] font-normal transition-all duration-300 bg-white text-slate-900 shadow-md";
        registerBtn.className = "flex-1 py-2.5 rounded-xl text-[13px] font-normal transition-all duration-300 text-white/80 hover:text-white";
        loginArea.classList.remove('hidden');
        registerArea.classList.add('hidden');
    } else {
        registerBtn.className = "flex-1 py-2.5 rounded-xl text-[13px] font-normal transition-all duration-300 bg-white text-slate-900 shadow-md";
        loginBtn.className = "flex-1 py-2.5 rounded-xl text-[13px] font-normal transition-all duration-300 text-white/80 hover:text-white";
        registerArea.classList.remove('hidden');
        loginArea.classList.add('hidden');
    }
};

window.previewImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const imgObj = new Image();
        imgObj.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            const srcWidth = imgObj.width;
            const srcHeight = imgObj.height;
            const size = 200;

            let srcX = 0;
            let srcY = 0;
            let srcW = srcWidth;
            let srcH = srcHeight;

            if (srcWidth > srcHeight) {
                srcW = srcHeight;
                srcX = (srcWidth - srcHeight) / 2;
            } else {
                srcH = srcWidth;
                srcY = (srcHeight - srcWidth) / 2;
            }

            ctx.drawImage(imgObj, srcX, srcY, srcW, srcH, 0, 0, size, size);
            window.uploadedProfileBase64 = canvas.toDataURL('image/jpeg', 0.85);

            const previewImg = document.getElementById('regAvatarImg');
            const text = document.getElementById('regAvatarText');
            if (previewImg && text) {
                previewImg.src = window.uploadedProfileBase64;
                previewImg.classList.remove('hidden');
                text.classList.add('hidden');
            }

            window.checkRegFormValidity();
        };
        imgObj.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// --- ระบบเสียงพูด (ถอดระบบเสียงพูดออก) ---
window.speakText = (text, delay = 600) => {
    // Disabled
};

// ฟังก์ชันแสดงการแจ้งเตือนกลางหน้าจอ ปรับขนาด font เป็น 12px ทั้งหมด และตั้งเวลาคงอยู่ 5 วินาที
window.showMessage = (msg, isError = false) => {
    const box = document.getElementById('messageBox');
    if (!box) return;
    box.textContent = msg;
    box.className = (isError ? "bg-red-600 text-white shadow-lg" : "bg-green-600 text-white shadow-lg") + " text-[12px] font-normal px-6 py-3.5 rounded-2xl z-[9999]";
    box.classList.remove('hidden');

    if (window.msgTimeout) clearTimeout(window.msgTimeout);
    window.msgTimeout = setTimeout(() => { box.classList.add('hidden'); }, 5000); // ตั้งเวลาคงอยู่ 5 วินาที
};

// ฟังก์ชันสร้าง Path การเข้าถึงคอลเลกชันแบบผสมผสาน (สลับโหมดอัตโนมัติระหว่าง Canvas Preview และ Local Hosting)
const getCollectionRef = (colName) => {
    if (typeof __firebase_config !== 'undefined' && typeof __app_id !== 'undefined' && __app_id !== 'default-app-id') {
        return collection(db, `artifacts/${appId}/public/data/${colName}`);
    } else {
        return collection(db, colName);
    }
};

// ฟังก์ชันสร้าง Path การเข้าถึงเอกสารแบบผสมผสาน (รองรับสิทธิ์พรีวิวจำลอง)
const getDocRef = (colName, docId) => {
    if (typeof __firebase_config !== 'undefined' && typeof __app_id !== 'undefined' && __app_id !== 'default-app-id') {
        return doc(db, `artifacts/${appId}/public/data/${colName}`, docId);
    } else {
        return doc(db, colName, docId);
    }
};

// ฟังก์ชันโหลดข้อมูลจาก Firestore ตามเงื่อนไขความปลอดภัยและเส้นทางแบบคิวรีสคริปต์ฟิลด์จริง
window.loadDropdownData = async () => {
    if (!auth.currentUser) return;

    try {
        // 1. ดึงข้อมูลจากตารางคอลเลกชัน Tiktok_Branch ฟิลด์ empBranch
        const branchRef = getCollectionRef(BRANCH_COLLECTION);
        const branchSnap = await getDocs(branchRef);
        window.branchesList = [];
        branchSnap.forEach(d => {
            const data = d.data();
            if (data.empBranch) window.branchesList.push(data.empBranch);
        });

        window.branchesList = [...new Set(window.branchesList)].sort();

        // 2. ดึงข้อมูลจากตารางคอลเลกชัน Tiktok_Position ฟิลด์ empPosition
        const positionRef = getCollectionRef(POSITION_COLLECTION);
        const positionSnap = await getDocs(positionRef);
        window.positionsList = [];
        positionSnap.forEach(d => {
            const data = d.data();
            if (data.empPosition) window.positionsList.push(data.empPosition);
        });
        window.positionsList = [...new Set(window.positionsList)].sort();

        // สั่งแรนเดอร์รายการ dropdowns ตัวเลือกใน UI
        window.renderSearchItems('branch', window.branchesList);
        window.renderSearchItems('position', window.positionsList);

    } catch (e) {
        console.error("Error loading dropdown data from Firestore path:", e);
        window.branchesList = [];
        window.positionsList = [];
        window.renderSearchItems('branch', []);
        window.renderSearchItems('position', []);
    }
};

// แสดงรายการผลการค้นหาลง dropdown
window.renderSearchItems = (type, items) => {
    const resultBox = document.getElementById(type === 'branch' ? 'regBranchResults' : 'regPositionResults');
    if (!resultBox) return;

    if (items.length === 0) {
        resultBox.innerHTML = `<div class="p-3 text-slate-400 text-xs text-center">พิมพ์เพื่อระบุข้อมูลสังกัดของท่าน</div>`;
        return;
    }

    resultBox.innerHTML = items.map(item => `
        <div class="px-4 py-2.5 search-item cursor-pointer text-[13px]" onclick="window.selectSearchValue('${type}', '${item.replace(/'/g, "\\'")}')">
            ${item}
        </div>
    `).join('');
};

window.handleRegister = async () => {
    if (!auth.currentUser) {
        window.showMessage("กรุณารอระบบยืนยันสิทธิ์สักครู่...", true);
        return;
    }

    const empId = document.getElementById('regEmployeeId').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const empBranch = document.getElementById('regBranchInput').value.trim();
    const empPosition = document.getElementById('regPositionInput').value.trim();
    const tiktokUser = document.getElementById('regTiktokUser').value.trim();
    const tiktokUrl = document.getElementById('regTiktokUrl').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    const confirmPass = document.getElementById('regConfirmPassword').value.trim();

    if (!empId || !fullName || !empBranch || !empPosition || !tiktokUser || !tiktokUrl || !pass || !confirmPass) {
        window.showMessage("กรุณากรอกข้อมูลและระบุรายละเอียดให้ครบถ้วนทุกช่อง", true);
        return;
    }

    if (pass !== confirmPass) {
        window.showMessage("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน", true);
        return;
    }

    const gl = document.getElementById('globalLoader');
    if (gl) gl.classList.remove('hidden');

    try {
        const memberRef = getCollectionRef(MEMBER_COLLECTION);
        const snap = await getDocs(memberRef);
        let exists = false;
        snap.forEach(d => {
            if (d.data().employeeId === empId) exists = true;
        });

        if (exists) {
            window.showMessage("รหัสพนักงานนี้เคยถูกลงทะเบียนในระบบแล้ว", true);
            if (gl) gl.classList.add('hidden');
            return;
        }

        const newUser = {
            employeeId: empId,
            name: fullName,
            empBranch: empBranch,
            empPosition: empPosition,
            tiktokUser: tiktokUser.startsWith('@') ? tiktokUser : '@' + tiktokUser,
            tiktokUrl: tiktokUrl,
            password: pass,
            profileImage: window.uploadedProfileBase64 || null,
            MemberStatus: "New Registration",
            StartWelcome: 0,
            createdAt: serverTimestamp()
        };

        await addDoc(memberRef, newUser);

        document.getElementById('formView').classList.add('hidden');
        document.getElementById('successPanel').classList.remove('hidden');
        document.getElementById('registeredName').textContent = fullName;
        window.scrollToTop();

        window.showMessage("ลงทะเบียนสมาชิกสำเร็จ!");
        window.speakText("ลงทะเบียนสำเร็จ ยินดีต้อนรับเข้าสู่ครอบครัว แบรนช์ ติ๊กต๊อก เดอะ ไอดอล คุณ " + fullName);
    } catch (e) {
        console.error("Database Registration Error:", e);
        window.showMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง", true);
    } finally {
        if (gl) gl.classList.add('hidden');
    }
};

window.handleLogin = async () => {
    if (!auth.currentUser) {
        window.showMessage("กรุณารอระบบยืนยันสิทธิ์สักครู่...", true);
        return;
    }

    const empId = document.getElementById('loginEmployeeId').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();

    if (!empId || !pass) {
        window.showMessage("กรุณากรอกรหัสพนักงานและรหัสผ่านให้ครบถ้วน", true);
        return;
    }

    const gl = document.getElementById('globalLoader');
    if (gl) gl.classList.remove('hidden');

    try {
        const memberRef = getCollectionRef(MEMBER_COLLECTION);
        const snap = await getDocs(memberRef);
        let matchedUser = null;
        snap.forEach(d => {
            const data = d.data();
            if (data.employeeId === empId && data.password === pass) {
                matchedUser = { docId: d.id, ...data };
            }
        });

        if (matchedUser) {
            window.currentMember = matchedUser;
            document.getElementById('formView').classList.add('hidden');

            const startWelcomeValue = (typeof matchedUser.StartWelcome !== 'undefined') ? Number(matchedUser.StartWelcome) : 0;

            if (startWelcomeValue === 0) {
                document.getElementById('registrationFormPanel').classList.add('hidden');
                document.getElementById('invitationBox').classList.add('hidden');
                document.getElementById('quizIntroView').classList.remove('hidden');
                window.scrollToTop();

                window.showMessage("กรุณาทำแบบทดสอบเพื่อเริ่มต้นกิจกรรมค่ะ", false);
                window.speakText("ยินดีต้อนรับเข้าใช้งาน กรุณาทำแบบทดสอบความเข้าใจก่อนเริ่มต้นกิจกรรมค่ะ");
            } else {
                window.enterAppDashboard();
            }
        } else {
            window.showMessage("รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง", true);
        }
    } catch (e) {
        console.error("Database Login Error:", e);
        window.showMessage("เกิดข้อผิดพลาดทางเทคนิค กรุณาลองใหม่อีกครั้ง", true);
    } finally {
        if (gl) gl.classList.add('hidden');
    }
};

window.checkLoginEmployeeId = async () => {
    const empIdInput = document.getElementById('loginEmployeeId');
    let empId = empIdInput.value.trim();
    const loginAvatarImg = document.getElementById('loginAvatarImg');
    const loginAvatarPlaceholder = document.getElementById('loginAvatarPlaceholder');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginButton = document.getElementById('loginSubmitBtn');

    const resetLoginUI = () => {
        if (loginAvatarImg) loginAvatarImg.classList.add('hidden');
        if (loginAvatarPlaceholder) loginAvatarPlaceholder.classList.remove('hidden');
        if (loginPasswordInput) {
            loginPasswordInput.disabled = true;
            loginPasswordInput.value = "";
        }
        if (loginButton) loginButton.disabled = true;
    };

    if (empId.length === 0) {
        resetLoginUI();
        return;
    }

    if (empId.length > 5) {
        window.showMessage("คุณคีย์รหัสพนักงานไม่ถูกต้อง", true);
        empIdInput.value = empId.substring(0, 5);
        resetLoginUI();
        return;
    }

    if (empId.length < 5) {
        resetLoginUI();
        return;
    }

    try {
        const memberRef = getCollectionRef(MEMBER_COLLECTION);
        const snap = await getDocs(memberRef);
        let matched = null;
        snap.forEach(d => {
            const data = d.data();
            if (data.employeeId === empId) {
                matched = data;
            }
        });

        if (matched) {
            const status = matched.MemberStatus || "";

            if ((status === "Registration" || status === "New Registration") && matched.profileImage) {
                if (loginAvatarImg) {
                    loginAvatarImg.src = matched.profileImage;
                    loginAvatarImg.classList.remove('hidden');
                }
                if (loginAvatarPlaceholder) {
                    loginAvatarPlaceholder.classList.add('hidden');
                }
            }

            if (status === "Registration") {
                if (loginPasswordInput) {
                    loginPasswordInput.disabled = false;
                }
            } else if (status === "New Registration") {
                window.showMessage("บัญชีของท่านอยู่ระหว่างรอการอนุมัติ (New Registration) จึงยังไม่สามารถระบุรหัสผ่านได้ค่ะ", false);
            } else {
                window.showMessage("สถานะบัญชีของท่านไม่ถูกต้องสำหรับการเข้าสู่ระบบ", true);
            }
        } else {
            window.showMessage("ไม่พบรหัสพนักงานนี้ในระบบ", true);
        }
    } catch (e) {
        console.error("Error checking employee ID status:", e);
    }
};

window.checkLoginPassword = () => {
    const passwordInput = document.getElementById('loginPassword');
    const loginButton = document.getElementById('loginSubmitBtn');
    if (passwordInput && loginButton) {
        if (passwordInput.value.length > 0 && !passwordInput.disabled) {
            loginButton.disabled = false;
        } else {
            loginButton.disabled = true;
        }
    }
};

window.checkRegisterEmployeeId = async () => {
    const empIdInput = document.getElementById('regEmployeeId');
    let empId = empIdInput.value.trim();
    const fields = ['regFullName', 'regBranchInput', 'regPositionInput', 'regTiktokUser', 'regTiktokUrl', 'regPassword', 'regConfirmPassword'];
    const avatarLabel = document.getElementById('regAvatarLabel');
    const imageInput = document.getElementById('regImageInput');

    const lockFields = () => {
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = true;
                el.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        if (imageInput) imageInput.disabled = true;
        if (avatarLabel) {
            avatarLabel.style.pointerEvents = 'none';
            avatarLabel.style.opacity = '0.5';
        }
    };

    const unlockFields = () => {
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = false;
                el.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
        if (imageInput) imageInput.disabled = false;
        if (avatarLabel) {
            avatarLabel.style.pointerEvents = 'auto';
            avatarLabel.style.opacity = '1';
        }
    };

    if (empId.length === 0) {
        lockFields();
        window.checkRegFormValidity();
        return;
    }

    if (empId.length > 5) {
        window.showMessage("คุณคีย์รหัสพนักงานไม่ถูกต้อง", true);
        empIdInput.value = empId.substring(0, 5);
        lockFields();
        window.checkRegFormValidity();
        return;
    }

    if (empId.length < 5) {
        lockFields();
        window.checkRegFormValidity();
        return;
    }

    try {
        const memberRef = getCollectionRef(MEMBER_COLLECTION);
        const snap = await getDocs(memberRef);
        let exists = false;
        snap.forEach(d => {
            if (d.data().employeeId === empId) exists = true;
        });

        if (exists) {
            window.showMessage("รหัสพนักงานนี้ได้ลงทะเบียนแล้ว", true);
            lockFields();
        } else {
            window.showMessage("รหัสพนักงานสามารถใช้งานได้", false);
            unlockFields();
        }
    } catch (e) {
        console.error("Error checking register employee ID:", e);
    }
    window.checkRegFormValidity();
};

window.checkRegFormValidity = () => {
    const empId = document.getElementById('regEmployeeId').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const empBranch = document.getElementById('regBranchInput').value.trim();
    const empPosition = document.getElementById('regPositionInput').value.trim();
    const tiktokUser = document.getElementById('regTiktokUser').value.trim();
    const tiktokUrl = document.getElementById('regTiktokUrl').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    const confirmPass = document.getElementById('regConfirmPassword').value.trim();
    const hasImage = !!window.uploadedProfileBase64;

    const submitBtn = document.getElementById('regSubmitBtn');
    if (!submitBtn) return;

    if (empId && empId.length === 5 && fullName && empBranch && empPosition && tiktokUser && tiktokUrl && pass && confirmPass && (pass === confirmPass) && hasImage) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
};

window.submitQuizAnswer = async () => {
    if (window.quizSelectedChoice === null || window.quizSubmitted) return;

    window.quizSubmitted = true;
    const questionData = window.quizQuestions[window.currentQuizIndex];
    const choicesContainer = document.getElementById('quizChoicesContainer');
    const buttons = choicesContainer.getElementsByTagName('button');

    let choices = [];
    const f1 = questionData.Ans_1 || "";
    const f2 = questionData.Ans_2 || "";
    const f3 = questionData.Ans_3 || "";
    const f4 = questionData.Ans_4 || "";

    if (f1 || f2 || f3 || f4) {
        choices = [f1, f2, f3, f4];
    } else if (questionData.choices && Array.isArray(questionData.choices)) {
        choices = questionData.choices;
    } else {
        choices = ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4"];
    }

    let correctAnswerIndex = -1;
    if (questionData.Answer !== undefined) {
        correctAnswerIndex = Number(questionData.Answer) - 1;
    } else if (questionData.answer_index !== undefined) {
        correctAnswerIndex = Number(questionData.answer_index);
    }

    const isCorrect = (window.quizSelectedChoice === correctAnswerIndex);

    const submitBtn = document.getElementById('quizSubmitAnswerBtn');
    if (submitBtn) {
        submitBtn.classList.add('hidden');
    }

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (i === correctAnswerIndex) {
            buttons[i].className = "w-full p-4 rounded-2xl border border-transparent text-left text-[13px] bg-green-500 block text-white opacity-100 !opacity-100";
        } else if (i === window.quizSelectedChoice) {
            buttons[i].className = "w-full p-4 rounded-2xl border border-transparent text-left text-[13px] bg-red-500 block text-white opacity-100 !opacity-100";
        } else {
            buttons[i].className = "w-full p-4 rounded-2xl border border-white/10 text-left text-[13px] bg-white/10 block text-white opacity-100 !opacity-100";
        }
    }

    const feedback = document.getElementById('quizSelectionFeedback');
    if (isCorrect) {
        feedback.innerHTML = `<span class="text-green-400 font-semibold flex items-center gap-1"><i data-lucide="check" class="w-4 h-4"></i> ตอบถูกต้อง!</span>`;
        window.quizScore++;
        window.quizTrueCount++;
    } else {
        feedback.innerHTML = `<span class="text-red-400 font-semibold flex items-center gap-1"><i data-lucide="x" class="w-4 h-4"></i> ตอบไม่ถูกต้องค่ะ</span>`;
        window.quizFalseCount++;
    }

    if (window.lucide) window.lucide.createIcons();

    try {
        const quizDocRef = getDocRef(QUIZ_COLLECTION, questionData.id);
        const quizUpdates = {};

        quizUpdates['A' + (window.quizSelectedChoice + 1)] = increment(1);

        if (isCorrect) {
            quizUpdates['Quiz_true'] = increment(1);
        } else {
            quizUpdates['Quiz_false'] = increment(1);
        }

        await setDoc(quizDocRef, quizUpdates, { merge: true });

        const memberDocRef = doc(db, MEMBER_COLLECTION, window.currentMember.docId);
        const memberUpdates = {
            ScoreQuiz: window.quizScore,
            Quiz_true: window.quizTrueCount,
            Quiz_false: window.quizFalseCount
        };

        if (!window.currentMember.QuizAnswers) {
            window.currentMember.QuizAnswers = {};
        }
        window.currentMember.QuizAnswers['Q_' + questionData.Q_number] = {
            selectedChoice: window.quizSelectedChoice,
            selectedText: choices[window.quizSelectedChoice] || "ตัวเลือกที่เลือก",
            isCorrect: isCorrect,
            answerTime: new Date().toISOString()
        };
        memberUpdates.QuizAnswers = window.currentMember.QuizAnswers;

        await updateDoc(memberDocRef, memberUpdates);

        window.currentMember.ScoreQuiz = window.quizScore;
        window.currentMember.Quiz_true = window.quizTrueCount;
        window.currentMember.Quiz_false = window.quizFalseCount;

    } catch (err) {
        console.error("Error saving quiz response to Firestore:", err);
    }

    document.getElementById('quizNextBtn').disabled = false;
};

window.nextQuizQuestion = async () => {
    if (window.currentQuizIndex < window.quizQuestions.length - 1) {
        window.currentQuizIndex++;
        window.renderQuizQuestion();
        window.scrollToTop();
    } else {
        const gl = document.getElementById('globalLoader');
        if (gl) gl.classList.remove('hidden');

        try {
            const memberDocRef = doc(db, MEMBER_COLLECTION, window.currentMember.docId);
            await updateDoc(memberDocRef, {
                StartWelcome: 1,
                ScoreQuiz: window.quizScore,
                Quiz_true: window.quizTrueCount,
                Quiz_false: window.quizFalseCount
            });

            window.currentMember.StartWelcome = 1;

            document.getElementById('quizQuestionView').classList.add('hidden');
            window.showMessage("บันทึกแบบทดสอบเรียบร้อย ยินดีต้อนรับเข้าใช้งานหน้าหลักค่ะ");
            window.enterAppDashboard();
        } catch (e) {
            console.error("Error updating StartWelcome status:", e);
            document.getElementById('quizQuestionView').classList.add('hidden');
            window.enterAppDashboard();
        } finally {
            if (gl) gl.classList.add('hidden');
        }
    }
};

window.startQuizFlow = async () => {
    const gl = document.getElementById('globalLoader');
    if (gl) gl.classList.remove('hidden');

    try {
        const quizRef = getCollectionRef(QUIZ_COLLECTION);
        const quizSnap = await getDocs(quizRef);
        window.quizQuestions = [];

        quizSnap.forEach(d => {
            const data = d.data();
            const qNum = data.Q_number !== undefined ? Number(data.Q_number) : (data.q_number !== undefined ? Number(data.q_number) : (data.qNumber !== undefined ? Number(data.qNumber) : parseInt(d.id.replace(/\D/g, ''))));

            if (!isNaN(qNum)) {
                window.quizQuestions.push({
                    id: d.id,
                    Q_number: qNum,
                    ...data
                });
            } else {
                window.quizQuestions.push({
                    id: d.id,
                    Q_number: window.quizQuestions.length + 1,
                    ...data
                });
            }
        });

        window.quizQuestions.sort((a, b) => Number(a.Q_number) - Number(b.Q_number));

        if (window.quizQuestions.length === 0) {
            window.showMessage("ไม่พบข้อมูลคำถามในตาราง Tiktok_Quiz กรุณาเพิ่มข้อมูลคำถามในระบบ", true);
            if (gl) gl.classList.add('hidden');
            return;
        }

        window.currentQuizIndex = 0;
        window.quizScore = 0;
        window.quizTrueCount = 0;
        window.quizFalseCount = 0;

        document.getElementById('quizIntroView').classList.add('hidden');
        document.getElementById('quizQuestionView').classList.remove('hidden');
        window.scrollToTop();

        window.renderQuizQuestion();
    } catch (e) {
        console.error("Error loading quiz questions:", e);
        window.showMessage("เกิดข้อผิดพลาดขณะโหลดแบบทดสอบ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล", true);
    } finally {
        if (gl) gl.classList.add('hidden');
    }
};

window.selectQuizChoice = (index, clickedBtn) => {
    if (window.quizSubmitted) return;

    window.quizSelectedChoice = index;
    const choicesContainer = document.getElementById('quizChoicesContainer');
    const buttons = choicesContainer.getElementsByTagName('button');

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].className = "w-full p-4 rounded-2xl border border-white/10 text-left text-[13px] bg-white/5 hover:bg-white/10 transition-all duration-200 block text-white font-normal";
    }

    clickedBtn.className = "w-full p-4 rounded-2xl border-2 border-orange-500 text-left text-[13px] bg-white/10 transition-all duration-200 block text-white";

    const submitBtn = document.getElementById('quizSubmitAnswerBtn');
    if (submitBtn) {
        submitBtn.classList.remove('hidden');
    }
};

window.showSearchDropdown = (type) => {
    const list = document.getElementById(type === 'branch' ? 'regBranchResults' : 'regPositionResults');
    if (list) list.classList.remove('hidden');

    const otherType = type === 'branch' ? 'position' : 'branch';
    const otherList = document.getElementById(otherType === 'branch' ? 'regBranchResults' : 'regPositionResults');
    if (otherList) otherList.classList.add('hidden');
};

window.filterSearchDropdown = (type) => {
    const inputVal = document.getElementById(type === 'branch' ? 'regBranchInput' : 'regPositionInput').value.trim().toLowerCase();
    const fullList = type === 'branch' ? window.branchesList : window.positionsList;

    const filtered = fullList.filter(item => item.toLowerCase().includes(inputVal));
    window.renderSearchItems(type, filtered);
};

window.selectSearchValue = (type, val) => {
    const input = document.getElementById(type === 'branch' ? 'regBranchInput' : 'regPositionInput');
    const list = document.getElementById(type === 'branch' ? 'regBranchResults' : 'regPositionResults');

    if (input) input.value = val;
    if (list) list.classList.add('hidden');

    window.checkRegFormValidity();
};

window.switchDashboardTab = (tab) => {
    document.querySelectorAll('.dash-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.app-nav-item').forEach(el => el.classList.remove('active'));

    document.getElementById(`dash-tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-dash-${tab}`).classList.add('active');

    if (tab === 'leaderboard') {
        window.loadLeaderboardData();
    } else if (tab === 'userinfo') {
        window.renderUserInfoTab();
    } else if (tab === 'submit-post') {
        window.loadMyPostsData();
    } else if (tab === 'details') {
        window.switchDetailsSubTab('info');
    }

    window.scrollToTop();

    if (window.lucide) window.lucide.createIcons();
};

window.submitWork = async () => {
    const postDate = document.getElementById('workPostDateInput').value;
    const title = document.getElementById('workTitleInput').value.trim();
    const url = document.getElementById('workUrlInput').value.trim();

    if (!postDate || !title || !url) {
        window.showMessage("กรุณาระบุข้อมูลวันที่ หัวข้อ และลิ้งก์ TikTok วิดีโอให้ครบถ้วนนะคะ", true);
        return;
    }

    const gl = document.getElementById('globalLoader');
    if (gl) gl.classList.remove('hidden');

    try {
        const worksRef = getCollectionRef('Tiktok_Post');
        await addDoc(worksRef, {
            employeeId: window.currentMember.employeeId,
            name: window.currentMember.name,
            postDate: postDate,
            title: title,
            url: url,
            createdAt: serverTimestamp()
        });

        document.getElementById('workPostDateInput').value = "";
        document.getElementById('workTitleInput').value = "";
        document.getElementById('workUrlInput').value = "";
        window.showMessage("ส่งคลิปผลงานประกวดเข้าระบบสำเร็จ ขอขอบคุณที่ร่วมสนุกค่ะ!");

        window.loadMyPostsData();
    } catch (e) {
        console.error("Submit work error:", e);
        window.showMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูลผลงานของท่านค่ะ", true);
    } finally {
        if (gl) gl.classList.add('hidden');
    }
};

// รีเซ็ตค่าและย้อนกลับหน้าแรก (แก้ไขบั๊ก img.src ที่ไม่ถูกประกาศ ส่งผลให้ Logout ทำงานได้อย่างสมบูรณ์แบบ)
window.resetToForm = () => {
    const successPanel = document.getElementById('successPanel');
    if (successPanel) successPanel.classList.add('hidden');

    const dashboardPanel = document.getElementById('dashboardPanel');
    if (dashboardPanel) dashboardPanel.classList.add('hidden');

    const appDashboardView = document.getElementById('appDashboardView');
    if (appDashboardView) appDashboardView.classList.add('hidden');

    const quizIntroView = document.getElementById('quizIntroView');
    if (quizIntroView) quizIntroView.classList.add('hidden');

    const quizQuestionView = document.getElementById('quizQuestionView');
    if (quizQuestionView) {
        quizQuestionView.classList.add('hidden');
        quizQuestionView.scrollTop = 0;
    }

    const welcomeView = document.getElementById('welcomeView');
    if (welcomeView) welcomeView.classList.remove('hidden');

    document.getElementById('loginEmployeeId').value = "";
    document.getElementById('loginPassword').value = "";
    document.getElementById('loginPassword').disabled = true;
    document.getElementById('loginSubmitBtn').disabled = true;

    const loginImg = document.getElementById('loginAvatarImg');
    const loginPlaceholder = document.getElementById('loginAvatarPlaceholder');
    if (loginImg) {
        loginImg.classList.add('hidden');
        loginImg.src = ""; // FIXED: แก้ไขจาก img.src เป็น loginImg.src ป้องกัน ReferenceError ของหน้าต่างพัง
    }
    if (loginPlaceholder) {
        loginPlaceholder.classList.remove('hidden');
    }

    document.getElementById('regEmployeeId').value = "";
    document.getElementById('regFullName').value = "";
    document.getElementById('regBranchInput').value = "";
    document.getElementById('regPositionInput').value = "";
    document.getElementById('regTiktokUser').value = "";
    document.getElementById('regTiktokUrl').value = "";
    document.getElementById('regPassword').value = "";
    document.getElementById('regConfirmPassword').value = "";

    const fields = ['regFullName', 'regBranchInput', 'regPositionInput', 'regTiktokUser', 'regTiktokUrl', 'regPassword', 'regConfirmPassword'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = true;
            el.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
    const imageInput = document.getElementById('regImageInput');
    if (imageInput) imageInput.disabled = true;
    const avatarLabel = document.getElementById('regAvatarLabel');
    if (avatarLabel) {
        avatarLabel.style.pointerEvents = 'none';
        avatarLabel.style.opacity = '0.5';
    }
    const regSubmitBtn = document.getElementById('regSubmitBtn');
    if (regSubmitBtn) regSubmitBtn.disabled = true;

    window.uploadedProfileBase64 = null;
    const img = document.getElementById('regAvatarImg');
    const text = document.getElementById('regAvatarText');
    if (img && text) {
        img.classList.add('hidden');
        img.src = "";
        text.classList.remove('hidden');
    }
    window.switchFormTab('login');
    window.scrollToTop();
};

// ออกจากระบบ
window.handleCheckOut = () => {
    window.speechSynthesis.cancel();
    window.resetToForm();
    window.showMessage("ออกจากระบบเรียบร้อย");
};

window.loadLeaderboardData = async () => {
    const tableBody = document.getElementById('leaderboardTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">กำลังโหลดทำเนียบผู้นำ...</td></tr>`;

    try {
        const memberRef = getCollectionRef(MEMBER_COLLECTION);
        const snap = await getDocs(memberRef);
        const allMembers = [];

        snap.forEach(d => {
            const data = d.data();
            allMembers.push(data);
        });

        allMembers.sort((a, b) => {
            const scoreA = typeof a.ScoreQuiz !== 'undefined' ? Number(a.ScoreQuiz) : 0;
            const scoreB = typeof b.ScoreQuiz !== 'undefined' ? Number(b.ScoreQuiz) : 0;
            return scoreB - scoreA;
        });

        if (allMembers.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">ยังไม่มีผู้สอบแบบทดสอบกิจกรรม</td></tr>`;
            return;
        }

        tableBody.innerHTML = allMembers.map((m, index) => {
            const scoreVal = typeof m.ScoreQuiz !== 'undefined' ? m.ScoreQuiz : 0;
            const branchName = m.empBranch || 'ทั่วไป';
            let rankIcon = index + 1;
            if (index === 0) rankIcon = `🥇`;
            else if (index === 1) rankIcon = `🥈`;
            else if (index === 2) rankIcon = `🥉`;

            return `
                <tr class="hover:bg-white/5 transition-colors">
                    <td class="p-3 text-center font-bold text-slate-200">${rankIcon}</td>
                    <td class="p-3 font-medium text-white text-xs">${m.name}</td>
                    <td class="p-3 text-center text-slate-300 text-xs">${branchName}</td>
                    <td class="p-3 text-right font-semibold text-orange-400 text-xs">${scoreVal} คะแนน</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading leaderboard data:", err);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">ไม่สามารถเชื่อมต่อทำเนียบผู้นำได้ค่ะ</td></tr>`;
    }
};

window.renderUserInfoTab = () => {
    const m = window.currentMember;
    if (!m) return;

    document.getElementById('dashEmployeeId').textContent = m.employeeId;
    document.getElementById('dashFullName').textContent = m.name;
    document.getElementById('dashBranch').textContent = m.empBranch || 'ไม่ได้ระบุ';
    document.getElementById('dashPosition').textContent = m.empPosition || 'ไม่ได้ระบุ';
    document.getElementById('dashTiktokUser').textContent = m.tiktokUser || 'ไม่ได้ระบุ';
    document.getElementById('dashScoreQuiz').textContent = `${typeof m.ScoreQuiz !== 'undefined' ? m.ScoreQuiz : 0} / 5 คะแนน`;

    const tiktokLink = document.getElementById('dashTiktokUrl');
    if (tiktokLink) {
        tiktokLink.textContent = m.tiktokUrl || 'ไม่ได้ระบุ';
        tiktokLink.href = m.tiktokUrl || '#';
    }

    const dashAvatar = document.getElementById('dashAvatar');
    const dashPlaceholder = document.getElementById('dbAvatarPlaceholder');
    if (m.profileImage) {
        dashAvatar.src = m.profileImage;
        dashAvatar.classList.remove('hidden');
        if (dashPlaceholder) dashPlaceholder.classList.add('hidden');
    } else {
        dashAvatar.classList.add('hidden');
        if (dashPlaceholder) dashPlaceholder.classList.remove('hidden');
    }

    // Switch default sub-tab
    window.switchSubTab('my-work');
};

window.enterAppDashboard = () => {
    document.getElementById('formView').classList.add('hidden');
    document.getElementById('quizIntroView').classList.add('hidden');
    document.getElementById('quizQuestionView').classList.add('hidden');
    document.getElementById('welcomeView').classList.add('hidden');

    const dashboard = document.getElementById('appDashboardView');
    dashboard.classList.remove('hidden');

    document.getElementById('appHeaderUserName').textContent = window.currentMember.name;

    // อัปเดตรูปถ่ายพนักงานที่แท็บด้านบนหน้าสุดของหน้าเพจ (VIEW 7 Header Avatar)
    const headerAvatar = document.getElementById('appHeaderAvatarImg');
    const headerPlaceholder = document.getElementById('appHeaderAvatarPlaceholder');
    if (window.currentMember.profileImage) {
        if (headerAvatar) {
            headerAvatar.src = window.currentMember.profileImage;
            headerAvatar.classList.remove('hidden');
        }
        if (headerPlaceholder) headerPlaceholder.classList.add('hidden');
    } else {
        if (headerAvatar) headerAvatar.classList.add('hidden');
        if (headerPlaceholder) headerPlaceholder.classList.remove('hidden');
    }

    window.switchDashboardTab('home');
};

// ผูก Event Listener กับปุ่มออกระบบเพื่อความเสถียร 100% ป้องกันปุ่มไม่ทำงานจากปัญหาลำดับโหลดสคริปต์
const bindLogoutButtons = () => {
    const headerLogout = document.getElementById('headerLogoutBtn');
    const profileLogout = document.getElementById('profileLogoutBtn');
    if (headerLogout) {
        headerLogout.onclick = window.handleCheckOut;
    }
    if (profileLogout) {
        profileLogout.onclick = window.handleCheckOut;
    }
};

// --- เริ่มการทำงานและโหลด Auth เสมอตั้งแต่เริ่มต้นเพื่อความปลอดภัยสูงสุด ---
const initAuth = async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (err) {
        console.error("Firebase Auth Error:", err);
    }
};

initAuth();

onAuthStateChanged(auth, (u) => {
    if (u) {
        window.currentUser = u;
        const gl = document.getElementById('globalLoader'); if (gl) gl.classList.add('hidden');
        const mw = document.getElementById('mainWrapper'); if (mw) mw.classList.remove('hidden');

        // โหลดสาขาและตำแหน่งงาน
        window.loadDropdownData();

        // ตรึงและผูกปุ่ม Logout ให้พร้อมทำงานทันที
        bindLogoutButtons();
        if (window.lucide) window.lucide.createIcons();
    }
});

// ดึงรายการคำถามแบบทดสอบ
window.renderQuizQuestion = () => {
    const questionData = window.quizQuestions[window.currentQuizIndex];
    if (!questionData) return;

    document.getElementById('quizProgressDisplay').textContent = `ข้อที่ ${window.currentQuizIndex + 1} / ${window.quizQuestions.length}`;
    document.getElementById('quizQuestionText').textContent = questionData.Question || "";

    let choices = [];
    const f1 = questionData.Ans_1 || "";
    const f2 = questionData.Ans_2 || "";
    const f3 = questionData.Ans_3 || "";
    const f4 = questionData.Ans_4 || "";

    if (f1 || f2 || f3 || f4) {
        choices = [f1, f2, f3, f4];
    } else if (questionData.choices && Array.isArray(questionData.choices)) {
        choices = questionData.choices;
    } else {
        choices = ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4"];
    }

    const choicesContainer = document.getElementById('quizChoicesContainer');
    choicesContainer.innerHTML = choices.map((c, i) => `
        <button onclick="window.selectQuizChoice(${i}, this)" class="w-full p-4 rounded-2xl border border-white/10 text-left text-[13px] bg-white/5 hover:bg-white/10 transition-all duration-200 block text-white font-normal">
            ${c}
        </button>
    `).join('');

    window.quizSelectedChoice = null;
    window.quizSubmitted = false;

    const submitBtn = document.getElementById('quizSubmitAnswerBtn');
    if (submitBtn) {
        submitBtn.classList.add('hidden');
    }

    document.getElementById('quizSelectionFeedback').textContent = "";
    document.getElementById('quizNextBtn').disabled = true;

    if (window.lucide) window.lucide.createIcons();
};

window.handleEditImage = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const imgObj = new Image();
        imgObj.onload = async function () {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');

            const srcWidth = imgObj.width;
            const srcHeight = imgObj.height;
            const size = 200;

            let srcX = 0;
            let srcY = 0;
            let srcW = srcWidth;
            let srcH = srcHeight;

            if (srcWidth > srcHeight) {
                srcW = srcHeight;
                srcX = (srcWidth - srcHeight) / 2;
            } else {
                srcH = srcWidth;
                srcY = (srcHeight - srcWidth) / 2;
            }

            ctx.drawImage(imgObj, srcX, srcY, srcW, srcH, 0, 0, size, size);
            const base64Img = canvas.toDataURL('image/jpeg', 0.85);

            const gl = document.getElementById('globalLoader');
            if (gl) gl.classList.remove('hidden');

            try {
                const memberDocRef = doc(db, MEMBER_COLLECTION, window.currentMember.docId);
                await updateDoc(memberDocRef, {
                    profileImage: base64Img
                });

                window.currentMember.profileImage = base64Img;

                // Update UI
                const dashAvatar = document.getElementById('dashAvatar');
                const dbAvatarPlaceholder = document.getElementById('dbAvatarPlaceholder');
                if (dashAvatar) {
                    dashAvatar.src = base64Img;
                    dashAvatar.classList.remove('hidden');
                }
                if (dbAvatarPlaceholder) {
                    dbAvatarPlaceholder.classList.add('hidden');
                }

                const headerAvatar = document.getElementById('appHeaderAvatarImg');
                const headerPlaceholder = document.getElementById('appHeaderAvatarPlaceholder');
                if (headerAvatar) {
                    headerAvatar.src = base64Img;
                    headerAvatar.classList.remove('hidden');
                }
                if (headerPlaceholder) {
                    headerPlaceholder.classList.add('hidden');
                }

                window.showMessage("อัปเดตรูปถ่ายพนักงานสำเร็จ!");
            } catch (err) {
                console.error("Error updating profile image:", err);
                window.showMessage("เกิดข้อผิดพลาดในการอัปเดตรูปภาพ", true);
            } finally {
                if (gl) gl.classList.add('hidden');
            }
        };
        imgObj.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.switchSubTab = (tab) => {
    document.querySelectorAll('.sub-tab-content').forEach(el => el.classList.add('hidden'));

    const buttons = ['subTabMyWorkBtn', 'subTabBranchWorkBtn', 'subTabFollowUpBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.className = "flex-1 py-1.5 rounded-xl text-[12px] font-normal transition-all duration-300 text-white/80 hover:text-white bg-transparent";
        }
    });

    const activeBtnId = 'subTab' + tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Btn';
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.className = "flex-1 py-1.5 rounded-xl text-[12px] font-normal transition-all duration-300 bg-[#e26e2c] text-white shadow-md";
    }

    document.getElementById(`sub-content-${tab}`).classList.remove('hidden');

    if (tab === 'my-work') {
        window.loadMyWorkData();
    } else if (tab === 'branch-work') {
        window.loadBranchWorkData();
    }
};

window.switchDetailsSubTab = (tabName) => {
    // Hide all details sub-tab contents
    document.querySelectorAll('.details-sub-tab-content').forEach(el => el.classList.add('hidden'));

    // Reset all details sub-tab button styles
    const buttons = ['detailsSubTabInfoBtn', 'detailsSubTabRulesBtn', 'detailsSubTabRewardsBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.className = "flex-1 py-2 rounded-xl text-[12px] font-normal transition-all duration-300 text-white/80 hover:text-white bg-transparent";
        }
    });

    // Highlight the active details sub-tab button
    const activeBtnId = 'detailsSubTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Btn';
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.className = "flex-1 py-2 rounded-xl text-[12px] font-normal transition-all duration-300 bg-[#e26e2c] text-white shadow-md";
    }

    // Show the active details sub-tab content
    const activeContentId = `details-sub-content-${tabName}`;
    const activeContent = document.getElementById(activeContentId);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }

    // Scroll dashboard content to top
    const scrollArea = document.getElementById('dashboardScrollArea');
    if (scrollArea) {
        scrollArea.scrollTop = 0;
    }

    // Re-initialize Lucide Icons if available
    if (window.lucide) {
        window.lucide.createIcons();
    }
};


window.loadMyWorkData = async () => {
    const container = document.getElementById('myWorkDetailsContainer');
    if (!container) return;
    container.innerHTML = `<p class="text-xs text-slate-400">กำลังโหลดผลงานของคุณ...</p>`;

    try {
        const worksRef = getCollectionRef('Tiktok_Post');
        const snap = await getDocs(worksRef);
        const list = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.employeeId === window.currentMember.employeeId) {
                list.push(data);
            }
        });

        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (list.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400 text-center py-2">คุณยังไม่มีผลงานส่งประกวดในระบบ</p>`;
            return;
        }

        container.innerHTML = list.map(w => `
            <div class="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs">
                <div class="font-medium text-orange-400 truncate">${w.title}</div>
                <a href="${w.url}" target="_blank" class="text-[11px] text-blue-400 truncate block hover:underline mt-0.5">${w.url}</a>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading my work:", err);
        container.innerHTML = `<p class="text-xs text-red-400">ไม่สามารถโหลดข้อมูลได้ค่ะ</p>`;
    }
};

window.loadBranchWorkData = async () => {
    const container = document.getElementById('branchWorkDetailsContainer');
    if (!container) return;
    container.innerHTML = `<p class="text-xs text-slate-400">กำลังโหลดผลงานของสาขา...</p>`;

    try {
        const memberRef = getCollectionRef(MEMBER_COLLECTION);
        const memberSnap = await getDocs(memberRef);
        const branchMemberIds = new Set();
        memberSnap.forEach(d => {
            const data = d.data();
            if (data.empBranch === window.currentMember.empBranch) {
                branchMemberIds.add(data.employeeId);
            }
        });

        const worksRef = getCollectionRef('Tiktok_Post');
        const snap = await getDocs(worksRef);
        const list = [];
        snap.forEach(d => {
            const data = d.data();
            if (branchMemberIds.has(data.employeeId)) {
                list.push(data);
            }
        });

        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (list.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400 text-center py-2">ยังไม่มีผลงานของสาขาส่งในระบบ</p>`;
            return;
        }

        container.innerHTML = list.map(w => `
            <div class="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs">
                <div class="font-medium text-orange-400 truncate">${w.title}</div>
                <div class="text-[10px] text-slate-300 mt-0.5">โดย: ${w.name} (รหัส: ${w.employeeId})</div>
                <a href="${w.url}" target="_blank" class="text-[11px] text-blue-400 truncate block hover:underline mt-0.5">${w.url}</a>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading branch work:", err);
        container.innerHTML = `<p class="text-xs text-red-400">ไม่สามารถโหลดข้อมูลได้ค่ะ</p>`;
    }
};

window.selectedFilterMonth = null;
window.myPostsList = [];

window.loadMyPostsData = async () => {
    const tableBody = document.getElementById('myPostsTableBody');
    const filterContainer = document.getElementById('monthFilterContainer');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>`;

    try {
        const memberId = window.currentMember.employeeId;
        const postsRef = getCollectionRef('Tiktok_Post');
        const snap = await getDocs(postsRef);
        const myPosts = [];

        snap.forEach(d => {
            const data = d.data();
            if (data.employeeId === memberId) {
                myPosts.push({ docId: d.id, ...data });
            }
        });

        // Store all posts globally for filtering and modal access
        window.myPostsList = myPosts;

        // Sort posts by date descending
        myPosts.sort((a, b) => {
            const dateA = a.postDate || "";
            const dateB = b.postDate || "";
            return dateB.localeCompare(dateA);
        });

        // Extract unique months from postDate (format YYYY-MM-DD -> YYYY-MM)
        const thaiMonths = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];

        const monthsMap = {};
        myPosts.forEach(p => {
            if (p.postDate) {
                const parts = p.postDate.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0]);
                    const monthIdx = parseInt(parts[1]) - 1;
                    if (monthIdx >= 0 && monthIdx < 12) {
                        const key = `${parts[0]}-${parts[1]}`;
                        const label = `${thaiMonths[monthIdx]} ${year + 543}`;
                        monthsMap[key] = label;
                    }
                }
            }
        });

        // Sort months descending (latest month first)
        const sortedMonths = Object.keys(monthsMap).sort((a, b) => b.localeCompare(a));

        if (sortedMonths.length === 0) {
            filterContainer.innerHTML = `<span class="text-slate-400 text-xs">ยังไม่มีข้อมูลโพสต์ที่จะจัดกลุ่ม</span>`;
            tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">ยังไม่มีข้อมูลการส่งผลงาน</td></tr>`;
            return;
        }

        // Render Month Filter Buttons
        // If selectedFilterMonth is not set or not in sortedMonths, set it to the first (latest) month
        if (!window.selectedFilterMonth || !monthsMap[window.selectedFilterMonth]) {
            window.selectedFilterMonth = sortedMonths[0];
        }

        filterContainer.innerHTML = sortedMonths.map(monthKey => {
            const isActive = (window.selectedFilterMonth === monthKey);
            const activeClass = isActive ? "bg-[#e26e2c] text-white shadow-md font-semibold" : "bg-white/10 text-white/80 hover:bg-white/20";
            return `<button onclick="window.selectFilterMonth('${monthKey}')" class="px-3.5 py-2 rounded-xl transition-all duration-300 ${activeClass}">${monthsMap[monthKey]}</button>`;
        }).join('');

        // Filter posts by selected month
        const filteredPosts = myPosts.filter(p => p.postDate && p.postDate.startsWith(window.selectedFilterMonth));

        if (filteredPosts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">ไม่มีผลงานที่โพสต์ในเดือนนี้</td></tr>`;
            return;
        }

        // Render Table Rows
        tableBody.innerHTML = filteredPosts.map(p => {
            // Check if edit is allowed (employee_send=0 and admin_ok=0)
            const employeeSend = p.employee_send !== undefined ? Number(p.employee_send) : 0;
            const adminOk = p.admin_ok !== undefined ? Number(p.admin_ok) : 0;
            const canEdit = (employeeSend === 0 && adminOk === 0);

            // Date format in Thai BE
            let displayDate = "-";
            if (p.postDate) {
                const parts = p.postDate.split('-');
                if (parts.length === 3) {
                    displayDate = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parseInt(parts[0]) + 543}`;
                }
            }

            const editButton = canEdit
                ? `<button onclick="window.openEditPostModal('${p.docId}')" class="p-1 text-blue-400 hover:text-blue-300 mr-2" title="แก้ไข"><i data-lucide="edit" class="w-4 h-4"></i></button>`
                : `<span class="p-1 text-slate-500 cursor-not-allowed mr-2" title="ไม่สามารถแก้ไขได้"><i data-lucide="edit" class="w-4 h-4 opacity-40"></i></span>`;

            const deleteButton = `<button onclick="window.deletePost('${p.docId}')" class="p-1 text-red-500 hover:text-red-400" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;

            return `
                <tr class="hover:bg-white/5 transition-colors">
                    <td class="p-2.5 font-medium text-slate-100">${displayDate}</td>
                    <td class="p-2.5 text-slate-200 truncate max-w-[120px]" title="${p.title || ''}">${p.title || '-'}</td>
                    <td class="p-2.5">
                        <a href="${p.url || '#'}" target="_blank" class="text-blue-400 hover:underline truncate block max-w-[120px]" title="${p.url || ''}">${p.url || '-'}</a>
                    </td>
                    <td class="p-2.5 text-center flex items-center justify-center">${editButton}${deleteButton}</td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error("Error loading my posts:", err);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-400">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
};

window.selectFilterMonth = (monthKey) => {
    window.selectedFilterMonth = monthKey;
    window.loadMyPostsData();
};

window.openEditPostModal = (docId) => {
    const post = window.myPostsList.find(p => p.docId === docId);
    if (!post) return;

    document.getElementById('editPostDocId').value = docId;
    document.getElementById('editPostDateInput').value = post.postDate || "";
    document.getElementById('editPostTitleInput').value = post.title || "";
    document.getElementById('editPostUrlInput').value = post.url || "";

    const modal = document.getElementById('editPostModal');
    if (modal) modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
};

window.closeEditModal = () => {
    const modal = document.getElementById('editPostModal');
    if (modal) modal.classList.add('hidden');
};

window.saveEditedPost = async () => {
    const docId = document.getElementById('editPostDocId').value;
    const postDate = document.getElementById('editPostDateInput').value;
    const title = document.getElementById('editPostTitleInput').value.trim();
    const url = document.getElementById('editPostUrlInput').value.trim();

    if (!postDate || !title || !url) {
        window.showMessage("กรุณาระบุข้อมูลให้ครบถ้วนนะคะ", true);
        return;
    }

    const gl = document.getElementById('globalLoader');
    if (gl) gl.classList.remove('hidden');

    try {
        const postDocRef = doc(db, 'Tiktok_Post', docId);
        await updateDoc(postDocRef, {
            postDate: postDate,
            title: title,
            url: url
        });

        window.showMessage("แก้ไขข้อมูลผลงานสำเร็จ!");
        window.closeEditModal();
        window.loadMyPostsData();
    } catch (e) {
        console.error("Error updating post:", e);
        window.showMessage("ไม่สามารถบันทึกการแก้ไขได้ค่ะ", true);
    } finally {
        if (gl) gl.classList.add('hidden');
    }
};

window.deletePost = async (docId) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการผลงานนี้?")) return;

    const gl = document.getElementById('globalLoader');
    if (gl) gl.classList.remove('hidden');

    try {
        const postDocRef = doc(db, 'Tiktok_Post', docId);
        await deleteDoc(postDocRef);

        window.showMessage("ลบรายการผลงานสำเร็จ!");
        window.loadMyPostsData();
    } catch (e) {
        console.error("Error deleting post:", e);
        window.showMessage("ไม่สามารถลบรายการผลงานได้ค่ะ", true);
    } finally {
        if (gl) gl.classList.add('hidden');
    }
};


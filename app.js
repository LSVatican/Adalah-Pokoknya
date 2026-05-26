// ====== CONFIGURASI SUPABASE ======
// Ganti dengan kredensial dari dashboard Supabase Anda sendiri
const SUPABASE_URL = "https://sqzbjedgcqsnwvebrzxl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxemJqZWRnY3Fzbnd2ZWJyenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDgzOTIsImV4cCI6MjA5NTM4NDM5Mn0.Zc87Z9o3HMk0xyGfTaRj5V_zT9EgaNxEwnyw9K5LArU";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== STATE UTAMA APP ======
let currentEmail = ""; 
let accountsList = []; // Menyimpan email akun yang pernah login di browser ini
let targetedAccount = ""; // Untuk handling popup dinamis
let generatedDeleteCode = "";

// Ambil DOM
const accountListContainer = document.getElementById("account-list");
const activeAccountBox = document.getElementById("active-account-box");
const currentUserEmailTxt = document.getElementById("current-user-email");

// ====== INisialisasi PROGRAM ======
document.addEventListener("DOMContentLoaded", () => {
    loadAccountsFromLocalStorage();
    checkCurrentSession();
    
    // Event listener untuk tombol utama +
    document.getElementById("btn-add-account").addEventListener("click", () => {
        openModal("pop-email");
    });
});

// Load data sesi lokal penyimpanan browser
function loadAccountsFromLocalStorage() {
    const stored = localStorage.getItem("connected_accounts");
    accountsList = stored ? JSON.parse(stored) : [];
}

function saveAccountsToLocalStorage() {
    localStorage.setItem("connected_accounts", JSON.stringify(accountsList));
}

// Cek User yang sedang login saat ini di Supabase
async function checkCurrentSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUserEmailTxt.innerText = user.email;
        activeAccountBox.classList.remove("hidden");
        
        // Tambahkan ke daftar histori jika belum ada
        if (!accountsList.includes(user.email)) {
            accountsList.push(user.email);
            saveAccountsToLocalStorage();
        }
    } else {
        activeAccountBox.classList.add("hidden");
    }
    renderAccountList(user ? user.email : null);
}

// ====== LOGIKA RENDER TAMPILAN ======
function renderAccountList(activeEmail) {
    accountListContainer.innerHTML = "";
    
    if (accountsList.length === 0) {
        accountListContainer.innerHTML = '<p class="empty-state">Belum ada akun yang terhubung.</p>';
        return;
    }

    accountsList.forEach(email => {
        const isActive = email === activeEmail;
        const item = document.createElement("div");
        item.className = `account-item ${isActive ? 'active' : ''}`;
        
        item.innerHTML = `
            <div class="account-info" onclick="${isActive ? '' : `switchAccount('${email}')`}">
                ${email} ${isActive ? ' <small style="color:#ff007f">(Aktif)</small>' : ''}
            </div>
            <div class="account-actions">
                <button class="btn-action logout" onclick="openLogoutModal('${email}')">Logout</button>
                <button class="btn-action delete" onclick="openDeleteModal('${email}')">Hapus</button>
            </div>
        `;
        accountListContainer.appendChild(item);
    });
}

// ====== MODAL HANDLING ======
function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
}

// ====== AUTENTIKASI DENGAN SUPABASE (OTP) ======

// 1. Mengirim Kode OTP ke Email ("Minta Kode")
async function handleSendOTP() {
    const emailInput = document.getElementById("input-email").value.trim();
    
    if (!emailInput) {
        alert("Masukkan email terlebih dahulu!");
        return;
    }
    
    currentEmail = emailInput;

    const { error } = await supabase.auth.signInWithOtp({
        email: currentEmail,
        options: {
            shouldCreateUser: true // Membuat akun baru secara otomatis jika belum terdaftar
        }
    });

    if (error) {
        alert("Gagal kirim kode: " + error.message);
    } else {
        alert("Kode OTP berhasil dikirim ke email " + currentEmail);
        closeModal("pop-email");
        openModal("pop-otp");
    }
}

// 2. Verifikasi OTP yang dimasukkan user
async function handleVerifyOTP() {
    const otpInput = document.getElementById("input-otp").value.trim();

    if (otpInput.length !== 6) {
        alert("Masukkan 6 digit kode OTP valid!");
        return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
        email: currentEmail,
        token: otpInput,
        type: 'email'
    });

    if (error) {
        alert("Verifikasi Gagal: " + error.message);
    } else {
        alert("Berhasil masuk/menghubungkan akun!");
        closeModal("pop-otp");
        document.getElementById("input-email").value = "";
        document.getElementById("input-otp").value = "";
        
        // Simpan sesi terdaftar lokal
        if (!accountsList.includes(currentEmail)) {
            accountsList.push(currentEmail);
            saveAccountsToLocalStorage();
        }
        
        checkCurrentSession();
    }
}

// ====== ALIH AKUN (SWITCH ACCOUNT) ======
async function switchAccount(targetEmail) {
    // Catatan: Supabase secara bawaan mengunci 1 sesi login aktif per client browser.
    // Untuk mengimplementasikan alih akun instan nyata, user diminta re-autentikasi OTP ke email target 
    // demi keamanan siber terbaik, atau menyimpan JWT tokens terenkripsi masing-masing akun.
    // Di sini sistem memicu relogin aman via OTP langsung ke email yang diklik:
    currentEmail = targetEmail;
    alert(`Mengalihkan akun ke ${targetEmail}. Kode verifikasi baru dikirim.`);
    
    const { error } = await supabase.auth.signInWithOtp({ email: targetEmail });
    if(!error) {
        openModal("pop-otp");
    } else {
        alert("Gagal memicu pengalihan akun: " + error.message);
    }
}

// ====== FITUR LOGOUT ======
function openLogoutModal(email) {
    targetedAccount = email;
    document.getElementById("logout-target").innerText = email;
    
    // Tautkan aksi ke tombol konfirmasi popup
    document.getElementById("confirm-logout-btn").onclick = async () => {
        // Jika akun yang di-logout adalah akun yang sedang aktif di client session
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === targetedAccount) {
            await supabase.auth.signOut();
        }
        
        alert(`Berhasil keluar dari sesi lokal untuk ${targetedAccount}`);
        closeModal("pop-logout");
        checkCurrentSession();
    };
    
    openModal("pop-logout");
}

// ====== FITUR HAPUS AKUN (DENGAN KODE ACAK) ======
function openDeleteModal(email) {
    targetedAccount = email;
    document.getElementById("delete-target").innerText = email;
    document.getElementById("delete-code-input").value = "";
    
    // Generate kode acak 4 digit angka/huruf kapital
    generatedDeleteCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    document.getElementById("random-code-display").innerText = generatedDeleteCode;

    document.getElementById("confirm-delete-btn").onclick = () => {
        const userInputCode = document.getElementById("delete-code-input").value.trim().toUpperCase();
        
        if (userInputCode !== generatedDeleteCode) {
            alert("Kode konfirmasi salah! Gagal menghapus.");
            return;
        }
        
        // Hapus dari list penyimpanan lokal perangkat
        accountsList = accountsList.filter(acc => acc !== targetedAccount);
        saveAccountsToLocalStorage();
        
        alert(`Akun ${targetedAccount} berhasil dihapus dari daftar list web.`);
        closeModal("pop-delete");
        checkCurrentSession();
    };

    openModal("pop-delete");
}

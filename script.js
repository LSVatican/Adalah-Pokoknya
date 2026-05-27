// ISI DENGAN DATA PROYEK SUPABASE ANDA
const SUPABASE_URL = "https://sqzbjedgcqsnwvebrzxl.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxemJqZWRnY3Fzbnd2ZWJyenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDgzOTIsImV4cCI6MjA5NTM4NDM5Mn0.Zc87Z9o3HMk0xyGfTaRj5V_zT9EgaNxEwnyw9K5LArU"; 

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let tempEmail = ""; // Menyimpan email sementara saat proses login/OTP
let accounts = JSON.parse(localStorage.getItem('saved_accounts')) || [];
let activeEmail = localStorage.getItem('active_account_email') || "";

// Inisialisasi saat aplikasi dimuat
document.addEventListener("DOMContentLoaded", () => {
    renderAccountList();
    
    document.getElementById('btnOpenEmailModal').addEventListener('click', () => {
        openModal('emailModal');
    });
});

// Fungsi Manajemen Modal
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// 1. KIRIM OTP (Login / Tambah Akun)
async function handleSendOTP() {
    const email = document.getElementById('inputEmail').value.trim();
    if (!email) return alert("Masukkan email dengan benar!");

    tempEmail = email;
    document.getElementById('btnSendOTP').innerText = "Mengirim...";

    const { error } = await supabase.auth.signInWithOtp({
        email: tempEmail,
        options: { shouldCreateUser: true } // Otomatis daftar jika belum punya akun
    });

    document.getElementById('btnSendOTP').innerText = "Kirim Kode";

    if (error) {
        alert("Gagal mengirim kode: " + error.message);
    } else {
        document.getElementById('displayEmail').innerText = tempEmail;
        closeModal('emailModal');
        openModal('otpModal');
    }
}

// Fitur "Minta Kode Lagi"
function requestCodeAgain() {
    handleSendOTP();
}

// 2. VERIFIKASI OTP
async function handleVerifyOTP() {
    const token = document.getElementById('inputOTP').value.trim();
    if (!token) return alert("Masukkan kode verifikasi!");

    const { data, error } = await supabase.auth.verifyOtp({
        email: tempEmail,
        token: token,
        type: 'email'
    });

    if (error) {
        alert("Verifikasi Gagal: " + error.message);
    } else {
        // Berhasil login/registrasi, simpan session ke daftar multi-akun local
        const session = data.session;
        saveAccount(tempEmail, session);
        closeModal('otpModal');
        document.getElementById('inputEmail').value = "";
        document.getElementById('inputOTP').value = "";
    }
}

// Simpan akun ke local list
function saveAccount(email, session) {
    if (!accounts.includes(email)) {
        accounts.push(email);
        localStorage.setItem('saved_accounts', JSON.stringify(accounts));
    }
    switchAccount(email);
}

// Render list akun ke antarmuka beranda
function renderAccountList() {
    const listContainer = document.getElementById('accountList');
    listContainer.innerHTML = "";

    if (accounts.length === 0) {
        listContainer.innerHTML = `<p style="color:#8b949e; text-align:center;">Belum ada akun terhubung. Klik "+" untuk menambah.</p>`;
        return;
    }

    accounts.forEach(email => {
        const isActive = email === activeEmail;
        
        const itemHtml = `
            <div class="account-item ${isActive ? 'active' : ''}" onclick="switchAccount('${email}')">
                <div class="account-info">
                    <span class="account-email">${email}</span>
                    <span class="account-status">${isActive ? '● Aktif digunakan' : 'Klik untuk beralih'}</span>
                </div>
                <div class="account-actions" onclick="event.stopPropagation();">
                    <button class="btn-logout" onclick="confirmLogout('${email}')">Logout</button>
                    <button class="btn-delete" onclick="confirmDelete('${email}')">Hapus</button>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
}

// Beralih akun ketika salah satu list diklik
function switchAccount(email) {
    activeEmail = email;
    localStorage.setItem('active_account_email', email);
    renderAccountList();
    alert(`Berhasil beralih ke akun: ${email}`);
}

// Konfirmasi Logout di sebelah kanan list
function confirmLogout(email) {
    if (confirm(`Apakah Anda yakin ingin logout dari akun ${email}?`)) {
        accounts = accounts.filter(acc => acc !== email);
        localStorage.setItem('saved_accounts', JSON.stringify(accounts));
        
        if (activeEmail === email) {
            activeEmail = accounts.length > 0 ? accounts[0] : "";
            localStorage.setItem('active_account_email', activeEmail);
        }
        
        renderAccountList();
    }
}

// Konfirmasi Hapus Akun dengan Kode Acak
function confirmDelete(email) {
    // Membuat kode acak 4 karakter huruf besar & angka
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const userInput = prompt(`PERINGATAN: Menghapus data lokal akun ${email}.\nKetik kode keamanan berikut untuk menghapus: ${randomCode}`);
    
    if (userInput === randomCode) {
        accounts = accounts.filter(acc => acc !== email);
        localStorage.setItem('saved_accounts', JSON.stringify(accounts));
        
        if (activeEmail === email) {
            activeEmail = accounts.length > 0 ? accounts[0] : "";
            localStorage.setItem('active_account_email', activeEmail);
        }
        
        renderAccountList();
        alert("Akun berhasil dihapus dari sistem perangkat ini.");
    } else {
        alert("Kode yang Anda masukkan salah. Penghapusan dibatalkan.");
    }
}

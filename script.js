// ISI KREDENSIAL SUPABASE ANDA DI SINI
const SUPABASE_URL = "https://sqzbjedgcqsnwvebrzxl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxemJqZWRnY3Fzbnd2ZWJyenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDgzOTIsImV4cCI6MjA5NTM4NDM5Mn0.Zc87Z9o3HMk0xyGfTaRj5V_zT9EgaNxEwnyw9K5LArU";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Manajemen Aplikasi
let registeredAccounts = JSON.parse(localStorage.getItem('registered_accounts')) || [];
let activeAccount = localStorage.getItem('active_account') || null;
let currentEmailInput = "";
let countdownTimer;

// Inisialisasi Elemen HTML
document.addEventListener("DOMContentLoaded", () => {
    renderAccountList();
    updateActiveProfileUI();

    document.getElementById('openEmailModal').addEventListener('click', () => openModal('emailModal'));
    document.getElementById('btnSendCode').addEventListener('click', sendVerificationCode);
    document.getElementById('btnVerifyCode').addEventListener('click', verifyCode);
    document.getElementById('btnResend').addEventListener('click', sendVerificationCode);
});

// Fungsi Navigasi Pop Up
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    if(id === 'codeModal') clearInterval(countdownTimer);
}

// 1. Fitur Kirim Kode Otentikasi (Supabase OTP)
async function sendVerificationCode() {
    const email = document.getElementById('emailInput').value.trim();
    if (!email) return alert("Masukkan email dengan benar!");

    currentEmailInput = email;
    
    // Memanggil API Supabase untuk mengirim kode OTP ke email
    const { error } = await supabase.auth.signInWithOtp({ email: email });

    if (error) {
        alert("Gagal mengirim kode: " + error.message);
    } else {
        closeModal('emailModal');
        document.getElementById('targetEmail').innerText = email;
        openModal('codeModal');
        startResendCountdown();
    }
}

// 2. Fitur Verifikasi Kode OTP & Simpan Ke Database
async function verifyCode() {
    const code = document.getElementById('codeInput').value.trim();
    if (code.length < 6) return alert("Masukkan 6 digit kode!");

    const { data, error } = await supabase.auth.verifyOtp({
        email: currentEmailInput,
        token: code,
        type: 'magiclink' // atau 'signup' / 'signin' tergantung setelan Supabase
    });

    if (error) {
        alert("Kode salah atau kedaluwarsa!");
    } else {
        alert("Verifikasi Berhasil!");
        closeModal('codeModal');
        
        // Simpan email ke tabel 'accounts' di Supabase jika belum terdaftar
        await saveAccountToSupabase(currentEmailInput);
        
        // Simpan ke sistem Sesi Multi-Akun Lokal
        if (!registeredAccounts.includes(currentEmailInput)) {
            registeredAccounts.push(currentEmailInput);
            localStorage.setItem('registered_accounts', JSON.stringify(registeredAccounts));
        }
        
        switchAccount(currentEmailInput);
    }
}

// Kirim data ke Table Editor Supabase
async function saveAccountToSupabase(email) {
    // Cek dulu apakah data sudah ada
    const { data } = await supabase.from('accounts').select('email').eq('email', email);
    if(data && data.length === 0) {
        await supabase.from('accounts').insert([{ email: email }]);
    }
}

// Fitur Minta Kode Ulang (Fitur Minta Kode)
function startResendCountdown() {
    let timeLeft = 60;
    const btnResend = document.getElementById('btnResend');
    const countdownText = document.getElementById('countdownText');
    
    btnResend.disabled = true;
    clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            countdownText.innerText = "";
            btnResend.disabled = false;
        } else {
            countdownText.innerText = `Tunggu ${timeLeft}s untuk `;
            timeLeft--;
        }
    }, 1000);
}

// 3. Render List Akun di Beranda
function renderAccountList() {
    const listContainer = document.getElementById('accountList');
    listContainer.innerHTML = "";

    if (registeredAccounts.length === 0) {
        listContainer.innerHTML = `<p style="font-size:12px; color:#555; text-align:center;">Belum ada akun tersambung.</p>`;
        return;
    }

    registeredAccounts.forEach(email => {
        const isActive = email === activeAccount;
        
        const item = document.createElement('div');
        item.className = `account-item ${isActive ? 'active' : ''}`;
        // Ketika item ditekan, beralih akun
        item.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                switchAccount(email);
            }
        };

        item.innerHTML = `
            <div class="account-info">${email}</div>
            <div class="account-actions">
                <button class="btn-action btn-logout" onclick="logoutAccount('${email}')">Logout</button>
                <button class="btn-action btn-delete" onclick="deleteAccount('${email}')">Hapus</button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// 4. Fitur Beralih Akun
function switchAccount(email) {
    activeAccount = email;
    localStorage.setItem('active_account', email);
    updateActiveProfileUI();
    renderAccountList();
}

function updateActiveProfileUI() {
    const activeText = document.getElementById('activeEmail');
    if (activeAccount) {
        activeText.innerText = activeAccount;
    } else {
        activeText.innerText = "Belum ada akun aktif";
    }
}

// 5. Fitur Logout & Konfirmasi
function logoutAccount(email) {
    const confirmLogout = confirm(`Apakah Anda yakin ingin logout dari akun ${email}?`);
    if (confirmLogout) {
        if (activeAccount === email) {
            activeAccount = null;
            localStorage.removeItem('active_account');
        }
        // Catatan: Sesi dihapus dari daftar aktif lokal, namun data di database tetap tersimpan
        alert(`Berhasil logout dari ${email}`);
        updateActiveProfileUI();
        renderAccountList();
    }
}

// 6. Fitur Hapus Akun & Konfirmasi Kode Acak
async function deleteAccount(email) {
    // Generate kode acak 4 digit angka
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const userInput = prompt(`Untuk menghapus akun ${email},\nSilakan masukkan kode konfirmasi berikut: ${randomCode}`);

    if (userInput == randomCode) {
        // 1. Hapus dari database Supabase
        const { error } = await supabase.from('accounts').delete().eq('email', email);
        
        if (error) {
            alert("Gagal menghapus akun di server: " + error.message);
            return;
        }

        // 2. Hapus dari local storage sistem multi-akun
        registeredAccounts = registeredAccounts.filter(acc => acc !== email);
        localStorage.setItem('registered_accounts', JSON.stringify(registeredAccounts));

        if (activeAccount === email) {
            activeAccount = registeredAccounts[0] || null;
            if(activeAccount) localStorage.setItem('active_account', activeAccount);
            else localStorage.removeItem('active_account');
        }

        alert("Akun berhasil dihapus permanen.");
        updateActiveProfileUI();
        renderAccountList();
    } else if (userInput !== null) {
        alert("Kode konfirmasi salah! Penghapusan dibatalkan.");
    }
}

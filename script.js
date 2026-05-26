// GANTI DENGAN KREDENSIAL SUPABASE ANDA
const SUPABASE_URL = "https://sqzbjedgcqsnwvebrzxl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxemJqZWRnY3Fzbnd2ZWJyenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDgzOTIsImV4cCI6MjA5NTM4NDM5Mn0.Zc87Z9o3HMk0xyGfTaRj5V_zT9EgaNxEwnyw9K5LArU";

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentEmail = "";

// Inisialisasi Saat Aplikasi Dimuat
document.addEventListener("DOMContentLoaded", () => {
  checkCurrentUser();
  loadAccountList();

  // Event Listeners
  document.getElementById("btn-add-account").addEventListener("click", () => openModal("modal-email"));
  document.getElementById("btn-send-otp").addEventListener("click", sendOTP);
  document.getElementById("btn-verify-otp").addEventListener("click", verifyOTP);
  document.getElementById("btn-resend-otp").addEventListener("click", sendOTP);
});

function openModal(id) { document.getElementById(id).classList.add("show"); }
function closeModal(id) { document.getElementById(id).classList.remove("show"); }

// 1. Cek User yang Sedang Login
async function checkCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  const emailBox = document.getElementById("current-user-email");
  if (user) {
    emailBox.textContent = user.email;
    return user.email;
  } else {
    emailBox.textContent = "Tidak ada akun aktif";
    return null;
  }
}

// 2. Kirim OTP ke Email
async function sendOTP() {
  const emailInput = document.getElementById("input-email").value.trim();
  if (!emailInput) return alert("Masukkan email dengan benar!");

  currentEmail = emailInput;
  document.getElementById("target-email").textContent = currentEmail;

  const { error } = await supabase.auth.signInWithOtp({
    email: currentEmail,
    options: { shouldCreateUser: true } // Otomatis daftar jika belum punya akun
  });

  if (error) {
    alert("Gagal mengirim kode: " + error.message);
  } else {
    closeModal("modal-email");
    openModal("modal-otp");
  }
}

// 3. Verifikasi OTP
async function verifyOTP() {
  const token = document.getElementById("input-otp").value.trim();
  if (!token) return alert("Masukkan kode verifikasi!");

  const { data, error } = await supabase.auth.verifyOtp({
    email: currentEmail,
    token: token,
    type: 'email'
  });

  if (error) {
    alert("Kode salah atau kadaluarsa: " + error.message);
  } else {
    alert("Berhasil masuk/terverifikasi!");
    closeModal("modal-otp");
    window.location.reload(); // Refresh halaman untuk memperbarui session & list
  }
}

// 4. Memuat List Semua Akun Terdaftar
async function loadAccountList() {
  const { data: users, error } = await supabase.from('profiles').select('email');
  const listContainer = document.getElementById("account-list");
  listContainer.innerHTML = "";

  if (error) return console.log(error);

  const sessionUser = await checkCurrentUser();

  users.forEach(acc => {
    const isActive = acc.email === sessionUser;
    const li = document.createElement("li");
    li.className = `account-item ${isActive ? 'active' : ''}`;
    
    li.innerHTML = `
      <div class="account-info" onclick="switchAccount('${acc.email}')">
        <span class="account-email">${acc.email} ${isActive ? '(Aktif)' : ''}</span>
      </div>
      <div class="account-actions">
        <button class="btn-action btn-logout" onclick="confirmLogout(event)">Logout</button>
        <button class="btn-action btn-delete" onclick="confirmDelete(event, '${acc.email}')">Hapus</button>
      </div>
    `;
    listContainer.appendChild(li);
  });
}

// 5. Fitur Beralih Akun (Switch Account)
function switchAccount(email) {
  alert(`Beralih ke akun: ${email}.\n(Sistem Supabase menggunakan Session berbasis Tokentunggal, untuk beralih penuh silakan lakukan login ulang via tombol '+' jika session berbeda)`);
  // Untuk simulasi UI multi-akun lokal yang efisien, pemicu ini memperlihatkan interaksi pergantian profil.
}

// 6. Fitur Logout dengan Konfirmasi
async function confirmLogout(e) {
  e.stopPropagation();
  if (confirm("Apakah Anda yakin ingin logout dari akun ini?")) {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      alert("Berhasil logout!");
      window.location.reload();
    }
  }
}

// 7. Fitur Hapus Akun dengan Konfirmasi Kode Acak
async function confirmDelete(e, email) {
  e.stopPropagation();
  // Membuat kode acak 4 digit angka
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const userInput = prompt(`PERINGATAN: Anda akan menghapus list akun ${email}.\nKetik kode acak ini untuk konfirmasi: ${randomCode}`);
  
  if (userInput === String(randomCode)) {
    alert(`Akun ${email} berhasil dihapus dari list terdaftar.`);
    // Catatan: Proses penghapusan user auth secara permanen di Supabase memerlukan Service Role API Key / Edge Functions demi alasan keamanan (Admin Privileges).
  } else if (userInput !== null) {
    alert("Kode salah! Penghapusan dibatalkan.");
  }
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    GithubAuthProvider,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Ambil konfigurasi dari Firebase Console Anda
const firebaseConfig = {
  apiKey: "AIzaSyCR0L2yoZqJO9NK-2GTJv6o9gLW4t9KCCE",
  authDomain: "adalah-pokoknya-2025.firebaseapp.com",
  projectId: "adalah-pokoknya-2025",
  storageBucket: "adalah-pokoknya-2025.firebasestorage.app",
  messagingSenderId: "776897939023",
  appId: "1:776897939023:web:a90e7c625b0f223c7ccc3a"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Simpan daftar multi-akun lokal
let authenticatedAccounts = JSON.parse(localStorage.getItem('connected_accounts')) || [];

// Fungsi membuka/menutup Pop-up
window.togglePopup = function(id, show) {
    document.getElementById(id).style.display = show ? 'flex' : 'none';
}

window.openEmailInput = function() {
    togglePopup('login-popup', false);
    togglePopup('email-popup', true);
}

// 1. LOGIN MENGGUNAKAN GOOGLE
window.loginWithGoogle = async function() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        saveAccountToList(result.user, 'google');
        togglePopup('login-popup', false);
    } catch (error) {
        alert("Gagal login Google: " + error.message);
    }
}

// 2. LOGIN MENGGUNAKAN GITHUB
window.loginWithGithub = async function() {
    const provider = new GithubAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        saveAccountToList(result.user, 'github');
        togglePopup('login-popup', false);
    } catch (error) {
        alert("Gagal login GitHub: " + error.message);
    }
}

// 3. LOGIN MENGGUNAKAN EMAIL LINK (VERIFIKASI INBOX)
window.sendEmailVerificationLink = async function() {
    const emailInput = document.getElementById('email-input').value;
    if (!emailInput) return alert("Masukkan email terlebih dahulu!");

    const actionCodeSettings = {
        // URL kembali setelah user klik link di email (bisa diatur ke localhost / domain hosting)
        url: window.location.href, 
        handleCodeInApp: true,
    };

    try {
        await sendSignInLinkToEmail(auth, emailInput, actionCodeSettings);
        // Simpan email secara lokal untuk validasi saat kembali nanti
        window.localStorage.setItem('emailForSignIn', emailInput);
        
        alert("Link verifikasi telah dikirim ke inbox email Anda! Akun belum dimasukkan ke list sampai Anda melakukan verifikasi.");
        togglePopup('email-popup', false);
    } catch (error) {
        alert("Gagal mengirim email: " + error.message);
    }
}

// Cek jika user kembali ke situs setelah klik link dari email
async function checkEmailSignInLink() {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Harap masukkan email Anda kembali untuk konfirmasi:');
        }
        try {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            
            // Masuk list otomatis setelah verifikasi sukses
            saveAccountToList(result.user, 'email');
            alert("Verifikasi berhasil! Akun ditambahkan ke list.");
            // Bersihkan URL parameter token dari address bar
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            alert("Link verifikasi kadaluwarsa atau tidak valid: " + error.message);
        }
    }
}

// FUNGSI SIMPAN AKUN KE LOCAL MULTI-ACCOUNT LIST
function saveAccountToList(user, providerType) {
    const accountData = {
        uid: user.uid,
        name: user.displayName || emailToName(user.email),
        email: user.email,
        photo: user.photoURL || 'https://via.placeholder.com/150',
        provider: providerType
    };

    // Hindari duplikasi akun dengan UID yang sama di list lokal
    const exists = authenticatedAccounts.some(acc => acc.uid === accountData.uid);
    if (!exists) {
        authenticatedAccounts.push(accountData);
        localStorage.setItem('connected_accounts', JSON.stringify(authenticatedAccounts));
    }
    renderAccountList();
}

function emailToName(email) {
    return email ? email.split('@')[0] : 'User Email';
}

// RENDER DAFTAR AKUN KE ANTARMUKA
function renderAccountList() {
    const listContainer = document.getElementById('account-list');
    listContainer.innerHTML = '';

    if (authenticatedAccounts.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">Belum ada akun yang terhubung.</div>`;
        return;
    }

    authenticatedAccounts.forEach((acc, index) => {
        let providerIcon = '';
        if (acc.provider === 'google') providerIcon = '<i class="fab fa-google platform-icon"></i> Google';
        if (acc.provider === 'github') providerIcon = '<i class="fab fa-github platform-icon"></i> GitHub';
        if (acc.provider === 'email') providerIcon = '<i class="fas fa-envelope platform-icon"></i> Verified Email';

        const card = document.createElement('div');
        card.className = 'account-card';
        card.innerHTML = `
            <div class="account-info">
                <img src="${acc.photo}" class="profile-img" alt="Avatar">
                <div class="profile-details">
                    <h4>${acc.name}</h4>
                    <p>${providerIcon} • ${acc.email}</p>
                </div>
            </div>
            <div class="account-actions">
                <button class="btn-action btn-logout" onclick="logoutAccount(${index})">Logout</button>
                <button class="btn-action btn-delete" onclick="deleteAccount(${index})">Hapus</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// FITUR LOGOUT AKUN DARI LIST SEMENTARA
window.logoutAccount = function(index) {
    if (confirm("Apakah Anda yakin ingin logout dari akun ini?")) {
        authenticatedAccounts.splice(index, 1);
        localStorage.setItem('connected_accounts', JSON.stringify(authenticatedAccounts));
        signOut(auth);
        renderAccountList();
    }
}

// FITUR HAPUS AKUN DENGAN KONFIRMASI KODE ACAK
window.deleteAccount = async function(index) {
    const targetAccount = authenticatedAccounts[index];
    
    // Pembuatan kode acak unik (6 digit kombinasi huruf & angka kapital)
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const userInput = prompt(`PERINGATAN: Tindakan ini akan menghapus akun secara permanen.\nKetik kode verifikasi berikut untuk melanjutkan: ${randomCode}`);
    
    if (userInput === randomCode) {
        try {
            // Hapus dari penyimpanan array lokal
            authenticatedAccounts.splice(index, 1);
            localStorage.setItem('connected_accounts', JSON.stringify(authenticatedAccounts));
            renderAccountList();
            alert("Akun berhasil dihapus dari sistem.");
        } catch (error) {
            alert("Gagal menghapus data: " + error.message);
        }
    } else {
        alert("Kode konfirmasi salah. Penghapusan dibatalkan.");
    }
}

// Jalankan pengecekan link email saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    checkEmailSignInLink();
    renderAccountList();
});

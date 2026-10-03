// =========================================================
// INTEGRASI GOOGLE SHEETS - DAYAKARSA SYSTEM
// =========================================================

// ⚠️ PASTE URL WEB APP DARI GOOGLE APPS SCRIPT KAMU DI SINI:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxv2HluUj9fqXhT3uT5nktTKrKHakfPX_6sHesgkE-LjV3uS_8RDoqlTPiQT0QzsSY_g/exec";

// DATA LOCAL (Akan otomatis diperbarui dari Google Sheets)
let produkList = [
    {
        id: "K001",
        nama: "Tas Anyaman Bambu",
        harga: 45000,
        stok: 10,
        terjual: 0,
        foto: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=300&q=80"
    }
];

let riwayatTransaksi = [];
let currentUser = null;

// FUNGSI UTAMA LOAD DATA DARI GOOGLE SHEETS (GET)
async function loadDataFromGoogleSheets() {
    if (!SCRIPT_URL || SCRIPT_URL === "PASANG_URL_WEB_APP_KAMU_DI_SINI") {
        console.warn("⚠️ URL Apps Script belum dipasang. Menggunakan data lokal sementara.");
        refreshAllViews();
        return;
    }

    try {
        console.log("Mengambil data terbaru dari Google Sheets...");
        
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();

        if (data.produkList && data.produkList.length > 0) {
            produkList = data.produkList;
        }
        if (data.riwayatTransaksi) {
            riwayatTransaksi = data.riwayatTransaksi;
        }

        refreshAllViews();
        console.log("✅ Data Google Sheets berhasil dimuat!");
    } catch (error) {
        console.error("❌ Gagal mengambil data dari Google Sheets:", error);
        refreshAllViews();
    }
}

// FUNGSI UNTUK MENGIRIM DATA KE GOOGLE SHEETS (POST DENGAN CORS FIX)
function sendToGoogleSheets(payload) {
    if (!SCRIPT_URL || SCRIPT_URL === "PASANG_URL_WEB_APP_KAMU_DI_SINI") return;

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // Wajib no-cors agar tidak diblokir browser
        headers: {
            "Content-Type": "text/plain" // Wajib text/plain untuk Google Apps Script
        },
        body: JSON.stringify(payload)
    })
    .then(() => console.log("✅ Payload berhasil dikirim ke Google Sheets!"))
    .catch(err => console.error("❌ Gagal mengirim ke Google Sheets:", err));
}

// FUNGSI REFRESH TAMPILAN DASHBOARD
function refreshAllViews() {
    renderKatalogGrid(produkList);
    renderStokTabel(produkList);
    renderAnalisa();
    updateDropdownOptions();
}

// 1. RENDER KATALOG CARD GRID (PEMBELI)
function renderKatalogGrid(data) {
    const gridContainer = document.getElementById("grid-katalog");
    if (!gridContainer) return;

    gridContainer.innerHTML = "";

    if (data.length === 0) {
        gridContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Produk tidak ditemukan...</p>`;
        return;
    }

    data.forEach(produk => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img src="${produk.foto}" alt="${produk.nama}" class="product-img" onerror="this.src='https://via.placeholder.com/300x160?text=DayaKarsa+Produk'">
            <div class="product-info">
                <div class="product-title">${produk.nama}</div>
                <div class="product-price">Rp${Number(produk.harga).toLocaleString('id-ID')}</div>
                <div class="product-stock">Sisa Stok: <b>${produk.stok} Pcs</b></div>
                <button class="btn btn-primary margin-top" ${produk.stok <= 0 ? 'disabled style="opacity:0.5"' : ''} onclick="openModalBeli('${produk.id}')">
                    ${produk.stok > 0 ? '🛒 Beli Sekarang' : 'Stok Habis'}
                </button>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

// PENCARIAN KATALOG
function filterKatalog() {
    const keyword = document.getElementById("search-katalog").value.toLowerCase();
    const filtered = produkList.filter(p => p.nama.toLowerCase().includes(keyword));
    renderKatalogGrid(filtered);
}

// 2. RENDER TABEL STOK (PENJUAL)
function renderStokTabel(data) {
    const tbody = document.querySelector("#tabel-katalog tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    data.forEach(p => {
        const row = document.createElement("tr");
        const statusBadge = p.stok > 0 
            ? `<span class="badge-status status-ready">Tersedia</span>` 
            : `<span class="badge-status status-empty">Habis</span>`;

        row.innerHTML = `
            <td><img src="${p.foto}" alt="${p.nama}" style="width:40px; height:40px; object-fit:cover; border-radius:6px;" onerror="this.src='https://via.placeholder.com/40'"></td>
            <td><b>${p.id}</b></td>
            <td>${p.nama}</td>
            <td>Rp${Number(p.harga).toLocaleString('id-ID')}</td>
            <td><b>${p.stok}</b></td>
            <td>${p.terjual || 0} Pcs</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

// PENCARIAN STOK
function filterStok() {
    const keyword = document.getElementById("search-stok").value.toLowerCase();
    const filtered = produkList.filter(p => p.nama.toLowerCase().includes(keyword) || p.id.toLowerCase().includes(keyword));
    renderStokTabel(filtered);
}

// 3. RENDER ANALISA PENJUALAN
function renderAnalisa() {
    let totalOmzet = riwayatTransaksi.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    let totalTerjual = riwayatTransaksi.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);
    let totalTransaksi = riwayatTransaksi.length;

    let terlaris = [...produkList].sort((a, b) => (b.terjual || 0) - (a.terjual || 0))[0];
    let namaTerlaris = terlaris && terlaris.terjual > 0 ? `${terlaris.nama} (${terlaris.terjual} pcs)` : "-";

    if (document.getElementById("stat-omzet")) document.getElementById("stat-omzet").textContent = `Rp${totalOmzet.toLocaleString('id-ID')}`;
    if (document.getElementById("stat-terjual")) document.getElementById("stat-terjual").textContent = `${totalTerjual} Pcs`;
    if (document.getElementById("stat-transaksi")) document.getElementById("stat-transaksi").textContent = `${totalTransaksi} Kali`;
    if (document.getElementById("stat-terlaris")) document.getElementById("stat-terlaris").textContent = namaTerlaris;

    const tbodyRiwayat = document.querySelector("#tabel-riwayat tbody");
    if (tbodyRiwayat) {
        tbodyRiwayat.innerHTML = "";
        riwayatTransaksi.slice().reverse().forEach(t => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${t.waktu}</td>
                <td><small class="badge-role">${t.tipe}</small></td>
                <td><b>${t.namaProduk}</b></td>
                <td>${t.jumlah} Pcs</td>
                <td>Rp${Number(t.total).toLocaleString('id-ID')}</td>
            `;
            tbodyRiwayat.appendChild(row);
        });
    }
}

// UPDATE DROPDOWN KASIR DIRECT
function updateDropdownOptions() {
    const selectJual = document.getElementById("pilih-produk-jual");
    if (!selectJual) return;

    selectJual.innerHTML = '<option value="">-- Pilih Produk --</option>';
    produkList.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.nama} - Rp${Number(p.harga).toLocaleString('id-ID')} (Stok: ${p.stok})`;
        selectJual.appendChild(opt);
    });
}

// NAVIGASI TAB MENU
function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(sec => sec.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

    const targetSec = document.getElementById(`sec-${tabName}`);
    const targetBtn = document.getElementById(`tab-btn-${tabName}`);

    if (targetSec) targetSec.classList.remove("hidden");
    if (targetBtn) targetBtn.classList.add("active");
}

// MODAL BELI PRODUK
function openModalBeli(produkId) {
    const produk = produkList.find(p => p.id === produkId);
    if (!produk) return;

    document.getElementById("modal-produk-id").value = produk.id;
    document.getElementById("modal-title").textContent = produk.nama;
    document.getElementById("modal-price").textContent = `Rp${Number(produk.harga).toLocaleString('id-ID')}`;
    document.getElementById("modal-stock").textContent = `Sisa Stok Tersedia: ${produk.stok} Pcs`;
    document.getElementById("modal-jumlah").value = 1;
    document.getElementById("modal-jumlah").max = produk.stok;

    document.getElementById("modal-beli").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal-beli").classList.add("hidden");
}

// SUBMIT MODAL PEMBELIAN
document.getElementById("form-modal-beli").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("modal-produk-id").value;
    const jumlah = parseInt(document.getElementById("modal-jumlah").value);

    eksekusiTransaksi(id, jumlah, "Pembelian Customer");
    closeModal();
});

// SUBMIT KASIR DIRECT
document.getElementById("form-penjualan-langsung").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("pilih-produk-jual").value;
    const jumlah = parseInt(document.getElementById("jumlah-jual").value);

    eksekusiTransaksi(id, jumlah, "Kasir Direct");
    this.reset();
});

// FUNGSI UTAMA EKSEKUSI TRANSAKSI & SYNC
function eksekusiTransaksi(produkId, jumlah, tipe) {
    const produk = produkList.find(p => p.id === produkId);

    if (!produk) return;

    if (produk.stok < jumlah) {
        alert(`Transaksi Gagal! Stok ${produk.nama} tidak mencukupi.`);
        return;
    }

    // 1. Update UI Lokal Secara Instan
    produk.stok -= jumlah;
    produk.terjual = (produk.terjual || 0) + jumlah;

    const totalBayar = produk.harga * jumlah;
    const jamSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WITA";

    const payloadTransaksi = {
        action: "transaksi",
        produkId: produk.id,
        namaProduk: produk.nama,
        jumlah: jumlah,
        total: totalBayar,
        waktu: jamSekarang,
        tipe: tipe
    };

    riwayatTransaksi.push(payloadTransaksi);
    refreshAllViews();

    alert(`✅ Transaksi Berhasil!\n\nProduk: ${produk.nama}\nJumlah: ${jumlah} pcs\nTotal Biaya: Rp${totalBayar.toLocaleString('id-ID')}`);

    // 2. Kirim Data ke Google Sheets di Background
    sendToGoogleSheets(payloadTransaksi);
}

// SUBMIT FORM PASOKAN BARANG BARU
document.getElementById("form-pasokan").addEventListener("submit", function(e) {
    e.preventDefault();

    const nama = document.getElementById("nama-kerajinan").value;
    const harga = parseInt(document.getElementById("harga-kerajinan").value);
    const stok = parseInt(document.getElementById("stok-kerajinan").value);
    const fotoInput = document.getElementById("foto-kerajinan");

    const newId = "K" + String(produkList.length + 1).padStart(3, '0');
    let fotoUrl = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=300&q=80";

    if (fotoInput.files && fotoInput.files[0]) {
        fotoUrl = URL.createObjectURL(fotoInput.files[0]);
    }

    const newProduct = {
        action: "tambahProduk",
        id: newId,
        nama: nama,
        harga: harga,
        stok: stok,
        terjual: 0,
        foto: fotoUrl
    };

    produkList.push(newProduct);
    refreshAllViews();
    this.reset();

    alert(`🎉 Pasokan Berhasil Ditambahkan!\nProduk "${nama}" sekarang tersedia di katalog.`);
    switchTab("stok");

    // Kirim Data ke Google Sheets
    sendToGoogleSheets(newProduct);
});

// LOGIKA LOGIN
document.getElementById("form-login").addEventListener("submit", function(e) {
    e.preventDefault();

    const username = document.getElementById("username").value || "User Demo";
    const role = document.getElementById("role").value;

    currentUser = { username, role };

    document.getElementById("user-name").textContent = username;
    document.getElementById("user-role-badge").textContent = role;

    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");

    const penjualElements = document.querySelectorAll(".penjual-only");
    if (role === "pembeli") {
        penjualElements.forEach(el => el.classList.add("hidden"));
        switchTab("katalog");
    } else {
        penjualElements.forEach(el => el.classList.remove("hidden"));
        switchTab("analisa");
    }

    loadDataFromGoogleSheets();
});

// LOGIKA LOGOUT
document.getElementById("btn-logout").addEventListener("click", function() {
    currentUser = null;
    document.getElementById("form-login").reset();
    document.getElementById("main-app").classList.add("hidden");
    document.getElementById("login-page").classList.remove("hidden");
});

// JALANKAN OTOMATIS SAAT WEB DIBUKA
window.addEventListener("DOMContentLoaded", () => {
    loadDataFromGoogleSheets();
});
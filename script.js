// ==========================================
// CONFIGURATION & GLOBAL VARIABLES
// ==========================================
// Masukkan URL Google Apps Script milikmu di dalam tanda kutip di bawah ini:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxv2HluUj9fqXhT3uT5nktTKrKHakfPX_6sHesgkE-LjV3uS_8RDoqlTPiQT0QzsSY_g/exec";

let currentUser = "";
let currentRole = "";
let fotoModeAktif = "galeri";
let base64GambarGaleri = "";

// Data lokal awal (Fallback jika backend belum terhubung)
let katalogData = [
  { id: "PRD-01", nama: "Ayam kfc", harga: 25000, stok: 25, terjual: 5, gambar: "https://via.placeholder.com/200" },
  { id: "PRD-02", nama: "Spiderman khas BTN", harga: 1000, stok: 1, terjual: 0, gambar: "https://via.placeholder.com/200" }
];
let riwayatData = [];

// ==========================================
// INISIALISASI APLIKASI
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // Event Handler Login & Logout
    const formLogin = document.getElementById("form-login");
    if (formLogin) formLogin.addEventListener("submit", handleLogin);

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.addEventListener("click", handleLogout);

    // Event Handler Forms
    const formPasokan = document.getElementById("form-pasokan");
    if (formPasokan) formPasokan.addEventListener("submit", handleSimpanPasokan);

    const formJual = document.getElementById("form-penjualan-langsung");
    if (formJual) formJual.addEventListener("submit", handleKasirPenjualan);

    const formBeli = document.getElementById("form-modal-beli");
    if (formBeli) formBeli.addEventListener("submit", handleKonfirmasiBeli);
}

// ==========================================
// SISTEM LOGIN & ROLE AKUN
// ==========================================
function handleLogin(e) {
    e.preventDefault();
    currentUser = document.getElementById("username").value.trim();
    currentRole = document.getElementById("role").value;

    if (!currentUser) {
        alert("Silakan masukkan username terlebih dahulu!");
        return;
    }

    // Tampilkan Informasi User di Header
    document.getElementById("user-name").innerText = currentUser;
    const badge = document.getElementById("user-role-badge");
    badge.innerText = currentRole.toUpperCase();
    badge.className = `badge-role ${currentRole}`;

    // Filter Elemen Khusus Penjual / Admin
    const penjualElements = document.querySelectorAll(".penjual-only");
    penjualElements.forEach(el => {
        if (currentRole === "penjual") {
            el.style.display = "inline-block";
        } else {
            el.style.display = "none";
        }
    });

    // Pindah Tampilan ke Dashboard Utama
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("main-app").classList.remove("hidden");

    // Tampilkan Tab Katalog & Muat Data
    switchTab("katalog");
    loadKatalogData();
}

function handleLogout() {
    currentUser = "";
    currentRole = "";
    document.getElementById("login-page").classList.remove("hidden");
    document.getElementById("main-app").classList.add("hidden");
    document.getElementById("form-login").reset();
}

// ==========================================
// NAVIGASI TAB DASHBOARD
// ==========================================
function switchTab(tabName) {
    const allTabs = document.querySelectorAll(".tab-content");
    const allButtons = document.querySelectorAll(".tab-btn");

    allTabs.forEach(tab => tab.classList.add("hidden"));
    allButtons.forEach(btn => btn.classList.remove("active"));

    const targetTab = document.getElementById(`sec-${tabName}`);
    const targetBtn = document.getElementById(`tab-btn-${tabName}`);

    if (targetTab) targetTab.classList.remove("hidden");
    if (targetBtn) targetBtn.classList.add("active");
}

// ==========================================
// UNGGOH FOTO GALERI & KOMPRESI OTOMATIS (BASE64)
// ==========================================
function switchFotoMode(mode) {
    fotoModeAktif = mode;
    const btnGaleri = document.getElementById("btn-mode-galeri");
    const btnLink = document.getElementById("btn-mode-link");
    const boxGaleri = document.getElementById("box-galeri");
    const boxLink = document.getElementById("box-link");

    if (mode === "galeri") {
        btnGaleri.classList.add("active");
        btnLink.classList.remove("active");
        boxGaleri.classList.remove("hidden");
        boxLink.classList.add("hidden");
    } else {
        btnLink.classList.add("active");
        btnGaleri.classList.remove("active");
        boxLink.classList.remove("hidden");
        boxGaleri.classList.add("hidden");
    }
}

function previewFotoGaleri(event) {
    const file = event.target.files[0];
    const previewWrapper = document.getElementById("preview-wrapper");
    const imgPreview = document.getElementById("img-preview");

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                // KOMPRESI GAMBAR OTOMATIS (Max lebar 500px & Kualitas JPEG 0.7)
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 500;
                const scale = MAX_WIDTH / img.width;

                if (scale < 1) {
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scale;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Hasilkan Data URL/Base64 yang sangat ringan (sekitar 30-80 KB)
                base64GambarGaleri = canvas.toDataURL("image/jpeg", 0.7);

                imgPreview.src = base64GambarGaleri;
                previewWrapper.classList.remove("hidden");
            };
        };
        reader.readAsDataURL(file);
    } else {
        base64GambarGaleri = "";
        previewWrapper.classList.add("hidden");
    }
}

// ==========================================
// AMBIL & TAMPILKAN DATA KATALOG / STOK
// ==========================================
function loadKatalogData() {
    if (SCRIPT_URL && SCRIPT_URL.includes("script.google.com")) {
        fetch(SCRIPT_URL + "?action=get")
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data.katalog)) katalogData = data.katalog;
                if (data && Array.isArray(data.riwayat)) riwayatData = data.riwayat;
                renderAllViews();
            })
            .catch(err => {
                console.warn("Server offline / menggunakan mode data lokal:", err);
                renderAllViews();
            });
    } else {
        renderAllViews();
    }
}

function renderAllViews() {
    renderKatalog(katalogData);
    renderStokTable(katalogData);
    renderKasirOptions(katalogData);
    renderAnalisa(riwayatData);
}

function renderKatalog(list) {
    const grid = document.getElementById("grid-katalog");
    if (!grid) return;
    grid.innerHTML = "";

    if (list.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Belum ada produk dalam katalog.</p>`;
        return;
    }

    list.forEach(item => {
        const card = document.createElement("div");
        card.className = "product-card card";
        
        // Tombol Aksi: Jika Penjual -> Tampilkan Beli + Tombol Hapus
        let tombolAksi = `<button class="btn btn-primary" style="width:100%;" onclick="bukaModalBeli('${item.nama}', ${item.harga}, ${item.stok})">🛒 Beli Sekarang</button>`;
        
        if (currentRole === "penjual") {
            tombolAksi = `
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button class="btn btn-primary" style="flex: 1;" onclick="bukaModalBeli('${item.nama}', ${item.harga}, ${item.stok})">🛒 Beli</button>
                    <button class="btn-danger" style="padding: 8px 12px; border-radius: 6px; font-weight: bold;" onclick="hapusBarang('${item.nama}')">🗑️ Hapus</button>
                </div>
            `;
        }

        card.innerHTML = `
            <img src="${item.gambar || 'https://via.placeholder.com/200'}" alt="${item.nama}" style="width:100%; height:180px; object-fit:cover; border-radius:8px;">
            <div style="padding: 12px 0;">
                <h3 style="margin: 0 0 6px 0; font-size: 1.1rem;">${item.nama}</h3>
                <p style="color:#3b82f6; font-weight:bold; font-size:1.1rem; margin:0 0 4px 0;">Rp${parseInt(item.harga || 0).toLocaleString('id-ID')}</p>
                <p style="color:#94a3b8; font-size:0.85rem; margin:0 0 12px 0;">Sisa Stok: ${item.stok} Pcs</p>
                ${tombolAksi}
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderStokTable(list) {
    const tbody = document.querySelector("#tabel-katalog tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    list.forEach((item, idx) => {
        const tr = document.createElement("tr");
        const statusBadge = item.stok > 5 
            ? `<span style="color:#22c55e; font-weight:bold;">Aman</span>` 
            : (item.stok > 0 ? `<span style="color:#eab308; font-weight:bold;">Menipis</span>` : `<span style="color:#ef4444; font-weight:bold;">Habis</span>`);

        tr.innerHTML = `
            <td><img src="${item.gambar || 'https://via.placeholder.com/50'}" width="40" height="40" style="object-fit:cover; border-radius:4px;"></td>
            <td>${item.id || ('PRD-' + (idx+1))}</td>
            <td><b>${item.nama}</b></td>
            <td>Rp${parseInt(item.harga || 0).toLocaleString('id-ID')}</td>
            <td>${item.stok} Pcs</td>
            <td>${item.terjual || 0} Pcs</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-danger" onclick="hapusBarang('${item.nama}')">🗑️ Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderKasirOptions(list) {
    const select = document.getElementById("pilih-produk-jual");
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Barang Terjual --</option>';

    list.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.nama;
        opt.textContent = `${item.nama} (Stok: ${item.stok} | Rp${parseInt(item.harga).toLocaleString('id-ID')})`;
        select.appendChild(opt);
    });
}

function renderAnalisa(riwayat) {
    let omzet = 0;
    let terjual = 0;
    let produkCount = {};

    riwayat.forEach(row => {
        omzet += parseInt(row.total || 0);
        terjual += parseInt(row.jumlah || 0);
        if (row.nama) {
            produkCount[row.nama] = (produkCount[row.nama] || 0) + parseInt(row.jumlah || 0);
        }
    });

    let topProduk = "-";
    let maxQty = 0;
    for (let p in produkCount) {
        if (produkCount[p] > maxQty) {
            maxQty = produkCount[p];
            topProduk = p;
        }
    }

    if (document.getElementById("stat-omzet")) document.getElementById("stat-omzet").innerText = `Rp${omzet.toLocaleString('id-ID')}`;
    if (document.getElementById("stat-terjual")) document.getElementById("stat-terjual").innerText = `${terjual} Pcs`;
    if (document.getElementById("stat-transaksi")) document.getElementById("stat-transaksi").innerText = `${riwayat.length} Transaksi`;
    if (document.getElementById("stat-terlaris")) document.getElementById("stat-terlaris").innerText = topProduk;

    const tbody = document.querySelector("#tabel-riwayat tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    riwayat.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.waktu || '-'}</td>
            <td><span class="badge-role ${r.tipe === 'Online' ? 'pembeli' : 'penjual'}">${r.tipe || 'Online'}</span></td>
            <td><b>${r.nama}</b></td>
            <td>${r.jumlah} Pcs</td>
            <td>Rp${parseInt(r.total || 0).toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// FORM SUBMIT ACTIONS (TAMBAH, JUAL, BELI, HAPUS)
// ==========================================
function handleSimpanPasokan(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    const nama = document.getElementById("nama-kerajinan").value.trim();
    const harga = document.getElementById("harga-kerajinan").value;
    const stok = document.getElementById("stok-kerajinan").value;

    let finalFoto = "";
    if (fotoModeAktif === "galeri") {
        if (!base64GambarGaleri) {
            alert("Silakan pilih foto dari galeri terlebih dahulu!");
            return;
        }
        finalFoto = base64GambarGaleri;
    } else {
        finalFoto = document.getElementById("foto-url").value.trim();
        if (!finalFoto) {
            alert("Silakan masukkan URL link foto!");
            return;
        }
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = "⏳ Menyimpan ke Database...";

    const payload = {
        action: "tambah",
        nama: nama,
        harga: harga,
        stok: stok,
        foto: finalFoto
    };

    if (SCRIPT_URL && SCRIPT_URL.includes("script.google.com")) {
        fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            alert(`Berhasil menambahkan "${nama}" ke katalog!`);
            resetFormPasokan();
            switchTab("katalog");
            loadKatalogData();
        })
        .catch(err => {
            console.error("Error Apps Script:", err);
            tambahDataLokal(payload);
            alert(`Berhasil menambahkan "${nama}" ke katalog!`);
            resetFormPasokan();
            switchTab("katalog");
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
    } else {
        tambahDataLokal(payload);
        alert(`Berhasil menambahkan "${nama}" ke katalog!`);
        resetFormPasokan();
        switchTab("katalog");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function resetFormPasokan() {
    document.getElementById("form-pasokan").reset();
    base64GambarGaleri = "";
    const previewWrapper = document.getElementById("preview-wrapper");
    if (previewWrapper) previewWrapper.classList.add("hidden");
}

function tambahDataLokal(p) {
    katalogData.push({
        id: "PRD-" + (katalogData.length + 1),
        nama: p.nama,
        harga: parseInt(p.harga),
        stok: parseInt(p.stok),
        terjual: 0,
        gambar: p.foto
    });
    renderAllViews();
}

function handleKasirPenjualan(e) {
    e.preventDefault();
    const nama = document.getElementById("pilih-produk-jual").value;
    const jumlah = parseInt(document.getElementById("jumlah-jual").value);

    if (!nama) {
        alert("Pilih barang yang terjual!");
        return;
    }

    prosesTransaksi(nama, jumlah, "Direct / Kasir");
}

function handleKonfirmasiBeli(e) {
    e.preventDefault();
    const nama = document.getElementById("modal-title").dataset.nama;
    const jumlah = parseInt(document.getElementById("modal-jumlah").value);

    prosesTransaksi(nama, jumlah, "Online / App");
    closeModal();
}

function prosesTransaksi(nama, jumlah, tipe) {
    const item = katalogData.find(x => x.nama === nama);
    if (!item) {
        alert("Produk tidak ditemukan!");
        return;
    }

    if (item.stok < jumlah) {
        alert(`Stok tidak mencukupi! Sisa stok: ${item.stok}`);
        return;
    }

    const total = item.harga * jumlah;
    const payload = {
        action: "jual",
        nama: nama,
        jumlah: jumlah,
        total: total,
        tipe: tipe,
        waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    };

    item.stok -= jumlah;
    item.terjual = (item.terjual || 0) + jumlah;
    riwayatData.unshift(payload);
    renderAllViews();

    if (SCRIPT_URL && SCRIPT_URL.includes("script.google.com")) {
        fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(err => console.warn("Sync transaksi gagal:", err));
    }

    alert(`Transaksi berhasil! Total: Rp${total.toLocaleString('id-ID')}`);
}

function hapusBarang(namaBarang) {
    if (confirm(`Apakah Anda yakin ingin menghapus "${namaBarang}" dari katalog?`)) {
        // 1. Hapus dari array lokal
        katalogData = katalogData.filter(x => x.nama !== namaBarang);
        
        // 2. Render ulang semua tampilan
        renderAllViews();

        // 3. Kirim perintah hapus ke Google Sheets / Apps Script jika terhubung
        if (SCRIPT_URL && SCRIPT_URL.includes("script.google.com")) {
            fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({ action: "hapus", nama: namaBarang })
            })
            .then(res => res.json())
            .then(data => console.log("Hapus server berhasil:", data))
            .catch(err => console.warn("Hapus server gagal:", err));
        }

        alert(`Produk "${namaBarang}" berhasil dihapus!`);
    }
}

// ==========================================
// FITUR SEARCH & MODAL HELPERS
// ==========================================
function filterKatalog() {
    const query = document.getElementById("search-katalog").value.toLowerCase();
    const filtered = katalogData.filter(item => item.nama.toLowerCase().includes(query));
    renderKatalog(filtered);
}

function filterStok() {
    const query = document.getElementById("search-stok").value.toLowerCase();
    const filtered = katalogData.filter(item => item.nama.toLowerCase().includes(query));
    renderStokTable(filtered);
}

function bukaModalBeli(nama, harga, stok) {
    document.getElementById("modal-title").innerText = `Beli ${nama}`;
    document.getElementById("modal-title").dataset.nama = nama;
    document.getElementById("modal-price").innerText = `Harga Satuan: Rp${parseInt(harga).toLocaleString('id-ID')}`;
    document.getElementById("modal-stock").innerText = `Sisa Stok: ${stok} Pcs`;
    document.getElementById("modal-jumlah").value = 1;
    document.getElementById("modal-jumlah").max = stok;
    document.getElementById("modal-beli").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal-beli").classList.add("hidden");
}
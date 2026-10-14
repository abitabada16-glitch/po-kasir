// GANTI nilai di bawah dengan konfigurasi Firebase milikmu dari Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyACvlYgBM6yFTVEg2ef_gasUqs-w7XtcLc",
  authDomain: "kasir-po.firebaseapp.com",
  databaseURL: "https://kasir-po-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "kasir-po",
  storageBucket: "kasir-po.firebasestorage.app",
  messagingSenderId: "1070813713445",
  appId: "1:1070813713445:web:e16f2b0398b94de74b1bcc",
  measurementId: "G-TWYN6JTP0K"
};

let firebaseReady = false;
let db = null, dbBarang = null, dbPreorder = null, dbRiwayat = null;
let barang = [], keranjang = [], preorder = [], riwayat = [];
let currentRole = null;

function configFirebaseValid() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("ISI_") &&
    firebaseConfig.messagingSenderId && !firebaseConfig.messagingSenderId.startsWith("ISI_") &&
    firebaseConfig.appId && !firebaseConfig.appId.startsWith("ISI_");
}

if (typeof firebase !== "undefined" && configFirebaseValid()) {
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    dbBarang = db.ref("barang"); dbPreorder = db.ref("preorder"); dbRiwayat = db.ref("riwayat");
    firebaseReady = true;
    dbBarang.on("value", snap => { barang = asArray(snap.val()); tampilkanBarang(); updateSelectBarang(); tampilkanKatalogUser(); });
    dbPreorder.on("value", snap => { preorder = asArray(snap.val()); tampilkanPreOrder(); tampilkanPesananSaya(); });
    dbRiwayat.on("value", snap => { riwayat = asArray(snap.val()); tampilkanRiwayat(); });
  } catch (err) { console.error(err); }
}

function asArray(data) {
  return data ? Object.keys(data).map(key => ({ idKey: key, ...data[key] })) : [];
}
function formatRupiah(value) { return "Rp " + Number(value || 0).toLocaleString("id-ID"); }
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function requireFirebase() {
  if (!firebaseReady) { alert("Firebase belum dikonfigurasi. Isi apiKey, messagingSenderId, dan appId di script.js dengan data dari Firebase Console."); return false; }
  return true;
}

// Login demo untuk Admin/Kasir saja. Pelanggan tidak perlu login untuk PO.
function bukaLoginAdmin() {
  if (currentRole === "admin") return;
  document.getElementById("loginPage").classList.remove("hidden");
  document.getElementById("username").focus();
}
function tutupLoginAdmin() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("loginError").textContent = "";
}
function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (username !== "admin" || password !== "admin123") {
    document.getElementById("loginError").textContent = "Username atau password salah.";
    return;
  }
  currentRole = "admin";
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("publicApp").classList.add("hidden");
  document.getElementById("adminApp").classList.remove("hidden");
  document.getElementById("adminLoginToggle").classList.add("hidden");
  document.getElementById("logoutBtn").classList.remove("hidden");
  document.getElementById("loginError").textContent = "";
  document.getElementById("password").value = "";
  showPage("barang");
  if (!firebaseReady) console.warn("Firebase belum siap; fitur penyimpanan dan sinkronisasi belum aktif.");
}
function logout() {
  currentRole = null;
  keranjang = [];
  tampilkanKeranjang();
  document.getElementById("adminApp").classList.add("hidden");
  document.getElementById("publicApp").classList.remove("hidden");
  document.getElementById("adminLoginToggle").classList.remove("hidden");
  document.getElementById("logoutBtn").classList.add("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  tutupLoginAdmin();
}
function showPage(pageId) {
  if (currentRole !== "admin") return;
  ["barang", "transaksi", "preorderAdmin", "riwayat"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== pageId);
  });
}

// Kelola barang (admin)
function tambahBarang() {
  if (currentRole !== "admin" || !requireFirebase()) return;
  const nama = document.getElementById("namaBarang").value.trim();
  const harga = Number(document.getElementById("hargaBarang").value);
  const stok = Number(document.getElementById("stokBarang").value);
  if (!nama || !Number.isFinite(harga) || harga <= 0 || !Number.isInteger(stok) || stok < 0) { alert("Isi nama, harga lebih dari 0, dan stok bilangan bulat minimal 0."); return; }
  dbBarang.push({ nama, harga, stok });
  document.getElementById("namaBarang").value = ""; document.getElementById("hargaBarang").value = ""; document.getElementById("stokBarang").value = "";
}
function buatBarisBarang(item) {
  return `<tr><td>${esc(item.nama)}</td><td>${formatRupiah(item.harga)}</td><td>${Number(item.stok)||0}</td><td><button onclick="editBarang('${item.idKey}')">Edit</button><button onclick="hapusBarang('${item.idKey}')">Hapus</button></td></tr>`;
}
function tampilkanBarang() {
  const tbody = document.getElementById("tabelBarang"); if (!tbody) return;
  const keyword = (document.getElementById("cariBarang")?.value || "").toLowerCase();
  tbody.innerHTML = barang.filter(x => String(x.nama).toLowerCase().includes(keyword)).map(buatBarisBarang).join("");
}
function cariBarangFn() { tampilkanBarang(); }
function editBarang(idKey) {
  if (currentRole !== "admin" || !requireFirebase()) return;
  const item = barang.find(x => x.idKey === idKey); if (!item) return;
  const nama = prompt("Nama barang:", item.nama); if (nama === null) return;
  const harga = prompt("Harga barang:", item.harga); if (harga === null) return;
  const stok = prompt("Stok barang:", item.stok); if (stok === null) return;
  if (!nama.trim() || Number(harga) <= 0 || !Number.isInteger(Number(stok)) || Number(stok) < 0) { alert("Data barang tidak valid."); return; }
  dbBarang.child(idKey).update({ nama: nama.trim(), harga: Number(harga), stok: Number(stok) });
}
function hapusBarang(idKey) { if (currentRole === "admin" && requireFirebase() && confirm("Yakin ingin menghapus barang ini?")) dbBarang.child(idKey).remove(); }

// Transaksi kasir dan smart discount
function updateSelectBarang() {
  const select = document.getElementById("pilihBarang"); if (!select) return;
  const selected = select.value;
  select.innerHTML = '<option value="">-- Pilih Barang --</option>' + barang.map(item => `<option value="${item.idKey}">${esc(item.nama)} - ${formatRupiah(item.harga)} (Stok: ${Number(item.stok)||0})</option>`).join("");
  if (barang.some(b => b.idKey === selected)) select.value = selected;
}
function tambahKeranjang() {
  if (currentRole !== "admin") return;
  const idKey = document.getElementById("pilihBarang").value, jumlah = Number(document.getElementById("jumlahBarang").value);
  const item = barang.find(b => b.idKey === idKey);
  if (!item) return alert("Pilih barang terlebih dahulu.");
  if (!Number.isInteger(jumlah) || jumlah <= 0) return alert("Jumlah harus bilangan bulat lebih dari 0.");
  const existing = keranjang.find(k => k.idKey === idKey), totalQty = (existing?.jumlah || 0) + jumlah;
  if (totalQty > Number(item.stok)) return alert("Jumlah melebihi stok yang tersedia.");
  if (existing) existing.jumlah += jumlah; else keranjang.push({ idKey, nama: item.nama, harga: Number(item.harga), jumlah });
  document.getElementById("jumlahBarang").value = 1; tampilkanKeranjang();
}
function hitungTotalDanDiskon() {
  const subtotal = keranjang.reduce((sum, item) => sum + item.harga * item.jumlah, 0);
  const persentaseDiskon = subtotal >= 200000 ? 15 : subtotal >= 100000 ? 10 : 0;
  const nominalDiskon = subtotal * persentaseDiskon / 100;
  return { subtotal, persentaseDiskon, nominalDiskon, totalAkhir: subtotal - nominalDiskon };
}
function tampilkanKeranjang() {
  const tbody = document.getElementById("tabelKeranjang"); if (!tbody) return;
  tbody.innerHTML = keranjang.map((item, i) => `<tr><td>${esc(item.nama)}</td><td>${item.jumlah}</td><td>${formatRupiah(item.harga * item.jumlah)}</td><td><button onclick="hapusKeranjang(${i})">Hapus</button></td></tr>`).join("");
  const calc = hitungTotalDanDiskon(), total = document.getElementById("total");
  if (total) total.innerHTML = calc.nominalDiskon ? `<s>${formatRupiah(calc.subtotal)}</s><br><small class="discount">Smart Discount ${calc.persentaseDiskon}%: -${formatRupiah(calc.nominalDiskon)}</small><br><b>${formatRupiah(calc.totalAkhir)}</b>` : formatRupiah(calc.subtotal);
}
function hapusKeranjang(index) { keranjang.splice(index, 1); tampilkanKeranjang(); }
async function bayar() {
  if (currentRole !== "admin" || !requireFirebase()) return;
  if (!keranjang.length) return alert("Keranjang masih kosong.");
  const pembayaran = Number(document.getElementById("pembayaran").value), calc = hitungTotalDanDiskon();
  if (!Number.isFinite(pembayaran) || pembayaran < calc.totalAkhir) return alert("Uang pembayaran kurang. Total: " + formatRupiah(calc.totalAkhir));
  try {
    // Transaksi stok dilakukan berurutan agar tidak mengurangi stok berdasarkan data lama.
    for (const cartItem of keranjang) {
      const snap = await dbBarang.child(cartItem.idKey).once("value"), current = snap.val();
      if (!current || Number(current.stok) < cartItem.jumlah) throw new Error("Stok barang " + cartItem.nama + " tidak mencukupi.");
      await dbBarang.child(cartItem.idKey).update({ stok: Number(current.stok) - cartItem.jumlah });
    }
    await dbRiwayat.push({ tanggal: new Date().toLocaleString("id-ID"), barang: keranjang.map(i => i.nama).join(", "), jumlah: keranjang.reduce((sum, i) => sum + i.jumlah, 0), total: calc.totalAkhir });
    const change = pembayaran - calc.totalAkhir; document.getElementById("kembalian").textContent = formatRupiah(change);
    alert("Pembayaran berhasil. Kembalian: " + formatRupiah(change)); keranjang = []; tampilkanKeranjang(); document.getElementById("pembayaran").value = "";
  } catch (error) { alert("Transaksi belum selesai: " + error.message); }
}

// Katalog yang dapat dilihat user
function tampilkanKatalogUser() {
  const container = document.getElementById("daftarKatalog"); if (!container) return;
  const keyword = (document.getElementById("cariUser")?.value || "").toLowerCase();
  const items = barang.filter(item => String(item.nama).toLowerCase().includes(keyword));
  container.innerHTML = items.length ? items.map(item => `<article class="product-card"><h3>${esc(item.nama)}</h3><p>Harga: <b>${formatRupiah(item.harga)}</b></p><p>Stok tersedia: ${Number(item.stok)||0}</p></article>`).join("") : '<p>Belum ada barang yang cocok atau data barang masih kosong.</p>';
}

// Pre-order pelanggan dan smart estimasi
function estimasiTanggalPO() {
  const qty = Number(document.getElementById("jumlahPreOrder").value) || 1;
  if (!Number.isInteger(qty) || qty < 1) return alert("Jumlah PO minimal 1.");
  const waiting = preorder.filter(p => p.status === "Menunggu").length;
  const days = qty * 2 + Math.ceil(waiting / 2); const date = new Date(); date.setDate(date.getDate() + days);
  document.getElementById("tanggalAmbil").value = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  alert(`[Smart Estimasi PO] Perkiraan ${days} hari dari sekarang, dengan ${waiting} PO yang masih menunggu.`);
}
function tambahPreOrderPelanggan() {
  if (!requireFirebase()) return;
  const pelanggan = document.getElementById("namaPelanggan").value.trim(), product = document.getElementById("barangPreOrder").value.trim();
  const jumlah = Number(document.getElementById("jumlahPreOrder").value), tanggal = document.getElementById("tanggalAmbil").value;
  const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  if (!pelanggan || !product || !Number.isInteger(jumlah) || jumlah < 1 || !tanggal) return alert("Lengkapi semua data pre-order.");
  if (tanggal < today) return alert("Tanggal pengambilan tidak boleh di masa lalu.");
  dbPreorder.push({ pelanggan, barang: product, jumlah, tanggal, status: "Menunggu", waktuInput: new Date().toLocaleString("id-ID") })
    .then(() => { document.getElementById("namaPelanggan").value = ""; document.getElementById("barangPreOrder").value = ""; document.getElementById("jumlahPreOrder").value = 1; document.getElementById("tanggalAmbil").value = ""; alert("Pre-Order berhasil dikirim."); })
    .catch(err => alert("Pre-Order gagal disimpan: " + err.message));
}
function tampilkanPreOrder() {
  const tbody = document.getElementById("tabelPreOrder"); if (!tbody) return;
  const sorted = [...preorder].sort((a,b) => String(a.tanggal||"").localeCompare(String(b.tanggal||"")));
  tbody.innerHTML = sorted.map(item => `<tr><td>${esc(item.waktuInput || "-")}</td><td>${esc(item.pelanggan)}</td><td>${esc(item.barang)}</td><td>${Number(item.jumlah)||0}</td><td>${esc(item.tanggal)}</td><td><select onchange="ubahStatus('${item.idKey}',this.value)"><option ${item.status === "Menunggu" ? "selected" : ""}>Menunggu</option><option ${item.status === "Sudah Tersedia" ? "selected" : ""}>Sudah Tersedia</option><option ${item.status === "Selesai" ? "selected" : ""}>Selesai</option></select></td><td><button onclick="hapusPreOrder('${item.idKey}')">Hapus</button></td></tr>`).join("");
}
function ubahStatus(idKey, status) { if (currentRole === "admin" && requireFirebase()) dbPreorder.child(idKey).update({ status }); }
function hapusPreOrder(idKey) { if (currentRole === "admin" && requireFirebase() && confirm("Hapus pre-order ini?")) dbPreorder.child(idKey).remove(); }
function tampilkanPesananSaya() {
  const tbody = document.getElementById("tabelPesananSaya"); if (!tbody) return;
  const name = (document.getElementById("filterNamaPO")?.value || "").trim().toLowerCase();
  tbody.innerHTML = name ? preorder.filter(p => String(p.pelanggan||"").trim().toLowerCase() === name).map(p => `<tr><td>${esc(p.waktuInput||"-")}</td><td>${esc(p.barang)}</td><td>${Number(p.jumlah)||0}</td><td>${esc(p.tanggal)}</td><td>${esc(p.status||"Menunggu")}</td></tr>`).join("") : "";
}

// Riwayat transaksi
function tampilkanRiwayat() {
  const tbody = document.getElementById("tabelRiwayat"); if (!tbody) return;
  tbody.innerHTML = riwayat.map(item => `<tr><td>${esc(item.tanggal||"-")}</td><td>${esc(item.barang||"-")}</td><td>${Number(item.jumlah)||0}</td><td>${formatRupiah(item.total)}</td></tr>`).join("");
}
function hapusRiwayat() { if (currentRole === "admin" && requireFirebase() && riwayat.length && confirm("Hapus semua riwayat transaksi?")) dbRiwayat.remove(); }

// Render data yang sudah tersedia ketika halaman dibuka.
tampilkanBarang(); updateSelectBarang(); tampilkanKatalogUser(); tampilkanPreOrder(); tampilkanRiwayat();

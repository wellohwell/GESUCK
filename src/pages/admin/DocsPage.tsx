import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  BookOpen, 
  GitBranch, 
  Map, 
  ShieldCheck, 
  ChevronRight, 
  CornerDownRight, 
  Database, 
  Code2, 
  Cpu, 
  Workflow, 
  AlertTriangle, 
  Sparkles, 
  Copy, 
  Check, 
  Search,
  ExternalLink,
  Users,
  Terminal,
  Layers,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'roles' | 'database' | 'services' | 'recipes'>('architecture');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Standards copied: ${label}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Safe search utility inside tabs
  const filterText = (content: string) => {
    if (!searchQuery) return true;
    return content.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="w-full bg-transparent text-zinc-900 dark:text-zinc-50 pb-32 pt-6">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        
        {/* Main Sticky Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-850 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-brand-primary" />
              Standardisasi & Arsitektur
            </h1>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 leading-normal">
              ENGINEERING STANDARDS & MODULE ROADMAP FOR FIELD OPERATIONS & DEVELOPMENT SAFETY
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari pedoman & sintaks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Big Alert Banner for developer discipline */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 leading-relaxed flex items-start gap-3 shadow-md">
          <Terminal className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-white block font-mono text-[10px] uppercase tracking-wider">DEV_RULE_PREREQUISITE // STANDARD OPERASIONAL SERVER & CLIENT</span>
            <p className="text-zinc-400 leading-relaxed font-mono text-[9px]">
              Kerapihan basis data berbanding lurus dengan ketepatan kalkulasi uang angsuran lapangan. Dilarang melakukan query Firestore ad-hoc dari komponen halaman visual tanpa melewati service layer `src/lib/services.ts`. Perubahan skema wajib didaftarkan di `firebase-blueprint.json` dan `firestore.rules`.
            </p>
          </div>
        </div>

        {/* Nested Interactive Tab Controllers */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-850 pb-4">
          {[
            { id: 'architecture', name: 'Arsitektur & Alur', icon: Map },
            { id: 'roles', name: 'Standar Peran & Status', icon: ShieldCheck },
            { id: 'database', name: 'Skema Database & Rules', icon: Database },
            { id: 'services', name: 'Pola Service Layer', icon: Code2 },
            { id: 'recipes', name: 'Resep Ekspansi Fitur', icon: Workflow },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                  isActive 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md' 
                    : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-250 border border-zinc-200 dark:border-zinc-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Dynamic Multi-Tab Content Rendering */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ARCHITECTURE & OPERATIONAL FLOWS */}
          {activeTab === 'architecture' && filterText('explore map client order task activity flow model') && (
            <motion.div
              key="tab-architecture"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Architecture Map & Structure Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Section: App Flow */}
                <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                    <Workflow className="w-5 h-5 text-brand-primary" />
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">Alur Perjalanan Data Lapangan (System Pipeline)</h3>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-tight">Sirkulasi dari Leads Baru hingga Audit Trail Jurnal Aktivitas</p>
                    </div>
                  </div>

                  {/* Operational Flow Visualization Blocks */}
                  <div className="space-y-3 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-[2px] before:bg-zinc-150 dark:before:bg-zinc-800">
                    
                    {/* step 1 */}
                    <div className="flex items-start gap-4 pl-3 relative">
                      <div className="w-5 h-5 rounded-full bg-brand-primary text-black font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 z-10 font-mono">1</div>
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-200">Tahap 1: Registrasi Konsumen & Rujukan Kerja</span>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Sales lapangan mendaftarkan data konsumen baru rujukan prospek di modul <strong className="text-brand-primary font-mono text-[10px]">/client</strong>. Menyimpan atribut nama lengkap, koordinat domisili, status kategori (`baru`/`eks`/`langgan`) demi kestabilan data awal.
                        </p>
                      </div>
                    </div>

                    {/* step 2 */}
                    <div className="flex items-start gap-4 pl-3 relative">
                      <div className="w-5 h-5 rounded-full bg-indigo-500 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 z-10 font-mono">2</div>
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-200">Tahap 2: Rencana Pasar Harian (Market Plan)</span>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          SPV Cabang menginisiasi titik penugasan wilayah di modul <strong className="text-indigo-500 font-mono text-[10px]">/Market-Plans</strong> berdasarkan jadwal dwi-mingguan pasar sirkuit. Membagi rute sirkulasi sales secara terpusat untuk memangkas duplikasi survei.
                        </p>
                      </div>
                    </div>

                    {/* step 3 */}
                    <div className="flex items-start gap-4 pl-3 relative">
                      <div className="w-5 h-5 rounded-full bg-purple-500 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 z-10 font-mono">3</div>
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-200">Tahap 3: Pengajuan Kredit & Assignment Task</span>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Sirkuit order diterbitkan dengan relasi `clientId`. Order berkedudukan awal <span className="font-mono text-purple-400 text-[10px] bg-purple-500/10 px-1 py-0.5 rounded leading-none">waiting</span> menunggu rujukan tim surveyor menyelesaikan instrumen uji lapangan (Task Checklist).
                        </p>
                      </div>
                    </div>

                    {/* step 4 */}
                    <div className="flex items-start gap-4 pl-3 relative">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5 z-10 font-mono">4</div>
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-200">Tahap 4: Persetujuan, Pengiriman & Jurnal Laporan</span>
                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Apabila di-approve oleh Staff atau Owner, data mengalir ke GUDANG untuk verifikasi pengeluaran barang. Transaksi beralih status ke aktif, konversi terkapitalisasi otomatis dalam modul <strong className="text-emerald-500 font-mono text-[10px]">/report</strong> dan terlog di ulasan aktivitas audit trail global.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Sub-Section visual app layout layers */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                    <Layers className="w-5 h-5 text-zinc-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">Arsitektur Visual Layer</h4>
                      <p className="text-[9px] text-zinc-500">Pemisahan fungsional struktur rujukan halaman</p>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-[10px]">
                    
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-850 space-y-1">
                      <span className="font-black text-zinc-900 dark:text-white uppercase text-[8px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded">View Layer</span>
                      <p className="text-zinc-500 text-[9px] leading-relaxed">Pages (`src/pages/*`) berisi UI fungsional berkondisi, statik dan visual layout.</p>
                    </div>

                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-850 space-y-1">
                      <span className="font-black text-zinc-900 dark:text-white uppercase text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">Route Guards</span>
                      <p className="text-zinc-500 text-[9px] leading-relaxed">`ModuleGuard` memetakan status `modules` secara reaktif sebelum merender visual target.</p>
                    </div>

                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-850 space-y-1">
                      <span className="font-black text-zinc-900 dark:text-white uppercase text-[8px] bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded">Service Proxy</span>
                      <p className="text-zinc-500 text-[9px] leading-relaxed">`src/lib/services.ts` melakukan komunikasi sinkron dengan Firebase Firestore API.</p>
                    </div>

                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-850 space-y-1">
                      <span className="font-black text-zinc-900 dark:text-white uppercase text-[8px] bg-zinc-500/10 text-zinc-400 px-1.5 py-0.5 rounded">Auth Context</span>
                      <p className="text-zinc-500 text-[9px] leading-relaxed">`AuthProvider` menyalurkan user metadata dan payload profile ke seluruh hierarki DOM.</p>
                    </div>

                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 2: ROLES AND STATUSES */}
          {activeTab === 'roles' && filterText('role status sales branch owner audit pending waiting completed shipped') && (
            <motion.div
              key="tab-roles"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Roles Matrix and Definitions Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                  <Users className="w-5 h-5 text-brand-primary" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">Matriks Otoritas Peran Struktural (Canonical Role Map)</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tight font-semibold">Tanggung Jawab Teknis dan Aksesibilitas Hak Kelola Bisnis</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Owner */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded leading-none">OWNER (SUPER_ROLE)</span>
                      <h4 className="text-sm font-bold block pt-1">Otoritas Konsep Mutlak</h4>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        Memiliki akses penuh ke semua laporan profitibilitas cabang global, bypass penutupan pemeliharaan modul, konfigurabilitas hak akses baru per pengguna halaman, serta ekspor format sirkuit data audit.
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">ACCESS_SCOPE = ALL_BRANCHES</span>
                  </div>

                  {/* Staff */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded leading-none">STAFF (BRANCH_ADMIN)</span>
                      <h4 className="text-sm font-bold block pt-1">Otoritas Wilayah Kerja</h4>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        Memiliki ijin fungsional luas di satu daerah operasional khusus (`branchId`). Berhak menyetujui, menyunting kuitansi pengajuan tenor order baru serta memimpin distribusi penugasan target harian wilayah.
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">ACCESS_SCOPE = SCOPED_BRANCH</span>
                  </div>

                  {/* Sales & Survey */}
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded leading-none">SALES_TEAM / FIELD_AGENT</span>
                      <h4 className="text-sm font-bold block pt-1">Pelaksana Operasional Lapangan</h4>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        Mengunggah leads prospek, mengisi estimasi simulasi angsuran, mencatat laporan lokasi terkini kunjungan harian. Tidak diizinkan mengakses panel otorisasi user sistem, tata kelola modul, maupun rekap audit pusat.
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">ACCESS_SCOPE = SCOPED_OWNER_ID</span>
                  </div>

                </div>
              </div>

              {/* Status Specification Tables */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                  <FileCheck className="w-5 h-5 text-brand-primary" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">Spesifikasi Status Kanonikal</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tight font-semibold">Hindari Penulisan String Bebas Demi Kerapian Basis Data</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* USER STATUS CODE */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono">1. Siklus Hidup Akun User</h4>
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-2xl p-4 space-y-3 text-xs font-mono">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">"pending"</span>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">User baru dalam masa pendaftaran mandiri. Menunggu persetujuan struktural.</p>
                        </div>
                      </div>
                      <div className="h-[1px] bg-zinc-200 dark:bg-zinc-850" />
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">"approved"</span>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Status aktif. Otorisasi modul disesuaikan dengan jenis `role` terpilih.</p>
                        </div>
                      </div>
                      <div className="h-[1px] bg-zinc-200 dark:bg-zinc-850" />
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-semibold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">"blocked"</span>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Akses terblokir secara permanen oleh admin pusat.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ORDER STATUS CODE */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono">2. Alur Pembayaran & Order</h4>
                    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-2xl p-4 space-y-3 text-xs font-mono">
                      
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">"waiting"</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Order terbuat. Menunggu tinjauan berkas.</p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-zinc-200 dark:bg-zinc-850" />

                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">"approved"</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Tinjauan selesai. Menunggu persiapan kirim oleh Gudang.</p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-zinc-200 dark:bg-zinc-850" />

                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">"shipped"</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Barang sedang di perjalanan oleh tim armada kurir.</p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-zinc-200 dark:bg-zinc-850" />

                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">"active" / "completed"</span>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">Masa pembayaran angsuran harian berjalan atau lunas lunas di garis akhir.</p>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: FIRESTORE SCHEMAS AND RULES */}
          {activeTab === 'database' && filterText('firebase firestore rules json blueprint collections users client rules metadata') && (
            <motion.div
              key="tab-database"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                  <Database className="w-5 h-5 text-brand-primary" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">Kamus Firestore & Aturan Wilayah Cabang (Branch Security Scope)</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tight font-semibold">Skema Data Koleksi & Validasi Keamanan Firestore Rules</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Setiap entitas data primer membawa atribut pembagi cabang seperti <code className="font-mono text-brand-primary text-[11px] bg-zinc-100 dark:bg-zinc-850 px-1 py-0.5 rounded">branchId</code> atau <code className="font-mono text-brand-primary text-[11px] bg-zinc-100 dark:bg-zinc-850 px-1 py-0.5 rounded">ownerId</code>. Berikut adalah silsilah koleksi Firestore utama:
                  </p>

                  <div className="space-y-3 font-mono text-[11px]">
                    {/* users schema */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center bg-zinc-200/50 dark:bg-zinc-900 p-1.5 px-3 rounded-xl">
                        <span className="font-black text-zinc-900 dark:text-zinc-200">Koleksi: `/users/{'{userId}'}`</span>
                        <span className="text-[8px] uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Identity</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 px-2 leading-relaxed">
                        <div>
                          • displayName: string<br />
                          • email: string<br />
                          • role: "owner" | "admin" | "staff" | "sales" | etc
                        </div>
                        <div>
                          • status: "pending" | "approved" | "blocked"<br />
                          • branchId: string (e.g. "YK01")<br />
                          • lastLogin: String ISO_Timestamp
                        </div>
                      </div>
                    </div>

                    {/* clients schema */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center bg-zinc-200/50 dark:bg-zinc-900 p-1.5 px-3 rounded-xl">
                        <span className="font-black text-zinc-900 dark:text-zinc-200">Koleksi: `/clients/{'{clientId}'}`</span>
                        <span className="text-[8px] uppercase bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded">Operational CRM</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 px-2 leading-relaxed">
                        <div>
                          • nama: string<br />
                          • nomor: string (WhatsApp format standar)<br />
                          • alamat: string<br />
                          • ownerId: string (UserID pendaftar)
                        </div>
                        <div>
                          • kategori: "baru" | "eks" | "langgan"<br />
                          • branchId: string (Isolation key)<br />
                          • createdAt: String ISO_Timestamp
                        </div>
                      </div>
                    </div>

                    {/* orders schema */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center bg-zinc-200/50 dark:bg-zinc-900 p-1.5 px-3 rounded-xl">
                        <span className="font-black text-zinc-900 dark:text-zinc-200">Koleksi: `/orders/{'{orderId}'}`</span>
                        <span className="text-[8px] uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">Financial Workflow</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 px-2 leading-relaxed">
                        <div>
                          • clientId: string<br />
                          • ownerId: string<br />
                          • barang: string (Nama unit produk)<br />
                          • angsuran: number
                        </div>
                        <div>
                          • tenorDays: number<br />
                          • status: "waiting" | "approved" | "rejected" | "shipped" | "active"<br />
                          • branchId: string<br />
                          • dueAt: ISO_Timestamp
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Firestore Rules Snip */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400 font-mono">Prinsip Keamanan Cabang (Firestore Security Rules)</span>
                    <button 
                      onClick={() => handleCopy(rulesSnip, 'securityRules')}
                      className="px-2.5 py-1 text-[10px] font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all inline-flex items-center gap-1 border border-zinc-200 dark:border-zinc-800"
                    >
                      {copiedText === 'securityRules' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      Copy Rules Rule
                    </button>
                  </div>

                  <pre className="text-[10px] leading-relaxed bg-zinc-950 text-zinc-300 p-4 rounded-2xl border border-zinc-850 overflow-x-auto no-scrollbar max-h-[250px] font-mono text-left">
                    {rulesSnip}
                  </pre>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 4: SERVICE LAYER AND QUERY PATTERNS */}
          {activeTab === 'services' && filterText('services ts callback collection query update subscribe service sample services.ts patterns') && (
            <motion.div
              key="tab-services"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                  <Code2 className="w-5 h-5 text-brand-primary" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">Pola Standar Service Layer</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tight font-semibold">Gunakan Abstraksi Bersih dan Matikan Query Ad-Hoc</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Semua penulisan mutasi data koheren wajib disusun di dalam file proxy <code className="font-mono text-brand-primary font-bold">src/lib/services.ts</code>. Contoh pola standar penarikan data reaktif menggunakan subskripsi listener:
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase font-black">Pola Pengambilan Listerner Reaktif (Subskripsi Data)</span>
                    <button 
                      onClick={() => handleCopy(serviceSnip, 'serviceCode')}
                      className="px-2.5 py-1 text-[10px] font-mono hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all inline-flex items-center gap-1 border border-zinc-200 dark:border-zinc-800"
                    >
                      {copiedText === 'serviceCode' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      Copy Code
                    </button>
                  </div>

                  <pre className="text-[10px] leading-relaxed bg-zinc-950 text-zinc-300 p-4 rounded-2xl border border-zinc-850 overflow-x-auto no-scrollbar font-mono text-left">
                    {serviceSnip}
                  </pre>
                </div>

                {/* Technical Best Practices list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 space-y-1.5">
                    <span className="font-black text-[9px] text-red-500 uppercase tracking-widest block font-mono">⚠️ JANGAN MEMAKAI INI (WARNING)</span>
                    <ul className="text-[10px] text-zinc-500 leading-normal space-y-1">
                      <li>• Import `collection` atau `getDocs` di dalam file halaman visual</li>
                      <li>• Menulis query database di dalam visual component `useEffect`</li>
                      <li>• Melakukan hardcode nama role dalam string liar tanpa validasi</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-1.5">
                    <span className="font-black text-[9px] text-emerald-500 uppercase tracking-widest block font-mono">🟢 BIASAKAN LAKUKAN INI (DO)</span>
                    <ul className="text-[10px] text-zinc-500 leading-normal space-y-1">
                      <li>• Selalu gunakan hook `useUserProfile` untuk melandasi role</li>
                      <li>• Pastikan relasi rujukan divalidasi tidak nihil (throw safety check)</li>
                      <li>• Catat mutasi penting melalui service penulisan `addActivity`</li>
                    </ul>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 5: HOW-TO EXPANSION RECIPES */}
          {activeTab === 'recipes' && filterText('recipe guide write compile modules custom role development workflow add') && (
            <motion.div
              key="tab-recipes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Cookbook Container Grid */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-850 pb-3">
                  <Cpu className="w-5 h-5 text-brand-primary" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">Petunjuk Pengembangan Fitur & Ekstensi (Recipes & Cookbook)</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tight font-semibold">Langkah Pasti Menambahkan Komponen Baru Tanpa Menghancurkan Sistem</p>
                  </div>
                </div>

                {/* Recipe lists */}
                <div className="space-y-6">
                
                  {/* Recipe 1 */}
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                      <CornerDownRight className="w-4 h-4 text-brand-primary" />
                      1. Bagaimana Cara Menambahkan Modul Baru Halaman?
                    </span>
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 text-xs text-zinc-500 leading-relaxed space-y-2">
                      <p>
                        Ikuti 3 tahapan standardisasi fungsional untuk menambah link ruko operasional baru:
                      </p>
                      <ol className="list-decimal pl-5 space-y-1 text-[11px] font-mono">
                        <li>Buka <strong className="text-brand-primary">src/config/modules.ts</strong>, lalu tambahkan baris konfigurasi modular baru di dalam konstanta `DEFAULT_MODULES` lengkap dengan ijin `allowedRoles`.</li>
                        <li>Buka <strong className="text-brand-primary">src/App.tsx</strong>, buat atau daftarkan element halaman Anda dibungkus dengan route guard modular:<br />
                          <code className="text-[10px] bg-zinc-200 dark:bg-zinc-900 text-brand-primary px-1 rounded block mt-1 py-0.5">
                            {"<Route path=\"/my-path\" element={<ModuleGuard moduleId=\"myModule\"><MyPage /></ModuleGuard>} />"}
                          </code>
                        </li>
                        <li>Buka menu navigasi <strong className="text-brand-primary">src/components/BottomNavbar.tsx</strong> dan tambahkan deskripsi `moduleId` jika ingin ditampilkan sebagai link pintasan visual bawah.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Recipe 2 */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                      <CornerDownRight className="w-4 h-4 text-brand-primary" />
                      2. Bagaimana Cara Menambahkan Alur Otorisasi Peran Baru (New Role)?
                    </span>
                    <div className="bg-zinc-50 dark:bg-[#060608] p-4 rounded-2xl border border-zinc-100 dark:border-zinc-850 text-xs text-zinc-500 leading-relaxed space-y-2">
                      <ol className="list-decimal pl-5 space-y-1 text-[11px] font-mono">
                        <li>Buka file <strong className="text-brand-primary">src/config/roles.ts</strong>, tambahkan nama id peran secara harfiah di dalam tipe `ROLES`.</li>
                        <li>Update array skema validasi peran di file <strong className="text-brand-primary">firebase-blueprint.json</strong> pada properti Koleksi User - enum untuk sinkronisasi database.</li>
                        <li>Rumuskan ulang perijinan fungsional menu role di panel <strong className="text-brand-primary">/admin/modules</strong> untuk modul terkait rekap.</li>
                      </ol>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}

// Standar script variables containing snippets for absolute safety
const rulesSnip = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Auth helpers block
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isManager() {
      return isSignedIn() && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "owner" ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin" ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "staff");
    }

    // Module restrictions
    match /modules/{moduleId} {
      allow read: if isSignedIn();
      allow write: if isManager();
    }
    
    // Client security matching branch scope
    match /clients/{clientId} {
      allow read: if isSignedIn() && (
        resource.data.branchId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branchId ||
        isManager()
      );
      allow write: if isSignedIn() && (
        request.resource.data.branchId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branchId ||
        isManager()
      );
    }
  }
}`;

const serviceSnip = `import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Pola Standar subskripsi data dengan jaminan filter cabang operasional harian.
 */
export function subscribeClients(
  role: string, 
  uid: string, 
  callback: (clients: any[]) => void, 
  branchId?: string | null
) {
  const clientsCol = collection(db, 'clients');
  let q = query(clientsCol);

  // Jika bukan owner, isolasi sirkulasi data berdasarkan wilayah cabang fungsional
  if (role !== 'owner' && branchId) {
    q = query(clientsCol, where('branchId', '==', branchId));
  } else if (role === 'sales') {
    q = query(clientsCol, where('ownerId', '==', uid));
  }

  // Real-time listener dengan callback reaktif
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(list);
  }, (error) => {
    console.error("Subskripsi clients gagal:", error);
  });
}`;

process.env.VITE_PRICELIST_SHEET_ID="16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc";
const GID = "0";
const url = `https://docs.google.com/spreadsheets/d/${process.env.VITE_PRICELIST_SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
fetch(url).then(r=>r.text()).then(text => {
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);
    const rows = data.table.rows.map((row, index) => ({
      id: row.c[0]?.v?.toString() || index.toString(),
      nama: row.c[1]?.v?.toString() || "Tanpa Nama",
      kategori: row.c[2]?.v?.toString() || "Umum",
      harga: Number(row.c[3]?.v) || 0,
      marginRate: Number(row.c[4]?.v) || 0.3,
      gambarUrl: row.c[5]?.v?.toString() || "",
      deskripsi: row.c[6]?.v?.toString() || "",
    }));
    console.log("Categories:", Array.from(new Set(rows.map(d => d.kategori))));
    console.log("First 5 products:", rows.slice(0, 5));
});

const sheetId = "16MEtVRu3Vv3-6JEw46xndUisFy7Uo7ZMT86BucWeQOc";
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=0`;
fetch(url).then(r=>r.text()).then(t => {
  const jsonString = t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1);
  const data = JSON.parse(jsonString);
  let sharpIdx = data.table.rows.findIndex(r => r.c.some(c => c?.v?.toString() === 'SJ-N 192D'));
  console.log("Rows around SHARP:");
  data.table.rows.slice(Math.max(0, sharpIdx - 5), sharpIdx + 1).forEach(r => {
      console.log(r.c.map(c=>c?.v));
  });
});

import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workbook = Workbook.create();
const invoice = workbook.worksheets.add("Invoice");
invoice.showGridLines = false;
invoice.getRange("A1:C5").values = [
  ["Description", "Quantity", "Amount"],
  ["Service plan", 1, 89.99],
  ["Administrative fee", 1, 19.95],
  ["Technology fee", 1, 8.5],
  ["Total", null, 118.44],
];
invoice.getRange("A1:C1").format = { fill: "#17365D", font: { bold: true, color: "#FFFFFF" } };
invoice.getRange("B2:B5").format.numberFormat = "0";
invoice.getRange("C2:C5").format.numberFormat = '"$"#,##0.00';
invoice.getRange("A1:C5").format.autofitColumns();
const terms = workbook.worksheets.add("Contract Terms");
terms.getRange("A1:B4").values = [
  ["Term", "Detail"],
  ["Renewal", "Automatically renews for twelve months unless canceled 60 days before renewal."],
  ["Cancellation", "A $125 cancellation charge applies."],
  ["Disputes", "Written notice is required within 30 days."],
];
terms.getRange("A1:B1").format = { fill: "#17365D", font: { bold: true, color: "#FFFFFF" } };
terms.getRange("A1:B4").format.wrapText = true;
terms.getRange("A1:B4").format.autofitColumns();
terms.getRange("B1:B4").format.columnWidth = 52;
await fs.mkdir("tmp/fixtures", { recursive: true });
const previewOne = await workbook.render({ sheetName: "Invoice", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile("tmp/fixtures/xlsx-invoice.png", new Uint8Array(await previewOne.arrayBuffer()));
const previewTwo = await workbook.render({ sheetName: "Contract Terms", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile("tmp/fixtures/xlsx-terms.png", new Uint8Array(await previewTwo.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save("tmp/fixtures/multi-sheet-invoice.xlsx");
const inspection = await workbook.inspect({ kind: "table", range: "Invoice!A1:C5", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 5 });
console.log(inspection.ndjson);

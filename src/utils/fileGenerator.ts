import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DatabaseProduct,
  ShipmentItem,
  XlsxReportMode,
  BoxBarcodesMap,
} from "../types";

let cachedRobotoNormal: string | null = null;

/**
 * Downloads a font in arraybuffer and encodes to base64 for jsPDF.
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font from URL: ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return window.btoa(binary);
}

const ROBOTO_FONT_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";

/**
 * Ensures Roboto font with full Cyrillic support is registered in the PDF document.
 */
async function ensureCyrillicFont(doc: jsPDF): Promise<string> {
  try {
    if (!cachedRobotoNormal) {
      cachedRobotoNormal = await fetchFontAsBase64(ROBOTO_FONT_URL);
    }
    const fontFilename = "Roboto-Regular.ttf";
    doc.addFileToVFS(fontFilename, cachedRobotoNormal);
    doc.addFont(fontFilename, "Roboto", "normal");
    doc.setFont("Roboto", "normal");
    return "Roboto";
  } catch (error) {
    console.warn(
      "Failed to load Roboto font for Cyrillic. Falling back to default system font.",
      error,
    );
    doc.setFont("helvetica", "normal");
    return "helvetica";
  }
}

/**
 * Parses an Excel or CSV file into DatabaseProduct items.
 * Expects three columns: 'название', 'баркод', 'артикул' (case-insensitive).
 */
export function parseImportedFile(file: File): Promise<DatabaseProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Не удалось прочитать файл");
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON array
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          sheet,
          { defval: "" },
        );

        if (rawRows.length === 0) {
          throw new Error("Файл пуст или имеет неверный формат");
        }

        // Detect columns regardless of case and trim
        const products: DatabaseProduct[] = [];
        let index = 1;

        for (const row of rawRows) {
          let name = "";
          let barcode = "";
          let article = "";

          // Look for matching keys
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            const value = String(row[key] ?? "").trim();

            if (
              cleanKey === "название" ||
              cleanKey === "name" ||
              cleanKey === "товар" ||
              cleanKey === "наименование"
            ) {
              name = value;
            } else if (
              cleanKey === "баркод" ||
              cleanKey === "barcode" ||
              cleanKey === "штрихкод"
            ) {
              barcode = value;
            } else if (
              cleanKey === "артикул" ||
              cleanKey === "article" ||
              cleanKey === "sku"
            ) {
              article = value;
            }
          }

          // Fallback to column order if headers weren't named exactly
          if (!name || !barcode || !article) {
            const keys = Object.keys(row);
            if (keys.length >= 3) {
              name = name || String(row[keys[0]] ?? "").trim();
              barcode = barcode || String(row[keys[1]] ?? "").trim();
              article = article || String(row[keys[2]] ?? "").trim();
            }
          }

          // Only add if at least barcode is provided
          if (barcode) {
            products.push({
              id: `prod_${index}_${Date.now()}`,
              name: name || `Продукт без названия ${index}`,
              barcode: barcode,
              article: article || `АРТ-${index}`,
            });
            index++;
          }
        }

        if (products.length === 0) {
          throw new Error(
            "Не найдено корректных данных. Убедитесь, что в файле есть столбцы: Название, Баркод, Артикул.",
          );
        }

        resolve(products);
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error("Ошибка при разборе файла Excel/CSV"),
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Ошибка чтения файла"));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Parses a previously exported shipment file for recovery.
 * Expects three columns: 'баркод', 'количество', 'коробка' (case-insensitive).
 * Returns ShipmentItem array matched with the database products by barcode.
 * Requires database to be pre-loaded.
 */
export function parseShipmentFile(
  file: File,
  database: DatabaseProduct[],
): Promise<ShipmentItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Не удалось прочитать файл");
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON array
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          sheet,
          { defval: "" },
        );

        if (rawRows.length === 0) {
          throw new Error("Файл пуст или имеет неверный формат");
        }

        // Create a map of database products by barcode for quick lookup
        const barcodeMap = new Map<string, DatabaseProduct>();
        database.forEach((product) => {
          barcodeMap.set(product.barcode, product);
        });

        const items: ShipmentItem[] = [];
        let index = 0;

        for (const row of rawRows) {
          let barcode = "";
          let quantity = 0;
          let boxNumber = 0;

          // Look for matching keys
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            const value = String(row[key] ?? "").trim();

            if (
              cleanKey === "баркод" ||
              cleanKey === "barcode" ||
              cleanKey === "штрихкод"
            ) {
              barcode = value;
            } else if (
              cleanKey === "количество" ||
              cleanKey === "quantity" ||
              cleanKey === "кол-во"
            ) {
              quantity = parseInt(value, 10) || 0;
            } else if (
              cleanKey === "коробка" ||
              cleanKey === "box" ||
              cleanKey === "box number"
            ) {
              boxNumber = parseInt(value, 10) || 0;
            }
          }

          // Fallback to column order if headers weren't named exactly
          if (!barcode || !quantity || !boxNumber) {
            const keys = Object.keys(row);
            if (keys.length >= 3) {
              barcode = barcode || String(row[keys[0]] ?? "").trim();
              quantity = quantity || parseInt(String(row[keys[1]] ?? "0"), 10);
              boxNumber =
                boxNumber || parseInt(String(row[keys[2]] ?? "0"), 10);
            }
          }

          // Only add if we have barcode and valid quantity/box
          if (barcode && quantity > 0 && boxNumber > 0) {
            const product = barcodeMap.get(barcode);
            if (product) {
              items.push({
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
                product,
                quantity,
                boxNumber,
                createdAt: Date.now() + index, // Add slight delay to maintain order
              });
              index++;
            }
          }
        }

        if (items.length === 0) {
          throw new Error(
            "Не найдено корректных данных в файле. Убедитесь, что в файле есть столбцы: Баркод, Количество, Коробка.",
          );
        }

        resolve(items);
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error("Ошибка при разборе файла поставки"),
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Ошибка чтения файла"));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Exports added shipment items to an XLSX report.
 *
 * "summary" mode creates an overall barcode summary:
 * - Баркод
 * - Количество
 *
 * "byBox" mode creates a distribution by box:
 * - Баркод товара
 * - Кол-во товаров
 * - ШК короба
 * - Срок годности
 */
export function exportToXLSX(
  items: ShipmentItem[],
  fileName = "shipment.xlsx",
  mode: XlsxReportMode = "summary",
  boxBarcodes: BoxBarcodesMap = {},
): void {
  const sortedItems = [...items].sort((a, b) => a.createdAt - b.createdAt);
  const isByBox = mode === "byBox";

  const data = isByBox
    ? buildBoxDistributionRows(sortedItems, boxBarcodes)
    : buildSummaryRows(sortedItems);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    isByBox ? "Распределение" : "Сводка",
  );

  worksheet["!cols"] = isByBox
    ? [
        { wch: 25 }, // Баркод товара
        { wch: 18 }, // Кол-во товаров
        { wch: 14 }, // ШК короба
        { wch: 16 }, // Срок годности
      ]
    : [
        { wch: 25 }, // Баркод
        { wch: 15 }, // Количество
      ];

  XLSX.writeFile(workbook, fileName);
}

function buildSummaryRows(items: ShipmentItem[]): Record<string, unknown>[] {
  const barcodeOrder: string[] = [];
  const quantityByBarcode = new Map<string, number>();

  items.forEach((item) => {
    const barcode = item.product.barcode;

    if (!quantityByBarcode.has(barcode)) {
      barcodeOrder.push(barcode);
      quantityByBarcode.set(barcode, 0);
    }

    quantityByBarcode.set(
      barcode,
      (quantityByBarcode.get(barcode) || 0) + item.quantity,
    );
  });

  return barcodeOrder.map((barcode) => ({
    Баркод: barcode,
    Количество: quantityByBarcode.get(barcode) || 0,
  }));
}

function buildBoxDistributionRows(
  items: ShipmentItem[],
  boxBarcodes: BoxBarcodesMap = {},
): Record<string, unknown>[] {
  const rowOrder: Array<{ barcode: string; boxNumber: number }> = [];
  const quantityByKey = new Map<string, number>();

  items.forEach((item) => {
    const key = `${item.product.barcode}__${item.boxNumber}`;

    if (!quantityByKey.has(key)) {
      rowOrder.push({
        barcode: item.product.barcode,
        boxNumber: item.boxNumber,
      });
      quantityByKey.set(key, 0);
    }

    quantityByKey.set(key, (quantityByKey.get(key) || 0) + item.quantity);
  });

  return rowOrder.map(({ barcode, boxNumber }) => ({
    "Баркод товара": barcode,
    "Кол-во товаров": quantityByKey.get(`${barcode}__${boxNumber}`) || 0,
    "ШК короба": boxBarcodes[boxNumber] || boxNumber,
    "Срок годности": "",
  }));
}

/**
 * Exports added items to a PDF structured by Box with proper Cyrillic rendering.
 * For each box, includes statistics and a detailed breakdown.
 */
export async function exportToPDF(
  items: ShipmentItem[],
  shipmentName = "Поставка WB",
): Promise<void> {
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  // Ensure Roboto font for Cyrillic support
  const fontName = await ensureCyrillicFont(doc);

  // Group items by box number
  const boxesMap = new Map<number, ShipmentItem[]>();
  items.forEach((item) => {
    if (!boxesMap.has(item.boxNumber)) {
      boxesMap.set(item.boxNumber, []);
    }
    boxesMap.get(item.boxNumber)!.push(item);
  });

  // Sort boxes ascending
  const sortedBoxNumbers = Array.from(boxesMap.keys()).sort((a, b) => a - b);

  // Helper to draw clean header on pages
  const addDocumentHeader = (pageNum: number) => {
    doc.setFont(fontName, "normal");
    doc.setFontSize(16);
    // Dark Charcoal theme text color
    doc.setTextColor(33, 33, 33);
    doc.text("ОТЧЕТ ПО ПОСТАВКЕ WB", 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Сформировано: ${new Date().toLocaleString("ru-RU")}`, 14, 26);
    doc.text(`Страница: ${pageNum}`, 180, 26);

    // Draw a thin accent header line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 29, 196, 29);
  };

  let pageIndex = 1;
  addDocumentHeader(pageIndex);

  let currentY = 35;

  if (items.length === 0) {
    doc.setFontSize(11);
    doc.text("Нет добавленных товаров в поставку", 14, currentY);
    doc.save(`${shipmentName}.pdf`);
    return;
  }

  // Iterate over each box and draw stats & records
  sortedBoxNumbers.forEach((boxNum, index) => {
    const boxItems = boxesMap.get(boxNum) || [];

    // Sort items inside the box by their chronological addition
    const sortedBoxItems = [...boxItems].sort(
      (a, b) => a.createdAt - b.createdAt,
    );

    // Stats for the box
    const uniqueBarcodes = new Set(
      sortedBoxItems.map((item) => item.product.barcode),
    ).size;
    const totalQuantity = sortedBoxItems.reduce(
      (acc, item) => acc + item.quantity,
      0,
    );

    // Check if we need to start on a new page (roughly 60mm needed for at least a small box layout)
    if (currentY > 230 && index > 0) {
      doc.addPage();
      pageIndex++;
      addDocumentHeader(pageIndex);
      currentY = 35;
    }

    doc.setFont(fontName, "normal");
    doc.setFontSize(12);
    doc.setTextColor(43, 93, 212); // Royal Blue accent color for BOX index
    doc.text(`Коробка № ${boxNum}`, 14, currentY);

    // Summary block
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const statText = `Уникальных баркодов: ${uniqueBarcodes}  |  Общее количество: ${totalQuantity} шт.`;
    doc.text(statText, 14, currentY + 6);

    // Build Table Rows: barcode, article, product name, quantity
    const tableBody = sortedBoxItems.map((item, idx) => [
      String(idx + 1),
      item.product.barcode,
      item.product.article,
      item.product.name,
      String(item.quantity),
    ]);

    // Use autoTable
    autoTable(doc, {
      startY: currentY + 9,
      head: [["#", "Баркод", "Артикул", "Наименование товара", "Кол-во"]],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
        font: fontName,
      },
      headStyles: {
        fillColor: [31, 41, 55], // Slate 800 background
        textColor: [255, 255, 255],
        font: fontName, // Set the Cyrillic font for headers
      },
      bodyStyles: {
        font: fontName, // Set the Cyrillic font for body rows
      },
      columnStyles: {
        0: { cellWidth: 10 }, // Numbering
        1: { cellWidth: 40 }, // Barcode
        2: { cellWidth: 35 }, // Article
        3: { cellWidth: "auto" }, // Product Name
        4: { cellWidth: 20, halign: "right" }, // Quantity
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // update Y state
        currentY = (data.cursor?.y || currentY + 30) + 12;
      },
    });

    // Make sure we carry forward updated cursor Y position
    const lastY = (doc as any).lastAutoTable?.finalY;
    if (lastY) {
      currentY = lastY + 12;
    } else {
      currentY += 40;
    }
  });

  doc.save(`${shipmentName}.pdf`);
}

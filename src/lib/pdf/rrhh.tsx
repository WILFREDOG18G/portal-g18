import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFPage } from "pdf-lib";
import type { PDFFont } from "pdf-lib";

type LoanPdfInput = {
  businessUnitName: string;
  razonSocial: string;
  logoColor?: string | null;
  employeeName: string;
  position?: string | null;
  areaName?: string | null;
  amount: number;
  installmentAmount: number;
  installmentsCount: number;
  lastInstallmentAmount?: number | null;
  reason?: string | null;
  requestDate: string;
};

type WorkLetterPdfInput = {
  businessUnitName: string;
  razonSocial: string;
  logoColor?: string | null;
  employeeName: string;
  position?: string | null;
  contractType: "SP" | "SIPE";
  purpose?: string | null;
  requestDate: string;
  hireDateText?: string | null;
  salary?: number | null;
  weeklyTipAvg?: number | null;
  identification?: string | null;
};

type MemoPdfInput = {
  businessUnitName: string;
  razonSocial: string;
  logoColor?: string | null;
  memoType: string;
  subject: string;
  body: string;
  date: string;
  status?: string | null;
  targetEmployeeName?: string | null;
};

type VacationRequestPdfInput = {
  businessUnitName: string;
  razonSocial: string;
  logoColor?: string | null;
  employeeName: string;
  position?: string | null;
  areaName?: string | null;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  status?: string | null;
  requestDate?: string | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 9,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 10,
  },
  label: {
    fontWeight: "bold",
  },
  paragraph: {
    lineHeight: 1.5,
  },
  box: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  signatureRow: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: "#64748b",
    paddingTop: 6,
    fontSize: 10,
    color: "#334155",
  },
});

function currency(value?: number | null) {
  const amount = Number(value ?? 0);
  return `$${amount.toFixed(2)}`;
}

function normalizeBusinessUnitName(name: string) {
  return String(name || "").trim().toUpperCase();
}

function resolveTemplatePath(kind: "loan" | "vacation", businessUnitName: string) {
  const unit = normalizeBusinessUnitName(businessUnitName);
  const fileName =
    kind === "loan"
      ? unit === "KAVA"
        ? "FORMATO DE PRESTAMOS KAVA.pdf"
        : "FORMATO DE PRESTAMOS ARIA.pdf"
      : unit === "KAVA"
      ? "FORMATO DE VACACIONES KAVA.pdf"
      : "FORMATO DE VACACIONES ARIA.pdf";

  return path.join(process.cwd(), fileName);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("es-PA")} ${date.toLocaleTimeString("es-PA", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return value;
    return fallback.toLocaleDateString("es-PA");
  }
  return date.toLocaleDateString("es-PA");
}

function addDays(value?: string | null, days = 1) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("es-PA");
}

function truncate(value: string, max = 88) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

type OverlayField = {
  value: string;
  x: number;
  y: number;
  size?: number;
  max?: number;
};

function drawFieldsOnTemplate(
  page: PDFPage,
  fields: OverlayField[],
  font: PDFFont
) {
  for (const field of fields) {
    page.drawText(truncate(field.value || "-", field.max ?? 92), {
      x: field.x,
      y: field.y,
      size: field.size ?? 10,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });
  }
}

async function fillTemplateWithData(
  kind: "loan" | "vacation",
  businessUnitName: string,
  rows: Array<{ label: string; value: string }>
) {
  const templatePath = resolveTemplatePath(kind, businessUnitName);
  let templateBytes: Buffer;

  try {
    templateBytes = await readFile(templatePath);
  } catch {
    return null;
  }

  const templateDoc = await PDFDocument.load(templateBytes);
  const pages = templateDoc.getPages();
  if (pages.length === 0) {
    return null;
  }

  const page = pages[0];
  const fontRegular = await templateDoc.embedFont(StandardFonts.Helvetica);
  const rowValue = (label: string) => rows.find((row) => row.label === label)?.value || "-";

  if (kind === "loan") {
    // Coordenadas calibradas desde etiquetas reales del formato ARIA/KAVA (mismo layout).
    drawFieldsOnTemplate(
      page,
      [
        { value: rowValue("Colaborador"), x: 188, y: 635, max: 34 },
        { value: rowValue("Fecha"), x: 340, y: 658, max: 20 },
        { value: rowValue("Cargo"), x: 170, y: 606, max: 28 },
        { value: rowValue("Area"), x: 410, y: 606, max: 24 },
        { value: rowValue("Monto"), x: 165, y: 580, max: 18 },
        { value: rowValue("Cuota"), x: 170, y: 553, max: 18 },
        { value: rowValue("# Cuotas"), x: 440, y: 553, max: 8 },
        { value: rowValue("Motivo"), x: 185, y: 534, max: 60 },
        { value: rowValue("Colaborador"), x: 208, y: 474, max: 40, size: 9.2 },
      ],
      fontRegular
    );
  } else {
    // Vacaciones no contiene texto extraible; se usa mapa visual sobre el formato ARIA/KAVA.
    drawFieldsOnTemplate(
      page,
      [
        { value: rowValue("Colaborador"), x: 158, y: 705, max: 36 },
        { value: rowValue("Fecha"), x: 425, y: 706, max: 22 },
        { value: rowValue("Colaborador"), x: 155, y: 680, max: 34 },
        { value: rowValue("Cargo"), x: 165, y: 653, max: 30 },
        { value: rowValue("Area"), x: 375, y: 653, max: 24 },
        { value: rowValue("Dias Generados"), x: 200, y: 626, max: 10 },
        { value: rowValue("Dias"), x: 450, y: 626, max: 10 },
        { value: rowValue("Inicio"), x: 170, y: 600, max: 20 },
        { value: rowValue("Fin"), x: 382, y: 600, max: 20 },
        { value: rowValue("Retorno"), x: 177, y: 573, max: 20 },
        { value: rowValue("Pendientes"), x: 468, y: 573, max: 12 },
        { value: rowValue("Motivo"), x: 95, y: 473, max: 52, size: 9 },
        { value: rowValue("Estado"), x: 382, y: 473, max: 20, size: 9 },
      ],
      fontRegular
    );
  }

  page.drawText(`Generado: ${formatDateTime(new Date().toISOString())}`, {
    x: 28,
    y: 18,
    size: 8,
    font: fontRegular,
    color: rgb(0.25, 0.25, 0.25),
  });

  const bytes = await templateDoc.save();
  return Buffer.from(bytes);
}

async function toPdfBuffer(document: React.ReactElement) {
  const instance = pdf(document);
  const pdfStream = await instance.toBuffer();
  const chunks: Buffer[] = [];

  for await (const chunk of pdfStream as AsyncIterable<Uint8Array | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function renderLoanRequestPdf(input: LoanPdfInput) {
  const logoColor = input.logoColor || "#0f766e";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text>{input.razonSocial}</Text>
            <Text>{input.businessUnitName}</Text>
          </View>
          <View style={{ ...styles.logoBox, backgroundColor: logoColor }}>
            <Text>{input.businessUnitName}</Text>
          </View>
        </View>

        <Text style={styles.title}>Solicitud de Adelanto</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            <Text style={styles.label}>Colaborador: </Text>{input.employeeName}
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.label}>Cargo: </Text>{input.position || "-"}
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.label}>Area: </Text>{input.areaName || "-"}
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.label}>Fecha de solicitud: </Text>{input.requestDate}
          </Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.paragraph}><Text style={styles.label}>Monto solicitado: </Text>{currency(input.amount)}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Monto por cuota: </Text>{currency(input.installmentAmount)}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Cantidad de cuotas: </Text>{input.installmentsCount}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Ultima cuota: </Text>{currency(input.lastInstallmentAmount)}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Motivo: </Text>{input.reason || "-"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>Monto aprobado: ____________________</Text>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureBox}>Firma colaborador</Text>
          <Text style={styles.signatureBox}>GERENCIA GENERAL</Text>
        </View>
      </Page>
    </Document>
  );

  const templateBuffer = await fillTemplateWithData("loan", input.businessUnitName, [
    { label: "Colaborador", value: input.employeeName },
    { label: "Cargo", value: input.position || "-" },
    { label: "Area", value: input.areaName || "-" },
    { label: "Fecha", value: input.requestDate },
    { label: "Monto", value: currency(input.amount) },
    { label: "Cuota", value: currency(input.installmentAmount) },
    { label: "# Cuotas", value: String(input.installmentsCount) },
    { label: "Ult. cuota", value: currency(input.lastInstallmentAmount) },
    { label: "Motivo", value: input.reason || "-" },
  ]);

  if (templateBuffer) {
    return templateBuffer;
  }

  return toPdfBuffer(doc);
}

export async function renderWorkLetterPdf(input: WorkLetterPdfInput) {
  const logoColor = input.logoColor || "#334155";
  const contractLabel = input.contractType === "SP" ? "SERVICIOS PROFESIONALES" : "SIPE";

  const contractDetails =
    input.contractType === "SP"
      ? `Honorarios mensuales: ${currency(input.salary)}. Propina semanal promedio: ${currency(input.weeklyTipAvg)}.`
      : `Salario mensual: ${currency(input.salary)}. Este colaborador aplica descuentos de ley (seguro social y educativo).`;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text>{input.razonSocial}</Text>
            <Text>{input.businessUnitName}</Text>
          </View>
          <View style={{ ...styles.logoBox, backgroundColor: logoColor }}>
            <Text>{input.businessUnitName}</Text>
          </View>
        </View>

        <Text style={styles.title}>Carta de Trabajo</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>Por medio de la presente se certifica que:</Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.paragraph}><Text style={styles.label}>Nombre: </Text>{input.employeeName}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Identificacion: </Text>{input.identification || "-"}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Cargo: </Text>{input.position || "-"}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Tipo de contrato: </Text>{contractLabel}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Fecha de ingreso: </Text>{input.hireDateText || "-"}</Text>
          <Text style={styles.paragraph}>{contractDetails}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}><Text style={styles.label}>Proposito: </Text>{input.purpose || "-"}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Fecha de solicitud: </Text>{input.requestDate}</Text>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureBox}>Firma autorizada</Text>
          <Text style={styles.signatureBox}>Sello de la empresa</Text>
        </View>
      </Page>
    </Document>
  );

  return toPdfBuffer(doc);
}

export async function renderMemoPdf(input: MemoPdfInput) {
  const logoColor = input.logoColor || "#7f1d1d";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text>{input.razonSocial}</Text>
            <Text>{input.businessUnitName}</Text>
          </View>
          <View style={{ ...styles.logoBox, backgroundColor: logoColor }}>
            <Text>{input.businessUnitName}</Text>
          </View>
        </View>

        <Text style={styles.title}>Memo RRHH</Text>

        <View style={styles.box}>
          <Text style={styles.paragraph}><Text style={styles.label}>Fecha: </Text>{input.date}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Tipo: </Text>{input.memoType}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Asunto: </Text>{input.subject}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Colaborador objetivo: </Text>{input.targetEmployeeName || "Todo el personal"}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Estado: </Text>{input.status || "-"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Detalle:</Text>
          <Text style={styles.paragraph}>{input.body}</Text>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureBox}>Firma RRHH</Text>
          <Text style={styles.signatureBox}>Firma receptor</Text>
        </View>
      </Page>
    </Document>
  );

  return toPdfBuffer(doc);
}

export async function renderVacationRequestPdf(input: VacationRequestPdfInput) {
  const logoColor = input.logoColor || "#0f766e";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text>{input.razonSocial}</Text>
            <Text>{input.businessUnitName}</Text>
          </View>
          <View style={{ ...styles.logoBox, backgroundColor: logoColor }}>
            <Text>{input.businessUnitName}</Text>
          </View>
        </View>

        <Text style={styles.title}>Solicitud de Vacaciones</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}><Text style={styles.label}>Colaborador: </Text>{input.employeeName}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Cargo: </Text>{input.position || "-"}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Area: </Text>{input.areaName || "-"}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Estado: </Text>{input.status || "-"}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Fecha de solicitud: </Text>{input.requestDate || "-"}</Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.paragraph}><Text style={styles.label}>Inicio de vacaciones: </Text>{input.startDate}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Fin de vacaciones: </Text>{input.endDate}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Total de dias: </Text>{input.totalDays}</Text>
          <Text style={styles.paragraph}><Text style={styles.label}>Motivo: </Text>{input.reason || "-"}</Text>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureBox}>Firma colaborador</Text>
          <Text style={styles.signatureBox}>Aprobacion RRHH / Gerencia</Text>
        </View>
      </Page>
    </Document>
  );

  const templateBuffer = await fillTemplateWithData("vacation", input.businessUnitName, [
    { label: "Fecha", value: formatDateOnly(input.requestDate || "") },
    { label: "Colaborador", value: input.employeeName },
    { label: "Cargo", value: input.position || "-" },
    { label: "Area", value: input.areaName || "-" },
    { label: "Dias Generados", value: "-" },
    { label: "Inicio", value: formatDateOnly(input.startDate) },
    { label: "Fin", value: formatDateOnly(input.endDate) },
    { label: "Retorno", value: addDays(input.endDate, 1) },
    { label: "Pendientes", value: "-" },
    { label: "Dias", value: String(input.totalDays) },
    { label: "Motivo", value: input.reason || "-" },
    { label: "Estado", value: input.status || "-" },
  ]);

  if (templateBuffer) {
    return templateBuffer;
  }

  return toPdfBuffer(doc);
}

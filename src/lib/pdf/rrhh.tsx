import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

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


import { NextResponse } from "next/server";
import { getCantonConfig } from "@/lib/canton";

export async function GET() {
  const config = getCantonConfig();

  return NextResponse.json({
    network: "Canton",
    status: config.isConfigured ? "configured" : "not_configured",
    connected: false,
    participantConfigured: Boolean(config.participantUrl),
    partyConfigured: Boolean(config.partyId),
    message: config.isConfigured
      ? "Configuração encontrada. A conexão ainda precisa ser validada."
      : "Aguardando configuração do participante Canton e do Party ID.",
    transfersEnabled: false,
  });
}

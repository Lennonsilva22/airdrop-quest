
import { NextResponse } from "next/server";

const GATEWAY = "https://gateway.testnet.zenith.network";

export async function GET() {
  try {
    const response = await fetch(`${GATEWAY}/v1/registries`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Falha ao consultar os registros.");
    }

    const data = await response.json();

    const devRegistry = data.registries?.find(
      (registry: { kind?: string }) => registry.kind === "dev"
    );

    if (!devRegistry) {
      throw new Error("Registro DevCC/DevUSD não encontrado.");
    }

    async function getWrapper(instrumentId: string) {
      const params = new URLSearchParams({
        instrumentAdmin: devRegistry.admin,
        instrumentId,
      });

      const result = await fetch(
        `${GATEWAY}/v1/derive/wrapper?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!result.ok) {
        throw new Error(`Falha ao consultar ${instrumentId}.`);
      }

      const wrapper = await result.json();

      if (!wrapper.address) {
        throw new Error(`Endereço de ${instrumentId} não encontrado.`);
      }

      return wrapper.address;
    }

    const [devCCAddress, devUSDAddress] = await Promise.all([
      getWrapper("DevCC"),
      getWrapper("DevUSD"),
    ]);

    return NextResponse.json({
      ...data,
      evmTokens: [
        {
          id: "ZTH",
          symbol: "ZTH",
          name: "Zenith",
          address: null,
          decimals: 18,
          native: true,
        },
        {
          id: "DevCC",
          symbol: "wCC",
          name: "Wrapped CC",
          address: devCCAddress,
          decimals: 10,
          native: false,
        },
        {
          id: "DevUSD",
          symbol: "DUSD",
          name: "Dev USD",
          address: devUSDAddress,
          decimals: 10,
          native: false,
        },
        {
          id: "E",
          symbol: "DORIG",
          name: "Dev Original",
          address: data.registries?.find(
            (registry: { kind?: string }) =>
              registry.kind === "wrapped-erc20"
          )?.token,
          decimals: 18,
          native: false,
        },
      ],
    });
  } catch (error) {
    console.error("Erro no Zenith Gateway:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os contratos do Gateway." },
      { status: 500 }
    );
  }
}

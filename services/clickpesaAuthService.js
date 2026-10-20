 
const axios = require("axios"); 

const authClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

class ClickPesaAuthService {
  async getToken() {
    const baseUrl = process.env.CLICKPESA_BASE_URL;
    const apiKey = process.env.CLICKPESA_API_KEY;
    const clientId = process.env.CLICKPESA_CLIENT_ID;

    if (!baseUrl || !apiKey || !clientId) {
      throw new Error(
        "ClickPesa haijasanidiwa kikamilifu kwenye server."
      );
    }

    try {
      const response = await authClient.post(
        `${baseUrl.replace(/\/+$/, "")}/third-parties/generate-token`,
        {},
        {
          headers: {
            "api-key": apiKey,
            "client-id": clientId
          }
        }
      );

      const token = response.data?.token;

      if (typeof token !== "string" || !token.trim()) {
        console.error("CLICKPESA AUTH: Token missing in response.", {
          httpStatus: response.status,
          responseData: response.data
        });

        throw new Error(
          "ClickPesa haikurudisha token inayohitajika."
        );
      }

      console.log("CLICKPESA AUTH: Authentication successful.");

      return token;
    } catch (error) {
      const status = error.response?.status;
      const code = error.code || "NO_ERROR_CODE";

      // Rekodi maelezo ya kosa bila kuchapisha credentials au token.
      console.error("========== CLICKPESA AUTH DEBUG ==========");
      console.error("HTTP status:", status ?? "Hakuna HTTP response");
      console.error("Error code:", code);
      console.error("Error message:", error.message);

      if (error.response) {
        console.error(
          "Response body:",
          typeof error.response.data === "string"
            ? error.response.data.slice(0, 2000)
            : JSON.stringify(error.response.data)?.slice(0, 2000)
        );
      } else {
        console.error(
          "No HTTP response received; request may have timed out or failed to connect."
        );
      }

      console.error("==========================================");

      // Hifadhi ujumbe wa ndani ikiwa kosa limetoka kwenye validation yetu.
      if (
        error.message ===
        "ClickPesa haikurudisha token inayohitajika."
      ) {
        throw error;
      }

      throw new Error(
        "Imeshindikana kupata uthibitisho wa ClickPesa. Angalia Railway Logs kwa maelezo ya kosa."
      );
    }
  }
}

module.exports = new ClickPesaAuthService();

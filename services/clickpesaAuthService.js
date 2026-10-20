 
const axios = require("axios");

class ClickPesaAuthService {
  async getToken() {
    const baseUrl = process.env.CLICKPESA_BASE_URL;
    const apiKey = process.env.CLICKPESA_API_KEY;
    const clientId = process.env.CLICKPESA_CLIENT_ID;

    if (!baseUrl || !apiKey || !clientId) {
      console.error("CLICKPESA AUTH CONFIG ERROR", {
        baseUrlConfigured: Boolean(baseUrl),
        apiKeyConfigured: Boolean(apiKey),
        clientIdConfigured: Boolean(clientId)
      });

      throw new Error(
        "Mipangilio ya ClickPesa haijakamilika. Tafadhali wasiliana na msimamizi."
      );
    }

    const url =
      `${baseUrl}/third-parties/generate-token`;

    try {
      const response = await axios.post(
        url,
        {},
        {
          timeout: 30000,
          headers: {
            "api-key": apiKey,
            "client-id": clientId,
            "Content-Type": "application/json"
          }
        }
      );

      console.log("CLICKPESA TOKEN RESPONSE:", {
        status: response.status,
        tokenReceived: Boolean(response.data?.token)
      });

      if (!response.data?.token) {
        console.error(
          "CLICKPESA AUTH ERROR: Token haikupatikana."
        );

        throw new Error(
          "ClickPesa haikutoa token. Tafadhali jaribu tena baadaye."
        );
      }

      return response.data.token;

    } catch (error) {
      // Hifadhi maelezo ya hitilafu bila kuonyesha API key
      // au token kwenye logs.
      const status = error.response?.status;
      const data = error.response?.data;
      const code = error.code;

      console.error("========== CLICKPESA AUTH ERROR ==========");
      console.error("HTTP Status:", status || "N/A");
      console.error("Error Code:", code || "N/A");
      console.error("Response:", JSON.stringify(data || {}));
      console.error("Message:", error.message);
      console.error("==========================================");

      // Hifadhi ujumbe maalumu uliotengenezwa hapo juu.
      if (
        error.message ===
          "ClickPesa haikutoa token. Tafadhali jaribu tena baadaye."
      ) {
        throw error;
      }

      const rawMessage = String(
        data?.message ||
        data?.error?.message ||
        data?.error ||
        error.message ||
        ""
      );

      if (/not whitelisted|whitelist/i.test(rawMessage)) {
        throw new Error(
          "IP ya server haijawekwa kwenye whitelist ya ClickPesa. Tafadhali wasiliana na ClickPesa."
        );
      }

      if (
        status === 401 ||
        status === 403
      ) {
        throw new Error(
          "ClickPesa imekataa uthibitisho wa akaunti. Hakiki API Key, Client ID na ruhusa za akaunti."
        );
      }

      if (
        code === "ECONNABORTED" ||
        code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        code === "ETIMEDOUT" ||
        code === "EAI_AGAIN"
      ) {
        throw new Error(
          "Imeshindikana kuwasiliana na ClickPesa. Tafadhali jaribu tena baadaye."
        );
      }

      throw new Error(
        "Imeshindikana kupata token ya ClickPesa. Tafadhali jaribu tena au wasiliana na msimamizi."
      );
    }
  }
}

module.exports = new ClickPesaAuthService();

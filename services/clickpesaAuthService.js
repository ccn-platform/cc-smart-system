 
const axios = require("axios");

const authClient = axios.create({
  timeout: 10000,
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
        console.error("ClickPesa token response is missing token.");
        throw new Error(
          "Imeshindikana kupata uthibitisho wa huduma ya malipo."
        );
      }

      // Usichapishe token kwenye logs.
      console.log("ClickPesa authentication successful.");

      return token;
    } catch (error) {
      // Usichapishe headers, API keys, au token.
      console.error("ClickPesa authentication failed:", {
        status: error.response?.status,
        code: error.code,
        message: error.response
          ? "ClickPesa authentication request was rejected."
          : error.message
      });

      throw new Error(
        "Imeshindikana kuunganisha na huduma ya malipo. Tafadhali jaribu tena baadaye."
      );
    }
  }
}

module.exports = new ClickPesaAuthService();

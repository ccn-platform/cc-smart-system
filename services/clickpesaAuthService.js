 
 const axios = require("axios");

class ClickPesaAuthService {

 async getToken() {

  const response = await axios.post(
   `${process.env.CLICKPESA_BASE_URL}/third-parties/generate-token`,
   {},
   {
    headers: {
     "api-key": process.env.CLICKPESA_API_KEY,
     "client-id": process.env.CLICKPESA_CLIENT_ID
    }
   }
  );

  console.log("CLICKPESA TOKEN RESPONSE:", response.data);

  return response.data.token;
 }

}

module.exports = new ClickPesaAuthService();



 

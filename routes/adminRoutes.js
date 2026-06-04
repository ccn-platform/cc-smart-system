 const express = require("express");
const router = express.Router();

const User = require("../models/User");

router.get(
  "/users-view",
  async (req, res) => {
    try {
      const users = await User.find({});

      let html = `
        <html>
        <body>
          <h2>Users</h2>
          <table border="1">
            <tr>
              <th>Name</th>
              <th>Phone</th>
            </tr>
      `;

      users.forEach(user => {
        html += `
          <tr>
            <td>${user.fullName || ""}</td>
            <td>${user.phone || ""}</td>
          </tr>
        `;
      });

      html += `
          </table>
        </body>
        </html>
      `;

      res.send(html);
    } catch (error) {
      res.status(500).send(error.message);
    }
  }
);

module.exports = router;

 const express = require("express");
const router = express.Router();

const User = require("../models/User");

router.get(
  "/users-view",
  async (req, res) => {
    try {
      const users = await User.find({})
        .select(
          "name phone businessName role createdAt"
        );

      let html = `
        <html>
        <head>
          <title>Users</title>
          <style>
            table {
              border-collapse: collapse;
              width: 100%;
            }

            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }

            th {
              background: #f2f2f2;
            }
          </style>
        </head>
        <body>
          <h2>Total Users: ${users.length}</h2>

          <table>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Business</th>
              <th>Role</th>
            </tr>
      `;

      users.forEach(user => {
        html += `
          <tr>
            <td>${user.name || ""}</td>
            <td>${user.phone || ""}</td>
            <td>${user.businessName || ""}</td>
            <td>${user.role || ""}</td>
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

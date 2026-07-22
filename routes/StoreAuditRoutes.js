const express =
  require("express");

const multer =
  require("multer");

const path =
  require("path");

const fs =
  require("fs");

const {
  protect,
  branchAccess
} = require(
  "../middleware/authMiddleware"
);

const {
  uploadAuditVideo,
  getAuditHistory,
  getSingleAudit
} = require(
  "../controllers/StoreAuditController"
);

const router =
  express.Router();

const uploadDir =
  path.join(
    __dirname,
    "../uploads/audits"
  );

if (
  !fs.existsSync(
    uploadDir
  )
) {
  fs.mkdirSync(
    uploadDir,
    {
      recursive: true
    }
  );
}

const storage =
  multer.diskStorage({
    destination:
      (
        req,
        file,
        cb
      ) => {
        cb(
          null,
          uploadDir
        );
      },

    filename:
      (
        req,
        file,
        cb
      ) => {
        const ext =
          path.extname(
            file.originalname
          );

        cb(
          null,
          `${Date.now()}${ext}`
        );
      }
  });

const upload =
  multer({
    storage,
    limits: {
      fileSize:
        100 *
        1024 *
        1024
    }
  });

router.post(
  "/upload",
  protect,
  branchAccess,
  upload.single(
    "video"
  ),
  uploadAuditVideo
);

router.get(
  "/history",
  protect,
  branchAccess,
  getAuditHistory
);

router.get(
  "/:id",
  protect,
  branchAccess,
  getSingleAudit
);

module.exports =
  router;
